import ts from 'typescript';
import fs from 'fs';
import path from 'path';

function findLegacyTermsInCode(): string[] {
  const violations: string[] = [];
  const srcDir = path.join(process.cwd(), 'src');

  function visit(node: ts.Node, sourceFile: ts.SourceFile) {
    if (ts.isIdentifier(node)) {
      const text = node.text;
      const invalidIdentifiers = ['premium_until', 'premium_tier', 'membership', 'planRank', 'isPremium', 'hasPremium'];
      if (invalidIdentifiers.includes(text)) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        violations.push(`${sourceFile.fileName}:${line + 1}:${character + 1} - Found legacy identifier: ${text}`);
      }
    }

    if (ts.isPropertyAccessExpression(node)) {
      const expText = node.expression.getText(sourceFile);
      const nameText = node.name.text;
      if (expText === 'subscription' && (nameText === 'plan' || nameText === 'status')) {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        violations.push(`${sourceFile.fileName}:${line + 1}:${character + 1} - Found legacy property access: subscription.${nameText}`);
      }
      if (nameText === 'premium_until' || nameText === 'premium_tier') {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        violations.push(`${sourceFile.fileName}:${line + 1}:${character + 1} - Found legacy property access: ${nameText}`);
      }
    }

    if (ts.isBinaryExpression(node)) {
      const left = node.left.getText(sourceFile);
      const operator = node.operatorToken.kind;
      const right = node.right.getText(sourceFile);
      const isEqOrStrictEq = operator === ts.SyntaxKind.EqualsEqualsToken || operator === ts.SyntaxKind.EqualsEqualsEqualsToken;
      
      if (isEqOrStrictEq) {
        if (left === 'premium' && right === 'true') {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          violations.push(`${sourceFile.fileName}:${line + 1}:${character + 1} - Found legacy check: premium === true`);
        }
        if ((left === 'plan' || left.endsWith('.plan')) && !sourceFile.fileName.includes('/admin/')) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          violations.push(`${sourceFile.fileName}:${line + 1}:${character + 1} - Found legacy check: plan === ${right}`);
        }
        if ((left === 'role' || left.endsWith('.role')) && (right === '"pro"' || right === "'pro'" || right === '"premium"' || right === "'premium'")) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          violations.push(`${sourceFile.fileName}:${line + 1}:${character + 1} - Found legacy check: role === ${right}`);
        }
      }
    }

    ts.forEachChild(node, child => visit(child, sourceFile));
  }

  function readFilesRecursively(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (
        fullPath.includes(path.join('src', 'lib', 'membership')) ||
        fullPath.includes('src/lib/membership') ||
        fullPath.includes('src\\lib\\membership') ||
        fullPath.includes(path.join('src', 'app', 'admin', 'memberships')) ||
        fullPath.includes('src/app/admin/memberships') ||
        fullPath.includes('src\\app\\admin\\memberships') ||
        fullPath.includes(path.join('src', 'app', 'api', 'admin', 'memberships')) ||
        fullPath.includes('src/app/api/admin/memberships') ||
        fullPath.includes('src\\app\\api\\admin\\memberships')
      ) {
        continue;
      }
      if (stat.isDirectory()) {
        readFilesRecursively(fullPath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const sourceFile = ts.createSourceFile(fullPath, fileContent, ts.ScriptTarget.Latest, true);
        visit(sourceFile, sourceFile);
      }
    }
  }

  readFilesRecursively(srcDir);
  return violations;
}

console.log('Starting AST-Based Legacy Permission Scanner...');
const violations = findLegacyTermsInCode();

if (violations.length > 0) {
  console.error(`❌ LEGACY PERMISSION ERROR: Found ${violations.length} violations in code:`);
  violations.forEach(v => console.error(`  - ${v}`));
  process.exit(1);
} else {
  console.log('✅ ZERO LEGACY VERIFIED: No legacy permissions found in code.');
  process.exit(0);
}

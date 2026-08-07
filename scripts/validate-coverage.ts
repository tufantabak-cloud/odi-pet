import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { featureRegistry } from '../src/lib/features/registry';

function findGuardsAndQuotasInCode() {
  const guardKeys = new Set<string>();
  const quotaKeys = new Set<string>();
  const srcDir = path.join(process.cwd(), 'src');

  function visit(node: ts.Node, sourceFile: ts.SourceFile) {
    // 1. Function Call Expressions
    if (ts.isCallExpression(node)) {
      const expText = node.expression.getText(sourceFile);
      
      // Guards: useFeature, withAPIFeatureGuard, withActionFeatureGuard, checkFeatureAccess
      if (['useFeature', 'withAPIFeatureGuard', 'withActionFeatureGuard', 'checkFeatureAccess'].some(fn => expText.endsWith(fn))) {
        const firstArg = node.arguments[0];
        if (firstArg && ts.isStringLiteral(firstArg)) {
          guardKeys.add(firstArg.text);
        }
      }
      
      // Quota: consumeUsage
      if (expText.endsWith('consumeUsage')) {
        const firstArg = node.arguments[0];
        if (firstArg && ts.isObjectLiteralExpression(firstArg)) {
          for (const prop of firstArg.properties) {
            if (ts.isPropertyAssignment(prop) && prop.name.getText(sourceFile) === 'featureKey') {
              if (ts.isStringLiteral(prop.initializer)) {
                quotaKeys.add(prop.initializer.text);
              }
            }
          }
        }
      }
    }

    // 2. JSX Elements (ClientFeatureGuard, ServerFeatureGuard)
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile);
      if (tagName === 'ClientFeatureGuard' || tagName === 'ServerFeatureGuard' || tagName === 'FeatureGuard') {
        for (const prop of node.attributes.properties) {
          if (ts.isJsxAttribute(prop) && prop.name.getText(sourceFile) === 'featureKey') {
            if (prop.initializer && ts.isStringLiteral(prop.initializer)) {
              guardKeys.add(prop.initializer.text);
            }
          }
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
  return { guardKeys, quotaKeys };
}

console.log('Starting AST-Based Feature Coverage Validation...');

const { guardKeys, quotaKeys } = findGuardsAndQuotasInCode();
const registeredFeatures = Array.from(featureRegistry.values());
const totalFeatures = registeredFeatures.length;

let guardedCount = 0;
let quotaCount = 0;
const missingGuards: string[] = [];

for (const feature of registeredFeatures) {
  if (guardKeys.has(feature.key)) {
    guardedCount++;
  } else {
    missingGuards.push(feature.key);
  }
  
  if (quotaKeys.has(feature.key)) {
    quotaCount++;
  }
}

const coveragePercent = totalFeatures === 0 ? 100 : Math.round((guardedCount / totalFeatures) * 100);

console.log(`📊 Coverage Report:`);
console.log(`- Registry: ${totalFeatures}`);
console.log(`- Guarded Features: ${guardedCount}`);
console.log(`- Quota Tracked Features: ${quotaCount}`);
console.log(`- Coverage: ${coveragePercent}%`);

if (coveragePercent < 100) {
  console.warn(`⚠️ COVERAGE WARNING: Target is 100%. Missing guards for:\n  - ${missingGuards.join('\n  - ')}`);
  process.exit(0);
} else {
  console.log(`✅ ZERO DEAD FEATURES: 100% Guard Coverage verified.`);
  process.exit(0);
}

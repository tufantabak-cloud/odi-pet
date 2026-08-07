import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { featureRegistry, validateDependencies } from '../src/lib/features/registry';

function findFeatureKeysInCode(): Set<string> {
  const codeKeys = new Set<string>();
  const srcDir = path.join(process.cwd(), 'src');

  function visit(node: ts.Node) {
    // Look for string literals passed into useFeature('key'), checkFeatureAccess({ featureKey: 'key' }), etc.
    if (ts.isCallExpression(node)) {
      const expressionText = node.expression.getText();
      if (['useFeature', 'withAPIFeatureGuard', 'withActionFeatureGuard'].some(fn => expressionText.endsWith(fn))) {
        const firstArg = node.arguments[0];
        if (firstArg && ts.isStringLiteral(firstArg)) {
          codeKeys.add(firstArg.text);
        }
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const propName = node.name.getText();
      if (propName === 'featureKey' && ts.isStringLiteral(node.initializer)) {
        codeKeys.add(node.initializer.text);
      }
    }

    ts.forEachChild(node, visit);
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
        const sourceFile = ts.createSourceFile(file, fileContent, ts.ScriptTarget.Latest, true);
        visit(sourceFile);
      }
    }
  }

  readFilesRecursively(srcDir);
  return codeKeys;
}

function runASTValidation() {
  console.log('Starting AST-Based Feature Registry Validation...');

  const registeredFeatures = Array.from(featureRegistry.values());
  const registeredKeys = new Set(registeredFeatures.map(f => f.key));

  console.log(`✅ Loaded ${registeredFeatures.length} features from Registry.`);

  let hasErrors = false;

  // 1. Dependency DFS Check
  try {
    validateDependencies();
    console.log('✅ Dependency DFS validation passed.');
  } catch (error: any) {
    console.error('❌ Validation Failed: Dependency checks failed.', error.message);
    hasErrors = true;
  }

  // 2. AST Static Code Scan
  const codeKeys = findFeatureKeysInCode();
  console.log(`🔍 Scanned codebase and found ${codeKeys.size} feature key references in code.`);

  // Orphan Guard Detection: Used in code but missing in Registry
  const orphanGuards: string[] = [];
  for (const key of codeKeys) {
    if (!registeredKeys.has(key)) {
      orphanGuards.push(key);
    }
  }

  if (orphanGuards.length > 0) {
    console.error(`❌ ORPHAN GUARD ERROR: The following feature keys are used in code but NOT registered in Registry:\n  - ${orphanGuards.join('\n  - ')}`);
    hasErrors = true;
  } else {
    console.log('✅ No Orphan Guards detected.');
  }

  // Dead Feature Detection: Registered in Registry but never referenced in code
  const deadFeatures: string[] = [];
  for (const key of registeredKeys) {
    if (!codeKeys.has(key)) {
      deadFeatures.push(key);
    }
  }

  if (deadFeatures.length > 0) {
    console.warn(`⚠️ DEAD FEATURE WARNING: The following registered features are not referenced in code:\n  - ${deadFeatures.join('\n  - ')}`);
  } else {
    console.log('✅ No Dead Features detected.');
  }

  if (hasErrors) {
    console.error('💥 Registry AST validation completed with ERRORS.');
    process.exit(1);
  } else {
    console.log('🚀 Registry AST validation completed SUCCESSFULLY.');
    
    // Generate feature-index.json and registry-lock.json
    const features = registeredFeatures.map(f => ({
      featureKey: f.key,
      apis: [], // To be enriched if needed
      components: [],
      hooks: [],
      guards: [],
      quota: true,
      bundle: [],
      plans: [],
      dependsOn: f.dependsOn,
      state: f.state,
      metadata: f.metadata
    }));
    
    const indexFilePath = path.join(process.cwd(), 'src', 'lib', 'features', 'feature-index.json');
    fs.writeFileSync(indexFilePath, JSON.stringify(features, null, 2));
    console.log(`✅ Generated feature-index.json at ${indexFilePath}`);

    const hash = crypto.createHash('sha256').update(JSON.stringify(features)).digest('hex');
    const lockData = {
      registryHash: hash,
      schemaVersion: '1.0.0',
      featureCount: features.length,
      generatedAt: new Date().toISOString(),
      featureIndex: features
    };
    
    const lockFilePath = path.join(process.cwd(), 'src', 'lib', 'features', 'registry-lock.json');
    fs.writeFileSync(lockFilePath, JSON.stringify(lockData, null, 2));
    console.log(`✅ Generated registry-lock.json at ${lockFilePath}`);

    process.exit(0);
  }
}

runASTValidation();

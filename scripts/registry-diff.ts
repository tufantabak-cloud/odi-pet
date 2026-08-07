import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { featureRegistry } from '../src/lib/features/registry';

function runRegistryDiff() {
  console.log('🔍 Generating Registry Diff...\n');

  const lockFilePath = path.join(process.cwd(), 'src', 'lib', 'features', 'registry-lock.json');
  let oldLockData: any = null;

  try {
    // Try to get the registry-lock.json from HEAD (last commit)
    const oldLockStr = execSync('git show HEAD:src/lib/features/registry-lock.json', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    oldLockData = JSON.parse(oldLockStr);
  } catch (e) {
    console.log('⚠️ Could not find previous registry-lock.json in git HEAD. Assuming all features are newly added.\n');
  }

  const oldFeatures = oldLockData?.featureIndex || [];
  const oldFeaturesMap = new Map<string, any>();
  for (const f of oldFeatures) {
    oldFeaturesMap.set(f.featureKey, f);
  }

  const currentFeatures = Array.from(featureRegistry.values());
  const currentFeaturesMap = new Map<string, any>();
  for (const f of currentFeatures) {
    currentFeaturesMap.set(f.key, f);
  }

  const added: string[] = [];
  const removed: string[] = [];
  const stateChanged: string[] = [];
  const depsChanged: string[] = [];

  for (const [key, curr] of currentFeaturesMap.entries()) {
    if (!oldFeaturesMap.has(key)) {
      added.push(key);
    } else {
      const old = oldFeaturesMap.get(key);
      if (old.state !== curr.state) {
        stateChanged.push(`${key}: ${old.state} -> ${curr.state}`);
      }
      
      const oldDeps = old.dependsOn ? [...old.dependsOn].sort().join(',') : '';
      const currDeps = curr.dependsOn ? [...curr.dependsOn].sort().join(',') : '';
      
      if (oldDeps !== currDeps) {
        depsChanged.push(`${key}: [${oldDeps}] -> [${currDeps}]`);
      }
    }
  }

  for (const [key] of oldFeaturesMap.entries()) {
    if (!currentFeaturesMap.has(key)) {
      removed.push(key);
    }
  }

  console.log('=== REGISTRY DIFF ===\n');
  
  if (added.length > 0) {
    console.log('🟢 ADDED:');
    added.forEach(a => console.log(`  + ${a}`));
    console.log('');
  }

  if (removed.length > 0) {
    console.log('🔴 REMOVED:');
    removed.forEach(r => console.log(`  - ${r}`));
    console.log('');
  }

  if (stateChanged.length > 0) {
    console.log('🟡 STATE CHANGED:');
    stateChanged.forEach(s => console.log(`  ~ ${s}`));
    console.log('');
  }

  if (depsChanged.length > 0) {
    console.log('🔵 DEPENDENCY CHANGED:');
    depsChanged.forEach(d => console.log(`  ~ ${d}`));
    console.log('');
  }

  if (added.length === 0 && removed.length === 0 && stateChanged.length === 0 && depsChanged.length === 0) {
    console.log('✅ No changes in Registry since last commit.');
  }
}

runRegistryDiff();

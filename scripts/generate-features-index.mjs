import fs from 'fs';
import path from 'path';

const DEFINITIONS_DIR = path.join(process.cwd(), 'src', 'lib', 'features', 'definitions');
const GENERATED_DIR = path.join(process.cwd(), 'src', 'lib', 'features', 'generated');
const INDEX_FILE = path.join(GENERATED_DIR, 'index.ts');

function generateIndex() {
  if (!fs.existsSync(DEFINITIONS_DIR)) {
    console.warn(`[FeatureRegistry] Warning: Definitions directory not found at ${DEFINITIONS_DIR}`);
    fs.mkdirSync(DEFINITIONS_DIR, { recursive: true });
  }

  if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
  }

  const files = fs.readdirSync(DEFINITIONS_DIR)
    .filter(file => file.endsWith('.ts') && !file.endsWith('.d.ts'))
    .sort();

  let content = `// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.\n`;
  content += `// Run 'npm run prebuild' or 'npm run predev' to regenerate.\n\n`;
  content += `import type { FeatureDefinition } from '../types';\n\n`;

  const imports = [];
  const exports = [];

  files.forEach((file, index) => {
    const importName = `feature_${index}`;
    const moduleName = file.replace(/\.ts$/, '');
    content += `import { feature as ${importName} } from '../definitions/${moduleName}';\n`;
    exports.push(importName);
  });

  content += `\nexport const features: FeatureDefinition[] = [\n  ${exports.join(',\n  ')}\n];\n`;

  fs.writeFileSync(INDEX_FILE, content, 'utf8');
  console.log(`[FeatureRegistry] Successfully generated index with ${files.length} features.`);
}

generateIndex();

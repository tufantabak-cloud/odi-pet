import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting Production Certification...\n');

const steps = [
  { name: 'Registry', cmd: 'npm run validate:registry' },
  { name: 'Coverage', cmd: 'npm run validate:coverage' },
  { name: 'Legacy', cmd: 'npm run validate:legacy' },
  { name: 'Bundle', cmd: 'npm run validate:bundles' },
  { name: 'TS Compile', cmd: 'npx tsc --noEmit' },
  { name: 'Unit Tests', cmd: 'npm run test:unit' }
];

const results: Record<string, boolean> = {};
let allPassed = true;

for (const step of steps) {
  process.stdout.write(`⏳ Running ${step.name}... `);
  try {
    execSync(step.cmd, { stdio: 'ignore' });
    console.log('✅ PASS');
    results[step.name] = true;
  } catch (e) {
    console.log('❌ FAIL');
    results[step.name] = false;
    allPassed = false;
  }
}

// Ensure docs generated
try {
  execSync('npm run docs:registry', { stdio: 'ignore' });
} catch (e) {
  console.log('⚠️ Failed to generate registry docs');
}

// Read lock file
let registryHash = 'N/A';
let schemaVersion = 'N/A';
try {
  const lockData = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'features', 'registry-lock.json'), 'utf8'));
  registryHash = lockData.registryHash || 'N/A';
  schemaVersion = lockData.schemaVersion || 'N/A';
} catch (e) {
  // Ignore
}

// Generate Report
const reportPath = path.join(process.cwd(), 'docs', 'production-certification.md');
let md = `# Odi.Pet Production Certification\n\n`;
md += `**Generated At:** ${new Date().toISOString()}\n`;
md += `**Status:** ${allPassed ? '✅ CERTIFIED' : '❌ FAILED'}\n\n`;

md += `## Checks\n`;
for (const step of steps) {
  md += `- **${step.name}:** ${results[step.name] ? 'PASS' : 'FAIL'}\n`;
}

md += `\n## Metadata\n`;
md += `- **Registry Hash:** \`${registryHash}\`\n`;
md += `- **Schema Version:** \`${schemaVersion}\`\n`;

fs.writeFileSync(reportPath, md, 'utf8');

console.log(`\n📄 Certification report generated at ${reportPath}`);

if (allPassed) {
  console.log('🎉 Production Certification PASSED.');
  process.exit(0);
} else {
  console.error('💥 Production Certification FAILED.');
  process.exit(1);
}

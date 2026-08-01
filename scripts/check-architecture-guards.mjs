import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ARCHITECTURE GUARD FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('🔍 Running Architecture Guard Check (Sprint Y.1)...');

// 1. Check vercel.json cron configuration
const vercelJsonPath = path.join(rootDir, 'vercel.json');
assert(fs.existsSync(vercelJsonPath), 'vercel.json missing');
const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
assert(Array.isArray(vercelConfig.crons), 'vercel.json must have crons array');
assert(vercelConfig.crons.length === 1, 'vercel.json must have exactly 1 scheduled cron');
assert(vercelConfig.crons[0].path === '/api/cron/orchestrator', 'vercel.json cron must be /api/cron/orchestrator');
console.log('✅ Guard 1 Passed: vercel.json has only /api/cron/orchestrator scheduled.');

// 2. Check decommissioned cron routes return disabled status
const decommissionedRoutes = [
  'data-quality',
  'vaccine-check',
  'user-health',
  'plans',
  'expire-cards',
  'anomaly-detector',
  'process-events',
  'subscription-reminders',
  'weekly-report',
];

for (const routeName of decommissionedRoutes) {
  const routePath = path.join(rootDir, `src/app/api/cron/${routeName}/route.ts`);
  assert(fs.existsSync(routePath), `Decommissioned cron route missing: ${routeName}`);
  const content = fs.readFileSync(routePath, 'utf8');
  assert(content.includes("status: 'disabled'"), `Route ${routeName} must return status: 'disabled'`);
}
console.log(`✅ Guard 2 Passed: All ${decommissionedRoutes.length} decommissioned cron routes return status: 'disabled'.`);

// 3. Check Unified Vaccine Record Service
const createVaccineRecordPath = path.join(rootDir, 'src/lib/vaccines/createVaccineRecord.ts');
assert(fs.existsSync(createVaccineRecordPath), 'createVaccineRecord.ts missing');
const createVaccineContent = fs.readFileSync(createVaccineRecordPath, 'utf8');
assert(createVaccineContent.includes('export async function createVaccineRecord'), 'createVaccineRecord() function missing');
console.log('✅ Guard 3 Passed: createVaccineRecord Single Source of Truth exists.');

// 4. Check Confidence Level Translation Layer
const confidenceLevelsPath = path.join(rootDir, 'src/lib/vaccines/confidenceLevels.ts');
assert(fs.existsSync(confidenceLevelsPath), 'confidenceLevels.ts missing');
const confidenceContent = fs.readFileSync(confidenceLevelsPath, 'utf8');
assert(confidenceContent.includes('export function normalizeConfidenceLevel'), 'normalizeConfidenceLevel() missing');
assert(confidenceContent.includes('CANONICAL_CONFIDENCE_LEVELS'), 'CANONICAL_CONFIDENCE_LEVELS array missing');
assert(confidenceContent.includes("'verified'") && confidenceContent.includes("'user_reported'") && confidenceContent.includes("'estimated'"), 'DB CHECK constraint canonical levels missing');
console.log('✅ Guard 4 Passed: Confidence Level Translation Layer exists and matches DB CHECK constraint.');

// 5. Check Legal Required Rabies Vaccination Algorithm
const algoPath = path.join(rootDir, 'src/features/pets/vaccination-algorithm.ts');
assert(fs.existsSync(algoPath), 'vaccination-algorithm.ts missing');
const algoContent = fs.readFileSync(algoPath, 'utf8');
assert(algoContent.includes("is_core: p.is_core"), 'is_core domain meaning must remain untouched');
assert(algoContent.includes('isLegalRequiredPlansEnabled'), 'isLegalRequiredPlansEnabled feature flag helper missing');
console.log('✅ Guard 5 Passed: vaccination-algorithm preserves is_core semantics and uses feature flag.');

// 6. Check Overdue Recovery Architecture
const recoveryPath = path.join(rootDir, 'src/lib/notifications/recoverOverdueNotifications.ts');
assert(fs.existsSync(recoveryPath), 'recoverOverdueNotifications.ts missing');
const recoveryContent = fs.readFileSync(recoveryPath, 'utf8');
assert(recoveryContent.includes('createOverdueVaccineNotifications'), 'recoverOverdueNotifications must delegate to createOverdueVaccineNotifications');
console.log('✅ Guard 6 Passed: Overdue Recovery delegates to canonical createOverdueVaccineNotifications.');

// 7. Check OPOS Illustration Single Source of Truth & DAM Protection
const manifestPath = path.join(rootDir, 'public/brand/illustrations/illustration-manifest.json');
assert(fs.existsSync(manifestPath), 'OPOS illustration-manifest.json missing');
const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(Array.isArray(manifestContent) && manifestContent.length >= 70, 'OPOS illustration manifest must contain at least 70 master illustrations');
const illustrationComponentPath = path.join(rootDir, 'src/components/ui/Illustration.tsx');
assert(fs.existsSync(illustrationComponentPath), 'Illustration React component missing');
const illustrationApiPath = path.join(rootDir, 'src/lib/illustrations.ts');
assert(fs.existsSync(illustrationApiPath), 'Core Illustration API (illustrations.ts) missing');
console.log('✅ Guard 7 Passed: OPOS Illustration System is active, protected, and frozen.');

console.log('🎉 ALL ARCHITECTURE GUARDS PASSED (100%)');

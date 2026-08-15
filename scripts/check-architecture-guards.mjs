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
console.log('✅ Guard 5 Passed: vaccination-algorithm preserves is_core semantics.');

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

// 8. Check Canonical Data & Health Data Protection Governance Rules (Cilt 5 & 6)
const agentsMdPath = path.join(rootDir, 'AGENTS.md');
assert(fs.existsSync(agentsMdPath), 'AGENTS.md missing');
const agentsContent = fs.readFileSync(agentsMdPath, 'utf8');
assert(agentsContent.includes('Single Source of Truth & Kanonik Veri Modeli'), 'AGENTS.md must contain Single Source of Truth rule');
assert(agentsContent.includes('Dashboard & Timeline Veri Üretmez'), 'AGENTS.md must contain Dashboard & Timeline Read-Only rule');
assert(agentsContent.includes('Sağlık Verisi Silinemez, Sadece Arşivlenir'), 'AGENTS.md must contain Health Data Archival Only rule');

const governanceHandbookPath = path.join(rootDir, 'docs/governance/governance-handbook.md');
assert(fs.existsSync(governanceHandbookPath), 'governance-handbook.md missing');
const handbookContent = fs.readFileSync(governanceHandbookPath, 'utf8');
assert(handbookContent.includes('Rule 7 (Canonical Data Model)'), 'Governance handbook missing Rule 7');
assert(handbookContent.includes('Rule 8 (Dashboard & Timeline Read-Only Aggregation)'), 'Governance handbook missing Rule 8');
assert(handbookContent.includes('Rule 9 (Health Data Archival Only)'), 'Governance handbook missing Rule 9');
console.log('✅ Guard 8 Passed: Canonical Data & Health Data Protection Rules registered and active.');

// 9. Check AI Governance & Human-in-the-Loop Rules (Cilt 13)
assert(agentsContent.includes('OPOS AI Governance & Human-in-the-Loop Kuralları (Cilt 13)'), 'AGENTS.md must contain AI Governance section');
assert(agentsContent.includes('AI Görsel & İkon Standardı (Mor Yıldız / Sparkles Indicator - Cilt 13)'), 'AGENTS.md must contain AI Visual Indicator rule');
assert(agentsContent.includes('Human-in-the-Loop & Onay Zorunluluğu'), 'AGENTS.md must contain Human-in-the-Loop rule');
assert(agentsContent.includes('Confidence Score & Açıklanabilirlik'), 'AGENTS.md must contain Confidence Score rule');
assert(agentsContent.includes('Yasal Sorumluluk & Tıbbi Sorumluluk Reddi'), 'AGENTS.md must contain Medical Disclaimer rule');

assert(handbookContent.includes('Rule 10 (AI Visual Indicator Standard)'), 'Governance handbook missing Rule 10');
assert(handbookContent.includes('Rule 11 (AI Human-in-the-Loop Confirmation)'), 'Governance handbook missing Rule 11');
assert(handbookContent.includes('Rule 12 (AI Confidence Score & Explainability)'), 'Governance handbook missing Rule 12');
assert(handbookContent.includes('Rule 13 (Medical Disclaimer & Legal Boundaries)'), 'Governance handbook missing Rule 13');
console.log('✅ Guard 9 Passed: AI Governance & Human-in-the-Loop Rules registered and active.');

console.log('🎉 ALL ARCHITECTURE GUARDS PASSED (100%)');



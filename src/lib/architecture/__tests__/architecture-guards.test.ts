import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

describe('Sprint Y.1 — Architecture Guard Rails', () => {
  it('Guard 1: vercel.json schedules ONLY /api/cron/orchestrator', () => {
    const vercelJsonPath = path.join(rootDir, 'vercel.json');
    expect(fs.existsSync(vercelJsonPath)).toBe(true);
    const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));

    expect(Array.isArray(vercelConfig.crons)).toBe(true);
    expect(vercelConfig.crons.length).toBe(1);
    expect(vercelConfig.crons[0].path).toBe('/api/cron/orchestrator');
  });

  it('Guard 2: all 9 decommissioned cron routes return status: "disabled"', () => {
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
      expect(fs.existsSync(routePath)).toBe(true);
      const content = fs.readFileSync(routePath, 'utf8');
      expect(content).toContain("status: 'disabled'");
    }
  });

  it('Guard 3: createVaccineRecord Single Source of Truth exists', () => {
    const createVaccineRecordPath = path.join(rootDir, 'src/lib/vaccines/createVaccineRecord.ts');
    expect(fs.existsSync(createVaccineRecordPath)).toBe(true);
    const content = fs.readFileSync(createVaccineRecordPath, 'utf8');
    expect(content).toContain('export async function createVaccineRecord');
  });

  it('Guard 4: Confidence Level Translation Layer exists and matches DB CHECK constraint', () => {
    const confidenceLevelsPath = path.join(rootDir, 'src/lib/vaccines/confidenceLevels.ts');
    expect(fs.existsSync(confidenceLevelsPath)).toBe(true);
    const content = fs.readFileSync(confidenceLevelsPath, 'utf8');
    expect(content).toContain('export function normalizeConfidenceLevel');
    expect(content).toContain('CANONICAL_CONFIDENCE_LEVELS');
    expect(content).toContain("'verified'");
    expect(content).toContain("'user_reported'");
    expect(content).toContain("'estimated'");
  });

  it('Guard 5: vaccination-algorithm preserves is_core semantics and uses feature flag', () => {
    const algoPath = path.join(rootDir, 'src/features/pets/vaccination-algorithm.ts');
    expect(fs.existsSync(algoPath)).toBe(true);
    const content = fs.readFileSync(algoPath, 'utf8');
    expect(content).toContain('is_core: p.is_core');
    expect(content).toContain('isLegalRequiredPlansEnabled');
  });

  it('Guard 6: recoverOverdueNotifications delegates to canonical createOverdueVaccineNotifications', () => {
    const recoveryPath = path.join(rootDir, 'src/lib/notifications/recoverOverdueNotifications.ts');
    expect(fs.existsSync(recoveryPath)).toBe(true);
    const content = fs.readFileSync(recoveryPath, 'utf8');
    expect(content).toContain('createOverdueVaccineNotifications');
  });
});

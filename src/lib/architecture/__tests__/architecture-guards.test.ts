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

  it('Guard 5: vaccination-algorithm preserves is_core semantics', () => {
    const algoPath = path.join(rootDir, 'src/features/pets/vaccination-algorithm.ts');
    expect(fs.existsSync(algoPath)).toBe(true);
    const content = fs.readFileSync(algoPath, 'utf8');
    expect(content).toContain('is_core: p.is_core');
  });

  it('Guard 6: recoverOverdueNotifications delegates to canonical createOverdueVaccineNotifications', () => {
    const recoveryPath = path.join(rootDir, 'src/lib/notifications/recoverOverdueNotifications.ts');
    expect(fs.existsSync(recoveryPath)).toBe(true);
    const content = fs.readFileSync(recoveryPath, 'utf8');
    expect(content).toContain('createOverdueVaccineNotifications');
  });

  it('Guard 8: Canonical Data & Health Data Protection Governance Rules are active', () => {
    const agentsMdPath = path.join(rootDir, 'AGENTS.md');
    expect(fs.existsSync(agentsMdPath)).toBe(true);
    const agentsContent = fs.readFileSync(agentsMdPath, 'utf8');
    expect(agentsContent).toContain('Single Source of Truth & Kanonik Veri Modeli');
    expect(agentsContent).toContain('Dashboard & Timeline Veri Üretmez');
    expect(agentsContent).toContain('Sağlık Verisi Silinemez, Sadece Arşivlenir');

    const handbookPath = path.join(rootDir, 'docs/governance/governance-handbook.md');
    expect(fs.existsSync(handbookPath)).toBe(true);
    const handbookContent = fs.readFileSync(handbookPath, 'utf8');
    expect(handbookContent).toContain('Rule 7 (Canonical Data Model)');
    expect(handbookContent).toContain('Rule 8 (Dashboard & Timeline Read-Only Aggregation)');
    expect(handbookContent).toContain('Rule 9 (Health Data Archival Only)');
  });

  it('Guard 9: AI Governance & Human-in-the-Loop Rules (Cilt 13) are active', () => {
    const agentsMdPath = path.join(rootDir, 'AGENTS.md');
    expect(fs.existsSync(agentsMdPath)).toBe(true);
    const agentsContent = fs.readFileSync(agentsMdPath, 'utf8');
    expect(agentsContent).toContain('OPOS AI Governance & Human-in-the-Loop Kuralları (Cilt 13)');
    expect(agentsContent).toContain('AI Görsel & İkon Standardı (Mor Yıldız / Sparkles Indicator - Cilt 13)');
    expect(agentsContent).toContain('Human-in-the-Loop & Onay Zorunluluğu');
    expect(agentsContent).toContain('Confidence Score & Açıklanabilirlik');
    expect(agentsContent).toContain('Yasal Sorumluluk & Tıbbi Sorumluluk Reddi');

    const handbookPath = path.join(rootDir, 'docs/governance/governance-handbook.md');
    expect(fs.existsSync(handbookPath)).toBe(true);
    const handbookContent = fs.readFileSync(handbookPath, 'utf8');
    expect(handbookContent).toContain('Rule 10 (AI Visual Indicator Standard)');
    expect(handbookContent).toContain('Rule 11 (AI Human-in-the-Loop Confirmation)');
    expect(handbookContent).toContain('Rule 12 (AI Confidence Score & Explainability)');
    expect(handbookContent).toContain('Rule 13 (Medical Disclaimer & Legal Boundaries)');
  });
});



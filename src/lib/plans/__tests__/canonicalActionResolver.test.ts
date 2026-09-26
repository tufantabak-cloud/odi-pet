import { describe, it, expect } from 'vitest';
import { resolvePlanActions, normalizePlanId } from '../canonicalActionResolver';

describe('canonicalActionResolver', () => {
  it('normalizes plan_ prefix from id correctly', () => {
    expect(normalizePlanId('plan_123-abc')).toBe('123-abc');
    expect(normalizePlanId('123-abc')).toBe('123-abc');
    expect(normalizePlanId(null as any)).toBe('');
  });

  it('correctly resolves parasite plans with completionMode parasite_protocol', () => {
    const context = {
      planId: 'plan_para-1',
      category: 'parazit',
      plan: {
        id: 'plan_para-1',
        title: 'Iç Parazit Tedavisi',
        category: 'parazit',
        status: 'scheduled',
      },
    };
    const resolved = resolvePlanActions(context);
    expect(resolved.isParasite).toBe(true);
    expect(resolved.completionMode).toBe('parasite_protocol');
    expect(resolved.canComplete).toBe(true);
    expect(resolved.canPostpone).toBe(true);
    expect(resolved.sourceTable).toBe('plans');
  });

  it('correctly classifies real plans table UUID Records as plans with repeat_rule and sub_type', () => {
    const context = {
      planId: '695ce571-97a7-4b5c-a502-a908135e66d1',
      plan: {
        id: '695ce571-97a7-4b5c-a502-a908135e66d1',
        category: 'bakim',
        sub_type: 'tuy_bakimi',
        repeat_rule: 'weekly',
        status: 'active',
        scheduled_at: '2026-09-19T09:00:00.000Z',
      },
    };
    const resolved = resolvePlanActions(context);
    expect(resolved.sourceTable).toBe('plans');
    expect(resolved.canComplete).toBe(true);
  });

  it('correctly classifies legacy health_schedules with plan_type or vaccine_id', () => {
    const context = {
      planId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      plan: {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        plan_type: 'vaccine',
        vaccine_id: 'vac-123',
        title: 'Karma Aşı Doz 1',
        due_date: '2026-09-20',
      },
    };
    const resolved = resolvePlanActions(context);
    expect(resolved.sourceTable).toBe('health_schedules');
  });

  it('does not allow editing of pure health_schedules records via plans modal', () => {
    const context = {
      planId: 'legacy-schedule-1',
      sourceTable: 'health_schedules',
      plan: {
        id: 'legacy-schedule-1',
        title: 'Legacy Schedule',
      },
    };
    const resolved = resolvePlanActions(context);
    expect(resolved.canEdit).toBe(false);
    expect(resolved.actions.some(a => a.id === 'edit')).toBe(false);
  });
});

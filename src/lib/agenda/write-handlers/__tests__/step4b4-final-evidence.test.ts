import { describe, it, expect, vi } from 'vitest';
import { VaccineWriteHandler } from '../handlers/vaccine-write-handler';
import { ParasiteWriteHandler } from '../handlers/parasite-write-handler';
import { MedicationWriteHandler } from '../handlers/medication-write-handler';
import { agendaWriteRegistry } from '../registry';

describe('ADIM 4B.4 — Canonical Protocol Engine, Idempotency Key, Strict Match & Odi Evidence', () => {

  // ─── 1. CANONICAL PROTOCOL ENGINE ───

  it('1. calculateNextDue calls canonical calculateNextBoosterDate for DOG_RABIES (365d legal)', async () => {
    const handler = new VaccineWriteHandler();
    const result = await handler.calculateNextDue(
      { pet_id: 'p1', vaccine_code: 'DOG_RABIES', vaccine_name: 'Kuduz', administered_at: '2026-07-23T10:00:00Z' },
      null
    );
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.source).toContain('protocol_engine_');
      expect(result.source).toContain('365d');
      // Legal booster = +365 days from administered_at
      const nextDate = new Date(result.nextDueAt);
      const expected = new Date('2026-07-23T10:00:00Z');
      expected.setDate(expected.getDate() + 365);
      expect(nextDate.toISOString().split('T')[0]).toBe(expected.toISOString().split('T')[0]);
    }
  });

  it('2. calculateNextDue uses canonical engine for DOG_DHPPI (triennial clinical, annual legal)', async () => {
    const handler = new VaccineWriteHandler();
    const result = await handler.calculateNextDue(
      { pet_id: 'p1', vaccine_code: 'DOG_DHPPI', vaccine_name: 'Karma Aşı', administered_at: '2026-03-15T10:00:00Z' },
      null
    );
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      // Legal booster days for DHPPI = 365 (Türkiye yasal prosedürleri)
      expect(result.source).toContain('protocol_engine_365d');
    }
  });

  it('3. calculateNextDue uses canonical engine for CAT_FVRCP', async () => {
    const handler = new VaccineWriteHandler();
    const result = await handler.calculateNextDue(
      { pet_id: 'p1', vaccine_code: 'CAT_FPV', vaccine_name: 'Kedi Parvovirus', administered_at: '2026-01-10T10:00:00Z' },
      null
    );
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.source).toContain('protocol_engine_');
    }
  });

  it('4. calculateNextDue returns unresolved for CUSTOM/unknown vaccine_code', async () => {
    const handler = new VaccineWriteHandler();
    const result = await handler.calculateNextDue(
      { pet_id: 'p1', vaccine_name: 'Bilinmeyen Aşı', administered_at: '2026-07-23T10:00:00Z' },
      null
    );
    expect(result.status).toBe('unresolved');
    if (result.status === 'unresolved') {
      expect(result.reason).toContain('unknown_vaccine_code');
    }
  });

  it('5. No hardcoded +365/+21/setFullYear in vaccine calculateNextDue', async () => {
    // This test verifies by checking all vaccine codes go through the canonical path
    const handler = new VaccineWriteHandler();
    const codes = ['DOG_RABIES', 'CAT_RABIES', 'DOG_DHPPI', 'DOG_LEPTO', 'DOG_BORDETELLA'];
    for (const code of codes) {
      const result = await handler.calculateNextDue(
        { pet_id: 'p1', vaccine_code: code, vaccine_name: 'Test', administered_at: '2026-01-01T10:00:00Z' },
        null
      );
      expect(result.status).toBe('resolved');
      if (result.status === 'resolved') {
        expect(result.source).toMatch(/^protocol_engine_\d+d$/);
      }
    }
  });

  // ─── 2. VALIDATED OVERRIDE ───

  it('6. Rejects unvalidated client next_due_date (no override_reason)', async () => {
    const handler = new VaccineWriteHandler();
    const result = await handler.calculateNextDue(
      { pet_id: 'p1', vaccine_code: 'DOG_RABIES', vaccine_name: 'Kuduz', administered_at: '2026-07-23T10:00:00Z', next_due_date: '2026-12-01' },
      null
    );
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      // Must use protocol engine, NOT the client-provided date
      expect(result.source).toContain('protocol_engine_');
      expect(result.nextDueAt).not.toBe('2026-12-01');
    }
  });

  it('7. Accepts override with explicit override_reason', async () => {
    const handler = new VaccineWriteHandler();
    const result = await handler.calculateNextDue(
      { pet_id: 'p1', vaccine_code: 'DOG_RABIES', vaccine_name: 'Kuduz', administered_at: '2026-07-23T10:00:00Z', next_due_date: '2026-12-01', override_reason: 'Veteriner önerisi' },
      null
    );
    expect(result.status).toBe('resolved');
    if (result.status === 'resolved') {
      expect(result.source).toBe('user_override_validated');
      expect(result.nextDueAt).toBe('2026-12-01');
    }
  });

  // ─── 3. STRICT EXACT MATCH ───

  it('8. Dose number mismatch prevents exact match', async () => {
    const handler = new VaccineWriteHandler();
    const plans = [{
      id: 'plan_dose3', pet_id: 'p1', category: 'asi', sub_type: 'Karma Doz 3',
      scheduled_at: '2026-07-23T10:00:00Z', repeat_rule: null, status: 'active',
      parent_plan_id: null, occurrence_scheduled_at: null,
      extra_data: { vaccine_code: 'DOG_DHPPI', dose_number: 3 }
    }];
    const match = await handler.findMatchingPlans(
      { pet_id: 'p1', vaccine_code: 'DOG_DHPPI', vaccine_name: 'Karma', dose_number: 1, administered_at: '2026-07-23T10:00:00Z' },
      plans
    );
    expect(match.status).toBe('none');
  });

  it('9. Vaccine code mismatch prevents match', async () => {
    const handler = new VaccineWriteHandler();
    const plans = [{
      id: 'plan_rabies', pet_id: 'p1', category: 'asi', sub_type: 'Kuduz',
      scheduled_at: '2026-07-23T10:00:00Z', repeat_rule: 'yearly', status: 'active',
      parent_plan_id: null, occurrence_scheduled_at: null,
      extra_data: { vaccine_code: 'DOG_RABIES' }
    }];
    const match = await handler.findMatchingPlans(
      { pet_id: 'p1', vaccine_code: 'DOG_DHPPI', vaccine_name: 'Karma', administered_at: '2026-07-23T10:00:00Z' },
      plans
    );
    expect(match.status).toBe('none');
  });

  it('10. Multiple candidates returns multiple (no auto-select)', async () => {
    const handler = new VaccineWriteHandler();
    const plans = [
      { id: 'plan_a', pet_id: 'p1', category: 'asi', sub_type: 'Kuduz', scheduled_at: '2026-07-20T10:00:00Z', repeat_rule: 'yearly', status: 'active', parent_plan_id: null, occurrence_scheduled_at: null, extra_data: { vaccine_code: 'DOG_RABIES' } },
      { id: 'plan_b', pet_id: 'p1', category: 'asi', sub_type: 'Kuduz 2', scheduled_at: '2026-07-25T10:00:00Z', repeat_rule: 'yearly', status: 'active', parent_plan_id: null, occurrence_scheduled_at: null, extra_data: { vaccine_code: 'DOG_RABIES' } },
    ];
    const match = await handler.findMatchingPlans(
      { pet_id: 'p1', vaccine_code: 'DOG_RABIES', vaccine_name: 'Kuduz', administered_at: '2026-07-23T10:00:00Z' },
      plans
    );
    expect(match.status).toBe('multiple');
  });

  it('11. Unique valid candidate returns exact', async () => {
    const handler = new VaccineWriteHandler();
    const plans = [{
      id: 'plan_unique', pet_id: 'p1', category: 'asi', sub_type: 'Kuduz',
      scheduled_at: '2026-07-23T10:00:00Z', repeat_rule: 'yearly', status: 'active',
      parent_plan_id: null, occurrence_scheduled_at: null,
      extra_data: { vaccine_code: 'DOG_RABIES' }
    }];
    const match = await handler.findMatchingPlans(
      { pet_id: 'p1', vaccine_code: 'DOG_RABIES', vaccine_name: 'Kuduz', administered_at: '2026-07-23T10:00:00Z' },
      plans
    );
    expect(match.status).toBe('exact');
  });

  // ─── 4. IDEMPOTENCY KEY FLOW ───

  it('12. VaccineWriteHandler passes V3 RPC parameters including UUID p_idempotency_key and omits p_user_id', async () => {
    const handler = new VaccineWriteHandler();
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: { success: true, idempotent_already_processed: false, record_id: 'rec1', completed_plan_id: 'child1', main_plan_id: 'main1', next_scheduled_at: '2027-07-23' },
        error: null
      })
    };
    const match = {
      planId: 'main1', mainPlanId: 'main1', occurrenceScheduledAt: '2026-07-23T10:00:00Z',
      category: 'asi', subCategory: 'Kuduz', stableIdentity: 'asi:DOG_RABIES',
      distanceMinutes: 0, repeatRule: 'yearly', displayDate: '2026-07-23',
      rawPlan: { id: 'main1', scheduled_at: '2026-07-23T10:00:00Z', repeat_rule: 'yearly' }
    };
    const testUuid = '11111111-2222-3333-4444-555555555555';
    await handler.persistLinkedRecord(
      { pet_id: 'p1', vaccine_code: 'DOG_RABIES', vaccine_name: 'Kuduz', administered_at: '2026-07-23T10:00:00Z' },
      match,
      { status: 'resolved', nextDueAt: '2027-07-23T10:00:00Z', source: 'protocol_engine_365d' },
      { supabase: mockSupabase, petId: 'p1', userId: 'u1', timeZone: 'Europe/Istanbul', idempotencyKey: testUuid }
    );
    expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_vaccine_plan_and_record', expect.objectContaining({
      p_idempotency_key: testUuid,
      p_next_scheduled_at: '2027-07-23T10:00:00Z',
      p_close_series: false,
      p_brand_free_text: null
    }));
    const args = mockSupabase.rpc.mock.calls[0][1];
    expect(args).not.toHaveProperty('p_user_id');
    expect(args).not.toHaveProperty('p_next_due_date');
  });

  it('13. ParasiteWriteHandler passes V4 RPC parameters including p_parasite_code, p_application_method, UUID p_idempotency_key and omits p_user_id', async () => {
    const handler = new ParasiteWriteHandler();
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: { success: true, idempotent_already_processed: false, record_id: 'par1', completed_plan_id: 'pchild1', next_scheduled_at: '2026-08-22T10:00:00Z' },
        error: null
      })
    };
    const match = {
      planId: 'par_main', mainPlanId: 'par_main', occurrenceScheduledAt: '2026-07-23T10:00:00Z',
      category: 'parazit', subCategory: 'İç Parazit', stableIdentity: 'parazit:internal',
      distanceMinutes: 0, repeatRule: 'monthly', displayDate: '2026-07-23',
      rawPlan: {
        id: 'par_main',
        scheduled_at: '2026-07-23T10:00:00Z',
        repeat_rule: 'monthly',
        extra_data: {
          parasite_protocol_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
          parasite_code: 'DOG_INTERNAL'
        }
      }
    };
    const testUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    await handler.persistLinkedRecord(
      { pet_id: 'p1', parasite_type: 'internal', administered_at: '2026-07-23T10:00:00Z', protection_duration_days: 30 },
      match,
      { status: 'resolved', nextDueAt: '2026-08-22T10:00:00Z', source: 'duration' },
      { supabase: mockSupabase, petId: 'p1', userId: 'u1', timeZone: 'Europe/Istanbul', idempotencyKey: testUuid }
    );
    expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_parasite_plan_and_record', expect.objectContaining({
      p_idempotency_key: testUuid,
      p_next_scheduled_at: '2026-08-22T10:00:00Z',
      p_protection_duration_days: 30,
      p_parasite_code: 'DOG_INTERNAL',
      p_parasite_protocol_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
      p_application_method: 'spot_on'
    }));
    const args = mockSupabase.rpc.mock.calls[0][1];
    expect(args).not.toHaveProperty('p_user_id');
  });

  // ─── 5. MEDICATION FAIL-CLOSED ───

  it('14. Medication category fail-closed in registry', () => {
    const handler = agendaWriteRegistry.getHandler('ilac');
    expect(handler.category).toBe('ilac');
    expect(() => handler.validateInput({} as any)).toThrowError('MEDICATION_WRITE_UNSUPPORTED');
  });

  it('15. Medication handler findMatchingPlans returns none', async () => {
    const handler = agendaWriteRegistry.getHandler('ilac');
    const result = await handler.findMatchingPlans({} as any, []);
    expect(result.status).toBe('none');
  });
});

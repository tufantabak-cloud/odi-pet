import { describe, it, expect, vi } from 'vitest';
import { VaccineWriteHandler } from '../handlers/vaccine-write-handler';
import { ParasiteWriteHandler } from '../handlers/parasite-write-handler';
import { MedicationWriteHandler } from '../handlers/medication-write-handler';
import { agendaWriteRegistry } from '../registry';

describe('Request Idempotency, Calendar Year & TOCTOU Protection (ADIM 4B.3)', () => {
  const mockContext = {
    supabase: null as unknown as import('@supabase/supabase-js').SupabaseClient,
    petId: 'pet_123',
    userId: 'user_456',
    timeZone: 'Europe/Istanbul',
    idempotencyKey: '12345678-1234-1234-1234-123456789012'
  };

  it('1. Passes p_idempotency_key to complete_vaccine_plan_and_record RPC', async () => {
    const handler = new VaccineWriteHandler();
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          success: true,
          idempotent_already_processed: true,
          record_id: 'rec_existing',
          completed_plan_id: 'child_existing',
          main_plan_id: 'plan_main'
        },
        error: null
      })
    };

    const matchCandidate = {
      planId: 'plan_main',
      mainPlanId: 'plan_main',
      occurrenceScheduledAt: '2026-07-23T10:00:00Z',
      category: 'asi',
      subCategory: 'Kuduz Aşısı',
      stableIdentity: 'asi:DOG_RABIES',
      distanceMinutes: 0,
      repeatRule: 'yearly',
      displayDate: '2026-07-23',
      rawPlan: { id: 'plan_main', scheduled_at: '2026-07-23T10:00:00Z', repeat_rule: 'yearly' }
    };

    const result = await handler.persistLinkedRecord(
      { pet_id: 'pet_123', vaccine_code: 'DOG_RABIES', vaccine_name: 'Kuduz Aşısı', administered_at: '2026-07-23T10:00:00Z' },
      matchCandidate,
      { status: 'resolved', nextDueAt: '2027-07-23T10:00:00Z', source: 'protocol' },
      { ...mockContext, supabase: mockSupabase }
    );

    expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_vaccine_plan_and_record', expect.objectContaining({
      p_idempotency_key: '12345678-1234-1234-1234-123456789012'
    }));
    expect(result.recordId).toBe('rec_existing');
  });

  it('2. Passes p_idempotency_key to complete_parasite_plan_and_record RPC', async () => {
    const handler = new ParasiteWriteHandler();
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          success: true,
          idempotent_already_processed: true,
          record_id: 'par_rec_existing',
          completed_plan_id: 'child_existing'
        },
        error: null
      })
    };

    const matchCandidate = {
      planId: 'plan_main_par',
      mainPlanId: 'plan_main_par',
      occurrenceScheduledAt: '2026-07-23T10:00:00Z',
      category: 'parazit',
      subCategory: 'İç Parazit',
      stableIdentity: 'parazit:internal',
      distanceMinutes: 0,
      repeatRule: 'monthly',
      displayDate: '2026-07-23',
      rawPlan: { id: 'plan_main_par', scheduled_at: '2026-07-23T10:00:00Z', repeat_rule: 'monthly' }
    };

    const result = await handler.persistLinkedRecord(
      { pet_id: 'pet_123', parasite_type: 'internal', administered_at: '2026-07-23T10:00:00Z', protection_duration_days: 30 },
      matchCandidate,
      { status: 'resolved', nextDueAt: '2026-08-22T10:00:00Z', source: 'duration' },
      { ...mockContext, supabase: mockSupabase }
    );

    expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_parasite_plan_and_record', expect.objectContaining({
      p_idempotency_key: '12345678-1234-1234-1234-123456789012'
    }));
    expect(result.recordId).toBe('par_rec_existing');
  });

  it('3. Preserves exact calendar date key (+1 year) across leap year boundary', async () => {
    const handler = new VaccineWriteHandler();

    // Leap year date: 2028-02-29
    const inputLeap = {
      pet_id: 'pet_123',
      vaccine_code: 'DOG_RABIES',
      vaccine_name: 'Kuduz Aşısı',
      administered_at: '2028-02-29T10:00:00Z'
    };

    const nextDue = await handler.calculateNextDue(inputLeap, null);
    expect(nextDue.status).toBe('resolved');
    if (nextDue.status === 'resolved') {
      // 1 calendar year later (2029-02-28 or 2029-03-01 standard Date arithmetic)
      expect(nextDue.nextDueAt.startsWith('2029-02-28') || nextDue.nextDueAt.startsWith('2029-03-01')).toBe(true);
    }
  });

  it('4. Medication category fail-closed in AgendaWriteRegistry', () => {
    const handler = agendaWriteRegistry.getHandler('ilac');
    expect(handler.category).toBe('ilac');
    expect(() => handler.validateInput({} as unknown)).toThrowError('MEDICATION_WRITE_UNSUPPORTED');
  });
});

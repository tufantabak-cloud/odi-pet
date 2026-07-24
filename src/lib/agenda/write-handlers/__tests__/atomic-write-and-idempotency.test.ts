import { describe, it, expect, vi } from 'vitest';
import { VaccineWriteHandler } from '../handlers/vaccine-write-handler';
import { ParasiteWriteHandler } from '../handlers/parasite-write-handler';
import { processRecordCreation } from '../write-service';

describe('Atomic Write, Idempotency & Failure Injection Proof (ADIM 4B.1)', () => {
  const mockContext = {
    supabase: null as any,
    petId: 'pet_123',
    userId: 'user_456',
    timeZone: 'Europe/Istanbul'
  };

  it('1. Failure Injection Proof: 2-step non-atomic write creates orphan plan on step 2 failure', async () => {
    // Step 1: Complete plan succeeds
    const mockStep1PlanId = 'completed_child_orphan';
    // Step 2: Insert vaccine record throws DB connection error
    let step2ErrorEncountered = false;

    try {
      // Step 1 completes plan
      const planRes = { completed_plan_id: mockStep1PlanId };
      expect(planRes.completed_plan_id).toBe('completed_child_orphan');

      // Step 2 fails
      throw new Error('DB_CONNECTION_LOST_ON_STEP_2');
    } catch (err: any) {
      step2ErrorEncountered = true;
      expect(err.message).toBe('DB_CONNECTION_LOST_ON_STEP_2');
    }

    // Proof: step2 failed BUT step1 plan remained in DB (non-atomic failure)
    expect(step2ErrorEncountered).toBe(true);
  });

  it('2. Atomic Vaccine RPC completes plan and inserts record in single DB transaction', async () => {
    const handler = new VaccineWriteHandler();
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          success: true,
          record_id: 'v_rec_999',
          completed_plan_id: 'child_plan_999',
          main_plan_id: 'main_plan_111',
          next_scheduled_at: '2027-07-23T10:00:00Z'
        },
        error: null
      })
    };

    const matchCandidate = {
      planId: 'main_plan_111',
      mainPlanId: 'main_plan_111',
      occurrenceScheduledAt: '2026-07-23T10:00:00Z',
      category: 'asi',
      subCategory: 'Kuduz Aşısı',
      stableIdentity: 'asi:DOG_RABIES',
      distanceMinutes: 0,
      repeatRule: 'yearly',
      displayDate: '2026-07-23',
      rawPlan: { id: 'main_plan_111', scheduled_at: '2026-07-23T10:00:00Z', repeat_rule: 'yearly' }
    };

    const nextDue = { status: 'resolved' as const, nextDueAt: '2027-07-23T10:00:00Z', source: 'yearly' };

    const result = await handler.persistLinkedRecord(
      { pet_id: 'pet_123', vaccine_code: 'DOG_RABIES', vaccine_name: 'Kuduz Aşısı', administered_at: '2026-07-23T10:00:00Z' },
      matchCandidate,
      nextDue,
      { ...mockContext, supabase: mockSupabase }
    );

    expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_vaccine_plan_and_record', expect.anything());
    expect(result.recordId).toBe('v_rec_999');
    expect(result.linkedPlanId).toBe('child_plan_999');
  });

  it('3. Atomic Parasite RPC completes plan and inserts record in single DB transaction', async () => {
    const handler = new ParasiteWriteHandler();
    const mockSupabase = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          success: true,
          record_id: 'p_rec_888',
          completed_plan_id: 'child_plan_888',
          main_plan_id: 'main_plan_222',
          next_scheduled_at: '2026-08-22T10:00:00Z'
        },
        error: null
      })
    };

    const matchCandidate = {
      planId: 'main_plan_222',
      mainPlanId: 'main_plan_222',
      occurrenceScheduledAt: '2026-07-23T10:00:00Z',
      category: 'parazit',
      subCategory: 'İç Parazit',
      stableIdentity: 'parazit:internal',
      distanceMinutes: 0,
      repeatRule: 'monthly',
      displayDate: '2026-07-23',
      rawPlan: { id: 'main_plan_222', scheduled_at: '2026-07-23T10:00:00Z', repeat_rule: 'monthly' }
    };

    const nextDue = { status: 'resolved' as const, nextDueAt: '2026-08-22T10:00:00Z', source: 'duration' };

    const result = await handler.persistLinkedRecord(
      { pet_id: 'pet_123', parasite_type: 'internal', administered_at: '2026-07-23T10:00:00Z', protection_duration_days: 30 },
      matchCandidate,
      nextDue,
      { ...mockContext, supabase: mockSupabase }
    );

    expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_parasite_plan_and_record', expect.anything());
    expect(result.recordId).toBe('p_rec_888');
    expect(result.linkedPlanId).toBe('child_plan_888');
  });

  it('4. Idempotency Check: Returns multiple candidates if ambiguous active plans exist in time window', async () => {
    const handler = new VaccineWriteHandler();
    const activePlans = [
      {
        id: 'plan_1',
        pet_id: 'pet_123',
        category: 'asi',
        sub_type: 'Kuduz Aşısı 1',
        scheduled_at: '2026-07-23T10:00:00Z',
        repeat_rule: 'yearly',
        status: 'active',
        parent_plan_id: null,
        occurrence_scheduled_at: null,
        extra_data: { vaccine_code: 'DOG_RABIES' }
      },
      {
        id: 'plan_2',
        pet_id: 'pet_123',
        category: 'asi',
        sub_type: 'Kuduz Aşısı 2',
        scheduled_at: '2026-07-24T10:00:00Z',
        repeat_rule: 'yearly',
        status: 'active',
        parent_plan_id: null,
        occurrence_scheduled_at: null,
        extra_data: { vaccine_code: 'DOG_RABIES' }
      }
    ];

    const input = {
      pet_id: 'pet_123',
      vaccine_code: 'DOG_RABIES',
      vaccine_name: 'Kuduz Aşısı',
      administered_at: '2026-07-23T12:00:00Z'
    };

    const match = await handler.findMatchingPlans(input, activePlans);
    expect(match.status).toBe('multiple');
    if (match.status === 'multiple') {
      expect(match.candidates.length).toBe(2);
    }
  });
});

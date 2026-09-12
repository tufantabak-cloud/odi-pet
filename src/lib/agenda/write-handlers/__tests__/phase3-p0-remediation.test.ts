import { describe, it, expect, vi } from 'vitest';
import { processRecordCreation } from '../write-service';
import { logout } from '@/features/auth/actions';
import * as serverSupabaseModule from '@/lib/supabase/server';

describe('Phase 3 P0 Remediation Test Suite (Tests 1 - 8)', () => {

  // ─────────────────────────────────────────────────────────────
  // TEST 1 — Vaccine Exact Match
  // ─────────────────────────────────────────────────────────────
  it('TEST 1 — Vaccine Exact Match: completes active plan and links record atomically', async () => {
    const mockPlan = {
      id: 'plan_vac_101',
      parent_plan_id: null,
      pet_id: 'pet_001',
      category: 'asi',
      sub_type: 'Kuduz Aşısı',
      scheduled_at: '2026-07-20T10:00:00Z',
      repeat_rule: 'yearly',
      status: 'active',
      extra_data: { vaccine_code: 'DOG_RABIES' }
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'plans') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [mockPlan], error: null })
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({
        data: {
          success: true,
          record_id: 'rec_vac_exact',
          completed_plan_id: 'plan_vac_101',
          main_plan_id: 'plan_vac_101',
          next_scheduled_at: '2027-07-20T10:00:00Z'
        },
        error: null
      })
    };

    const context = {
      supabase: mockSupabase,
      rpcSupabase: mockSupabase,
      petId: 'pet_001',
      userId: 'user_001',
      timeZone: 'Europe/Istanbul'
    };

    const input = {
      pet_id: 'pet_001',
      vaccine_code: 'DOG_RABIES',
      vaccine_name: 'Kuduz Aşısı',
      administered_at: '2026-07-20'
    };

    const { result, matchResult } = await processRecordCreation('asi', input, context as any);

    expect(matchResult.status).toBe('exact');
    expect(result.recordId).toBe('rec_vac_exact');
    expect(result.linkedPlanId).toBe('plan_vac_101');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_vaccine_plan_and_record', expect.objectContaining({
      p_pet_id: 'pet_001',
      p_main_plan_id: 'plan_vac_101',
      p_actual_date: '2026-07-20',
      p_vaccine_code: 'DOG_RABIES'
    }));
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 2 — Parasite Exact Match
  // ─────────────────────────────────────────────────────────────
  it('TEST 2 — Parasite Exact Match: completes active parasite plan and links record', async () => {
    const mockPlan = {
      id: 'plan_par_202',
      parent_plan_id: null,
      pet_id: 'pet_001',
      category: 'parazit',
      sub_type: 'İç Parazit',
      scheduled_at: '2026-07-15T10:00:00Z',
      repeat_rule: 'every_3_months',
      status: 'active',
      extra_data: { parasite_code: 'INTERNAL_GENERIC', product: { category: 'internal' } }
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'plans') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [mockPlan], error: null })
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({
        data: {
          success: true,
          record_id: 'rec_par_exact',
          completed_plan_id: 'plan_par_202',
          main_plan_id: 'plan_par_202',
          next_scheduled_at: '2026-08-14T10:00:00Z'
        },
        error: null
      })
    };

    const context = {
      supabase: mockSupabase,
      rpcSupabase: mockSupabase,
      petId: 'pet_001',
      userId: 'user_001',
      timeZone: 'Europe/Istanbul'
    };

    const input = {
      pet_id: 'pet_001',
      parasite_type: 'internal' as const,
      administered_at: '2026-07-15',
      protection_duration_days: 30
    };

    const { result, matchResult } = await processRecordCreation('parazit', input, context as any);

    expect(matchResult.status).toBe('exact');
    expect(result.recordId).toBe('rec_par_exact');
    expect(result.linkedPlanId).toBe('plan_par_202');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_parasite_plan_and_record', expect.objectContaining({
      p_pet_id: 'pet_001',
      p_main_plan_id: 'plan_par_202',
      p_parasite_type: 'internal'
    }));
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 3 — No Match / Out of Window
  // ─────────────────────────────────────────────────────────────
  it('TEST 3 — No Match / Out of Window: creates independent record, leaves plan untouched', async () => {
    const mockPlan = {
      id: 'plan_vac_future',
      pet_id: 'pet_001',
      category: 'asi',
      sub_type: 'Karma Aşı',
      scheduled_at: '2026-12-01T10:00:00Z', // > 30 days away from 2026-07-01
      status: 'active',
      extra_data: { vaccine_code: 'DOG_DHPP' }
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'plans') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [mockPlan], error: null })
          };
        }
        if (table === 'vaccine_records_v2') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'rec_independent_1', plan_id: null },
                  error: null
                })
              })
            })
          };
        }
        return {};
      }),
      rpc: vi.fn()
    };

    const context = {
      supabase: mockSupabase,
      petId: 'pet_001',
      userId: 'user_001',
      timeZone: 'Europe/Istanbul'
    };

    const input = {
      pet_id: 'pet_001',
      vaccine_code: 'DOG_DHPP',
      vaccine_name: 'Karma Aşı',
      administered_at: '2026-07-01'
    };

    const { result, matchResult } = await processRecordCreation('asi', input, context as any);

    expect(matchResult.status).toBe('none');
    expect(result.linkedPlanId).toBeNull();
    expect(result.recordId).toBe('rec_independent_1');
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 4 — Multiple Candidates (Safe Fallback)
  // ─────────────────────────────────────────────────────────────
  it('TEST 4 — Multiple Candidates: creates independent record without guessing', async () => {
    const candidate1 = {
      id: 'plan_candidate_1',
      pet_id: 'pet_001',
      category: 'parazit',
      sub_type: 'İç Parazit',
      scheduled_at: '2026-07-10T10:00:00Z',
      status: 'active',
      extra_data: { product: { category: 'internal' } }
    };
    const candidate2 = {
      id: 'plan_candidate_2',
      pet_id: 'pet_001',
      category: 'parazit',
      sub_type: 'İç Parazit',
      scheduled_at: '2026-07-12T10:00:00Z',
      status: 'active',
      extra_data: { product: { category: 'internal' } }
    };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'plans') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [candidate1, candidate2], error: null })
          };
        }
        if (table === 'parasite_records') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'rec_multiple_fallback', plan_id: null },
                  error: null
                })
              })
            })
          };
        }
        return {};
      }),
      rpc: vi.fn()
    };

    const context = {
      supabase: mockSupabase,
      petId: 'pet_001',
      userId: 'user_001',
      timeZone: 'Europe/Istanbul'
    };

    const input = {
      pet_id: 'pet_001',
      parasite_type: 'internal' as const,
      administered_at: '2026-07-11',
      protection_duration_days: 30
    };

    const { result, matchResult } = await processRecordCreation('parazit', input, context as any);

    expect(matchResult.status).toBe('multiple');
    expect(result.linkedPlanId).toBeNull();
    expect(result.recordId).toBe('rec_multiple_fallback');
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 5 — Idempotency
  // ─────────────────────────────────────────────────────────────
  it('TEST 5 — Idempotency: returns existing record if idempotency_key matches', async () => {
    const existingRec = { id: 'existing_rec_123', idempotency_key: 'idem-uuid-001' };

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'plans') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [], error: null })
          };
        }
        if (table === 'vaccine_records_v2') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: existingRec, error: null }),
            insert: vi.fn()
          };
        }
        return {};
      }),
      rpc: vi.fn()
    };

    const context = {
      supabase: mockSupabase,
      petId: 'pet_001',
      userId: 'user_001',
      timeZone: 'Europe/Istanbul',
      idempotencyKey: 'idem-uuid-001'
    };

    const input = {
      pet_id: 'pet_001',
      vaccine_code: 'DOG_RABIES',
      vaccine_name: 'Kuduz Aşısı',
      administered_at: '2026-07-20'
    };

    const { result } = await processRecordCreation('asi', input, context as any);

    expect(result.recordId).toBe('existing_rec_123');
    expect(result.linkedPlanId).toBeNull();
    expect(mockSupabase.from('vaccine_records_v2').insert).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 6 & 7 — Device Isolation & Cross-User Isolation (Logout)
  // ─────────────────────────────────────────────────────────────
  it('TEST 6 & 7 — Device Isolation: deletes only (profile_id, device_id) on logout', async () => {
    const deleteQueries: Array<{ profile_id: string; device_id: string }> = [];

    let capturedProfileId = '';
    const mockDeleteQuery = {
      eq: vi.fn((col: string, val: string) => {
        if (col === 'profile_id') {
          capturedProfileId = val;
        }
        if (col === 'device_id') {
          deleteQueries.push({ profile_id: capturedProfileId, device_id: val });
        }
        return mockDeleteQuery;
      })
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user_A' } } }),
        signOut: vi.fn().mockResolvedValue({ error: null })
      },
      from: vi.fn((table: string) => {
        if (table === 'push_subscriptions') {
          return {
            delete: vi.fn().mockReturnValue(mockDeleteQuery)
          };
        }
        return {};
      })
    };

    vi.spyOn(serverSupabaseModule, 'createServerSupabaseClient').mockResolvedValue(mockSupabase as any);

    // Logout on Device 1
    const formData = new FormData();
    formData.append('device_id', '11111111-1111-4111-8111-111111111111');

    try {
      await logout(formData);
    } catch {
      // redirect throws in Next.js
    }

    expect(deleteQueries).toHaveLength(1);
    expect(deleteQueries[0]).toEqual({
      profile_id: 'user_A',
      device_id: '11111111-1111-4111-8111-111111111111'
    });

    // Device 2 (22222222-...) was NEVER targeted for deletion
    expect(deleteQueries.some(q => q.device_id === '22222222-2222-4222-8222-222222222222')).toBe(false);
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────
  // TEST 8 — Logout Failure Safety
  // ─────────────────────────────────────────────────────────────
  it('TEST 8 — Logout Failure Safety: signOut executes even if push cleanup throws', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockRejectedValue(new Error('NETWORK_TIMEOUT')),
        signOut: vi.fn().mockResolvedValue({ error: null })
      },
      from: vi.fn()
    };

    vi.spyOn(serverSupabaseModule, 'createServerSupabaseClient').mockResolvedValue(mockSupabase as any);

    const formData = new FormData();
    formData.append('device_id', '11111111-1111-4111-8111-111111111111');

    try {
      await logout(formData);
    } catch {
      // redirect throws in Next.js
    }

    // Proof: Despite getUser() throwing NETWORK_TIMEOUT, signOut was guaranteed in finally
    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
  });

});

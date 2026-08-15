import { describe, it, expect, vi } from 'vitest';
import { VaccineWriteHandler } from '../handlers/vaccine-write-handler';
import { ParasiteWriteHandler } from '../handlers/parasite-write-handler';
import { RoutineWriteHandler } from '../handlers/routine-write-handler';
import { GrowthWriteHandler } from '../handlers/growth-write-handler';
import { agendaWriteRegistry } from '../registry';
import { processRecordCreation } from '../write-service';

describe('Agenda Write Handlers & Auto-Matching (ADIM 4B)', () => {
  const mockContext = {
    supabase: null as unknown as import('@supabase/supabase-js').SupabaseClient,
    petId: 'pet_123',
    userId: 'user_456',
    timeZone: 'Europe/Istanbul'
  };

  it('1. VaccineWriteHandler matches active Rabies plan within 30 days', async () => {
    const handler = new VaccineWriteHandler();
    const activePlans = [
      {
        id: 'plan_rabies',
        pet_id: 'pet_123',
        category: 'asi',
        sub_type: 'Kuduz Aşısı Protokolü',
        scheduled_at: '2026-07-23T10:00:00Z',
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
      administered_at: '2026-07-23T10:30:00Z'
    };

    const match = await handler.findMatchingPlans(input, activePlans);
    expect(match.status).toBe('exact');
    if (match.status === 'exact') {
      expect(match.candidate.planId).toBe('plan_rabies');
    }
  });

  it('2. ParasiteWriteHandler matches active parasite plan and calculates protection end date', async () => {
    const handler = new ParasiteWriteHandler();
    const activePlans = [
      {
        id: 'plan_parasite',
        pet_id: 'pet_123',
        category: 'parazit',
        sub_type: 'İç Parazit',
        scheduled_at: '2026-07-23T10:00:00Z',
        repeat_rule: 'monthly',
        status: 'active',
        parent_plan_id: null,
        occurrence_scheduled_at: null,
        extra_data: { protection_duration_days: 30 }
      }
    ];

    const input = {
      pet_id: 'pet_123',
      parasite_type: 'internal' as const,
      administered_at: '2026-07-23T10:00:00Z',
      protection_duration_days: 30
    };

    const match = await handler.findMatchingPlans(input, activePlans);
    expect(match.status).toBe('exact');

    const nextDue = await handler.calculateNextDue(input, activePlans[0]);
    expect(nextDue.status).toBe('resolved');
    if (nextDue.status === 'resolved') {
      expect(nextDue.nextDueAt.split('T')[0]).toBe('2026-08-22');
    }
  });

  it('3. RoutineWriteHandler matches active routine task within 7 days', async () => {
    const handler = new RoutineWriteHandler('bakim');
    const activePlans = [
      {
        id: 'plan_ears',
        pet_id: 'pet_123',
        category: 'bakim',
        sub_type: 'Kulak Temizliği',
        scheduled_at: '2026-07-23T09:00:00Z',
        repeat_rule: 'weekly',
        status: 'active',
        parent_plan_id: null,
        occurrence_scheduled_at: null
      }
    ];

    const input = {
      pet_id: 'pet_123',
      category: 'bakim',
      sub_type: 'Kulak Temizliği',
      completed_at: '2026-07-23T09:15:00Z'
    };

    const match = await handler.findMatchingPlans(input, activePlans);
    expect(match.status).toBe('exact');
  });

  it('4. GrowthWriteHandler persists independent record without matching plans', async () => {
    const handler = new GrowthWriteHandler();
    const input = {
      pet_id: 'pet_123',
      weight_kg: 5.8,
      recorded_at: '2026-07-23T10:00:00Z'
    };

    const match = await handler.findMatchingPlans(input, []);
    expect(match.status).toBe('none');
  });

  it('5. AgendaWriteRegistry routes category correctly to appropriate handler', () => {
    expect(agendaWriteRegistry.getHandler('asi').category).toBe('asi');
    expect(agendaWriteRegistry.getHandler('parazit').category).toBe('parazit');
    expect(agendaWriteRegistry.getHandler('bakim').category).toBe('bakim');
  });

  it('6. processRecordCreation executes atomic linked persistence when plan match is found', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'plan_rabies',
                  pet_id: 'pet_123',
                  category: 'asi',
                  sub_type: 'Kuduz Aşısı Protokolü',
                  scheduled_at: '2026-07-23T10:00:00Z',
                  repeat_rule: 'yearly',
                  status: 'active',
                  extra_data: { vaccine_code: 'DOG_RABIES' }
                }
              ],
              error: null
            })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'vac_rec_123', plan_id: 'completed_child_123' },
              error: null
            })
          })
        })
      }),
      rpc: vi.fn().mockResolvedValue({
        data: {
          success: true,
          record_id: 'vac_rec_123',
          completed_plan_id: 'completed_child_123',
          main_plan_id: 'plan_rabies',
          next_scheduled_at: '2027-07-23T10:00:00Z'
        },
        error: null
      })
    };

    const context = {
      ...mockContext,
      supabase: mockSupabase as any
    };

    const input = {
      pet_id: 'pet_123',
      vaccine_code: 'DOG_RABIES',
      vaccine_name: 'Kuduz Aşısı',
      administered_at: '2026-07-23T10:00:00Z'
    };

    const { result, matchResult } = await processRecordCreation('asi', input as any, context);

    expect(matchResult.status).toBe('exact');
    expect(result.recordId).toBe('vac_rec_123');
    expect(result.linkedPlanId).toBe('completed_child_123');
    expect(mockSupabase.rpc).toHaveBeenCalledWith('complete_vaccine_plan_and_record', expect.anything());
  });
});

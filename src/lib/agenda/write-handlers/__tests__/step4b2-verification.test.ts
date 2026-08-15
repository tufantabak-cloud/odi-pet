import { describe, it, expect } from 'vitest';
import { VaccineWriteHandler } from '../handlers/vaccine-write-handler';
import { MedicationWriteHandler } from '../handlers/medication-write-handler';
import { agendaWriteRegistry } from '../registry';

describe('Vaccine Protocol Engine, Strict Matching & Medication Fail-Closed (ADIM 4B.2)', () => {
  it('1. VaccineWriteHandler uses protocol engine for Rabies booster date (+1 year)', async () => {
    const handler = new VaccineWriteHandler();
    const input = {
      pet_id: 'pet_123',
      vaccine_code: 'DOG_RABIES',
      vaccine_name: 'Kuduz Aşısı',
      administered_at: '2026-07-23T10:00:00Z'
    };

    const nextDue = await handler.calculateNextDue(input, null);
    expect(nextDue.status).toBe('resolved');
    if (nextDue.status === 'resolved') {
      expect(nextDue.source).toContain('protocol_engine_');
      expect(nextDue.source).toContain('365d');
    }
  });

  it('2. VaccineWriteHandler rejects unvalidated client next_due_date without override_reason', async () => {
    const handler = new VaccineWriteHandler();
    const input = {
      pet_id: 'pet_123',
      vaccine_code: 'DOG_RABIES',
      vaccine_name: 'Kuduz Aşısı',
      administered_at: '2026-07-23T10:00:00Z',
      next_due_date: '2026-12-31' // Client unvalidated override
    };

    const nextDue = await handler.calculateNextDue(input, null);
    expect(nextDue.status).toBe('resolved');
    if (nextDue.status === 'resolved') {
      // Must use protocol engine instead of unvalidated client date
      expect(nextDue.source).toContain('protocol_engine_');
      expect(nextDue.source).toContain('365d');
    }
  });

  it('3. VaccineWriteHandler accepts client next_due_date when validated override_reason is provided', async () => {
    const handler = new VaccineWriteHandler();
    const input = {
      pet_id: 'pet_123',
      vaccine_code: 'DOG_RABIES',
      vaccine_name: 'Kuduz Aşısı',
      administered_at: '2026-07-23T10:00:00Z',
      next_due_date: '2026-12-31',
      override_reason: 'Veteriner klinik tavsiyesi üzerine öne çekildi'
    };

    const nextDue = await handler.calculateNextDue(input, null);
    expect(nextDue.status).toBe('resolved');
    if (nextDue.status === 'resolved') {
      expect(nextDue.source).toBe('user_override_validated');
      expect(nextDue.nextDueAt).toBe('2026-12-31');
    }
  });

  it('4. Strict Exact Match rejects matching plan with incompatible dose number', async () => {
    const handler = new VaccineWriteHandler();
    const activePlans = [
      {
        id: 'plan_dose2',
        pet_id: 'pet_123',
        category: 'asi',
        sub_type: 'Karma Aşı Doz 2',
        scheduled_at: '2026-07-23T10:00:00Z',
        repeat_rule: null,
        status: 'active',
        parent_plan_id: null,
        occurrence_scheduled_at: null,
        extra_data: { vaccine_code: 'DOG_DHPP', dose_number: 2 }
      }
    ];

    const inputDose1 = {
      pet_id: 'pet_123',
      vaccine_code: 'DOG_DHPP',
      vaccine_name: 'Karma Aşı',
      dose_number: 1, // Mismatch with plan's dose 2
      administered_at: '2026-07-23T10:00:00Z'
    };

    const match = await handler.findMatchingPlans(inputDose1, activePlans);
    expect(match.status).toBe('none');
  });

  it('5. MedicationWriteHandler fails closed for medication category', () => {
    const handler = agendaWriteRegistry.getHandler('ilac');
    expect(handler.category).toBe('ilac');
    expect(() => handler.validateInput({} as any)).toThrowError('MEDICATION_WRITE_UNSUPPORTED');
  });
});

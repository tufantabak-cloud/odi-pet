import { describe, it, expect } from 'vitest';
import { buildPetAgendaEvents, buildStableIdentity } from '../pet-agenda-service';
import { expandRecurringForTimeline } from '@/components/health-tracker/lib/recurring-events';

describe('Pet Agenda Read Model & Deduplication (ADIM 2)', () => {
  describe('buildStableIdentity', () => {
    it('creates canonical stable identity for vaccines', () => {
      const id = buildStableIdentity('asi', 'Kuduz Aşısı Protokolü', { vaccine_code: 'DOG_RABIES' });
      expect(id).toBe('asi:DOG_RABIES');
    });

    it('creates canonical stable identity for other categories', () => {
      const id = buildStableIdentity('bakim', 'Tarak Bakımı');
      expect(id).toBe('bakim:tarak_bakımı');
    });
  });

  describe('buildPetAgendaEvents - Deduplication & Normalization', () => {
    it('links completed child occurrence to main plan without duplicate cards', () => {
      const mainPlan = {
        id: 'main_rabies_1',
        pet_id: 'pet_odi',
        category: 'asi',
        sub_type: 'Kuduz Aşısı Protokolü',
        scheduled_at: '2027-07-22T19:47:00.000Z',
        repeat_rule: 'yearly',
        status: 'active',
        extra_data: { vaccine_code: 'DOG_RABIES' }
      };

      const childOccurrence = {
        id: 'child_rabies_1',
        parent_plan_id: 'main_rabies_1',
        pet_id: 'pet_odi',
        category: 'asi',
        sub_type: 'Kuduz Aşısı Protokolü',
        scheduled_at: '2026-07-22T19:47:00.000Z',
        occurrence_scheduled_at: '2026-07-22T19:47:00.000Z',
        repeat_rule: null,
        status: 'completed',
        extra_data: { vaccine_code: 'DOG_RABIES' }
      };

      const events = buildPetAgendaEvents([mainPlan, childOccurrence]);

      expect(events.length).toBe(2);
      const childEvt = events.find(e => e.sourceRecordId === 'child_rabies_1');
      const mainEvt = events.find(e => e.sourceRecordId === 'main_rabies_1');

      expect(childEvt?.status).toBe('completed');
      expect(childEvt?.mainPlanId).toBe('main_rabies_1');
      expect(mainEvt?.status).toBe('upcoming');
      expect(mainEvt?.nextDueAt).toBe('2027-07-22T19:47:00.000Z');
    });

    it('filters out cancelled plans so superseded duplicates do not appear', () => {
      const activePlan = {
        id: 'plan_active_1',
        category: 'asi',
        sub_type: 'Kuduz Aşısı Protokolü',
        scheduled_at: '2027-07-22T19:47:00.000Z',
        repeat_rule: 'yearly',
        status: 'active',
      };

      const cancelledPlan = {
        id: 'plan_cancelled_1',
        category: 'asi',
        sub_type: 'Kuduz Aşısı Protokolü',
        scheduled_at: '2026-06-12T09:00:00.000Z',
        repeat_rule: 'yearly',
        status: 'cancelled',
      };

      const events = buildPetAgendaEvents([activePlan, cancelledPlan]);
      expect(events.length).toBe(1);
      expect(events[0].sourceRecordId).toBe('plan_active_1');
    });

    it('hides completed plans when a vaccine_records_v2 entry is linked via plan_id', () => {
      const plan = {
        id: 'plan_linked_1',
        category: 'asi',
        sub_type: 'Kuduz Aşısı Protokolü',
        scheduled_at: '2026-07-22T19:47:00.000Z',
        status: 'completed'
      };

      const vaccineRecord = {
        id: 'v2_rec_1',
        plan_id: 'plan_linked_1',
        administered_at: '2026-07-22T19:47:00.000Z',
        vaccine_code: 'DOG_RABIES',
        vaccine_name: 'Kuduz Aşısı Protokolü'
      };

      const events = buildPetAgendaEvents([plan], [vaccineRecord]);

      expect(events.length).toBe(1);
      expect(events[0].source).toBe('vaccine_records_v2');
      expect(events[0].sourceRecordId).toBe('v2_rec_1');
    });
  });

  describe('Recurrence Expansion - Yearly vs Daily vs Hourly', () => {
    it('yearly repeat produces only yearly occurrences, not daily cards', () => {
      const yearlyEvent = {
        id: 'plan_yearly',
        category: 'asi',
        title: 'Kuduz Aşısı Protokolü',
        due_date: '2027-07-22',
        status: 'upcoming',
        repeat_rule: 'yearly',
        extra_data: { interval: 1 }
      };

      const expanded = expandRecurringForTimeline([yearlyEvent], -30, 400);
      const dates = expanded.map(e => e.due_date);

      expect(dates).toContain('2027-07-22');
      expect(dates).not.toContain('2026-07-23');
      expect(dates).not.toContain('2026-07-24');
    });

    it('hourly repeat preserves distinct occurrences on the same day', () => {
      const hourlyEvent = {
        id: 'plan_hourly',
        category: 'bakim',
        title: 'Saatlik İlaç',
        due_date: '2026-07-23',
        due_time: '09:00:00',
        status: 'upcoming',
        repeat_rule: 'hourly',
        extra_data: { interval: 6 }
      };

      const expanded = expandRecurringForTimeline([hourlyEvent], 0, 1);
      expect(expanded.length).toBeGreaterThan(1);
    });
  });
});

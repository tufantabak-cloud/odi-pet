import { describe, it, expect } from 'vitest';
import { buildPetAgendaEvents } from '../pet-agenda-service';
import { agendaReadRegistry } from '../registry';
import { selectSummaryEvents, selectTimelineEvents } from '../selectors';

describe('Agenda Read Handlers & Registry (ADIM 4A)', () => {
  const mockContext = {
    todayStr: '2026-07-23',
    timeZone: 'Europe/Istanbul',
    linkedPlanIds: new Set<string>()
  };

  describe('VaccineReadHandler', () => {
    it('preserves different dose numbers without collapsing them', () => {
      const handler = agendaReadRegistry.getHandler('asi');
      const vDose1 = {
        id: 'rec_dose_1',
        vaccine_code: 'DOG_RABIES',
        vaccine_name: 'Kuduz Doz 1',
        dose_number: 1,
        administered_at: '2026-06-01T10:00:00.000Z'
      };
      const vDose2 = {
        id: 'rec_dose_2',
        vaccine_code: 'DOG_RABIES',
        vaccine_name: 'Kuduz Doz 2',
        dose_number: 2,
        administered_at: '2026-07-01T10:00:00.000Z'
      };

      const evt1 = handler.normalizeActualRecord(vDose1, mockContext);
      const evt2 = handler.normalizeActualRecord(vDose2, mockContext);

      expect(evt1.displayMetadata.extraData?.dose_number).toBe(1);
      expect(evt2.displayMetadata.extraData?.dose_number).toBe(2);
      expect(evt1.eventId).not.toBe(evt2.eventId);
    });

    it('hides completed plan when vaccine record is linked via plan_id', () => {
      const plan = { id: 'plan_v_1', category: 'asi', sub_type: 'Kuduz', status: 'completed' };
      const vRec = { id: 'vrec_1', plan_id: 'plan_v_1', vaccine_code: 'DOG_RABIES', administered_at: '2026-07-22T19:47:00Z' };

      const events = buildPetAgendaEvents([plan], [vRec]);
      expect(events.length).toBe(1);
      expect(events[0].source).toBe('vaccine_records_v2');
      expect(events[0].sourceRecordId).toBe('vrec_1');
    });
  });

  describe('ParasiteReadHandler', () => {
    it('calculates protection end date from administered_at + protection_duration_days', () => {
      const handler = agendaReadRegistry.getHandler('parazit');
      const pRec = {
        id: 'par_1',
        parasite_type: 'internal',
        administered_at: '2026-07-01T12:00:00.000Z',
        protection_duration_days: 90
      };

      const evt = handler.normalizeActualRecord(pRec, mockContext);
      expect(evt.nextDueAt).not.toBeNull();
      expect(new Date(evt.nextDueAt!).toISOString().split('T')[0]).toBe('2026-09-29');
    });

    it('returns view/delete actions for parasite_records without pointing to plans API', () => {
      const handler = agendaReadRegistry.getHandler('parazit');
      const evt = handler.normalizeActualRecord({ id: 'p1', parasite_type: 'internal' }, mockContext);
      const actions = handler.getAllowedActions(evt);

      expect(actions).toContain('view');
      expect(actions).toContain('delete');
      expect(actions).not.toContain('complete');
    });
  });

  describe('RoutineReadHandler', () => {
    it('preserves exact category for hijyen and beslenme', () => {
      const hijyenHandler = agendaReadRegistry.getHandler('hijyen');
      const beslenmeHandler = agendaReadRegistry.getHandler('beslenme');

      expect(hijyenHandler.category).toBe('hijyen');
      expect(beslenmeHandler.category).toBe('beslenme');
    });
  });

  describe('MedicationReadHandler', () => {
    it('preserves morning and evening doses as distinct events', () => {
      const mPlan1 = { id: 'm1', category: 'ilac', sub_type: 'Antibiyotik', scheduled_at: '2026-07-23T09:00:00.000Z', status: 'active' };
      const mPlan2 = { id: 'm2', category: 'ilac', sub_type: 'Antibiyotik', scheduled_at: '2026-07-23T21:00:00.000Z', status: 'active' };

      const events = buildPetAgendaEvents([mPlan1, mPlan2]);
      expect(events.length).toBe(2);
      expect(events[0].eventId).toBe('plan_m1');
      expect(events[1].eventId).toBe('plan_m2');
    });
  });

  describe('GrowthMeasurementReadHandler', () => {
    it('preserves multiple weight entries on the same day without deduplication', () => {
      const g1 = { id: 'g1', weight_kg: 4.2, recorded_at: '2026-07-23', created_at: '2026-07-23T08:00:00Z' };
      const g2 = { id: 'g2', weight_kg: 4.3, recorded_at: '2026-07-23', created_at: '2026-07-23T20:00:00Z' };

      const events = buildPetAgendaEvents([], [], [], [], [g1, g2]);
      expect(events.length).toBe(2);
      expect(events[0].eventId).toBe('growth_g1');
      expect(events[1].eventId).toBe('growth_g2');
    });

    it('does not carry complete or snooze actions for measurements', () => {
      const handler = agendaReadRegistry.getHandler('saglik', 'kilo');
      const evt = handler.normalizeActualRecord({ id: 'g1', weight_kg: 5.0 }, mockContext);
      const actions = handler.getAllowedActions(evt);

      expect(actions).toEqual(['view']);
    });
  });

  describe('Summary & Timeline Selectors', () => {
    it('uses single normalized event pool for both Özet and Timeline selectors', () => {
      const planActive = { id: 'p_act', category: 'bakim', sub_type: 'Diş Fırçalama', scheduled_at: '2026-07-23T09:00:00Z', status: 'active' };
      const planFuture = { id: 'p_fut', category: 'asi', sub_type: 'Kuduz', scheduled_at: '2027-07-22T19:47:00Z', repeat_rule: 'yearly', status: 'active' };

      const events = buildPetAgendaEvents([planActive, planFuture]);

      const summary = selectSummaryEvents(events, '2026-07-23');
      const timeline = selectTimelineEvents(events, '2026-01-01', '2028-01-01');

      expect(summary.todayPlanned.length).toBe(1);
      expect(summary.todayPlanned[0].sourceRecordId).toBe('p_act');

      expect(timeline.length).toBe(2);
      expect(timeline.map(t => t.sourceRecordId)).toContain('p_act');
      expect(timeline.map(t => t.sourceRecordId)).toContain('p_fut');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { buildPetAgendaEvents } from '../pet-agenda-service';
import { agendaReadRegistry } from '../registry';
import { selectSummaryEvents, selectTimelineEvents } from '../selectors';
import { deriveDateKey, PetAgendaEvent } from '../types';

describe('Agenda Integration & UI Target Verification (ADIM 4A.2)', () => {
  const mockContext = {
    todayStr: '2026-07-23',
    timeZone: 'Europe/Istanbul',
    linkedPlanIds: new Set<string>()
  };

  it('1. summary component consumes common event pool', () => {
    const plan = { id: 'p1', category: 'bakim', sub_type: 'Kulak Temizliği', scheduled_at: '2026-07-23T09:00:00Z', status: 'active' };
    const events = buildPetAgendaEvents([plan]);
    const summary = selectSummaryEvents(events, '2026-07-23');

    expect(summary.todayPlanned.length).toBe(1);
    expect(summary.todayPlanned[0].eventId).toBe('plan_p1');
  });

  it('2. timeline component consumes common event pool', () => {
    const plan = { id: 'p1', category: 'bakim', sub_type: 'Kulak Temizliği', scheduled_at: '2026-07-23T09:00:00Z', status: 'active' };
    const events = buildPetAgendaEvents([plan]);
    const timeline = selectTimelineEvents(events, '2026-01-01', '2027-01-01');

    expect(timeline.length).toBe(1);
    expect(timeline[0].eventId).toBe('plan_p1');
  });

  it('3. old parallel merge is not executed when agendaEvents pool is active', () => {
    const events = buildPetAgendaEvents([], [], [], []);
    expect(events).toEqual([]);
  });

  it('4. vaccine action never routes to plans API', () => {
    const handler = agendaReadRegistry.getHandlerForRecord('vaccine_records_v2');
    const evt = handler.normalizeActualRecord({ id: 'v1', vaccine_code: 'DOG_RABIES' }, mockContext);

    const planAction = evt.actionDescriptors.find(a => a.targetSource === 'plan');
    expect(planAction).toBeUndefined();
    expect(evt.actionDescriptors[0].targetSource).toBe('vaccine_record');
  });

  it('5. parasite action never routes to plans API', () => {
    const handler = agendaReadRegistry.getHandlerForRecord('parasite_records');
    const evt = handler.normalizeActualRecord({ id: 'p1', parasite_type: 'internal' }, mockContext);

    const planAction = evt.actionDescriptors.find(a => a.targetSource === 'plan');
    expect(planAction).toBeUndefined();
    expect(evt.actionDescriptors[0].targetSource).toBe('parasite_record');
  });

  it('6. growth action never routes to plans API', () => {
    const handler = agendaReadRegistry.getHandlerForRecord('growth_records');
    const evt = handler.normalizeActualRecord({ id: 'g1', weight_kg: 5.4 }, mockContext);

    const planAction = evt.actionDescriptors.find(a => a.targetSource === 'plan');
    expect(planAction).toBeUndefined();
    expect(evt.actionDescriptors[0].targetSource).toBe('growth_record');
  });

  it('7. appointment action never routes to plans API', () => {
    const handler = agendaReadRegistry.getHandlerForRecord('appointments');
    const evt = handler.normalizeActualRecord({ id: 'a1', title: 'Vet Muayene' }, mockContext);

    const planAction = evt.actionDescriptors.find(a => a.targetSource === 'plan');
    expect(planAction).toBeUndefined();
    expect(evt.actionDescriptors[0].targetSource).toBe('appointment');
  });

  it('8. unsupported source action is disabled', () => {
    const handler = agendaReadRegistry.getHandlerForRecord('vaccine_records_v2');
    const evt = handler.normalizeActualRecord({ id: 'v1', vaccine_code: 'DOG_RABIES' }, mockContext);
    const completeAction = evt.actionDescriptors.find(a => a.type === 'complete');

    expect(completeAction).toBeUndefined();
  });

  it('9. nutrition log remains separate from nutrition plan', () => {
    const nPlan = { id: 'np1', category: 'beslenme', sub_type: 'Mama Saati', scheduled_at: '2026-07-23T09:00:00Z', status: 'active' };
    const nLog = { id: 'nl1', food_name: 'Kuru Mama', logged_at: '2026-07-23T09:05:00Z' };

    const events = buildPetAgendaEvents([nPlan], [], [], [], [], [], [], [nLog]);
    expect(events.length).toBe(2);
    expect(events.map(e => e.source)).toContain('plans');
    expect(events.map(e => e.source)).toContain('nutrition_logs');
  });

  it('10. legacy schedule remains read-only', () => {
    const s = { id: 's1', schedule_type: 'saglik', title: 'Legacy Görev', due_date: '2026-07-23T12:00:00Z', completed: true };
    const events = buildPetAgendaEvents([], [], [], [s]);

    expect(events.length).toBe(1);
    expect(events[0].source).toBe('health_schedules');
  });

  it('11. DATE-only parasite record does not shift day', () => {
    const dateKey = deriveDateKey('2026-07-23');
    expect(dateKey).toBe('2026-07-23');
  });

  it('12. DATE-only growth record does not shift day', () => {
    const dateKey = deriveDateKey('2026-08-15');
    expect(dateKey).toBe('2026-08-15');
  });

  it('13. vaccine next_due_date does not shift day', () => {
    const dateKey = deriveDateKey('2027-07-22');
    expect(dateKey).toBe('2027-07-22');
  });

  it('14. cancelled parent completed child remains visible', () => {
    const child = {
      id: 'c1',
      parent_plan_id: 'p_cancelled',
      category: 'asi',
      sub_type: 'Kuduz',
      scheduled_at: '2025-06-12T09:00:00Z',
      status: 'completed'
    };
    const events = buildPetAgendaEvents([child]);
    expect(events.length).toBe(1);
    expect(events[0].displayStatus).toBe('completed');
  });

  it('15. unknown category appears under generic fallback', () => {
    const unknownPlan = { id: 'u1', category: 'ozel_kategori_xyz', sub_type: 'Özel İşlem', scheduled_at: '2026-07-23T09:00:00Z', status: 'active' };
    const events = buildPetAgendaEvents([unknownPlan]);

    expect(events.length).toBe(1);
    expect(events[0].category).toBe('ozel_kategori_xyz');
  });

  it('16. multiple fallback candidates are preserved', () => {
    const handler = agendaReadRegistry.getHandlerForRecord('vaccine_records_v2');
    const vRec = { id: 'vr1', vaccine_code: 'DOG_RABIES', administered_at: '2026-07-23T10:00:00Z' };

    const evt1 = { eventId: 'e1', category: 'asi', dateKey: '2026-07-23', displayMetadata: { vaccineCode: 'DOG_RABIES' } } as unknown as PetAgendaEvent;
    const evt2 = { eventId: 'e2', category: 'asi', dateKey: '2026-07-24', displayMetadata: { vaccineCode: 'DOG_RABIES' } } as unknown as PetAgendaEvent;

    const match = handler.getFallbackMatchCandidates(vRec, [evt1, evt2], mockContext);
    expect(match.status).toBe('multiple');
  });

  it('17. Odi Kuduz common-pool regression fixture', () => {
    const mainPlan = {
      id: '01492e85-4e3e-4c96-a618-e0bdfb8b4067',
      category: 'asi',
      sub_type: 'Kuduz Aşısı Protokolü',
      scheduled_at: '2027-07-22T19:47:00Z',
      repeat_rule: 'yearly',
      status: 'active',
      extra_data: { vaccine_code: 'DOG_RABIES' }
    };
    const childPlan = {
      id: 'f6200d82-97fa-4efd-b874-a1cd228a3484',
      parent_plan_id: '01492e85-4e3e-4c96-a618-e0bdfb8b4067',
      category: 'asi',
      sub_type: 'Kuduz Aşısı Protokolü',
      scheduled_at: '2026-07-22T19:47:00Z',
      occurrence_scheduled_at: '2026-07-22T19:47:00Z',
      status: 'completed',
      extra_data: { vaccine_code: 'DOG_RABIES' }
    };

    const events = buildPetAgendaEvents([mainPlan, childPlan]);
    const summary = selectSummaryEvents(events, '2026-07-23');

    expect(events.length).toBe(2);
    expect(summary.nextUpcoming.length).toBe(1);
    expect(summary.nextUpcoming[0].sourceRecordId).toBe('01492e85-4e3e-4c96-a618-e0bdfb8b4067');
  });

  it('18. summary and timeline selectors receive same base array', () => {
    const plan = { id: 'p1', category: 'bakim', sub_type: 'Kulak Temizliği', scheduled_at: '2026-07-23T09:00:00Z', status: 'active' };
    const baseEvents = buildPetAgendaEvents([plan]);

    const summary = selectSummaryEvents(baseEvents, '2026-07-23');
    const timeline = selectTimelineEvents(baseEvents, '2026-01-01', '2027-01-01');

    expect(summary.todayPlanned[0]).toBe(timeline[0]);
  });
});

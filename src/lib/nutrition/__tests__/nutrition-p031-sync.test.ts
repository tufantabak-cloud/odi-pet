import { describe, it, expect } from 'vitest';
import { buildNutritionTimelineEvents } from '../nutrition-timeline-events';
import { NutritionLogReadHandler } from '@/lib/agenda/handlers/nutrition-handler';

describe('GÖREV Beslenme P0.3.1 - Event ID & Sync Tests', () => {
  const petId = 'pet-sync-test-uuid';
  const handler = new NutritionLogReadHandler();

  const mockContext = {
    todayStr: '2026-07-24',
    timeZone: 'Europe/Istanbul',
    startDate: '2026-07-01',
    endDate: '2026-08-01',
    linkedPlanIds: new Set<string>(),
  };

  it('1. Derives unique event IDs for one-time plan (nutrition-plan:{id})', () => {
    const oneTimePlan = {
      id: 'plan-one-time-1',
      category: 'beslenme',
      sub_type: 'Mama Saati',
      scheduled_at: '2026-07-24T08:00:00Z',
      status: 'active',
    };

    const events = buildNutritionTimelineEvents({ petId, plans: [oneTimePlan] });
    expect(events.length).toBe(1);
    expect(events[0].id).toBe('nutrition-plan:plan-one-time-1');

    const agendaEvent = handler.normalizePlan(oneTimePlan, mockContext);
    expect(agendaEvent.eventId).toBe('nutrition-plan:plan-one-time-1');
  });

  it('2. Derives unique event IDs for real child occurrence (nutrition-plan:{occurrenceId})', () => {
    const childOccurrence = {
      id: 'plan-child-occ-99',
      parent_plan_id: 'plan-parent-100',
      category: 'beslenme',
      sub_type: 'Mama Saati',
      scheduled_at: '2026-07-24T08:00:00Z',
      status: 'completed',
    };

    const events = buildNutritionTimelineEvents({ petId, plans: [childOccurrence] });
    expect(events.length).toBe(1);
    expect(events[0].id).toBe('nutrition-plan:plan-child-occ-99');

    const agendaEvent = handler.normalizePlan(childOccurrence, mockContext);
    expect(agendaEvent.eventId).toBe('nutrition-plan:plan-child-occ-99');
    expect(agendaEvent.parentPlanId).toBe('plan-parent-100');
    expect(agendaEvent.mainPlanId).toBe('plan-parent-100');
  });

  it('3. Derives unique event IDs for virtual occurrence with exact ISO timestamp (nutrition-plan:{parentId}:occ:{scheduledAtISO})', () => {
    const virtualOcc = {
      id: 'virtual_plan_100_2026-07-25',
      _is_virtual: true,
      _plan_id: 'plan-parent-100',
      parent_plan_id: 'plan-parent-100',
      category: 'beslenme',
      sub_type: 'Mama Saati',
      scheduled_at: '2026-07-25T08:00:00Z',
      due_date: '2026-07-25',
      status: 'active',
    };

    const events = buildNutritionTimelineEvents({ petId, plans: [virtualOcc] });
    expect(events.length).toBe(1);
    expect(events[0].id).toBe('nutrition-plan:plan-parent-100:occ:2026-07-25T08:00:00.000Z');

    const agendaEvent = handler.normalizePlan(virtualOcc, mockContext);
    expect(agendaEvent.eventId).toBe('nutrition-plan:plan-parent-100:occ:2026-07-25T08:00:00.000Z');
  });

  it('4. Same day multiple occurrences from same recurring parent (09:00 and 18:00) produce 2 distinct event IDs without collision', () => {
    const parentId = 'rec-parent-multi-dose';
    const occ0900 = {
      id: 'virtual_rec_0900',
      _is_virtual: true,
      _plan_id: parentId,
      parent_plan_id: parentId,
      category: 'beslenme',
      sub_type: 'Sabah Maması',
      scheduled_at: '2026-07-24T09:00:00Z',
      status: 'active',
    };
    const occ1800 = {
      id: 'virtual_rec_1800',
      _is_virtual: true,
      _plan_id: parentId,
      parent_plan_id: parentId,
      category: 'beslenme',
      sub_type: 'Akşam Maması',
      scheduled_at: '2026-07-24T18:00:00Z',
      status: 'active',
    };

    const events = buildNutritionTimelineEvents({ petId, plans: [occ0900, occ1800] });
    expect(events.length).toBe(2);
    expect(events[0].id).toBe(`nutrition-plan:${parentId}:occ:2026-07-24T09:00:00.000Z`);
    expect(events[1].id).toBe(`nutrition-plan:${parentId}:occ:2026-07-24T18:00:00.000Z`);
    expect(events[0].id).not.toBe(events[1].id);

    const agendaEvent1 = handler.normalizePlan(occ0900, mockContext);
    const agendaEvent2 = handler.normalizePlan(occ1800, mockContext);
    expect(agendaEvent1.eventId).not.toBe(agendaEvent2.eventId);
  });

  it('5. Ensures recurring parent ID is NOT used as common event ID across multiple occurrences', () => {
    const parentId = 'recurring-parent-555';
    const occ1 = {
      id: 'occ-1',
      parent_plan_id: parentId,
      category: 'beslenme',
      sub_type: 'Su Tazeleme',
      scheduled_at: '2026-07-24T08:00:00Z',
      status: 'completed',
    };
    const occ2 = {
      id: 'occ-2',
      parent_plan_id: parentId,
      category: 'beslenme',
      sub_type: 'Su Tazeleme',
      scheduled_at: '2026-07-25T08:00:00Z',
      status: 'active',
    };

    const events = buildNutritionTimelineEvents({ petId, plans: [occ1, occ2] });
    expect(events.length).toBe(2);
    expect(events[0].id).toBe('nutrition-plan:occ-1');
    expect(events[1].id).toBe('nutrition-plan:occ-2');
    expect(events[0].id).not.toBe(events[1].id);
    expect(events[0].id).not.toBe(`nutrition-plan:${parentId}`);
  });

  it('6. Excludes raw daily nutrition_logs from timeline events to prevent clutter', () => {
    const events = buildNutritionTimelineEvents({
      petId,
      plans: [
        {
          id: 'plan-1',
          category: 'beslenme',
          sub_type: 'Mama Saati',
          scheduled_at: '2026-07-24T08:00:00Z',
          status: 'active',
        },
      ],
    });

    expect(events.length).toBe(1);
    expect(events.every((e) => e.source !== ('nutrition_logs' as any))).toBe(true);
  });
});

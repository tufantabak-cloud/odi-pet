import { PetAgendaEvent, AgendaNormalizationContext, deriveDateKey } from './types';
import { agendaReadRegistry } from './registry';

export function buildStableIdentity(category: string, subType: string, extraData?: any): string {
  const cat = (category || '').toLowerCase().trim();
  const sub = (subType || '').toLowerCase().trim();
  const vCode = extraData?.vaccine_code || extraData?.vaccine?.code;

  if (cat === 'asi' && vCode) {
    return `asi:${vCode.toUpperCase()}`;
  }
  return `${cat}:${sub.replace(/\s+/g, '_')}`;
}

export function buildPetAgendaEvents(
  rawPlans: any[] = [],
  rawVaccines: any[] = [],
  rawParasites: any[] = [],
  rawSchedules: any[] = [],
  rawGrowth: any[] = [],
  rawAppointments: any[] = [],
  rawMedications: any[] = [],
  rawNutrition: any[] = [],
  timeZone = 'Europe/Istanbul'
): PetAgendaEvent[] {
  const todayStr = deriveDateKey(new Date().toISOString(), timeZone);
  const linkedPlanIds = new Set<string>();

  rawVaccines.forEach(v => { if (v.plan_id) linkedPlanIds.add(v.plan_id); });
  rawParasites.forEach(p => { if (p.plan_id) linkedPlanIds.add(p.plan_id); });

  const context: AgendaNormalizationContext = {
    todayStr,
    timeZone,
    linkedPlanIds
  };

  const events: PetAgendaEvent[] = [];

  // 1. Vaccine Records v2
  rawVaccines.forEach(v => {
    const handler = agendaReadRegistry.getHandlerForRecord('vaccine_records_v2');
    events.push(handler.normalizeActualRecord(v, context));
  });

  // 2. Parasite Records
  rawParasites.forEach(p => {
    const handler = agendaReadRegistry.getHandlerForRecord('parasite_records');
    events.push(handler.normalizeActualRecord(p, context));
  });

  // 3. Growth Records
  rawGrowth.forEach(g => {
    const handler = agendaReadRegistry.getHandlerForRecord('growth_records');
    events.push(handler.normalizeActualRecord(g, context));
  });

  // 4. Appointments
  rawAppointments.forEach(a => {
    const handler = agendaReadRegistry.getHandlerForRecord('appointments');
    events.push(handler.normalizeActualRecord(a, context));
  });

  // 5. Nutrition Logs
  rawNutrition.forEach(n => {
    const handler = agendaReadRegistry.getHandlerForRecord('nutrition_logs');
    events.push(handler.normalizeActualRecord(n, context));
  });

  // 6. Legacy Medications
  rawMedications.forEach(m => {
    const handler = agendaReadRegistry.getHandlerForRecord('health_medications');
    events.push(handler.normalizeActualRecord(m, context));
  });

  // 7. Plans Table
  rawPlans.forEach(p => {
    // Filter cancelled plans
    if (p.status === 'cancelled') return;

    // Filter plans linked to medical records
    if (linkedPlanIds.has(p.id) && p.status === 'completed') return;

    const handler = agendaReadRegistry.getHandlerForRecord('plans', p.category, p.sub_type, p.extra_data);
    events.push(handler.normalizePlan(p, context));
  });

  // 8. Legacy Health Schedules (if un-covered)
  const knownStableIds = new Set(events.map(e => `${e.stableIdentity}_${e.dateKey}`));
  rawSchedules.forEach(s => {
    const sDate = deriveDateKey(s.due_date, timeZone);
    const handler = agendaReadRegistry.getHandlerForRecord('health_schedules', s.schedule_type || 'saglik', s.title, s.metadata);
    const baseEvt = handler.normalizePlan({
      id: s.id,
      category: s.schedule_type || 'saglik',
      sub_type: s.title || 'Görev',
      scheduled_at: s.due_date,
      status: s.completed ? 'completed' : 'active',
      extra_data: s.metadata,
      note: s.notes
    }, context);

    if (!knownStableIds.has(`${baseEvt.stableIdentity}_${sDate}`)) {
      events.push({
        ...baseEvt,
        eventId: `schedule_${s.id}`,
        source: 'health_schedules',
        sourceRecordId: s.id
      });
    }
  });

  // Sort chronologically
  return events.sort((a, b) => new Date(a.scheduledAt || a.dateKey).getTime() - new Date(b.scheduledAt || b.dateKey).getTime());
}

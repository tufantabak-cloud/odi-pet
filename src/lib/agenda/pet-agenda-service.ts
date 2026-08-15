import { AgendaPlanInput, AgendaRecordInput, PetAgendaEvent, AgendaNormalizationContext, AgendaDateRange, deriveDateKey } from './types';
import { agendaReadRegistry } from './registry';

export function buildStableIdentity(category: string, subType: string, extraData?: Record<string, unknown>): string {
  const cat = (category || '').toLowerCase().trim();
  const sub = (subType || '').toLowerCase().trim();
  const extra = (extraData as Record<string, any>) || {};
  const vCode = extra.vaccine_code || extra.vaccine?.code;

  if (cat === 'asi' && vCode) {
    return `asi:${vCode.toUpperCase()}`;
  }
  return `${cat}:${sub.replace(/\s+/g, '_')}`;
}

export function buildPetAgendaEvents(
  rawPlans: AgendaPlanInput[] = [],
  rawVaccines: AgendaRecordInput[] = [],
  rawParasites: AgendaRecordInput[] = [],
  rawSchedules: AgendaPlanInput[] = [],
  rawGrowth: AgendaRecordInput[] = [],
  rawAppointments: AgendaRecordInput[] = [],
  rawMedications: AgendaRecordInput[] = [],
  rawNutrition: AgendaRecordInput[] = [],
  timeZone = 'Europe/Istanbul'
): PetAgendaEvent[] {
  const todayStr = deriveDateKey(new Date().toISOString(), timeZone);
  const linkedPlanIds = new Set<string>();

  rawVaccines.forEach(v => { if ((v as any).plan_id) linkedPlanIds.add((v as any).plan_id); });
  rawParasites.forEach(p => { if ((p as any).plan_id) linkedPlanIds.add((p as any).plan_id); });

  const context: AgendaNormalizationContext = {
    todayStr,
    timeZone,
    linkedPlanIds
  };

  const events: PetAgendaEvent[] = [];

  // 1. Vaccine Records V2
  const vaccineHandler = agendaReadRegistry.getHandler('asi');
  rawVaccines.forEach(v => {
    events.push(vaccineHandler.normalizeActualRecord(v, context));
  });

  // 2. Parasite Records
  const parasiteHandler = agendaReadRegistry.getHandler('parazit');
  rawParasites.forEach(p => {
    events.push(parasiteHandler.normalizeActualRecord(p, context));
  });

  // 3. Growth Records
  const growthHandler = agendaReadRegistry.getHandler('kilo');
  rawGrowth.forEach(g => {
    events.push(growthHandler.normalizeActualRecord(g, context));
  });

  // 4. Appointments
  const apptHandler = agendaReadRegistry.getHandler('saglik');
  rawAppointments.forEach(a => {
    events.push(apptHandler.normalizeActualRecord(a, context));
  });

  // 5. Health Medications (Legacy)
  const medHandler = agendaReadRegistry.getHandler('ilac');
  rawMedications.forEach(m => {
    events.push(medHandler.normalizeActualRecord(m, context));
  });

  // 6. Nutrition Logs
  const nutHandler = agendaReadRegistry.getHandler('beslenme');
  rawNutrition.forEach(n => {
    events.push(nutHandler.normalizeActualRecord(n, context));
  });

  // 7. Canonical Plans & Occurrences
  const range: AgendaDateRange = {
    rangeStartStr: deriveDateKey(new Date(Date.now() - 30 * 86400000).toISOString(), timeZone),
    rangeEndStr: deriveDateKey(new Date(Date.now() + 60 * 86400000).toISOString(), timeZone)
  };

  rawPlans.forEach(p => {
    if (p.parent_plan_id) return; // Completed occurrences handled via status/link

    // Filter plans linked to medical records
    if (linkedPlanIds.has(p.id) && p.status === 'completed') return;

    const handler = agendaReadRegistry.getHandlerForRecord('plans', p.category || undefined, p.sub_type || undefined, (p.extra_data as Record<string, unknown>) || undefined);
    events.push(handler.normalizePlan(p, context));
  });

  // 8. Legacy Health Schedules (if un-covered)
  const knownStableIds = new Set(events.map(e => `${e.stableIdentity}_${e.dateKey}`));
  rawSchedules.forEach(s => {
    const sAny = s as any;
    const sDate = deriveDateKey(sAny.due_date || s.scheduled_at, timeZone);
    const handler = agendaReadRegistry.getHandlerForRecord('health_schedules', sAny.schedule_type || 'saglik', s.title || undefined, sAny.metadata || undefined);
    const baseEvt = handler.normalizePlan({
      id: s.id,
      category: sAny.schedule_type || 'saglik',
      sub_type: s.title || 'Görev',
      scheduled_at: sAny.due_date || s.scheduled_at,
      status: sAny.completed ? 'completed' : 'active',
      extra_data: sAny.metadata || s.extra_data,
      note: s.note
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

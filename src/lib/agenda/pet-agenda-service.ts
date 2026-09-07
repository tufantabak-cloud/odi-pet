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
  rawAppointments.forEach(a => { if (a.plan_id) linkedPlanIds.add(a.plan_id); });

  const actualVaccineIds = new Set(rawVaccines.map(v => v.id).filter(Boolean));
  const actualParasiteIds = new Set(rawParasites.map(p => p.id).filter(Boolean));
  const actualAppointmentIds = new Set(rawAppointments.map(a => a.id).filter(Boolean));

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

  // Track completed actual records for semantic compound deduplication:
  // pet_id + dateKey + stableIdentity
  const completedActualSemanticKeys = new Set<string>();
  events.forEach(e => {
    if (e.displayStatus === 'completed') {
      const petId = e.displayMetadata?.extraData?.pet_id || (e as any).pet_id || '';
      if (petId) {
        completedActualSemanticKeys.add(`${petId}__${e.dateKey}__${e.stableIdentity}`);
      }
      completedActualSemanticKeys.add(`${e.dateKey}__${e.stableIdentity}`);
    }
  });

  // 7. Plans Table
  rawPlans.forEach(p => {
    // Filter cancelled plans
    if (p.status === 'cancelled') return;

    // Filter plans explicitly linked to medical records
    if (p.status === 'completed') {
      if (linkedPlanIds.has(p.id)) return;
      if (p.extra_data?.appointment_id && actualAppointmentIds.has(p.extra_data.appointment_id)) return;
      if (p.extra_data?.vaccine_record_id && actualVaccineIds.has(p.extra_data.vaccine_record_id)) return;
      if (p.extra_data?.parasite_record_id && actualParasiteIds.has(p.extra_data.parasite_record_id)) return;

      // Semantic duplicate check: pet_id + date + category/identity
      const pDateKey = deriveDateKey(p.scheduled_at, timeZone);
      const pIdentity = buildStableIdentity(p.category, p.sub_type, p.extra_data);
      if (
        (p.pet_id && completedActualSemanticKeys.has(`${p.pet_id}__${pDateKey}__${pIdentity}`)) ||
        completedActualSemanticKeys.has(`${pDateKey}__${pIdentity}`)
      ) {
        return;
      }
    }

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

import {
  AgendaReadHandler,
  PetAgendaEvent,
  AgendaIdentity,
  AgendaMatchResult,
  AgendaNormalizationContext,
  AgendaDateRange,
  AgendaActionDescriptor,
  AgendaDisplayMetadata,
  AgendaActionType,
  AgendaPlanInput,
  AgendaRecordInput,
  deriveDateKey
} from '../types';

export class AppointmentReadHandler implements AgendaReadHandler {
  readonly category = 'saglik';

  normalizePlan(plan: AgendaPlanInput, context: AgendaNormalizationContext): PetAgendaEvent {
    const scheduledAt = plan.scheduled_at || null;
    const dateKey = deriveDateKey(scheduledAt, context.timeZone);

    return {
      eventId: `plan_${plan.id}`,
      source: 'plans',
      sourceRecordId: plan.id,
      category: 'saglik' as string,
      subCategory: (plan.sub_type || "") || 'Veteriner Randevusu',
      stableIdentity: `saglik:vet_${plan.id}`,
      occurrenceIdentity: null,
      fallbackIdentity: `saglik:vet_${dateKey}`,
      mainPlanId: plan.id,
      parentPlanId: null,
      scheduledAt,
      occurrenceScheduledAt: null,
      actualAt: plan.completed_at || null,
      nextDueAt: null,
      dateKey,
      sourceStatus: plan.status || 'unknown',
      lifecycleType: 'appointment',
      displayStatus: plan.status === 'completed' ? 'completed' : dateKey < context.todayStr ? 'overdue' : 'upcoming',
      status: plan.status === 'completed' ? 'completed' : dateKey < context.todayStr ? 'overdue' : 'upcoming',
      repeatRule: null,
      isVirtual: false,
      isActionable: plan.status === 'active',
      displayMetadata: {
        title: plan.sub_type || 'Veteriner Randevusu',
        note: plan.note,
        extraData: (plan.extra_data as Record<string, unknown>) || undefined
      },
      actionDescriptors: [
        { type: 'complete', targetSource: 'plan', targetId: plan.id, enabled: plan.status === 'active' },
        { type: 'edit', targetSource: 'plan', targetId: plan.id, enabled: true },
        { type: 'delete', targetSource: 'plan', targetId: plan.id, enabled: true }
      ]
    };
  }

  normalizeActualRecord(record: AgendaRecordInput, context: AgendaNormalizationContext): PetAgendaEvent {
    const appAt = record.scheduled_at || record.appointment_date || record.created_at || null;
    const dateKey = deriveDateKey(appAt, context.timeZone);

    return {
      eventId: `appointment_${record.id}`,
      source: 'appointments',
      sourceRecordId: record.id,
      category: 'saglik' as string,
      subCategory: 'Veteriner Randevusu' as string,
      stableIdentity: `saglik:vet_${record.id}`,
      occurrenceIdentity: null,
      fallbackIdentity: `saglik:vet_${dateKey}`,
      mainPlanId: null,
      parentPlanId: null,
      scheduledAt: appAt,
      occurrenceScheduledAt: appAt,
      actualAt: record.status === 'completed' ? appAt : null,
      nextDueAt: null,
      dateKey,
      sourceStatus: record.status || 'scheduled',
      lifecycleType: 'appointment',
      displayStatus: record.status === 'completed' ? 'completed' : dateKey < context.todayStr ? 'overdue' : 'upcoming',
      status: record.status === 'completed' ? 'completed' : dateKey < context.todayStr ? 'overdue' : 'upcoming',
      repeatRule: null,
      isVirtual: false,
      isActionable: record.status === 'scheduled',
      displayMetadata: {
        title: record.title || 'Veteriner Randevusu',
        note: record.notes,
        extraData: record
      },
      actionDescriptors: [
        { type: 'view', targetSource: 'appointment', targetId: record.id, enabled: true },
        { type: 'edit', targetSource: 'appointment', targetId: record.id, enabled: true }
      ]
    };
  }

  projectOccurrences(mainPlan: AgendaPlanInput, _range: AgendaDateRange, context: AgendaNormalizationContext): PetAgendaEvent[] {
    return [this.normalizePlan(mainPlan, context)];
  }

  getIdentity(input: AgendaPlanInput | AgendaRecordInput, context: AgendaNormalizationContext): AgendaIdentity {
    const appAt = input.scheduled_at || input.appointment_date || input.created_at;
    const dateKey = deriveDateKey(appAt, context.timeZone);

    return {
      category: 'saglik' as string,
      baseIdentity: `saglik:vet_${input.id}`,
      occurrenceIdentity: null,
      fallbackIdentity: `saglik:vet_${dateKey}`
    };
  }

  getFallbackMatchCandidates(_record: AgendaRecordInput, _events: PetAgendaEvent[], _context: AgendaNormalizationContext): AgendaMatchResult {
    return { status: 'none' };
  }

  getAllowedActions(event: PetAgendaEvent): AgendaActionType[] {
    return (event.actionDescriptors || []).map(a => a.type);
  }

  getActionDescriptors(event: PetAgendaEvent): AgendaActionDescriptor[] {
    return event.actionDescriptors;
  }

  getDisplayMetadata(event: PetAgendaEvent): AgendaDisplayMetadata {
    return event.displayMetadata;
  }
}

import {
  AgendaReadHandler,
  PetAgendaEvent,
  AgendaIdentity,
  AgendaMatchResult,
  AgendaNormalizationContext,
  AgendaDateRange,
  AgendaActionDescriptor,
  AgendaDisplayMetadata,
  deriveDateKey
} from '../types';

export class GrowthMeasurementReadHandler implements AgendaReadHandler {
  readonly category = 'saglik';

  normalizePlan(plan: any, context: AgendaNormalizationContext): PetAgendaEvent {
    const scheduledAt = plan.scheduled_at || null;
    const dateKey = deriveDateKey(scheduledAt, context.timeZone);

    return {
      eventId: `plan_${plan.id}`,
      source: 'plans',
      sourceRecordId: plan.id,
      category: 'saglik' as string,
      subCategory: (plan.sub_type || "") as any || 'Kilo & Boy Ölçümü',
      stableIdentity: 'saglik:kilo_boy',
      occurrenceIdentity: null,
      fallbackIdentity: `saglik:kilo_boy_${plan.id}`,
      mainPlanId: plan.id,
      parentPlanId: null,
      scheduledAt,
      occurrenceScheduledAt: null,
      actualAt: plan.completed_at || null,
      nextDueAt: null,
      dateKey,
      sourceStatus: plan.status || 'unknown',
      lifecycleType: 'measurement',
      displayStatus: plan.status === 'completed' ? 'completed' : 'upcoming',
      status: plan.status === 'completed' ? 'completed' : 'upcoming',
      repeatRule: null,
      isVirtual: false,
      isActionable: plan.status === 'active',
      displayMetadata: {
        title: plan.sub_type || 'Kilo & Boy Ölçümü',
        note: plan.note,
        extraData: plan.extra_data
      },
      actionDescriptors: [
        { type: 'complete', targetSource: 'plan', targetId: plan.id, enabled: plan.status === 'active' },
        { type: 'delete', targetSource: 'plan', targetId: plan.id, enabled: true }
      ]
    };
  }

  normalizeActualRecord(record: any, context: AgendaNormalizationContext): PetAgendaEvent {
    const recAt = record.measured_at
      ? record.measured_at
      : record.recorded_at
        ? `${record.recorded_at}T12:00:00.000Z`
        : record.created_at;
    const dateKey = deriveDateKey(recAt, context.timeZone);

    return {
      eventId: `growth_${record.id}`,
      source: 'growth_records',
      sourceRecordId: record.id,
      category: 'saglik' as string,
      subCategory: 'Kilo Ölçümü' as string,
      stableIdentity: `saglik:kilo_${record.id}`,
      occurrenceIdentity: null,
      fallbackIdentity: `saglik:kilo_${record.id}`,
      mainPlanId: null,
      parentPlanId: null,
      scheduledAt: recAt,
      occurrenceScheduledAt: recAt,
      actualAt: recAt,
      nextDueAt: null,
      dateKey,
      sourceStatus: 'completed',
      lifecycleType: 'measurement',
      displayStatus: 'completed',
      status: 'completed',
      repeatRule: null,
      isVirtual: false,
      isActionable: false,
      displayMetadata: {
        title: record.weight_kg ? `Kilo: ${record.weight_kg} kg` : 'Büyüme Kaydı',
        note: record.notes,
        extraData: { weight_kg: record.weight_kg, height_cm: record.height_cm }
      },
      actionDescriptors: [
        { type: 'view', targetSource: 'growth_record', targetId: record.id, enabled: true }
      ]
    };
  }

  projectOccurrences(mainPlan: any, _range: AgendaDateRange, context: AgendaNormalizationContext): PetAgendaEvent[] {
    return [this.normalizePlan(mainPlan, context)];
  }

  getIdentity(input: any, _context: AgendaNormalizationContext): AgendaIdentity {
    return {
      category: 'saglik' as string,
      baseIdentity: `saglik:kilo_${input.id}`,
      occurrenceIdentity: null,
      fallbackIdentity: `saglik:kilo_${input.id}`
    };
  }

  getFallbackMatchCandidates(_record: any, _events: PetAgendaEvent[], _context: AgendaNormalizationContext): AgendaMatchResult {
    return { status: 'none' };
  }

  getAllowedActions(event: PetAgendaEvent): any[] {
    return (event.actionDescriptors || []).map(a => a.type);
  }

  getActionDescriptors(event: PetAgendaEvent): AgendaActionDescriptor[] {
    return event.actionDescriptors;
  }

  getDisplayMetadata(event: PetAgendaEvent): AgendaDisplayMetadata {
    return event.displayMetadata;
  }
}

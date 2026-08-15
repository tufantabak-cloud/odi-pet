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

export class NutritionLogReadHandler implements AgendaReadHandler {
  readonly category = 'beslenme';

  normalizePlan(plan: AgendaPlanInput, context: AgendaNormalizationContext): PetAgendaEvent {
    const scheduledAt = plan.scheduled_at || null;
    const dateKey = deriveDateKey(scheduledAt, context.timeZone);

    const isVirtual = plan._is_virtual === true;
    const parentId = plan.parent_plan_id || plan._plan_id;
    const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : dateKey;
    const eventId = isVirtual
      ? `nutrition-plan:${parentId || plan.id}:occ:${scheduledIso}`
      : plan.parent_plan_id
      ? `nutrition-plan:${plan.id}`
      : `nutrition-plan:${plan.id}`;

    return {
      eventId,
      source: 'plans',
      sourceRecordId: plan.id,
      category: 'beslenme' as string,
      subCategory: (plan.sub_type || "") || 'Mama Saati',
      stableIdentity: `beslenme:${(plan.sub_type || 'mama').toLowerCase().replace(/\s+/g, '_')}`,
      occurrenceIdentity: plan.parent_plan_id ? `beslenme:${plan.parent_plan_id}_${dateKey}` : null,
      fallbackIdentity: `beslenme:${plan.id}_${dateKey}`,
      mainPlanId: parentId || plan.id,
      parentPlanId: plan.parent_plan_id || null,
      scheduledAt,
      occurrenceScheduledAt: null,
      actualAt: plan.completed_at || null,
      nextDueAt: plan.repeat_rule ? scheduledAt : null,
      dateKey,
      sourceStatus: plan.status || 'unknown',
      lifecycleType: 'plan',
      displayStatus: plan.status === 'completed' ? 'completed' : dateKey < context.todayStr ? 'overdue' : 'upcoming',
      status: plan.status === 'completed' ? 'completed' : dateKey < context.todayStr ? 'overdue' : 'upcoming',
      repeatRule: plan.repeat_rule || null,
      isVirtual: false,
      isActionable: plan.status === 'active',
      displayMetadata: {
        title: plan.sub_type || 'Mama Saati',
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
    const loggedAt = record.logged_at || record.created_at;
    const dateKey = deriveDateKey(loggedAt, context.timeZone);

    return {
      eventId: `nutrition_${record.id}`,
      source: 'nutrition_logs',
      sourceRecordId: record.id,
      category: 'beslenme' as string,
      subCategory: 'Beslenme Kaydı' as string,
      stableIdentity: `beslenme:log_${record.id}`,
      occurrenceIdentity: null,
      fallbackIdentity: `beslenme:log_${dateKey}`,
      mainPlanId: null,
      parentPlanId: null,
      scheduledAt: loggedAt,
      occurrenceScheduledAt: loggedAt,
      actualAt: loggedAt,
      nextDueAt: null,
      dateKey,
      sourceStatus: 'completed',
      lifecycleType: 'nutrition_log',
      displayStatus: 'completed',
      status: 'completed',
      repeatRule: null,
      isVirtual: false,
      isActionable: false,
      displayMetadata: {
        title: record.food_name ? `Beslenme: ${record.food_name}` : 'Beslenme Kaydı',
        note: record.notes,
        extraData: record
      },
      actionDescriptors: [
        { type: 'delete', targetSource: 'nutrition_log', targetId: record.id, enabled: true },
        { type: 'view', targetSource: 'nutrition_log', targetId: record.id, enabled: true }
      ]
    };
  }

  projectOccurrences(mainPlan: AgendaPlanInput, _range: AgendaDateRange, context: AgendaNormalizationContext): PetAgendaEvent[] {
    return [this.normalizePlan(mainPlan, context)];
  }

  getIdentity(input: AgendaPlanInput | AgendaRecordInput, context: AgendaNormalizationContext): AgendaIdentity {
    const dateKey = deriveDateKey(input.logged_at || input.scheduled_at, context.timeZone);
    return {
      category: 'beslenme' as string,
      baseIdentity: `beslenme:${input.id}`,
      occurrenceIdentity: null,
      fallbackIdentity: `beslenme:${input.id}_${dateKey}`
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

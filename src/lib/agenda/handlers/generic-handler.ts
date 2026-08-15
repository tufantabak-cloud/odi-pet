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
import { getPlanDisplayTitle } from '@/lib/plans/utils';

export class GenericReadHandler implements AgendaReadHandler {
  readonly category: string;

  constructor(category = 'diger') {
    this.category = category as string;
  }

  normalizePlan(plan: AgendaPlanInput, context: AgendaNormalizationContext): PetAgendaEvent {
    const isCompletedChild = !!plan.parent_plan_id;
    const scheduledAt = plan.scheduled_at || null;
    const occurrenceScheduledAt = plan.occurrence_scheduled_at || (isCompletedChild ? scheduledAt : null);
    const dateKey = deriveDateKey(scheduledAt, context.timeZone);

    let displayStatus: PetAgendaEvent['displayStatus'] = 'upcoming';
    if (plan.status === 'completed') displayStatus = 'completed';
    else if (plan.status === 'cancelled') displayStatus = 'cancelled';
    else if (dateKey < context.todayStr) displayStatus = 'overdue';
    else if (dateKey === context.todayStr) displayStatus = 'today';

    const subSlug = (plan.sub_type || 'task').toLowerCase().replace(/\s+/g, '_');
    const baseIdentity = `${this.category}:${subSlug}`;

    return {
      eventId: `plan_${plan.id}`,
      source: 'plans',
      sourceRecordId: plan.id,
      category: (plan.category as string) || this.category as string,
      subCategory: (plan.sub_type || "") || 'Görev',
      stableIdentity: baseIdentity,
      occurrenceIdentity: occurrenceScheduledAt ? `${plan.id}_${occurrenceScheduledAt}` : null,
      fallbackIdentity: `${baseIdentity}_${dateKey}`,
      mainPlanId: isCompletedChild ? plan.parent_plan_id : plan.id,
      parentPlanId: plan.parent_plan_id || null,
      scheduledAt,
      occurrenceScheduledAt,
      actualAt: plan.completed_at || (plan.status === 'completed' ? scheduledAt : null),
      nextDueAt: plan.repeat_rule ? scheduledAt : null,
      dateKey,
      sourceStatus: plan.status || 'unknown',
      lifecycleType: isCompletedChild ? 'completed_occurrence' : 'plan',
      displayStatus,
      status: displayStatus,
      repeatRule: plan.repeat_rule || null,
      isVirtual: false,
      isActionable: plan.status === 'active',
      displayMetadata: {
        title: getPlanDisplayTitle(plan),
        note: plan.note,
        extraData: plan.extra_data
      },
      actionDescriptors: [
        { type: 'complete', targetSource: 'plan', targetId: plan.id, enabled: plan.status === 'active' },
        { type: 'edit', targetSource: 'plan', targetId: plan.id, enabled: true },
        { type: 'delete', targetSource: 'plan', targetId: plan.id, enabled: true }
      ]
    };
  }

  normalizeActualRecord(record: AgendaRecordInput, context: AgendaNormalizationContext): PetAgendaEvent {
    return this.normalizePlan(record, context);
  }

  projectOccurrences(mainPlan: AgendaPlanInput, _range: AgendaDateRange, context: AgendaNormalizationContext): PetAgendaEvent[] {
    if (mainPlan.status !== 'active') return [];
    return [this.normalizePlan(mainPlan, context)];
  }

  getIdentity(input: AgendaPlanInput | AgendaRecordInput, context: AgendaNormalizationContext): AgendaIdentity {
    const subSlug = (input.sub_type || 'task').toLowerCase().replace(/\s+/g, '_');
    const baseIdentity = `${input.category || this.category}:${subSlug}`;
    const scheduledAt = input.scheduled_at;
    const dateKey = deriveDateKey(scheduledAt, context.timeZone);

    return {
      category: (input.category || "") as string || this.category as string,
      baseIdentity,
      occurrenceIdentity: input.occurrence_scheduled_at ? `${input.id}_${input.occurrence_scheduled_at}` : null,
      fallbackIdentity: `${baseIdentity}_${dateKey}`
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

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
import { expandRecurringForTimeline } from '@/components/health-tracker/lib/recurring-events';

export class RoutineReadHandler implements AgendaReadHandler {
  readonly category: string;

  constructor(category: string) {
    this.category = category;
  }

  normalizePlan(plan: any, context: AgendaNormalizationContext): PetAgendaEvent {
    const isCompletedChild = !!plan.parent_plan_id;
    const isMainSeries = !plan.parent_plan_id && !!plan.repeat_rule;
    const scheduledAt = plan.scheduled_at || null;
    const occurrenceScheduledAt = plan.occurrence_scheduled_at || (isCompletedChild ? scheduledAt : null);
    const dateKey = deriveDateKey(scheduledAt, context.timeZone);

    let displayStatus: PetAgendaEvent['displayStatus'] = 'upcoming';
    if (plan.status === 'completed') displayStatus = 'completed';
    else if (plan.status === 'cancelled') displayStatus = 'cancelled';
    else if (dateKey < context.todayStr) displayStatus = 'overdue';
    else if (dateKey === context.todayStr) displayStatus = 'today';

    const subSlug = (plan.sub_type || '').toLowerCase().replace(/\s+/g, '_');
    const baseIdentity = `${this.category}:${subSlug}`;
    const mainPlanId = isCompletedChild ? plan.parent_plan_id : plan.id;
    const occurrenceIdentity = occurrenceScheduledAt ? `${mainPlanId}_${occurrenceScheduledAt}` : null;
    const fallbackIdentity = `${baseIdentity}_${dateKey}`;

    return {
      eventId: `plan_${plan.id}`,
      source: 'plans',
      sourceRecordId: plan.id,
      category: this.category,
      subCategory: plan.sub_type || 'Görevi',
      stableIdentity: baseIdentity,
      occurrenceIdentity,
      fallbackIdentity,
      mainPlanId,
      parentPlanId: plan.parent_plan_id || null,
      scheduledAt,
      occurrenceScheduledAt,
      actualAt: plan.completed_at || (plan.status === 'completed' ? scheduledAt : null),
      nextDueAt: isMainSeries ? scheduledAt : null,
      dateKey,
      sourceStatus: plan.status,
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

  normalizeActualRecord(record: any, context: AgendaNormalizationContext): PetAgendaEvent {
    return this.normalizePlan(record, context);
  }

  projectOccurrences(mainPlan: any, _range: AgendaDateRange, context: AgendaNormalizationContext): PetAgendaEvent[] {
    if (mainPlan.status !== 'active') return [];

    const baseEvt = this.normalizePlan(mainPlan, context);
    if (!mainPlan.repeat_rule) return [baseEvt];

    const rawLegacy = {
      id: mainPlan.id,
      category: mainPlan.category,
      title: baseEvt.displayMetadata.title,
      due_date: baseEvt.dateKey,
      due_time: baseEvt.scheduledAt?.split('T')[1]?.substring(0, 8) || '09:00:00',
      status: 'upcoming',
      repeat_rule: mainPlan.repeat_rule,
      extra_data: mainPlan.extra_data
    };

    const expanded = expandRecurringForTimeline([rawLegacy], -7, 60);

    return expanded.map((exp: any) => {
      const isAnchor = exp.due_date === baseEvt.dateKey;
      return {
        ...baseEvt,
        eventId: isAnchor ? baseEvt.eventId : `virtual_${mainPlan.id}_${exp.due_date}_${exp.due_time}`,
        scheduledAt: `${exp.due_date}T${exp.due_time || '09:00:00'}.000Z`,
        dateKey: exp.due_date,
        isVirtual: !isAnchor,
        displayStatus: exp.due_date < context.todayStr ? 'overdue' : exp.due_date === context.todayStr ? 'today' : 'upcoming',
        status: exp.due_date < context.todayStr ? 'overdue' : exp.due_date === context.todayStr ? 'today' : 'upcoming'
      };
    });
  }

  getIdentity(input: any, context: AgendaNormalizationContext): AgendaIdentity {
    const subSlug = (input.sub_type || '').toLowerCase().replace(/\s+/g, '_');
    const baseIdentity = `${this.category}:${subSlug}`;
    const scheduledAt = input.scheduled_at;
    const dateKey = deriveDateKey(scheduledAt, context.timeZone);

    return {
      category: this.category,
      baseIdentity,
      occurrenceIdentity: input.occurrence_scheduled_at ? `${input.id}_${input.occurrence_scheduled_at}` : null,
      fallbackIdentity: `${baseIdentity}_${dateKey}`
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

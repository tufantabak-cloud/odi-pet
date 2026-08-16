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

export class MedicationReadHandler implements AgendaReadHandler {
  readonly category = 'ilac';

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

    const medName = plan.extra_data?.medication?.name || plan.sub_type || 'İlaç';
    const baseIdentity = `ilac:${medName.toLowerCase().replace(/\s+/g, '_')}`;
    const mainPlanId = isCompletedChild ? plan.parent_plan_id : plan.id;
    const occurrenceIdentity = occurrenceScheduledAt ? `${mainPlanId}_${occurrenceScheduledAt}` : null;
    const fallbackIdentity = `${baseIdentity}_${dateKey}`;

    return {
      eventId: `plan_${plan.id}`,
      source: 'plans',
      sourceRecordId: plan.id,
      category: 'ilac' as string,
      subCategory: (plan.sub_type || "") as any || 'İlaç Takibi',
      stableIdentity: baseIdentity,
      occurrenceIdentity,
      fallbackIdentity,
      mainPlanId: mainPlanId || null,
      parentPlanId: plan.parent_plan_id || null,
      scheduledAt,
      occurrenceScheduledAt,
      actualAt: plan.completed_at || (plan.status === 'completed' ? scheduledAt : null),
      nextDueAt: isMainSeries ? scheduledAt : null,
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
        dosageString: plan.extra_data?.medication?.dosage_string || plan.extra_data?.medication?.dose || '1 Doz',
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
    const administeredAt = record.start_date || record.created_at;
    const dateKey = deriveDateKey(administeredAt, context.timeZone);
    const medName = record.medication_name || 'İlaç';
    const baseIdentity = `ilac:${medName.toLowerCase().replace(/\s+/g, '_')}`;

    return {
      eventId: `med_${record.id}`,
      source: 'health_medications',
      sourceRecordId: record.id,
      category: 'ilac' as string,
      subCategory: medName,
      stableIdentity: baseIdentity,
      occurrenceIdentity: null,
      fallbackIdentity: `${baseIdentity}_${dateKey}`,
      mainPlanId: null,
      parentPlanId: null,
      scheduledAt: administeredAt,
      occurrenceScheduledAt: administeredAt,
      actualAt: administeredAt,
      nextDueAt: record.end_date || null,
      dateKey,
      sourceStatus: record.is_active ? 'active' : 'completed',
      lifecycleType: 'legacy',
      displayStatus: record.is_active ? 'upcoming' : 'completed',
      status: record.is_active ? 'upcoming' : 'completed',
      repeatRule: null,
      isVirtual: false,
      isActionable: false,
      displayMetadata: {
        title: medName,
        note: record.purpose,
        dosageString: record.dose || '1 Doz',
        extraData: record
      },
      actionDescriptors: [
        { type: 'delete', targetSource: 'medication_legacy', targetId: record.id, enabled: true },
        { type: 'view', targetSource: 'medication_legacy', targetId: record.id, enabled: true }
      ]
    };
  }

  projectOccurrences(mainPlan: any, _range: AgendaDateRange, context: AgendaNormalizationContext): PetAgendaEvent[] {
    if (mainPlan.status !== 'active') return [];
    return [this.normalizePlan(mainPlan, context)];
  }

  getIdentity(input: any, context: AgendaNormalizationContext): AgendaIdentity {
    const medName = input.extra_data?.medication?.name || input.medication_name || input.sub_type || 'ilac';
    const baseIdentity = `ilac:${medName.toLowerCase().replace(/\s+/g, '_')}`;
    const scheduledAt = input.scheduled_at || input.start_date;
    const dateKey = deriveDateKey(scheduledAt, context.timeZone);

    return {
      category: 'ilac' as string,
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

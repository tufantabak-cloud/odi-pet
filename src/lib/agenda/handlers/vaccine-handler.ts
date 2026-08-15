import {
  AgendaReadHandler,
  PetAgendaEvent,
  AgendaIdentity,
  AgendaMatchResult,
  AgendaNormalizationContext,
  AgendaDateRange,
  AgendaActionDescriptor,
  AgendaDisplayMetadata,
  AgendaPlanInput,
  AgendaRecordInput,
  AgendaActionType,
  deriveDateKey
} from '../types';
import { getPlanDisplayTitle } from '@/lib/plans/utils';

export class VaccineReadHandler implements AgendaReadHandler {
  readonly category = 'asi';

  normalizePlan(plan: AgendaPlanInput, context: AgendaNormalizationContext): PetAgendaEvent {
    const extra = (plan.extra_data as Record<string, any>) || {};
    const vCode = extra.vaccine_code || extra.vaccine?.code || 'CUSTOM';
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

    const baseIdentity = `asi:${vCode.toUpperCase()}`;
    const mainPlanId = isCompletedChild ? plan.parent_plan_id : plan.id;
    const occurrenceIdentity = occurrenceScheduledAt ? `${mainPlanId}_${occurrenceScheduledAt}` : null;
    const fallbackIdentity = `${baseIdentity}_${dateKey}`;

    return {
      eventId: `plan_${plan.id}`,
      source: 'plans',
      sourceRecordId: plan.id,
      category: 'asi' as string,
      subCategory: (plan.sub_type || "") || 'Aşı',
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
      displayMetadata: this.getDisplayMetadataFromPlan(plan),
      actionDescriptors: [
        { type: 'complete', targetSource: 'plan', targetId: plan.id, enabled: plan.status === 'active' },
        { type: 'edit', targetSource: 'plan', targetId: plan.id, enabled: true },
        { type: 'delete', targetSource: 'plan', targetId: plan.id, enabled: true }
      ]
    };
  }

  normalizeActualRecord(record: AgendaRecordInput, context: AgendaNormalizationContext): PetAgendaEvent {
    const vCode = record.vaccine_code || 'CUSTOM';
    const administeredAt = record.administered_at || record.created_at;
    const dateKey = deriveDateKey(administeredAt, context.timeZone);
    const baseIdentity = `asi:${vCode.toUpperCase()}`;

    return {
      eventId: `v2_vac_${record.id}`,
      source: 'vaccine_records_v2',
      sourceRecordId: record.id,
      category: 'asi' as string,
      subCategory: record.vaccine_name || 'Aşı Uygulaması',
      stableIdentity: baseIdentity,
      occurrenceIdentity: record.plan_id ? `linked_${record.plan_id}` : null,
      fallbackIdentity: `${baseIdentity}_${dateKey}`,
      mainPlanId: record.plan_id || null,
      parentPlanId: null,
      scheduledAt: administeredAt || null,
      occurrenceScheduledAt: administeredAt || null,
      actualAt: administeredAt || null,
      nextDueAt: (record.next_due_date || record.due_at || null) as string | null,
      dateKey,
      sourceStatus: record.status || 'completed',
      lifecycleType: 'medical_record',
      displayStatus: 'completed',
      status: 'completed',
      repeatRule: null,
      isVirtual: false,
      isActionable: false,
      displayMetadata: {
        title: record.vaccine_name || 'Aşı Uygulaması',
        note: record.notes,
        vaccineCode: record.vaccine_code,
        extraData: {
          dose_number: record.dose_number,
          brand_id: record.brand_id,
          brand_name: record.brand_name
        }
      },
      actionDescriptors: [
        { type: 'edit', targetSource: 'vaccine_record', targetId: record.id, enabled: true },
        { type: 'delete', targetSource: 'vaccine_record', targetId: record.id, enabled: true }
      ]
    };
  }

  projectOccurrences(mainPlan: AgendaPlanInput, _range: AgendaDateRange, context: AgendaNormalizationContext): PetAgendaEvent[] {
    if (mainPlan.status !== 'active') return [];
    return [this.normalizePlan(mainPlan, context)];
  }

  getIdentity(input: AgendaPlanInput | AgendaRecordInput, context: AgendaNormalizationContext): AgendaIdentity {
    const vCode = input.vaccine_code || input.extra_data?.vaccine_code || 'CUSTOM';
    const baseIdentity = `asi:${vCode.toUpperCase()}`;
    const scheduledAt = input.scheduled_at || input.administered_at;
    const dateKey = deriveDateKey(scheduledAt, context.timeZone);

    return {
      category: 'asi' as string,
      baseIdentity,
      occurrenceIdentity: input.occurrence_scheduled_at ? `${input.id}_${input.occurrence_scheduled_at}` : null,
      fallbackIdentity: `${baseIdentity}_${dateKey}`
    };
  }

  getFallbackMatchCandidates(record: AgendaRecordInput, events: PetAgendaEvent[], context: AgendaNormalizationContext): AgendaMatchResult {
    if (record.plan_id) {
      const match = events.find(e => e.sourceRecordId === record.plan_id || e.mainPlanId === record.plan_id);
      if (match) return { status: 'exact', eventId: match.eventId, reason: 'linked_plan_id' };
    }

    const recDate = deriveDateKey(record.administered_at, context.timeZone);
    const recCode = (record.vaccine_code || '').toUpperCase();

    const candidates = events.filter(e => {
      if (e.category !== 'asi') return false;
      const evtCode = (e.displayMetadata.vaccineCode || '').toUpperCase();
      if (recCode && evtCode && recCode !== evtCode) return false;
      return Math.abs(new Date(e.dateKey).getTime() - new Date(recDate).getTime()) <= 14 * 86400000;
    });

    if (candidates.length === 1) return { status: 'exact', eventId: candidates[0].eventId, reason: 'fallback_window_match' };
    if (candidates.length > 1) return { status: 'multiple', eventIds: candidates.map(c => c.eventId), reason: 'multiple_candidates_in_window' };
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

  private getDisplayMetadataFromPlan(plan: AgendaPlanInput): AgendaDisplayMetadata {
    const extra = (plan.extra_data as Record<string, any>) || {};
    return {
      title: getPlanDisplayTitle(plan as any),
      note: plan.note,
      vaccineCode: extra.vaccine_code || extra.vaccine?.code,
      extraData: (plan.extra_data as Record<string, unknown>) || undefined
    };
  }
}

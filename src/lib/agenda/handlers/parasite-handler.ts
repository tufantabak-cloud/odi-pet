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

export class ParasiteReadHandler implements AgendaReadHandler {
  readonly category = 'parazit';

  normalizePlan(plan: any, context: AgendaNormalizationContext): PetAgendaEvent {
    const pType = plan.extra_data?.product?.category || plan.sub_type || 'custom';
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

    const baseIdentity = `parazit:${pType.toLowerCase()}`;
    const mainPlanId = isCompletedChild ? plan.parent_plan_id : plan.id;
    const occurrenceIdentity = occurrenceScheduledAt ? `${mainPlanId}_${occurrenceScheduledAt}` : null;
    const fallbackIdentity = `${baseIdentity}_${dateKey}`;

    return {
      eventId: `plan_${plan.id}`,
      source: 'plans',
      sourceRecordId: plan.id,
      category: 'parazit',
      subCategory: plan.sub_type || 'Parazit',
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
        parasiteType: pType,
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
    const pType = record.parasite_type || 'custom';
    const administeredAt = record.administered_at || record.created_at;
    const dateKey = deriveDateKey(administeredAt, context.timeZone);
    const baseIdentity = `parazit:${pType.toLowerCase()}`;

    // Protection end date calculation without device drift
    let nextDueAt: string | null = null;
    if (administeredAt && record.protection_duration_days) {
      try {
        const d = new Date(administeredAt);
        d.setDate(d.getDate() + record.protection_duration_days);
        nextDueAt = d.toISOString();
      } catch {}
    }

    return {
      eventId: `parasite_${record.id}`,
      source: 'parasite_records',
      sourceRecordId: record.id,
      category: 'parazit',
      subCategory: pType,
      stableIdentity: baseIdentity,
      occurrenceIdentity: record.plan_id ? `linked_${record.plan_id}` : null,
      fallbackIdentity: `${baseIdentity}_${dateKey}`,
      mainPlanId: record.plan_id || null,
      parentPlanId: null,
      scheduledAt: administeredAt,
      occurrenceScheduledAt: administeredAt,
      actualAt: administeredAt,
      nextDueAt,
      dateKey,
      sourceStatus: 'completed',
      lifecycleType: 'medical_record',
      displayStatus: 'completed',
      status: 'completed',
      repeatRule: null,
      isVirtual: false,
      isActionable: false,
      displayMetadata: {
        title: record.product_free_text || record.brand_free_text || 'Parazit Uygulaması',
        note: record.notes,
        parasiteType: pType,
        frequencyDays: record.protection_duration_days || 30,
        extraData: {
          application_method: record.application_method,
          brand_free_text: record.brand_free_text,
          product_free_text: record.product_free_text
        }
      },
      actionDescriptors: [
        { type: 'view', targetSource: 'parasite_record', targetId: record.id, enabled: true },
        { type: 'delete', targetSource: 'parasite_record', targetId: record.id, enabled: true }
      ]
    };
  }

  projectOccurrences(mainPlan: any, _range: AgendaDateRange, context: AgendaNormalizationContext): PetAgendaEvent[] {
    if (mainPlan.status !== 'active') return [];
    return [this.normalizePlan(mainPlan, context)];
  }

  getIdentity(input: any, context: AgendaNormalizationContext): AgendaIdentity {
    const pType = input.parasite_type || input.extra_data?.product?.category || 'custom';
    const baseIdentity = `parazit:${pType.toLowerCase()}`;
    const scheduledAt = input.scheduled_at || input.administered_at;
    const dateKey = deriveDateKey(scheduledAt, context.timeZone);

    return {
      category: 'parazit',
      baseIdentity,
      occurrenceIdentity: input.occurrence_scheduled_at ? `${input.id}_${input.occurrence_scheduled_at}` : null,
      fallbackIdentity: `${baseIdentity}_${dateKey}`
    };
  }

  getFallbackMatchCandidates(record: any, events: PetAgendaEvent[], context: AgendaNormalizationContext): AgendaMatchResult {
    if (record.plan_id) {
      const match = events.find(e => e.sourceRecordId === record.plan_id || e.mainPlanId === record.plan_id);
      if (match) return { status: 'exact', eventId: match.eventId, reason: 'linked_plan_id' };
    }

    const recDate = deriveDateKey(record.administered_at, context.timeZone);
    const recType = (record.parasite_type || '').toLowerCase();

    const candidates = events.filter(e => {
      if (e.category !== 'parazit') return false;
      const evtType = (e.displayMetadata.parasiteType || '').toLowerCase();
      if (recType && evtType && recType !== evtType) return false;
      return Math.abs(new Date(e.dateKey).getTime() - new Date(recDate).getTime()) <= 14 * 86400000;
    });

    if (candidates.length === 1) return { status: 'exact', eventId: candidates[0].eventId, reason: 'fallback_window_match' };
    if (candidates.length > 1) return { status: 'multiple', eventIds: candidates.map(c => c.eventId), reason: 'multiple_candidates_in_window' };
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

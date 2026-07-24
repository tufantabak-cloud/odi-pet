import {
  AgendaWriteHandler,
  PlanMatchResult,
  PlanMatchCandidate,
  NextDueResult,
  PlanRecord,
  WriteContext,
  WriteResult
} from '../types';
import { deriveDateKey } from '@/lib/agenda/types';

export interface RoutineWriteInput {
  pet_id: string;
  category: string;
  sub_type: string;
  completed_at: string;
  notes?: string;
  extra_data?: any;
}

export class RoutineWriteHandler implements AgendaWriteHandler<RoutineWriteInput> {
  readonly category: string;

  constructor(category: string) {
    this.category = category;
  }

  validateInput(input: RoutineWriteInput): void {
    if (!input.pet_id) throw new Error('ROUTINE_WRITE_ERROR: pet_id is required');
    if (!input.completed_at) throw new Error('ROUTINE_WRITE_ERROR: completed_at is required');
  }

  getStableIdentity(input: RoutineWriteInput): string {
    const subSlug = (input.sub_type || 'task').toLowerCase().replace(/\s+/g, '_');
    return `${this.category}:${subSlug}`;
  }

  async findMatchingPlans(input: RoutineWriteInput, activePlans: PlanRecord[]): Promise<PlanMatchResult> {
    const targetSub = (input.sub_type || '').toLowerCase();
    const adminTime = new Date(input.completed_at).getTime();

    const candidates: PlanMatchCandidate[] = [];

    for (const plan of activePlans) {
      if (plan.category !== this.category) continue;

      const planSub = (plan.sub_type || '').toLowerCase();
      if (targetSub && planSub && targetSub !== planSub) continue;

      const planTime = new Date(plan.scheduled_at).getTime();
      const distanceMinutes = Math.round(Math.abs(planTime - adminTime) / 60000);

      // Window: Within 7 days (10080 minutes)
      if (distanceMinutes <= 10080) {
        candidates.push({
          planId: plan.id,
          mainPlanId: plan.parent_plan_id || plan.id,
          occurrenceScheduledAt: plan.scheduled_at,
          category: this.category,
          subCategory: plan.sub_type,
          stableIdentity: `${this.category}:${planSub}`,
          distanceMinutes,
          repeatRule: plan.repeat_rule,
          displayDate: deriveDateKey(plan.scheduled_at),
          rawPlan: plan
        });
      }
    }

    candidates.sort((a, b) => a.distanceMinutes - b.distanceMinutes);

    if (candidates.length === 1) {
      return { status: 'exact', candidate: candidates[0], reason: 'closest_active_plan_in_window' };
    }
    if (candidates.length > 1) {
      return { status: 'multiple', candidates, reason: 'multiple_active_plans_in_window' };
    }
    return { status: 'none' };
  }

  async calculateNextDue(input: RoutineWriteInput, matchedPlan: PlanRecord | null): Promise<NextDueResult> {
    if (matchedPlan?.repeat_rule) {
      const d = new Date(matchedPlan.scheduled_at);
      if (matchedPlan.repeat_rule === 'daily') d.setDate(d.getDate() + 1);
      else if (matchedPlan.repeat_rule === 'weekly') d.setDate(d.getDate() + 7);
      else if (matchedPlan.repeat_rule === 'monthly') d.setMonth(d.getMonth() + 1);
      else if (matchedPlan.repeat_rule === 'yearly') d.setFullYear(d.getFullYear() + 1);
      return { status: 'resolved', nextDueAt: d.toISOString(), source: 'plan_repeat_rule' };
    }
    return { status: 'unresolved', reason: 'no_repeat_rule' };
  }

  async persistIndependentRecord(input: RoutineWriteInput, context: WriteContext): Promise<WriteResult> {
    const { supabase, petId, userId } = context;

    const { data: plan, error } = await supabase
      .from('plans')
      .insert({
        pet_id: petId,
        user_id: userId,
        category: this.category,
        sub_type: input.sub_type,
        scheduled_at: input.completed_at,
        completed_at: input.completed_at,
        status: 'completed',
        note: input.notes || null,
        extra_data: input.extra_data || {}
      })
      .select()
      .single();

    if (error) throw error;

    return {
      recordId: plan.id,
      source: 'plans',
      linkedPlanId: plan.id,
      completedOccurrencePlanId: plan.id,
      advancedMainPlanId: null,
      nextDueAt: null
    };
  }

  async persistLinkedRecord(
    input: RoutineWriteInput,
    match: PlanMatchCandidate,
    nextDue: NextDueResult,
    context: WriteContext
  ): Promise<WriteResult> {
    const { supabase } = context;
    const mainPlan = match.rawPlan;

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('complete_recurring_plan', {
      p_plan_id: mainPlan.id,
      p_actual_date: input.completed_at,
      p_occurrence_scheduled_at: match.occurrenceScheduledAt,
      p_note: input.notes || null
    });

    if (rpcErr) throw rpcErr;

    const completedChildId = rpcRes?.completed_plan_id || rpcRes?.id || null;

    return {
      recordId: completedChildId || mainPlan.id,
      source: 'plans',
      linkedPlanId: completedChildId,
      completedOccurrencePlanId: completedChildId,
      advancedMainPlanId: mainPlan.id,
      nextDueAt: nextDue.status === 'resolved' ? nextDue.nextDueAt : null
    };
  }
}

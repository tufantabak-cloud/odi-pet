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

    const { data: record, error } = await supabase
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

    let canonicalTable: string | null = null;
    let canonicalPayload: any = null;

    if (this.category === 'beslenme') {
      canonicalTable = 'meal_consumption';
      canonicalPayload = {
        pet_id: petId,
        occurred_at: input.completed_at,
        occurrence_id: record.id,
        source: 'manual',
        verification: 'self_reported',
        grams: input.extra_data?.grams || 100, // default fallback
        notes: input.notes || null
      };
    } else if (this.category === 'bakim' || this.category === 'hijyen') {
      canonicalTable = 'care_logs';
      canonicalPayload = {
        pet_id: petId,
        occurred_at: input.completed_at,
        occurrence_id: record.id,
        source: 'manual',
        verification: 'self_reported',
        care_type: input.sub_type || 'Genel Bakım',
        notes: input.notes || null
      };
    } else if (this.category === 'aktivite') {
      canonicalTable = 'activity_logs';
      canonicalPayload = {
        pet_id: petId,
        occurred_at: input.completed_at,
        occurrence_id: record.id,
        source: 'manual',
        verification: 'self_reported',
        activity_type: input.sub_type || 'Egzersiz',
        duration_minutes: input.extra_data?.duration_minutes || 30,
        notes: input.notes || null
      };
    } else if (this.category === 'saglik' && input.sub_type === 'İlaç') {
      const { data: courses } = await supabase
        .from('health_medication_courses')
        .select('id, dose_per_administration')
        .eq('pet_id', petId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (courses && courses.length > 0) {
        const course = courses[0];
        const { error: insertErr } = await supabase.from('health_medication_records').insert({
          course_id: course.id,
          pet_id: petId,
          occurred_at: input.completed_at,
          occurrence_id: record.id,
          dose_administered: course.dose_per_administration || 1,
          notes: input.notes || null
        });
        
        if (!insertErr) {
          const rpcSupabase = (context as any).rpcSupabase ?? context.supabase;
          await rpcSupabase.rpc('consume_medication_dose', {
            p_course_id: course.id,
            p_dose: course.dose_per_administration || 1
          });
        } else {
          console.error(`Failed to insert independent record into health_medication_records:`, insertErr);
        }
      }
    }

    if (canonicalTable && canonicalPayload) {
      const { error: insertErr } = await supabase.from(canonicalTable).insert(canonicalPayload);
      if (insertErr) console.error(`Failed to insert independent record into ${canonicalTable}:`, insertErr);
    }

    return {
      recordId: record.id,
      source: 'plans',
      linkedPlanId: record.id,
      completedOccurrencePlanId: record.id,
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
    const { supabase, petId } = context;
    const mainPlan = match.rawPlan;

    const rpcSupabase = context.rpcSupabase ?? context.supabase;

    const { data: rpcRes, error: rpcErr } = await rpcSupabase.rpc('complete_recurring_plan', {
      p_plan_id: mainPlan.id,
      p_actual_date: input.completed_at,
      p_occurrence_scheduled_at: match.occurrenceScheduledAt,
      p_note: input.notes || null
    });

    if (rpcErr) throw rpcErr;

    const completedChildId = rpcRes?.completed_plan_id || rpcRes?.completed_id || rpcRes?.id || null;

    let canonicalTable: string | null = null;
    let canonicalPayload: any = null;

    if (this.category === 'beslenme') {
      canonicalTable = 'meal_consumption';
      canonicalPayload = {
        pet_id: petId,
        occurred_at: input.completed_at,
        occurrence_id: completedChildId,
        source: 'manual',
        verification: 'self_reported',
        grams: input.extra_data?.grams || 100, // default fallback
        notes: input.notes || null
      };
    } else if (this.category === 'bakim' || this.category === 'hijyen') {
      canonicalTable = 'care_logs';
      canonicalPayload = {
        pet_id: petId,
        occurred_at: input.completed_at,
        occurrence_id: completedChildId,
        source: 'manual',
        verification: 'self_reported',
        care_type: input.sub_type || 'Genel Bakım',
        notes: input.notes || null
      };
    } else if (this.category === 'aktivite') {
      canonicalTable = 'activity_logs';
      canonicalPayload = {
        pet_id: petId,
        occurred_at: input.completed_at,
        occurrence_id: completedChildId,
        source: 'manual',
        verification: 'self_reported',
        activity_type: input.sub_type || 'Egzersiz',
        duration_minutes: input.extra_data?.duration_minutes || 30,
        notes: input.notes || null
      };
    } else if (this.category === 'saglik' && input.sub_type === 'İlaç') {
      const { data: course } = await supabase
        .from('health_medication_courses')
        .select('id, dose_per_administration')
        .eq('main_plan_id', match.mainPlanId)
        .single();
        
      if (course) {
        const { error: insertErr } = await supabase.from('health_medication_records').insert({
          course_id: course.id,
          pet_id: petId,
          occurred_at: input.completed_at,
          occurrence_id: completedChildId,
          dose_administered: course.dose_per_administration || 1,
          notes: input.notes || null
        });
        
        if (!insertErr) {
          await rpcSupabase.rpc('consume_medication_dose', {
            p_course_id: course.id,
            p_dose: course.dose_per_administration || 1
          });
        } else {
          console.error(`Failed to insert linked record into health_medication_records:`, insertErr);
        }
      }
    }

    if (canonicalTable && canonicalPayload) {
      const { error: insertErr } = await supabase.from(canonicalTable).insert(canonicalPayload);
      if (insertErr) console.error(`Failed to insert linked record into ${canonicalTable}:`, insertErr);
    }

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

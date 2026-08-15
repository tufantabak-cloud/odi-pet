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
import { calculateNextBoosterDate } from '@/features/pets/vaccination-algorithm';

export interface VaccineWriteInput {
  pet_id: string;
  species?: string;
  vaccine_code?: string;
  vaccine_name: string;
  dose_number?: number;
  administered_at: string;
  next_due_date?: string;
  override_reason?: string;
  notes?: string;
  brand_id?: string;
  brand_name?: string;
}

export class VaccineWriteHandler implements AgendaWriteHandler<VaccineWriteInput> {
  readonly category = 'asi';

  validateInput(input: VaccineWriteInput): void {
    if (!input.pet_id) throw new Error('VACCINE_WRITE_ERROR: pet_id is required');
    if (!input.administered_at) throw new Error('VACCINE_WRITE_ERROR: administered_at is required');
    if (!input.vaccine_name && !input.vaccine_code) {
      throw new Error('VACCINE_WRITE_ERROR: vaccine_name or vaccine_code is required');
    }
  }

  getStableIdentity(input: VaccineWriteInput): string {
    const vCode = (input.vaccine_code || 'CUSTOM').toUpperCase();
    return `asi:${vCode}`;
  }

  async findMatchingPlans(input: VaccineWriteInput, activePlans: PlanRecord[]): Promise<PlanMatchResult> {
    const targetCode = (input.vaccine_code || '').toUpperCase();
    const adminTime = new Date(input.administered_at).getTime();

    const candidates: PlanMatchCandidate[] = [];

    for (const plan of activePlans) {
      if (plan.category !== 'asi') continue;

      const extra = plan.extra_data as Record<string, any> || {};
      const planCode = ((extra.vaccine_code as string) || (extra.vaccine?.code as string) || '').toUpperCase();
      
      // Strict exact matching: vaccine_code must match if present
      if (targetCode && planCode && targetCode !== planCode) continue;

      // Strict dose_number check
      if (input.dose_number && plan.extra_data?.dose_number && input.dose_number !== plan.extra_data.dose_number) {
        continue;
      }

      const planTime = new Date(plan.scheduled_at).getTime();
      const distanceMinutes = Math.round(Math.abs(planTime - adminTime) / 60000);

      // Window: Within 30 days (43200 minutes)
      if (distanceMinutes <= 43200) {
        candidates.push({
          planId: plan.id,
          mainPlanId: plan.parent_plan_id || plan.id,
          occurrenceScheduledAt: plan.scheduled_at,
          category: 'asi',
          subCategory: plan.sub_type || 'Aşı',
          stableIdentity: `asi:${planCode || 'CUSTOM'}`,
          distanceMinutes,
          repeatRule: plan.repeat_rule,
          displayDate: deriveDateKey(plan.scheduled_at),
          rawPlan: plan as unknown as Record<string, unknown>
        });
      }
    }

    candidates.sort((a, b) => a.distanceMinutes - b.distanceMinutes);

    if (candidates.length === 1) {
      return { status: 'exact', candidate: candidates[0], reason: 'strict_single_matching_plan_in_window' };
    }
    if (candidates.length > 1) {
      return { status: 'multiple', candidates, reason: 'multiple_matching_plans_in_window' };
    }
    return { status: 'none' };
  }

  async calculateNextDue(input: VaccineWriteInput, matchedPlan: PlanRecord | null): Promise<NextDueResult> {
    // 1. Validated veterinary override (requires explicit reason + source)
    if (input.next_due_date && input.override_reason) {
      return { status: 'resolved', nextDueAt: input.next_due_date, source: 'user_override_validated' };
    }

    // 2. Canonical protocol engine — single source of truth
    const vCode = ((input.vaccine_code as string) || ((matchedPlan?.extra_data as Record<string, any>)?.vaccine_code as string) || '').toUpperCase();

    if (!vCode || vCode === 'CUSTOM') {
      return { status: 'unresolved', reason: 'unknown_vaccine_code_cannot_resolve_protocol' };
    }

    const { date: nextDate, boosterInfo } = calculateNextBoosterDate(input.administered_at, vCode);

    return {
      status: 'resolved',
      nextDueAt: nextDate.toISOString(),
      source: `protocol_engine_${boosterInfo.legalBoosterDays}d`
    };
  }

  async persistIndependentRecord(input: VaccineWriteInput, context: WriteContext): Promise<WriteResult> {
    const { supabase, petId, idempotencyKey } = context;

    // Check if independent record already exists for this idempotency_key
    if (idempotencyKey) {
      const { data: existingRec } = await supabase
        .from('vaccine_records_v2')
        .select('id')
        .eq('pet_id', petId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingRec) {
        return {
          recordId: existingRec.id,
          source: 'vaccine_records_v2',
          linkedPlanId: null,
          completedOccurrencePlanId: null,
          advancedMainPlanId: null,
          nextDueAt: null
        };
      }
    }

    const { data: rec, error } = await supabase
      .from('vaccine_records_v2')
      .insert({
        pet_id: petId,
        vaccine_code: input.vaccine_code || null,
        vaccine_name: input.vaccine_name,
        dose_number: input.dose_number || 1,
        administered_at: input.administered_at,
        notes: input.notes || null,
        brand_id: input.brand_id || null,
        brand_free_text: input.brand_name || null,
        status: 'completed',
        source: 'user_detailed',
        idempotency_key: idempotencyKey || null
      })
      .select()
      .single();

    if (error) throw error;

    return {
      recordId: rec.id,
      source: 'vaccine_records_v2',
      linkedPlanId: null,
      completedOccurrencePlanId: null,
      advancedMainPlanId: null,
      nextDueAt: null
    };
  }

  async persistLinkedRecord(
    input: VaccineWriteInput,
    match: PlanMatchCandidate,
    nextDue: NextDueResult,
    context: WriteContext
  ): Promise<WriteResult> {
    const { supabase, petId, userId } = context;
    const mainPlan = match.rawPlan;

    // Handler must resolve next due date before calling atomic RPC
    if (nextDue.status === 'unresolved') {
      throw new Error('VACCINE_WRITE_ERROR: Cannot call atomic RPC with unresolved next due date');
    }

    const closeSeries = nextDue.status === 'series_complete';
    const nextScheduledAt = nextDue.status === 'resolved' ? nextDue.nextDueAt : null;

    // Ensure UUID idempotency key exists
    const idempotencyKey = context.idempotencyKey || crypto.randomUUID();

    const rpcSupabase = context.rpcSupabase ?? context.supabase;

    // Atomic RPC execution — V3 signature (p_user_id removed, user_id taken from v_main_plan)
    const { data: rpcRes, error: rpcErr } = await rpcSupabase.rpc('complete_vaccine_plan_and_record', {
      p_pet_id: petId,
      p_main_plan_id: mainPlan.id,
      p_actual_date: input.administered_at,
      p_occurrence_scheduled_at: match.occurrenceScheduledAt,
      p_vaccine_code: input.vaccine_code || null,
      p_vaccine_name: input.vaccine_name,
      p_dose_number: input.dose_number || 1,
      p_next_scheduled_at: nextScheduledAt,
      p_close_series: closeSeries,
      p_idempotency_key: idempotencyKey,
      p_notes: input.notes || null,
      p_brand_id: input.brand_id || null,
      p_brand_free_text: input.brand_name || null
    });

    if (rpcErr) throw rpcErr;

    return {
      recordId: rpcRes.record_id,
      source: 'vaccine_records_v2',
      linkedPlanId: rpcRes.completed_plan_id,
      completedOccurrencePlanId: rpcRes.completed_plan_id,
      advancedMainPlanId: rpcRes.main_plan_id,
      nextDueAt: rpcRes.next_scheduled_at
    };
  }
}

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

export interface ParasiteWriteInput {
  pet_id: string;
  parasite_type: 'internal' | 'external' | 'combined' | 'collar';
  parasite_code?: string;
  administered_at: string;
  protection_duration_days?: number;
  application_method?: string;
  brand_free_text?: string;
  product_free_text?: string;
  notes?: string;
}

function normalizeTurkish(str: string): string {
  return (str || '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

export class ParasiteWriteHandler implements AgendaWriteHandler<ParasiteWriteInput> {
  readonly category = 'parazit';

  validateInput(input: ParasiteWriteInput): void {
    if (!input.pet_id) throw new Error('PARASITE_WRITE_ERROR: pet_id is required');
    if (!input.administered_at) throw new Error('PARASITE_WRITE_ERROR: administered_at is required');
    if (!input.parasite_type) throw new Error('PARASITE_WRITE_ERROR: parasite_type is required');
    if (input.protection_duration_days != null && input.protection_duration_days <= 0) {
      throw new Error('PARASITE_WRITE_ERROR: protection_duration_days must be positive');
    }
  }

  getStableIdentity(input: ParasiteWriteInput): string {
    return `parazit:${input.parasite_type.toLowerCase()}`;
  }

  async findMatchingPlans(input: ParasiteWriteInput, activePlans: PlanRecord[]): Promise<PlanMatchResult> {
    const targetType = normalizeTurkish(input.parasite_type);
    const adminTime = new Date(input.administered_at).getTime();

    const candidates: PlanMatchCandidate[] = [];

    for (const plan of activePlans) {
      if (plan.category !== 'parazit') continue;

      const planType = normalizeTurkish(plan.extra_data?.product?.category || plan.sub_type || '');
      const isInternalMatch = targetType === 'internal' && (planType.includes('internal') || planType.includes('iç') || planType.includes('ic'));
      const isExternalMatch = targetType === 'external' && (planType.includes('external') || planType.includes('dış') || planType.includes('dis'));
      const isCombinedMatch = targetType === 'combined' && (planType.includes('combined') || planType.includes('karma'));
      const isCollarMatch = targetType === 'collar' && (planType.includes('collar') || planType.includes('tasma'));
      const isExactTypeMatch = targetType && (planType.includes(targetType) || isInternalMatch || isExternalMatch || isCombinedMatch || isCollarMatch);

      if (!isExactTypeMatch) continue;

      const planTime = new Date(plan.scheduled_at).getTime();
      const distanceMinutes = Math.round(Math.abs(planTime - adminTime) / 60000);

      // Window: Within 30 days (43200 minutes)
      if (distanceMinutes <= 43200) {
        candidates.push({
          planId: plan.id,
          mainPlanId: plan.parent_plan_id || plan.id,
          occurrenceScheduledAt: plan.scheduled_at,
          category: 'parazit',
          subCategory: plan.sub_type || 'Parazit',
          stableIdentity: `parazit:${planType || 'custom'}`,
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

  async calculateNextDue(input: ParasiteWriteInput, matchedPlan: PlanRecord | null): Promise<NextDueResult> {
    const durationDays = input.protection_duration_days || matchedPlan?.extra_data?.protection_duration_days || 30;
    const adminDate = new Date(input.administered_at);
    adminDate.setDate(adminDate.getDate() + durationDays);

    return {
      status: 'resolved',
      nextDueAt: adminDate.toISOString(),
      source: 'protection_duration_days'
    };
  }

  async persistIndependentRecord(input: ParasiteWriteInput, context: WriteContext): Promise<WriteResult> {
    const { supabase, petId, userId, idempotencyKey } = context;

    // Check if independent record already exists for this idempotency_key
    if (idempotencyKey) {
      const { data: existingRec } = await supabase
        .from('parasite_records')
        .select('id')
        .eq('pet_id', petId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingRec) {
        return {
          recordId: existingRec.id,
          source: 'parasite_records',
          linkedPlanId: null,
          completedOccurrencePlanId: null,
          advancedMainPlanId: null,
          nextDueAt: null
        };
      }
    }

    const rawMethod = (input.application_method || 'spot_on').toLowerCase();
    let applicationMethod = 'spot_on';
    if (rawMethod === 'oral' || rawMethod === 'tablet' || rawMethod === 'chewable') {
      applicationMethod = 'oral';
    } else if (rawMethod === 'collar') {
      applicationMethod = 'collar';
    } else if (rawMethod === 'injection' || rawMethod === 'injectable' || rawMethod === 'subcutaneous') {
      applicationMethod = 'injection';
    } else {
      applicationMethod = 'spot_on';
    }

    const { data: rec, error } = await supabase
      .from('parasite_records')
      .insert({
        pet_id: petId,
        created_by: userId,
        parasite_type: input.parasite_type,
        parasite_code: input.parasite_code || `${input.parasite_type.toUpperCase()}_GENERIC`,
        administered_at: input.administered_at.split('T')[0],
        protection_duration_days: input.protection_duration_days || 30,
        application_method: applicationMethod,
        brand_free_text: input.brand_free_text || null,
        product_free_text: input.product_free_text || null,
        notes: input.notes || null,
        source: 'user_manual',
        idempotency_key: idempotencyKey || null
      })
      .select()
      .single();

    if (error) throw error;

    return {
      recordId: rec.id,
      source: 'parasite_records',
      linkedPlanId: null,
      completedOccurrencePlanId: null,
      advancedMainPlanId: null,
      nextDueAt: null
    };
  }

  async persistLinkedRecord(
    input: ParasiteWriteInput,
    match: PlanMatchCandidate,
    nextDue: NextDueResult,
    context: WriteContext
  ): Promise<WriteResult> {
    const { supabase, petId, userId } = context;
    const mainPlan = match.rawPlan;

    // Handler must provide valid duration
    const duration = input.protection_duration_days;
    if (!duration || duration <= 0) {
      throw new Error('PARASITE_WRITE_ERROR: protection_duration_days required for linked record');
    }

    // Handler must resolve next due date before calling atomic RPC
    if (nextDue.status !== 'resolved') {
      throw new Error('PARASITE_WRITE_ERROR: Cannot call atomic RPC with unresolved next due date');
    }

    // Ensure UUID idempotency key exists
    const idempotencyKey = context.idempotencyKey || crypto.randomUUID();

    const parasiteCode = mainPlan.extra_data?.parasite_code || `${input.parasite_type.toUpperCase()}_GENERIC`;
    const parasiteProtocolId =
      mainPlan.extra_data?.parasite_protocol_id ||
      mainPlan.extra_data?.product?.id ||
      null;
    const rawMethod = (input.application_method || mainPlan.extra_data?.application_method || 'spot_on').toLowerCase();
    let applicationMethod = 'spot_on';
    if (rawMethod === 'oral' || rawMethod === 'tablet' || rawMethod === 'chewable') {
      applicationMethod = 'oral';
    } else if (rawMethod === 'collar') {
      applicationMethod = 'collar';
    } else if (rawMethod === 'injection' || rawMethod === 'injectable' || rawMethod === 'subcutaneous') {
      applicationMethod = 'injection';
    } else {
      applicationMethod = 'spot_on';
    }

    const rpcSupabase = context.rpcSupabase ?? context.supabase;

    // Atomic RPC execution — V4 signature
    const { data: rpcRes, error: rpcErr } = await rpcSupabase.rpc('complete_parasite_plan_and_record', {
      p_pet_id: petId,
      p_main_plan_id: mainPlan.id,
      p_actual_date: input.administered_at,
      p_occurrence_scheduled_at: match.occurrenceScheduledAt,
      p_parasite_type: input.parasite_type,
      p_parasite_code: parasiteCode,
      p_application_method: applicationMethod,
      p_protection_duration_days: duration,
      p_next_scheduled_at: nextDue.nextDueAt,
      p_idempotency_key: idempotencyKey,
      p_brand_free_text: input.brand_free_text || null,
      p_product_free_text: input.product_free_text || null,
      p_notes: input.notes || null,
      p_parasite_protocol_id: parasiteProtocolId
    });

    if (rpcErr) throw rpcErr;

    return {
      recordId: rpcRes.record_id,
      source: 'parasite_records',
      linkedPlanId: rpcRes.completed_plan_id,
      completedOccurrencePlanId: rpcRes.completed_plan_id,
      advancedMainPlanId: rpcRes.main_plan_id,
      nextDueAt: rpcRes.next_scheduled_at
    };
  }
}

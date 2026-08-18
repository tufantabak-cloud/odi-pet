import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { CreatePlanInput, UpdatePlanInput } from './schema';
import { normalizeSpecies } from '@/lib/species';
import { calculateNextBoosterDate } from '@/features/pets/vaccination-algorithm';

export function calculateNextOccurrenceDate(
  baseScheduledAt: string,
  repeatRule: string | null,
  extraData?: any
): string | null {
  const baseDate = new Date(baseScheduledAt);
  if (isNaN(baseDate.getTime())) return null;

  // 1. Vaccine category with a known vaccine_code: use vaccine booster rules engine
  const vaccineCode = extraData?.vaccine_code || extraData?.vaccine?.code;
  if (vaccineCode) {
    try {
      const { date } = calculateNextBoosterDate(baseScheduledAt, vaccineCode);
      if (date && !isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch {
      /* continue to check explicit repeat_rule */
    }
  }

  // 2. Explicit repeat_rule provided by user (hour, daily, weekly, monthly, yearly)
  if (repeatRule && repeatRule !== 'none') {
    const interval = Number(extraData?.interval) || 1;
    const nextDate = new Date(baseDate);

    if (repeatRule === 'hour' || repeatRule === 'hourly') {
      nextDate.setHours(nextDate.getHours() + interval);
    } else if (repeatRule === 'daily') {
      nextDate.setDate(nextDate.getDate() + interval);
    } else if (repeatRule === 'weekly') {
      nextDate.setDate(nextDate.getDate() + interval * 7);
    } else if (repeatRule === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + interval);
    } else if (repeatRule === 'yearly') {
      nextDate.setFullYear(nextDate.getFullYear() + interval);
    } else {
      return null;
    }
    return nextDate.toISOString();
  }

  // 3. Unsupported category or no explicit repeat_rule: DO NOT guess +365 days! Return null safely.
  return null;
}

export function calculateFireAt(scheduledAt: string, notifBefore: number | null, notifUnit: string): string | null {
  if (notifBefore === null) return null;
  const date = new Date(scheduledAt);
  if (notifUnit === 'minute') {
    date.setMinutes(date.getMinutes() - notifBefore);
  } else if (notifUnit === 'hour') {
    date.setHours(date.getHours() - notifBefore);
  } else if (notifUnit === 'day') {
    date.setDate(date.getDate() - notifBefore);
  }
  return date.toISOString();
}

export async function verifyPetOwnership(userId: string, petId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: petOwner, error } = await supabase
    .from('pet_owners')
    .select('id')
    .eq('pet_id', petId)
    .eq('profile_id', userId)
    .single();
    
  if (error || !petOwner) {
    throw new Error('FORBIDDEN');
  }
  return true;
}

export async function createPlan(userId: string, input: CreatePlanInput) {
  await verifyPetOwnership(userId, input.pet_id);
  const supabase = await createServerSupabaseClient();

  // category='asi' duplicate checks
  if (input.category === 'asi') {
    const vaccineCode = input.extra_data?.vaccine_code || input.extra_data?.vaccine?.code;
    const doseNumber = input.extra_data?.dose_number;

    const { data: existingPlans } = await supabase
      .from('plans')
      .select('id, scheduled_at, extra_data')
      .eq('pet_id', input.pet_id)
      .eq('category', 'asi')
      .eq('status', 'active');

    if (existingPlans && existingPlans.length > 0) {
      if (doseNumber !== undefined && doseNumber !== null) {
        const match = existingPlans.find(p => {
          const pCode = p.extra_data?.vaccine_code || p.extra_data?.vaccine?.code;
          const pDose = p.extra_data?.dose_number;
          return pCode === vaccineCode && String(pDose) === String(doseNumber);
        });
        if (match) {
          throw new Error(`DUPLICATE_ACTIVE_VACCINE_PLAN:${match.id}`);
        }
      } else {
        const scheduledDate = new Date(input.scheduled_at).toISOString().split('T')[0];
        const match = existingPlans.find(p => {
          const pCode = p.extra_data?.vaccine_code || p.extra_data?.vaccine?.code;
          const dateStr = new Date(p.scheduled_at).toISOString().split('T')[0];
          return pCode === vaccineCode && dateStr === scheduledDate;
        });
        if (match) {
          throw new Error(`DUPLICATE_ACTIVE_VACCINE_PLAN:${match.id}`);
        }
      }
    }
  }

  // Get pet info for species validation
  const { data: pet, error: petErr } = await supabase
    .from('pets')
    .select('species')
    .eq('id', input.pet_id)
    .single();

  if (petErr || !pet) {
    throw new Error('PROTOCOL_NOT_FOUND');
  }

  // 1. Vaccine Category Validations
  if (input.category === 'asi') {
    const vaccineCode = input.extra_data?.vaccine_code || input.extra_data?.vaccine?.code;
    if (!vaccineCode) {
      throw new Error('PROTOCOL_NOT_FOUND');
    }

    const { data: proto, error: protoErr } = await supabase
      .from('vaccine_protocols')
      .select('*')
      .eq('vaccine_code', vaccineCode)
      .maybeSingle();

    if (protoErr || !proto) {
      throw new Error('PROTOCOL_NOT_FOUND');
    }

    if (!proto.is_active) {
      throw new Error('INACTIVE_PROTOCOL');
    }

    if (proto.species !== 'both' && normalizeSpecies(proto.species) !== normalizeSpecies(pet.species)) {
      throw new Error('PROTOCOL_SPECIES_MISMATCH');
    }

    // Check preference
    const { data: pref } = await supabase
      .from('pet_vaccine_preferences')
      .select('enabled')
      .eq('pet_id', input.pet_id)
      .eq('vaccine_code', vaccineCode)
      .maybeSingle();

    if (pref && !pref.enabled && proto.category !== 'legal' && proto.category !== 'core') {
      throw new Error('VACCINE_PREFERENCE_DISABLED');
    }
  }

  // 2. Parasite Category Validations
  if (input.category === 'parazit') {
    const parasiteProtoId = input.extra_data?.product?.id || input.extra_data?.parasite_protocol_id;
    if (!parasiteProtoId) {
      throw new Error('PROTOCOL_NOT_FOUND');
    }

    const { data: proto, error: protoErr } = await supabase
      .from('parasite_protocols')
      .select('*')
      .eq('id', parasiteProtoId)
      .maybeSingle();

    if (protoErr || !proto) {
      throw new Error('PROTOCOL_NOT_FOUND');
    }

    if (!proto.is_active) {
      throw new Error('INACTIVE_PROTOCOL');
    }

    if (proto.species !== 'both' && normalizeSpecies(proto.species) !== normalizeSpecies(pet.species)) {
      throw new Error('PROTOCOL_SPECIES_MISMATCH');
    }

    // Check preference
    const { data: pref } = await supabase
      .from('pet_parasite_preferences')
      .select('enabled')
      .eq('pet_id', input.pet_id)
      .eq('parasite_protocol_id', parasiteProtoId)
      .maybeSingle();

    if (pref && !pref.enabled) {
      throw new Error('PARASITE_PREFERENCE_DISABLED');
    }

    // Parazit protokol kimliğini tek ve kanonik biçimde plana yaz.
    // İstemciler tarihsel olarak yalnızca extra_data.product.id gönderiyordu;
    // atomik tamamlama RPC'si ise üst seviye kimlik alanlarını doğruluyor.
    input.extra_data = {
      ...(input.extra_data || {}),
      parasite_protocol_id: proto.id,
      parasite_code: proto.parasite_code,
      parasite_type: proto.parasite_type,
    };

    // Validate sub_type matches protocol parasite_type
    const subCat = input.sub_type;
    const pType = proto.parasite_type;

    if (subCat === 'İç Parazit') {
      if (pType !== 'internal' && pType !== 'combined') {
        throw new Error('PROTOCOL_TYPE_MISMATCH');
      }
    } else if (subCat === 'Dış Parazit') {
      if (pType !== 'external' && pType !== 'combined') {
        throw new Error('PROTOCOL_TYPE_MISMATCH');
      }
    } else if (subCat === 'Birleşik Parazit') {
      if (pType !== 'combined') {
        throw new Error('PROTOCOL_TYPE_MISMATCH');
      }
    } else if (subCat === 'Parazit Tasması') {
      if (pType !== 'collar') {
        throw new Error('PROTOCOL_TYPE_MISMATCH');
      }
    }
  }

  const isPastDone = !!input.extra_data?.is_past_done;
  const isRecurring = !!input.repeat_rule;

  let scheduledAt = input.scheduled_at;
  let initialStatus = 'active';

  if (isPastDone) {
    if (isRecurring) {
      // 1. Calculate the next occurrence date for the main recurring plan from completion date
      const nextScheduledAtStr = calculateNextOccurrenceDate(
        input.scheduled_at,
        input.repeat_rule || null,
        input.extra_data
      ) || input.scheduled_at; // Safe fallback if no next date

      const fireAt = calculateFireAt(nextScheduledAtStr, input.notif_before, input.notif_unit);

      // 2. Create the main recurring plan FIRST (status: 'active')
      const { data: mainPlan, error: mainPlanErr } = await supabase
        .from('plans')
        .insert({
          user_id: userId,
          pet_id: input.pet_id,
          category: input.category,
          sub_type: input.sub_type,
          scheduled_at: nextScheduledAtStr,
          repeat_rule: input.repeat_rule || null,
          ends_at: input.ends_at || null,
          notif_before: input.notif_before,
          notif_unit: input.notif_unit,
          note: input.note || null,
          extra_data: { ...(input.extra_data || {}), is_past_done: false },
          status: 'active',
        })
        .select()
        .single();

      if (mainPlanErr) throw new Error(mainPlanErr.message);

      // 3. Create static completed copy linked via parent_plan_id and occurrence_scheduled_at
      const completedPlanData = {
        user_id: userId,
        pet_id: input.pet_id,
        category: input.category,
        sub_type: input.sub_type,
        scheduled_at: input.scheduled_at,
        occurrence_scheduled_at: input.occurrence_scheduled_at || input.scheduled_at,
        repeat_rule: null,
        ends_at: null,
        notif_before: 0,
        notif_unit: 'minute',
        note: input.note || null,
        extra_data: { ...(input.extra_data || {}), is_past_done: true },
        status: 'completed',
        parent_plan_id: mainPlan.id,
      };

      await supabase.from('plans').insert(completedPlanData);

      if (fireAt) {
        await supabase.from('notification_jobs').insert({
          plan_id: mainPlan.id,
          fire_at: fireAt,
        });
      }

      if (input.category === 'saglik' && input.sub_type === 'İlaç') {
        const startDate = input.scheduled_at.split('T')[0];
        await supabase.from('health_medication_courses').insert({
          pet_id: input.pet_id,
          user_id: userId,
          medication_name: input.extra_data?.medication_name || 'Bilinmeyen İlaç',
          medication_unit: input.extra_data?.medication_unit || 'doz',
          purpose: input.extra_data?.purpose || null,
          frequency_type: input.extra_data?.medication_freq_type || 'once_daily',
          start_date: startDate,
          duration_type: input.extra_data?.medication_duration || 'continuous',
          duration_days: input.extra_data?.medication_days || null,
          stock_enabled: input.extra_data?.medication_stock_enabled || false,
          stock_count: input.extra_data?.medication_stock_count || 0,
          stock_alert_threshold: input.extra_data?.medication_alert_count || 0,
          dose_per_administration: input.extra_data?.medication_dose || 1,
          main_plan_id: mainPlan.id
        });
      }

      return mainPlan;
    } else {
      // One-time plan: save with completed status directly
      initialStatus = 'completed';
    }
  }
  
  const fireAt = calculateFireAt(scheduledAt, input.notif_before, input.notif_unit);

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      user_id: userId,
      pet_id: input.pet_id,
      category: input.category,
      sub_type: input.sub_type,
      scheduled_at: scheduledAt,
      occurrence_scheduled_at: input.occurrence_scheduled_at || null,
      repeat_rule: input.repeat_rule || null,
      ends_at: input.ends_at || null,
      notif_before: input.notif_before,
      notif_unit: input.notif_unit,
      note: input.note || null,
      extra_data: input.extra_data || {},
      status: initialStatus,
    })
    .select()
    .single();

  if (planError) throw new Error(planError.message);

  if (fireAt && initialStatus !== 'completed') {
    const { error: notifError } = await supabase
      .from('notification_jobs')
      .insert({
        plan_id: plan.id,
        fire_at: fireAt,
      });
      
    if (notifError) throw new Error(notifError.message);
  }

  if (input.category === 'saglik' && input.sub_type === 'İlaç') {
    const startDate = input.scheduled_at.split('T')[0];
    await supabase.from('health_medication_courses').insert({
      pet_id: input.pet_id,
      user_id: userId,
      medication_name: input.extra_data?.medication_name || 'Bilinmeyen İlaç',
      medication_unit: input.extra_data?.medication_unit || 'doz',
      purpose: input.extra_data?.purpose || null,
      frequency_type: input.extra_data?.medication_freq_type || 'once_daily',
      start_date: startDate,
      duration_type: input.extra_data?.medication_duration || 'continuous',
      duration_days: input.extra_data?.medication_days || null,
      stock_enabled: input.extra_data?.medication_stock_enabled || false,
      stock_count: input.extra_data?.medication_stock_count || 0,
      stock_alert_threshold: input.extra_data?.medication_alert_count || 0,
      dose_per_administration: input.extra_data?.medication_dose || 1,
      main_plan_id: plan.id
    });
  }

  return plan;
}

export async function updatePlan(userId: string, planId: string, input: UpdatePlanInput) {
  if (planId.toString().startsWith('virtual_')) {
    throw new Error('INVALID_VIRTUAL_PLAN_ID');
  }

  const supabase = await createServerSupabaseClient();
  
  // RLS will ensure user owns the plan, but we need to check if pet_id is being changed
  if (input.pet_id) {
    await verifyPetOwnership(userId, input.pet_id);
  }

  const { data: currentPlan, error: fetchError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (fetchError || !currentPlan) {
    throw new Error('PLAN_NOT_FOUND');
  }

  // Treat input.extra_data?.is_past_done as completed status
  let statusToApply = input.status;
  const isPastDone = !!input.extra_data?.is_past_done;
  if (isPastDone) {
    statusToApply = 'completed';
  }

  const hasRepeatRule = input.repeat_rule !== undefined ? input.repeat_rule : currentPlan.repeat_rule;
  const isMainRecurringPlan = hasRepeatRule && !currentPlan.parent_plan_id;

  if (statusToApply === 'completed' && isMainRecurringPlan) {
    const occurrenceScheduledAt = input.occurrence_scheduled_at || currentPlan.scheduled_at;
    const actualCompletionDate = input.scheduled_at || occurrenceScheduledAt;

    // Calculate next occurrence date using protocol/rules (server-side only)
    const computedNextScheduledAt = calculateNextOccurrenceDate(
      actualCompletionDate,
      hasRepeatRule,
      input.extra_data || currentPlan.extra_data
    );

    const closeSeries = !hasRepeatRule || input.ends_at === 'close';
    if (!computedNextScheduledAt && !closeSeries) {
      throw new Error('NEXT_OCCURRENCE_UNRESOLVED');
    }

    // Use atomic database function complete_recurring_plan RPC (service_role only)
    const adminClient = createAdminSupabaseClient();
    const { data: rpcRes, error: rpcErr } = await adminClient.rpc('complete_recurring_plan', {
      p_plan_id: planId,
      p_user_id: userId,
      p_occurrence_scheduled_at: occurrenceScheduledAt,
      p_actual_completion_date: actualCompletionDate,
      p_next_scheduled_at: computedNextScheduledAt || null,
      p_close_series: closeSeries,
      p_note: input.note !== undefined ? input.note : currentPlan.note,
      p_extra_data: input.extra_data || {}
    });

    if (rpcErr) {
      console.error('[service.ts updatePlan] complete_recurring_plan RPC error:', rpcErr);
      throw new Error(rpcErr.message || 'PLAN_COMPLETION_FAILED');
    }

    // Refetch the updated main recurring plan
    const { data: updatedMainPlan } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (updatedMainPlan) {
      // Dismiss active in-app notifications tied to this plan
      await supabase
        .from('notifications')
        .update({ is_read: true, opened_at: new Date().toISOString() })
        .eq('plan_id', planId)
        .eq('is_read', false);

      // Update notification job for the next occurrence
      const newNotifBefore = updatedMainPlan.notif_before;
      const newNotifUnit = updatedMainPlan.notif_unit;
      const newFireAt = calculateFireAt(updatedMainPlan.scheduled_at, newNotifBefore, newNotifUnit);

      if (newFireAt !== null) {
        const { data: updatedJobs } = await supabase
          .from('notification_jobs')
          .update({ fire_at: newFireAt })
          .eq('plan_id', planId)
          .eq('sent', false)
          .select();

        if (!updatedJobs || updatedJobs.length === 0) {
          await supabase
            .from('notification_jobs')
            .insert({
              plan_id: planId,
              fire_at: newFireAt,
            });
        }
      } else {
        await supabase
          .from('notification_jobs')
          .delete()
          .eq('plan_id', planId)
          .eq('sent', false);
      }

      return updatedMainPlan;
    }
  }

  // Standard update flow for one-time plans or updating existing static records
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .update({
      ...input,
      ...(statusToApply ? { status: statusToApply } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', planId)
    .select()
    .single();

  if (planError) throw new Error(planError.message);

  // If plan was marked completed, dismiss active in-app notifications tied to this plan
  if (statusToApply === 'completed' || input.status === 'completed') {
    await supabase
      .from('notifications')
      .update({ is_read: true, opened_at: new Date().toISOString() })
      .eq('plan_id', planId)
      .eq('is_read', false);
  }

  // If schedule or notification settings changed, update notification_jobs
  if (input.scheduled_at || input.notif_before !== undefined || input.notif_unit) {
    const newScheduledAt = input.scheduled_at || plan.scheduled_at;
    const newNotifBefore = input.notif_before !== undefined ? input.notif_before : plan.notif_before;
    const newNotifUnit = input.notif_unit || plan.notif_unit;
    
    const newFireAt = calculateFireAt(newScheduledAt, newNotifBefore, newNotifUnit);
    
    if (newFireAt === null) {
      await supabase
        .from('notification_jobs')
        .delete()
        .eq('plan_id', planId)
        .eq('sent', false);
    } else {
      // Attempt to update existing pending job
      const { data: updatedJobs, error: updateNotifError } = await supabase
        .from('notification_jobs')
        .update({ fire_at: newFireAt })
        .eq('plan_id', planId)
        .eq('sent', false)
        .select();
        
      if (!updateNotifError && (!updatedJobs || updatedJobs.length === 0)) {
        // Insert a new job if it didn't exist (e.g. transitioning from no notifications)
        await supabase
          .from('notification_jobs')
          .insert({
            plan_id: planId,
            fire_at: newFireAt,
          });
      }
        
      if (updateNotifError) {
        console.error('Bildirim güncellenirken hata oluştu:', updateNotifError.message);
      }
    }
  }

  return plan;
}

export async function getPlans(userId: string, petId?: string | null, category?: string | null) {
  const supabase = await createServerSupabaseClient();
  
  let query = supabase
    .from('plans')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_at', { ascending: true });
    
  if (petId) query = query.eq('pet_id', petId);
  if (category) query = query.eq('category', category);
  
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  
  return data;
}

export async function deletePlan(planId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId);
    
  if (error) throw new Error(error.message);
  return true;
}

export interface ParasiteCompletionResponse {
  id: string;
  status: 'completed';
  record_id: string;
  idempotent: boolean;
  document_storage_path: string | null;
}

export async function completeParasitePlan(
  userId: string,
  planId: string,
  input: {
    administered_at: string;
    application_method: string;
    brand_free_text?: string | null;
    product_free_text?: string | null;
    protection_duration_days?: number | null;
    notes?: string | null;
    document_storage_path?: string | null;
  }
): Promise<ParasiteCompletionResponse> {
  const supabase = await createServerSupabaseClient();

  const { data: currentPlan, error: fetchError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (fetchError || !currentPlan) {
    throw new Error('PLAN_NOT_FOUND');
  }

  if (currentPlan.category !== 'parazit') {
    throw new Error('NOT_PARASITE_PLAN');
  }

  // 1. Verify ownership of currentPlan.pet_id
  try {
    await verifyPetOwnership(userId, currentPlan.pet_id);
  } catch {
    throw new Error('FORBIDDEN');
  }

  if (currentPlan.status === 'cancelled') {
    throw new Error('PLAN_CANCELLED');
  }

  const administeredAtStr = input.administered_at;
  if (!administeredAtStr) {
    throw new Error('INVALID_APPLICATION_DATA');
  }
  const administeredAt = new Date(administeredAtStr);
  const now = new Date();
  // administered_at gelecekte olamaz
  if (administeredAt > now) {
    throw new Error('INVALID_APPLICATION_DATA');
  }

  const applicationMethod = input.application_method;
  if (!applicationMethod || typeof applicationMethod !== 'string' || applicationMethod.trim() === '') {
    throw new Error('INVALID_APPLICATION_METHOD');
  }

  let protoId: string | null = null;
  try {
    protoId = currentPlan.extra_data?.product?.id ?? currentPlan.extra_data?.parasite_protocol_id ?? null;
  } catch {}

  if (!protoId) {
    throw new Error('PROTOCOL_NOT_FOUND');
  }

  const adminSupabase = createAdminSupabaseClient();
  const { data: rpcResult, error: rpcError } = await adminSupabase.rpc('complete_parasite_plan', {
    p_plan_id: planId,
    p_administered_at: administeredAtStr,
    p_application_method: applicationMethod,
    p_brand_free_text: input.brand_free_text ?? null,
    p_product_free_text: input.product_free_text ?? null,
    p_protection_duration_days: input.protection_duration_days ?? null,
    p_notes: input.notes ?? null,
    p_document_storage_path: input.document_storage_path ?? null,
    p_created_by: userId
  });

  if (rpcError) {
    console.error('DEBUG RPC ERROR:', rpcError);
    const msg = rpcError.message || '';
    if (msg.includes('PLAN_NOT_FOUND')) throw new Error('PLAN_NOT_FOUND');
    if (msg.includes('NOT_PARASITE_PLAN')) throw new Error('NOT_PARASITE_PLAN');
    if (msg.includes('PLAN_CANCELLED')) throw new Error('PLAN_CANCELLED');
    if (msg.includes('PROTOCOL_NOT_FOUND')) throw new Error('PROTOCOL_NOT_FOUND');
    if (msg.includes('INVALID_APPLICATION_METHOD')) throw new Error('INVALID_APPLICATION_METHOD');
    if (msg.includes('PROTOCOL_SPECIES_MISMATCH')) throw new Error('INVALID_APPLICATION_DATA');
    if (msg.includes('FORBIDDEN')) throw new Error('FORBIDDEN');
    if (msg.includes('INCONSISTENT_PLAN_STATE')) throw new Error('INCONSISTENT_PLAN_STATE');
    throw new Error('PLAN_COMPLETION_FAILED');
  }

  const { data: updatedPlan } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (!updatedPlan) {
    throw new Error('PLAN_COMPLETION_FAILED');
  }

  const recordId = (rpcResult as any)?.record_id;
  const idempotent = (rpcResult as any)?.idempotent;

  // Strict validation of the RPC response keys/types
  if (
    typeof recordId !== 'string' ||
    typeof idempotent !== 'boolean' ||
    updatedPlan.status !== 'completed'
  ) {
    throw new Error('PLAN_COMPLETION_FAILED');
  }

  // Fetch document storage path from the database to return in response if linked
  let finalPath: string | null = null;
  if (recordId) {
    const { data: rec } = await adminSupabase
      .from('parasite_records')
      .select('document_storage_path')
      .eq('id', recordId)
      .maybeSingle();
    if (rec) {
      finalPath = rec.document_storage_path ?? null;
    }
  }

  return {
    id: updatedPlan.id,
    status: 'completed',
    record_id: recordId,
    idempotent: idempotent,
    document_storage_path: finalPath
  };
}

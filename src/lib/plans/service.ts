import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { CreatePlanInput, UpdatePlanInput } from './schema';
import { normalizeSpecies } from '@/lib/species';

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
      // 1. Create a completed static copy of the plan for history
      const completedPlanData = {
        user_id: userId,
        pet_id: input.pet_id,
        category: input.category,
        sub_type: input.sub_type,
        scheduled_at: input.scheduled_at,
        repeat_rule: null,
        ends_at: null,
        notif_before: 0,
        notif_unit: 'minute',
        note: input.note || null,
        extra_data: { ...input.extra_data, is_past_done: true },
        status: 'completed',
      };

      const { error: copyError } = await supabase
        .from('plans')
        .insert(completedPlanData);

      if (copyError) throw new Error(copyError.message);

      // 2. Calculate the next occurrence date for the main recurring plan
      const currentScheduledAt = new Date(input.scheduled_at);
      let nextScheduledAtDate = new Date(currentScheduledAt);

      const interval = Number(input.extra_data?.interval) || 1;
      const rule = input.repeat_rule;

      if (rule === 'hour' || rule === 'hourly') {
        nextScheduledAtDate.setHours(nextScheduledAtDate.getHours() + interval);
      } else if (rule === 'daily') {
        nextScheduledAtDate.setDate(nextScheduledAtDate.getDate() + interval);
      } else if (rule === 'weekly') {
        nextScheduledAtDate.setDate(nextScheduledAtDate.getDate() + (interval * 7));
      } else if (rule === 'monthly') {
        nextScheduledAtDate.setMonth(nextScheduledAtDate.getMonth() + interval);
      } else if (rule === 'yearly') {
        nextScheduledAtDate.setFullYear(nextScheduledAtDate.getFullYear() + interval);
      }

      scheduledAt = nextScheduledAtDate.toISOString();
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

  return plan;
}

export async function updatePlan(userId: string, planId: string, input: UpdatePlanInput) {
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

  if (statusToApply === 'completed' && hasRepeatRule) {
    // 1. Create a completed static copy of the plan for history
    const completedPlanData = {
      pet_id: input.pet_id || currentPlan.pet_id,
      user_id: currentPlan.user_id,
      category: input.category || currentPlan.category,
      sub_type: input.sub_type || currentPlan.sub_type,
      scheduled_at: input.scheduled_at || currentPlan.scheduled_at,
      repeat_rule: null,
      ends_at: null,
      notif_before: 0,
      notif_unit: 'minute',
      note: input.note !== undefined ? input.note : currentPlan.note,
      extra_data: { ...(input.extra_data || currentPlan.extra_data), is_past_done: true },
      status: 'completed',
    };

    await supabase.from('plans').insert(completedPlanData);

    // 2. Calculate the next occurrence date
    const currentScheduledAt = new Date(input.scheduled_at || currentPlan.scheduled_at);
    let nextScheduledAtDate = new Date(currentScheduledAt);

    const interval = Number(input.extra_data?.interval || currentPlan.extra_data?.interval) || 1;
    const rule = hasRepeatRule;

    if (rule === 'hour' || rule === 'hourly') {
      nextScheduledAtDate.setHours(nextScheduledAtDate.getHours() + interval);
    } else if (rule === 'daily') {
      nextScheduledAtDate.setDate(nextScheduledAtDate.getDate() + interval);
    } else if (rule === 'weekly') {
      nextScheduledAtDate.setDate(nextScheduledAtDate.getDate() + (interval * 7));
    } else if (rule === 'monthly') {
      nextScheduledAtDate.setMonth(nextScheduledAtDate.getMonth() + interval);
    } else if (rule === 'yearly') {
      nextScheduledAtDate.setFullYear(nextScheduledAtDate.getFullYear() + interval);
    }

    const nextScheduledAt = nextScheduledAtDate.toISOString();

    // 3. Roll original plan forward
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .update({
        scheduled_at: nextScheduledAt,
        repeat_rule: rule,
        category: input.category || currentPlan.category,
        sub_type: input.sub_type || currentPlan.sub_type,
        ends_at: input.ends_at !== undefined ? input.ends_at : currentPlan.ends_at,
        notif_before: input.notif_before !== undefined ? input.notif_before : currentPlan.notif_before,
        notif_unit: input.notif_unit || currentPlan.notif_unit,
        note: input.note !== undefined ? input.note : currentPlan.note,
        extra_data: input.extra_data || currentPlan.extra_data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .select()
      .single();

    if (planError) throw new Error(planError.message);

    // Update notification job for the next occurrence
    const newNotifBefore = plan.notif_before;
    const newNotifUnit = plan.notif_unit;
    const newFireAt = calculateFireAt(nextScheduledAt, newNotifBefore, newNotifUnit);

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

    return plan;
  }

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

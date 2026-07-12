import { createServerSupabaseClient } from '@/lib/supabase/server';
import { CreatePlanInput, UpdatePlanInput } from './schema';

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
    throw new Error('Pet bulunamadı veya yetkiniz yok.');
  }
  return true;
}

export async function createPlan(userId: string, input: CreatePlanInput) {
  await verifyPetOwnership(userId, input.pet_id);
  const supabase = await createServerSupabaseClient();
  
  const fireAt = calculateFireAt(input.scheduled_at, input.notif_before, input.notif_unit);

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      user_id: userId,
      pet_id: input.pet_id,
      category: input.category,
      sub_type: input.sub_type,
      scheduled_at: input.scheduled_at,
      repeat_rule: input.repeat_rule || null,
      ends_at: input.ends_at || null,
      notif_before: input.notif_before,
      notif_unit: input.notif_unit,
      note: input.note || null,
      extra_data: input.extra_data || {},
    })
    .select()
    .single();

  if (planError) throw new Error(planError.message);

  if (fireAt) {
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
    throw new Error('Plan bulunamadı.');
  }

  const { data: plan, error: planError } = await supabase
    .from('plans')
    .update({
      ...input,
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

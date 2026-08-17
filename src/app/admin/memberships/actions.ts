'use server';

import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { membershipService } from '@/lib/membership';
import { revalidatePath } from 'next/cache';

async function ensureAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== 'admin' && profile.role !== 'founder')) {
    throw new Error('Unauthorized: Admin access required');
  }
  return profile;
}

export async function assignPlanAction(profileId: string, plan: string, durationDays: number = 60, reason?: string) {
  const admin = await ensureAdmin();
  const result = await membershipService.assignPlan(
    {
      profileId,
      plan,
      durationDays,
      reason: reason || 'ADMIN_ASSIGNMENT',
      adminId: admin.id
    },
    'manual'
  );
  revalidatePath('/admin/memberships');
  return result;
}

export async function changePlanAction(profileId: string, newPlan: string, reason?: string) {
  const admin = await ensureAdmin();
  const result = await membershipService.changePlan(
    {
      profileId,
      newPlan,
      reason: reason || 'ADMIN_CHANGE',
      adminId: admin.id
    },
    'manual'
  );
  revalidatePath('/admin/memberships');
  return result;
}

export async function extendPlanAction(profileId: string, additionalDays: number = 30, reason?: string, idempotencyKey?: string) {
  if (!idempotencyKey) throw new Error("idempotencyKey is required");
  const admin = await ensureAdmin();
  const result = await membershipService.extendPlan(
    {
      profileId,
      additionalDays,
      reason: reason || 'ADMIN_EXTENSION',
      adminId: admin.id,
      idempotencyKey
    },
    'manual'
  );
  revalidatePath('/admin/memberships');
  return result;
}

export async function extendAiPlusAction(profileId: string, additionalDays: number = 30, reason?: string, idempotencyKey?: string) {
  if (!idempotencyKey) throw new Error("idempotencyKey is required");
  const admin = await ensureAdmin();
  
  // Direct PG logic to bypass PostgREST limits and strictly grant AI+
  const { Client } = await import('pg');
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const dbUrl = process.env.DATABASE_URL;
  const pgClient = new Client({ connectionString: dbUrl });
  
  try {
    await pgClient.connect();
    
    // 1. Get current ai_plus_until
    const res = await pgClient.query('SELECT ai_plus_until FROM user_subscriptions WHERE profile_id = $1', [profileId]);
    let currentUntil = res.rows[0]?.ai_plus_until;
    let newUntil = new Date();
    if (currentUntil && new Date(currentUntil) > new Date()) {
      newUntil = new Date(currentUntil);
    }
    newUntil.setDate(newUntil.getDate() + additionalDays);
    const newUntilISO = newUntil.toISOString();
    
    // 2. Update user_subscriptions
    await pgClient.query(`
      UPDATE user_subscriptions 
      SET ai_plus_until = $1, status = 'active', updated_at = NOW() 
      WHERE profile_id = $2
    `, [newUntilISO, profileId]);
    
    // 3. Insert into membership_credits for audit
    await pgClient.query(`
      INSERT INTO membership_credits (profile_id, credit_days, reason, idempotency_key, metadata)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      profileId, 
      additionalDays, 
      reason || 'ADMIN_AI_PLUS_EXTENSION',
      idempotencyKey,
      JSON.stringify({ granted_by: admin.id, target: 'ai_plus', note: 'Direct AI+ Grant' })
    ]);
    
    // 4. Update profiles if premium_tier is free (upgrade to ai_plus)
    const profileRes = await pgClient.query('SELECT premium_tier, premium_until FROM profiles WHERE id = $1', [profileId]);
    const p = profileRes.rows[0];
    if (p) {
      const tier = p.premium_tier;
      if (tier === 'free' || tier === null) {
        await pgClient.query('UPDATE profiles SET premium_tier = $1, premium_until = $2 WHERE id = $3', ['ai_plus', newUntilISO, profileId]);
      } else if (tier === 'ai_plus') {
        await pgClient.query('UPDATE profiles SET premium_until = $1 WHERE id = $2', [newUntilISO, profileId]);
      }
    }
    
  } finally {
    await pgClient.end();
  }
  
  revalidatePath('/admin/memberships');
  return { success: true };
}

export async function startTrialAction(profileId: string, plan: string = 'ai_plus', trialDays: number = 30, reason?: string) {
  const admin = await ensureAdmin();
  const result = await membershipService.startTrial(
    {
      profileId,
      plan,
      trialDays,
      reason: reason || 'ADMIN_TRIAL',
      adminId: admin.id
    },
    'manual'
  );
  revalidatePath('/admin/memberships');
  return result;
}

export async function cancelMembershipAction(profileId: string, immediate: boolean = false, reason?: string) {
  const admin = await ensureAdmin();
  const result = await membershipService.cancel(
    {
      profileId,
      immediate,
      reason: reason || 'ADMIN_CANCELLATION',
      adminId: admin.id
    },
    'manual'
  );
  revalidatePath('/admin/memberships');
  return result;
}

export async function resumeMembershipAction(profileId: string, reason?: string) {
  const admin = await ensureAdmin();
  const result = await membershipService.resume(
    {
      profileId,
      reason: reason || 'ADMIN_RESUME',
      adminId: admin.id
    },
    'manual'
  );
  revalidatePath('/admin/memberships');
  return result;
}

export async function grantMembershipAction(profileId: string, days: number = 30, reason?: string, idempotencyKey?: string) {
  if (!idempotencyKey) throw new Error("idempotencyKey is required");
  const admin = await ensureAdmin();
  const result = await membershipService.grantMembership(profileId, days, reason || 'ADMIN_GRANT', admin.id, idempotencyKey);
  revalidatePath('/admin/memberships');
  return result;
}

export async function expireMembershipAction(profileId: string) {
  const admin = await ensureAdmin();
  const result = await membershipService.expireMembership(profileId, admin.id);
  revalidatePath('/admin/memberships');
  return result;
}

export async function resetQuotaAction(profileId: string, featureKey: string, reason?: string) {
  const admin = await ensureAdmin();
  const result = await membershipService.resetQuota(
    {
      profileId,
      featureKey,
      reason: reason || 'ADMIN_RESET_QUOTA',
      adminId: admin.id
    },
    'manual'
  );
  revalidatePath('/admin/memberships');
  return result;
}

export async function getUserMembershipDetailsAction(profileId: string) {
  const admin = await ensureAdmin();
  const { createAdminSupabaseClient } = await import('@/lib/supabase/server');
  const adminSupabase = createAdminSupabaseClient();
  
  const [credits, events, referrals] = await Promise.all([
    adminSupabase.from('membership_credits').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }),
    adminSupabase.from('membership_events').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }),
    adminSupabase.from('referrals')
      .select('*, referred:profiles!referrals_referred_id_fkey(first_name, last_name, email)')
      .eq('referrer_id', profileId)
      .order('created_at', { ascending: false })
  ]);
  
  return { 
    credits: credits.data || [], 
    events: events.data || [],
    referrals: referrals.data || []
  };
}
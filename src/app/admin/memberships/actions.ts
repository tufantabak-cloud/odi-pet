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

export async function extendPlanAction(profileId: string, additionalDays: number = 30, reason?: string) {
  const admin = await ensureAdmin();
  const result = await membershipService.extendPlan(
    {
      profileId,
      additionalDays,
      reason: reason || 'ADMIN_EXTENSION',
      adminId: admin.id
    },
    'manual'
  );
  revalidatePath('/admin/memberships');
  return result;
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

export async function grantMembershipAction(profileId: string, days: number = 30, reason?: string) {
  const admin = await ensureAdmin();
  const result = await membershipService.grantMembership(profileId, days, reason || 'ADMIN_GRANT', admin.id);
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

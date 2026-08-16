import { createAdminSupabaseClient } from '@/lib/supabase/server';
import {
  IMembershipProvider,
  MembershipProviderType,
  AssignPlanParams,
  ChangePlanParams,
  StartTrialParams,
  ExtendMembershipParams,
  CancelMembershipParams,
  ResumeMembershipParams,
  GrantQuotaParams,
  ResetQuotaParams,
  CreateOverrideParams,
  RemoveOverrideParams,
  MembershipDetails,
  ListMembershipsOptions,
  SubscriptionState
} from './types';
import { MembershipCalculator } from './MembershipCalculator';

export class ManualMembershipProvider implements IMembershipProvider {
  readonly providerType: MembershipProviderType = 'manual';

  protected getClient() {
    return createAdminSupabaseClient();
  }

  async getMembership(profileId: string): Promise<MembershipDetails | null> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*, profiles!user_subscriptions_profile_id_fkey(first_name, last_name, email, referral_code)')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error || !data) return null;

    const profileObj = data.profiles as any;
    const state = MembershipCalculator.calculateMembershipState(data);

    return {
      id: data.id,
      profileId: data.profile_id || profileId,
      plan: state.computedPlan,
      status: state.status as SubscriptionState,
      provider: data.provider || this.providerType,
      reason: data.reason || undefined,
      aiPlusUntil: data.ai_plus_until,
      proUntil: data.pro_until,
      currentPeriodEnd: state.currentPeriodEnd ? state.currentPeriodEnd.toISOString() : null,
      createdAt: data.created_at,
      profile: profileObj
    };
  }

  async assignPlan(params: AssignPlanParams): Promise<{ success: boolean; membership: MembershipDetails }> {
    const supabase = this.getClient();
    const durationDays = params.durationDays ?? 60;
    const periodEnd = new Date(Date.now() + durationDays * 86400000).toISOString();

    const updatePayload: any = {
      profile_id: params.profileId,
      plan: params.plan,
      status: 'active',
      provider: this.providerType,
      reason: params.reason || 'MANUAL_ASSIGNMENT',
      current_period_end: periodEnd
    };

    if (params.plan === 'ai_plus') updatePayload.ai_plus_until = periodEnd;
    if (params.plan === 'pro') updatePayload.pro_until = periodEnd;

    const { data, error } = await supabase
      .from('user_subscriptions')
      .upsert(updatePayload, { onConflict: 'profile_id' })
      .select('*, profiles!user_subscriptions_profile_id_fkey(first_name, last_name, email, referral_code)')
      .single();

    if (error || !data) {
      throw new Error(`Failed to assign plan: ${error?.message || 'Unknown error'}`);
    }

    await supabase
      .from('profiles')
      .update({ premium_tier: params.plan, premium_until: periodEnd })
      .eq('id', params.profileId);

    const membership = await this.getMembership(params.profileId);
    return { success: true, membership: membership! };
  }

  async changePlan(params: ChangePlanParams): Promise<{ success: boolean; membership: MembershipDetails }> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        plan: params.newPlan,
        provider: this.providerType,
        reason: params.reason || 'MANUAL_CHANGE'
      })
      .eq('profile_id', params.profileId)
      .select('*, profiles!user_subscriptions_profile_id_fkey(first_name, last_name, email, referral_code)')
      .single();

    if (error || !data) {
      throw new Error(`Failed to change plan: ${error?.message || 'Unknown error'}`);
    }

    await supabase
      .from('profiles')
      .update({ premium_tier: params.newPlan })
      .eq('id', params.profileId);

    const membership = await this.getMembership(params.profileId);
    return { success: true, membership: membership! };
  }

  async startTrial(params: StartTrialParams): Promise<{ success: boolean; membership: MembershipDetails }> {
    const supabase = this.getClient();
    const plan = params.plan || 'ai_plus';
    const periodEnd = new Date(Date.now() + params.trialDays * 86400000).toISOString();

    const updatePayload: any = {
      profile_id: params.profileId,
      plan: plan,
      status: 'trialing',
      provider: this.providerType,
      reason: params.reason || 'MANUAL_TRIAL',
      current_period_end: periodEnd
    };

    if (plan === 'ai_plus') updatePayload.ai_plus_until = periodEnd;
    if (plan === 'pro') updatePayload.pro_until = periodEnd;

    const { data, error } = await supabase
      .from('user_subscriptions')
      .upsert(updatePayload, { onConflict: 'profile_id' })
      .select('*, profiles!user_subscriptions_profile_id_fkey(first_name, last_name, email, referral_code)')
      .single();

    if (error || !data) {
      throw new Error(`Failed to start trial: ${error?.message || 'Unknown error'}`);
    }

    await supabase
      .from('profiles')
      .update({ premium_tier: plan, premium_until: periodEnd })
      .eq('id', params.profileId);

    const membership = await this.getMembership(params.profileId);
    return { success: true, membership: membership! };
  }

  async extendMembership(params: ExtendMembershipParams): Promise<{ success: boolean; membership: MembershipDetails }> {
    const supabase = this.getClient();

    const { error } = await supabase.rpc('grant_membership_credit', {
      p_profile_id: params.profileId,
      p_days: params.additionalDays,
      p_reason: params.reason || 'EXTENSION',
      p_idempotency_key: params.idempotencyKey || `extension_${Date.now()}_${Math.random()}`,
      p_metadata: params.metadata || {}
    });

    if (error) {
      throw new Error(`Failed to extend membership: ${error.message}`);
    }

    const membership = await this.getMembership(params.profileId);
    return { success: true, membership: membership! };
  }

  async cancelMembership(params: CancelMembershipParams): Promise<{ success: boolean; membership: MembershipDetails }> {
    const supabase = this.getClient();
    const nowISO = new Date().toISOString();

    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        provider: this.providerType,
        reason: params.reason || 'MANUAL_CANCELLATION',
        current_period_end: params.immediate ? nowISO : undefined,
        ai_plus_until: params.immediate ? nowISO : undefined,
        pro_until: params.immediate ? nowISO : undefined
      })
      .eq('profile_id', params.profileId)
      .select('*, profiles!user_subscriptions_profile_id_fkey(first_name, last_name, email, referral_code)')
      .single();

    if (error || !data) {
      throw new Error(`Failed to cancel membership: ${error?.message || 'Unknown error'}`);
    }

    if (params.immediate) {
      await supabase
        .from('profiles')
        .update({ premium_until: nowISO, premium_tier: 'free' })
        .eq('id', params.profileId);
    }

    const membership = await this.getMembership(params.profileId);
    return { success: true, membership: membership! };
  }

  async resumeMembership(params: ResumeMembershipParams): Promise<{ success: boolean; membership: MembershipDetails }> {
    const supabase = this.getClient();
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 86400000).toISOString();

    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        provider: this.providerType,
        reason: params.reason || 'MANUAL_RESUME',
        current_period_end: periodEnd,
        pro_until: periodEnd
      })
      .eq('profile_id', params.profileId)
      .select('*, profiles!user_subscriptions_profile_id_fkey(first_name, last_name, email, referral_code)')
      .single();

    if (error || !data) {
      throw new Error(`Failed to resume membership: ${error?.message || 'Unknown error'}`);
    }

    await supabase
      .from('profiles')
      .update({ premium_until: periodEnd, premium_tier: 'pro' })
      .eq('id', params.profileId);

    const membership = await this.getMembership(params.profileId);
    return { success: true, membership: membership! };
  }

  async grantQuota(params: GrantQuotaParams): Promise<{ success: boolean }> {
    const supabase = this.getClient();
    const { error } = await supabase.from('feature_limits').upsert(
      {
        feature_key: params.featureKey,
        plan_tier: 'manual_override',
        limit_type: 'quota',
        limit_value: params.quotaAmount,
        window_value: 30,
        window_unit: 'day',
        is_enabled: true
      },
      { onConflict: 'feature_key,plan_tier' }
    );

    return { success: !error };
  }

  async resetQuota(params: ResetQuotaParams): Promise<{ success: boolean }> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from('feature_usage')
      .delete()
      .eq('user_id', params.profileId)
      .eq('feature_key', params.featureKey);

    return { success: !error };
  }

  async createOverride(params: CreateOverrideParams): Promise<{ success: boolean }> {
    const supabase = this.getClient();
    const { error } = await supabase.from('feature_overrides').upsert(
      {
        user_id: params.profileId,
        feature_key: params.featureKey,
        is_enabled: params.isEnabled,
        custom_limit: params.customLimit ?? null,
        expires_at: params.expiresAt ?? null,
        created_by: params.adminId ?? null
      },
      { onConflict: 'user_id,feature_key' }
    );

    return { success: !error };
  }

  async removeOverride(params: RemoveOverrideParams): Promise<{ success: boolean }> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from('feature_overrides')
      .delete()
      .eq('user_id', params.profileId)
      .eq('feature_key', params.featureKey);

    return { success: !error };
  }

  async listMemberships(options?: ListMembershipsOptions): Promise<{ data: MembershipDetails[]; total: number }> {
    const supabase = this.getClient();
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 50;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('user_subscriptions')
      .select('*, profiles!user_subscriptions_profile_id_fkey(first_name, last_name, email, referral_code)', { count: 'exact' });

    if (options?.plan && options.plan !== 'all') {
      query = query.eq('plan', options.plan);
    }
    if (options?.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    if (options?.provider && options.provider !== 'all') {
      query = query.eq('provider', options.provider);
    }

    const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false });

    if (error || !data) {
      return { data: [], total: 0 };
    }

    const memberships: MembershipDetails[] = data.map((item: any) => {
      const profileObj = item.profiles;
      const state = MembershipCalculator.calculateMembershipState(item);

      return {
        id: item.id,
        profileId: item.profile_id,
        plan: state.computedPlan,
        status: state.status as SubscriptionState,
        provider: item.provider || 'manual',
        reason: item.reason || undefined,
        aiPlusUntil: item.ai_plus_until,
        proUntil: item.pro_until,
        currentPeriodEnd: state.currentPeriodEnd ? state.currentPeriodEnd.toISOString() : null,
        createdAt: item.created_at,
        profile: profileObj
      };
    });

    return { data: memberships, total: count || 0 };
  }
}

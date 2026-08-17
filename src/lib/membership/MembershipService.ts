import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { IMembershipProvider } from './MembershipProvider';
import { ReferralMembershipProvider } from './ReferralMembershipProvider';
import { ManualMembershipProvider } from './ManualMembershipProvider';
import {
  SubscriptionState,
  MembershipProviderType,
  AssignPlanParams,
  ChangePlanParams,
  StartTrialParams,
  ExtendMembershipParams,
  CancelMembershipParams,
  ResumeMembershipParams,
  GrantQuotaParams,
  ResetQuotaParams,
  MembershipDetails,
  MembershipEventType
} from './types';

const ALLOWED_TRANSITIONS: Record<SubscriptionState, SubscriptionState[]> = {
  FREE: ['TRIAL', 'ACTIVE', 'PAUSED'],
  TRIAL: ['ACTIVE', 'EXPIRED', 'CANCELLED', 'PAUSED'],
  ACTIVE: ['EXPIRED', 'GRACE', 'CANCELLED', 'PAUSED', 'TRIAL'],
  EXPIRED: ['ACTIVE', 'TRIAL', 'FREE'],
  GRACE: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
  CANCELLED: ['ACTIVE', 'TRIAL', 'FREE'],
  PAUSED: ['ACTIVE', 'CANCELLED', 'FREE']
};

export class MembershipService {
  private providers: Record<MembershipProviderType, IMembershipProvider>;

  constructor() {
    this.providers = {
      referral: new ReferralMembershipProvider(),
      manual: new ManualMembershipProvider(),
      stripe: new ManualMembershipProvider(),
      iyzico: new ManualMembershipProvider(),
      google_play: new ManualMembershipProvider(),
      apple: new ManualMembershipProvider()
    };
  }

  getProvider(type: MembershipProviderType = 'manual'): IMembershipProvider {
    return this.providers[type] || this.providers.manual;
  }

  private validateStateTransition(currentState: SubscriptionState, targetState: SubscriptionState) {
    if (currentState === targetState) return;
    const allowed = ALLOWED_TRANSITIONS[currentState] || [];
    if (!allowed.includes(targetState)) {
      throw new Error(`Geçersiz üyelik durum geçişi: ${currentState} -> ${targetState}`);
    }
  }

  private async logEvent(
    profileId: string,
    eventType: MembershipEventType,
    previousPlan?: string | null,
    newPlan?: string | null,
    provider: string = 'manual',
    metadata: Record<string, any> = {}
  ) {
    const supabase = createAdminSupabaseClient();
    await supabase.from('membership_events').insert({
      profile_id: profileId,
      event_type: eventType,
      previous_plan: previousPlan || null,
      new_plan: newPlan || null,
      provider: provider,
      metadata: metadata
    });
  }

  // FORENSIC DÜZELTME (schema-drift sweep): `premium_audit_logs`'un gerçek
  // (canlı) şeması `20260807013400_enterprise_premium_v3.sql`'de
  // KOŞULSUZ olarak ilk kez oluşturuldu: `id, user_id UUID NOT NULL,
  // action_type TEXT NOT NULL, old_value, new_value, ip_address,
  // created_at`. Daha sonraki `20260807100000_membership_events_and_referral_provider.sql`
  // aynı tabloyu `admin_id, target_profile_id, action, reason, metadata,
  // timestamp` kolonlarıyla yeniden `CREATE TABLE IF NOT EXISTS` ile
  // tanımlamaya çalıştı — tablo zaten var olduğu için no-op oldu; hiçbir
  // ALTER TABLE ile bu kolonlar gerçek tabloya eklenmedi. Bu fonksiyon
  // yanlışlıkla no-op olan ikinci tanıma göre yazılmıştı; her çağrıda
  // sessizce (hata hiç kontrol edilmeden) başarısız oluyordu.
  //
  // Alan eşlemesi (gerçek şemada karşılığı olmayanlar `new_value`
  // JSONB'sine kayıpsız şekilde katlanıyor, veri atılmıyor):
  //   admin_id -> user_id (gerçek kolon NOT NULL; admin_id tanımsızsa
  //     targetProfileId'ye düşülüyor — çağıran taraflarda adminId her
  //     zaman opsiyonel (bkz. types.ts `adminId?: string`), bu yüzden
  //     satırın en az etkilenen kullanıcıya atfedilmesi, NOT NULL
  //     ihlaliyle audit kaydının tamamen kaybolmasından daha güvenli).
  //   action -> action_type
  //   target_profile_id, reason, metadata -> new_value içine katlanır
  //   (gerçek şemada bu üçü için ayrı kolon yok)
  // Bu tablo yalnızca service_role'e GRANT edildiği için (`GRANT SELECT,
  // INSERT, UPDATE, DELETE ... TO service_role`) ve bu servis zaten
  // `createAdminSupabaseClient()` (service-role) kullandığı için GRANT
  // sorunu burada yok — yalnızca kolon adları yanlıştı.
  private async logAudit(
    adminId: string | undefined,
    targetProfileId: string,
    action: string,
    oldValue: any,
    newValue: any,
    reason?: string,
    metadata: Record<string, any> = {}
  ) {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase.from('premium_audit_logs').insert({
      user_id: adminId || targetProfileId,
      action_type: action,
      old_value: oldValue ?? {},
      new_value: {
        ...(newValue && typeof newValue === 'object' ? newValue : {}),
        target_profile_id: targetProfileId,
        reason: reason ?? null,
        metadata,
      },
    });
    if (error) {
      console.error('[MembershipService.logAudit] Insert failed:', error.message);
    }
  }

  async getMembership(profileId: string): Promise<MembershipDetails | null> {
    return this.getProvider('manual').getMembership(profileId);
  }

  // 1. AssignPlan
  async assignPlan(params: AssignPlanParams, providerType: MembershipProviderType = 'manual') {
    const existing = await this.getMembership(params.profileId);
    if (existing) {
      this.validateStateTransition(existing.status, 'ACTIVE');
    }

    const provider = this.getProvider(providerType);
    const result = await provider.assignPlan(params);

    await this.logEvent(params.profileId, 'ASSIGNED', existing?.plan, params.plan, providerType, params.metadata || {});
    await this.logAudit(params.adminId, params.profileId, 'ASSIGN_PLAN', existing || {}, result.membership, params.reason, params.metadata || {});

    return result;
  }

  // 2. ChangePlan
  async changePlan(params: ChangePlanParams, providerType: MembershipProviderType = 'manual') {
    const existing = await this.getMembership(params.profileId);
    const provider = this.getProvider(providerType);
    const result = await provider.changePlan(params);

    await this.logEvent(params.profileId, 'CHANGED', existing?.plan, params.newPlan, providerType, params.metadata || {});
    await this.logAudit(params.adminId, params.profileId, 'CHANGE_PLAN', existing || {}, result.membership, params.reason, params.metadata || {});

    return result;
  }

  // 3. ExtendPlan (extendMembership)
  async extendPlan(params: ExtendMembershipParams, providerType: MembershipProviderType = 'manual') {
    const existing = await this.getMembership(params.profileId);
    const provider = this.getProvider(providerType);
    const result = await provider.extendMembership(params);

    await this.logEvent(params.profileId, 'REWARD_GRANTED', existing?.plan, result.membership.plan, providerType, { additionalDays: params.additionalDays, ...params.metadata });
    await this.logAudit(params.adminId, params.profileId, 'EXTEND_MEMBERSHIP', { currentPeriodEnd: existing?.currentPeriodEnd }, { newPeriodEnd: result.membership.currentPeriodEnd, additionalDays: params.additionalDays }, params.reason, params.metadata || {});

    return result;
  }

  async extendMembership(params: ExtendMembershipParams, providerType: MembershipProviderType = 'manual') {
    return this.extendPlan(params, providerType);
  }

  // 4. StartTrial
  async startTrial(params: StartTrialParams, providerType: MembershipProviderType = 'manual') {
    const existing = await this.getMembership(params.profileId);
    if (existing) {
      this.validateStateTransition(existing.status, 'TRIAL');
    }

    const provider = this.getProvider(providerType);
    const result = await provider.startTrial(params);

    await this.logEvent(params.profileId, 'TRIAL_STARTED', existing?.plan, params.plan || 'ai_plus', providerType, params.metadata || {});
    await this.logAudit(params.adminId, params.profileId, 'START_TRIAL', existing || {}, result.membership, params.reason, params.metadata || {});

    return result;
  }

  // 5. Cancel
  async cancel(params: CancelMembershipParams, providerType: MembershipProviderType = 'manual') {
    const existing = await this.getMembership(params.profileId);
    if (existing) {
      this.validateStateTransition(existing.status, 'CANCELLED');
    }

    const provider = this.getProvider(providerType);
    const result = await provider.cancelMembership(params);

    await this.logEvent(params.profileId, 'CANCELLED', existing?.plan, existing?.plan, providerType, params.metadata || {});
    await this.logAudit(params.adminId, params.profileId, 'CANCEL_MEMBERSHIP', existing || {}, result.membership, params.reason, params.metadata || {});

    return result;
  }

  async cancelMembership(params: CancelMembershipParams, providerType: MembershipProviderType = 'manual') {
    return this.cancel(params, providerType);
  }

  // 6. Resume
  async resume(params: ResumeMembershipParams, providerType: MembershipProviderType = 'manual') {
    const existing = await this.getMembership(params.profileId);
    if (existing) {
      this.validateStateTransition(existing.status, 'ACTIVE');
    }

    const provider = this.getProvider(providerType);
    const result = await provider.resumeMembership(params);

    await this.logEvent(params.profileId, 'RESUMED', existing?.plan, existing?.plan, providerType, params.metadata || {});
    await this.logAudit(params.adminId, params.profileId, 'RESUME_MEMBERSHIP', existing || {}, result.membership, params.reason, params.metadata || {});

    return result;
  }

  async resumeMembership(params: ResumeMembershipParams, providerType: MembershipProviderType = 'manual') {
    return this.resume(params, providerType);
  }

  // 7. GrantMembership
  async grantMembership(profileId: string, days: number, reason: string = 'MANUAL_GRANT', adminId?: string, idempotencyKey?: string) {
    // Idempotency anahtarı çağıran tarafından üretilmelidir. Burada üretilirse
    // her çağrı yeni anahtar alır ve mükerrer gün ekleme koruması çalışmaz.
    if (!idempotencyKey) throw new Error('grantMembership requires an idempotencyKey');
    return this.extendPlan({ profileId, additionalDays: days, reason, adminId, idempotencyKey }, 'manual');
  }

  // 8. ExpireMembership
  async expireMembership(profileId: string, adminId?: string) {
    const supabase = createAdminSupabaseClient();
    const nowISO = new Date().toISOString();

    await supabase
      .from('user_subscriptions')
      .update({
        plan: 'free',
        status: 'expired',
        ai_plus_until: nowISO,
        pro_until: nowISO,
        current_period_end: nowISO
      })
      .eq('profile_id', profileId);

    await supabase.from('profiles').update({ premium_tier: 'free', premium_until: nowISO }).eq('id', profileId);

    await this.logEvent(profileId, 'EXPIRED', null, 'free', 'manual', {});
    await this.logAudit(adminId, profileId, 'EXPIRE_MEMBERSHIP', {}, { plan: 'free' }, 'Admin expired membership');

    const updated = await this.getMembership(profileId);
    return { success: true, membership: updated! };
  }

  // 9. ResetQuota
  async resetQuota(params: ResetQuotaParams, providerType: MembershipProviderType = 'manual') {
    const provider = this.getProvider(providerType);
    const result = await provider.resetQuota(params);

    await this.logEvent(params.profileId, 'QUOTA_RESET', null, null, providerType, params);
    await this.logAudit(params.adminId, params.profileId, 'RESET_QUOTA', {}, params, params.reason);

    return result;
  }

  // Legacy helper methods
  async assignReferral(referrerId: string, referredId: string, rewardDays: number = 30, adminId?: string) {
    const supabase = createAdminSupabaseClient();

    const { data: refData, error: refError } = await supabase
      .from('referrals')
      .upsert(
        {
          referrer_id: referrerId,
          referred_id: referredId,
          status: 'qualified',
          reward_days: rewardDays
        },
        { onConflict: 'referred_id' }
      )
      .select()
      .single();

    if (refError) {
      throw new Error(`Failed to assign referral: ${refError.message}`);
    }

    return this.extendPlan(
      {
        profileId: referrerId,
        additionalDays: rewardDays,
        reason: `REFERRAL_REWARD:${referredId}`,
        adminId: adminId,
        metadata: { referral_id: refData.id, referred_id: referredId },
        idempotencyKey: `legacy_referral_${referrerId}_${referredId}`
      },
      'manual'
    );
  }

  async removeReferral(referralId: string, adminId?: string) {
    const supabase = createAdminSupabaseClient();
    const { data: existing } = await supabase.from('referrals').select('*').eq('id', referralId).single();
    if (!existing) throw new Error('Referral record not found');

    await supabase.from('referrals').delete().eq('id', referralId);
    await this.logAudit(adminId, existing.referrer_id, 'REMOVE_REFERRAL', existing, {}, 'Admin removed referral');
    return { success: true };
  }
}

export const membershipService = new MembershipService();

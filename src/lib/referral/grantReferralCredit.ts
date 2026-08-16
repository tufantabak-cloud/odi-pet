import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { DEFAULT_SETTINGS } from '@/app/api/admin/memberships/settings/route'
import { membershipService } from '@/lib/membership'

export async function grantReferralCredit(referralId: string) {
  const adminSupabase = createAdminSupabaseClient()

  // 1. Dinamik ayarları veritabanından çek (veya varsayılan kuralları yükle)
  let settings = { ...DEFAULT_SETTINGS }
  let referralRewardDays = 30

  try {
    const { data: settingsRow } = await adminSupabase
      .from('system_settings')
      .select('value')
      .eq('key', 'membership_rules')
      .maybeSingle()

    if (settingsRow?.value) {
      settings = { ...DEFAULT_SETTINGS, ...settingsRow.value }
    }

    const { data: rewardRow } = await adminSupabase
      .from('system_settings')
      .select('value')
      .eq('key', 'referral_rewards')
      .maybeSingle()

    if (rewardRow?.value?.referral_reward_days) {
      referralRewardDays = Number(rewardRow.value.referral_reward_days) || 30
    }
  } catch {
    // Fallback default values
  }

  // 2. Referral detayını çek
  const { data: referral, error: refError } = await adminSupabase
    .from('referrals')
    .select('*')
    .eq('id', referralId)
    .single()

  if (refError || !referral) {
    throw new Error(`Referral record not found: ${referralId}`)
  }

  if (referral.status !== 'qualified') {
    console.warn(`Referral ${referralId} is not qualified. Credit skipped.`)
    return { success: false, reason: 'NOT_QUALIFIED' }
  }

  const referrerId = referral.referrer_id
  const refereeId = referral.referred_id

  // 3. Aylık davet sınırı kontrolü
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { count: monthlyCount } = await adminSupabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)
    .eq('status', 'qualified')
    .gte('qualified_at', startOfMonth)

  if ((monthlyCount ?? 0) >= settings.monthly_invite_cap) {
    console.warn(`Referrer ${referrerId} reached monthly qualified invite limit (${settings.monthly_invite_cap}). Credit skipped.`)
    return { success: false, reason: 'MONTHLY_LIMIT_REACHED' }
  }

  // 4. Davet edenin toplam nitelikli davet sayısını bul (bu davet dahil)
  const { count: totalQualifiedCount } = await adminSupabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)
    .eq('status', 'qualified')

  const inviteIndex = (totalQualifiedCount ?? 0) + 1 // 1-indexed

  let referrerCreditDays = Math.max(referralRewardDays, settings.referral_tier_1_days)

  if (inviteIndex === 2) {
    referrerCreditDays += settings.referral_tier_2_bonus
  } else if (inviteIndex === 3) {
    referrerCreditDays += settings.referral_tier_3_bonus
  } else if (inviteIndex === 4) {
    referrerCreditDays += settings.referral_tier_4_bonus
  } else if (inviteIndex >= 5) {
    referrerCreditDays += settings.referral_tier_5_bonus
  }

  // 6. Davet Edene Kademeli Kredi Tanımla (MembershipService event/audit/notification)
  await membershipService.extendMembership(
    {
      profileId: referrerId,
      additionalDays: referrerCreditDays,
      reason: 'REFERRAL_REWARD',
      idempotencyKey: `referral:${referralId}:referrer`,
      metadata: { referral_id: referralId, invite_index: inviteIndex }
    },
    'referral'
  )

  // 7. Davet Edilene (Yeni Üye) Kredi Tanımla
  await membershipService.extendMembership(
    {
      profileId: refereeId,
      additionalDays: settings.referee_welcome_days,
      reason: 'REFERRAL_REWARD',
      idempotencyKey: `referral:${referralId}:referee`,
      metadata: { referral_id: referralId, role: 'referee' }
    },
    'referral'
  )

  // 8. 5. Davette Kurucu Üye Rozeti ekle
  if (inviteIndex >= 5) {
    await adminSupabase.from('user_badges').upsert(
      { user_id: referrerId, badge_key: 'founder_member' },
      { onConflict: 'user_id, badge_key', ignoreDuplicates: true }
    )
  }

  return { success: true, referrerDays: referrerCreditDays, refereeDays: settings.referee_welcome_days }
}


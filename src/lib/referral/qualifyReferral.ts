import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { grantReferralCredit } from './grantReferralCredit'

export interface QualifyCheckResult {
  referralId: string
  referredId: string
  referrerId: string
  isQualified: boolean
  rejectionReason?: string
  checklist: {
    accountCreated: boolean
    emailVerified: boolean
    hasPet: boolean
    hasHealthRecordWithin14Days: boolean
  }
}

export async function qualifyReferral(referralId: string): Promise<QualifyCheckResult> {
  const adminSupabase = createAdminSupabaseClient()

  // 1. Referral kaydını çek
  const { data: referral, error: refError } = await adminSupabase
    .from('referrals')
    .select('*')
    .eq('id', referralId)
    .single()

  if (refError || !referral) {
    throw new Error(`Referral record not found: ${referralId}`)
  }

  // Zaten sonuçlanmışsa tekrar çalıştırma
  if (referral.status === 'qualified') {
    return {
      referralId: referral.id,
      referredId: referral.referred_id,
      referrerId: referral.referrer_id,
      isQualified: true,
      checklist: {
        accountCreated: true,
        emailVerified: true,
        hasPet: true,
        hasHealthRecordWithin14Days: true,
      },
    }
  }

  const referredId = referral.referred_id

  // 2. Davet edilen kullanıcının hesabı ve e-posta doğrulama durumu
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('id, created_at')
    .eq('id', referredId)
    .single()

  const { data: authUser } = await adminSupabase.auth.admin.getUserById(referredId)

  const accountCreated = !!profile
  const emailVerified = !!(authUser?.user?.email_confirmed_at)

  // 3. En az 1 evcil hayvan kaydı var mı?
  const { data: pets } = await adminSupabase
    .from('pets')
    .select('id, created_at')
    .eq('owner_id', referredId)

  const hasPet = !!(pets && pets.length > 0)

  // 4. Kayıttan sonraki 14 gün içinde en az 1 kanonik sağlık kaydı var mı? (Aşı / Kilo / Parazit)
  let hasHealthRecordWithin14Days = false

  if (profile && pets && pets.length > 0) {
    const signupTime = new Date(profile.created_at).getTime()
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000
    const deadlineISO = new Date(signupTime + fourteenDaysMs).toISOString()
    const petIds = pets.map(p => p.id)

    const [{ count: vaccineCount }, { count: weightCount }, { count: parasiteCount }] = await Promise.all([
      adminSupabase.from('vaccine_records_v2').select('id', { count: 'exact', head: true }).in('pet_id', petIds).lte('created_at', deadlineISO),
      adminSupabase.from('weight_logs').select('id', { count: 'exact', head: true }).in('pet_id', petIds).lte('created_at', deadlineISO),
      adminSupabase.from('parasite_records').select('id', { count: 'exact', head: true }).in('pet_id', petIds).lte('created_at', deadlineISO),
    ])

    hasHealthRecordWithin14Days = (vaccineCount ?? 0) > 0 || (weightCount ?? 0) > 0 || (parasiteCount ?? 0) > 0
  }

  const checklist = {
    accountCreated,
    emailVerified,
    hasPet,
    hasHealthRecordWithin14Days,
  }

  const isQualified = accountCreated && emailVerified && hasPet && hasHealthRecordWithin14Days

  if (isQualified) {
    // 5. Kanonik referral kredi servisini tetikle
    await grantReferralCredit(referral.id)

    // Referans durumunu qualified olarak güncelle
    await adminSupabase
      .from('referrals')
      .update({
        status: 'qualified',
        qualified_at: new Date().toISOString(),
        rejection_reason: null,
      })
      .eq('id', referral.id)
  }

  return {
    referralId: referral.id,
    referredId: referral.referred_id,
    referrerId: referral.referrer_id,
    isQualified,
    checklist,
  }
}

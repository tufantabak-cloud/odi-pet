import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { referralCode } = await req.json()
  if (!referralCode) return NextResponse.json({ error: 'referralCode gerekli' }, { status: 400 })

  const supabase = await createServerSupabaseClient()

  // Kodu sahibini bul
  const { data: referrer } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode.toUpperCase())
    .single()

  if (!referrer) return NextResponse.json({ error: 'Geçersiz referral kodu' }, { status: 404 })
  if (referrer.id === user.id) return NextResponse.json({ error: 'Kendi kodunu kullanamazsın' }, { status: 400 })

  // Referral kaydı oluştur (zaten varsa upsert ile hata engelle)
  const { error } = await supabase.from('referrals').upsert({
    referrer_id: referrer.id,
    referred_id: user.id,
    referral_code: referralCode.toUpperCase(),
  }, { onConflict: 'referred_id', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Rozet kontrolü — referrer için
  const { count } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', referrer.id)

  const badgesToCheck = [
    { key: 'first_invite', threshold: 1 },
    { key: 'three_friends', threshold: 3 },
    { key: 'super_ambassador', threshold: 10 },
  ]

  for (const badge of badgesToCheck) {
    if ((count ?? 0) >= badge.threshold) {
      await supabase.from('user_badges').upsert(
        { user_id: referrer.id, badge_key: badge.key },
        { onConflict: 'user_id, badge_key', ignoreDuplicates: true }
      )
    }
  }

  return NextResponse.json({ success: true })
}

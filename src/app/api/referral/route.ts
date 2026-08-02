import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { getEntitlement } from '@/lib/subscription/entitlement'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  // 1. Referral kodunu al
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code, first_name, premium_until')
    .eq('id', user.id)
    .single()

  // 2. Davet listesini ve sayılarını al
  const { data: invitesList, count: referralCount } = await supabase
    .from('referrals')
    .select('id, referred_id, status, created_at, qualified_at', { count: 'exact' })
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })

  const qualifiedCount = invitesList?.filter(i => i.status === 'qualified').length ?? 0
  const milestoneBonusDays = qualifiedCount >= 5 ? 60 : 0
  const earnedDays = (qualifiedCount * 30) + milestoneBonusDays

  const entitlement = await getEntitlement(user.id)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://odi-petcare.vercel.app'

  return NextResponse.json({
    referralCode: profile?.referral_code ?? null,
    referralUrl: `${appUrl}/?ref=${profile?.referral_code}`,
    referralCount: referralCount ?? 0,
    qualifiedCount,
    earnedDays,
    entitlement,
    invitesList: invitesList ?? [],
    firstName: profile?.first_name ?? ''
  })
}

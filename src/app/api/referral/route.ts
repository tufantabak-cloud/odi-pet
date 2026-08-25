import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { defaultRepository } from '@/lib/features/entitlement/repository'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  // 1. Referral kodunu al
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code, first_name')
    .eq('id', user.id)
    .single()

  // 2. Davet listesini ve sayılarını al
  const { data: invitesList, count: referralCount } = await supabase
    .from('referrals')
    .select('id, referred_id, status, created_at, qualified_at', { count: 'exact' })
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })

  const qualifiedCount = invitesList?.filter(i => i.status === 'qualified').length ?? 0
  
  const { data: credits } = await supabase
    .from('membership_credits')
    .select('credit_days')
    .eq('profile_id', user.id)
    .eq('reason', 'REFERRAL_REWARD');
  const earnedDays = credits?.reduce((sum, c) => sum + (c.credit_days || 0), 0) || 0;

  const tier = await defaultRepository.getUserTier(user.id)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://odi.pet'

  return NextResponse.json({
    referralCode: profile?.referral_code ?? null,
    referralUrl: `${appUrl}/?ref=${profile?.referral_code}`,
    referralCount: referralCount ?? 0,
    qualifiedCount,
    earnedDays,
    tier,
    invitesList: invitesList ?? [],
    firstName: profile?.first_name ?? ''
  })
}

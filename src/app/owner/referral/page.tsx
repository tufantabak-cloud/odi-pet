import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import ReferralClient from './ReferralClient'
import { defaultRepository } from '@/lib/features/entitlement/repository'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Arkadaşını Davet Et — Odi',
  description: 'Referral kodunla arkadaşlarını Odi\'ye davet et, Pro süreni uzat!',
}

export default async function ReferralPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data: userSubscription } = await supabase.from('user_subscriptions').select('current_period_end, status, ai_plus_until, pro_until').eq('profile_id', user.id).maybeSingle()
  const hasActiveSub = userSubscription?.status === 'active' || userSubscription?.status === 'trialing'
  let daysLeft = 0;
  if (hasActiveSub) {
    const endDates = [
      userSubscription?.ai_plus_until ? new Date(userSubscription.ai_plus_until).getTime() : 0,
      userSubscription?.pro_until ? new Date(userSubscription.pro_until).getTime() : 0,
      userSubscription?.current_period_end ? new Date(userSubscription.current_period_end).getTime() : 0
    ].filter(t => t > Date.now());
    if (endDates.length > 0) {
      daysLeft = Math.max(0, Math.ceil((Math.max(...endDates) - Date.now()) / (1000 * 60 * 60 * 24)));
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', user.id)
    .single()

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://odi.pet'
  const referralCode = profile?.referral_code ?? '—'
  const referralUrl = `${appUrl}/?ref=${referralCode}`

  return (
    <div className="max-w-lg mx-auto p-4">
      <ReferralClient
        referralCode={referralCode}
        referralUrl={referralUrl}
        referralCount={referralCount ?? 0}
        qualifiedCount={qualifiedCount}
        earnedDays={earnedDays}
        daysLeft={daysLeft}
        invitesList={invitesList ?? []}
      />
    </div>
  )
}

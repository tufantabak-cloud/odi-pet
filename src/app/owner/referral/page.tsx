import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import ReferralClient from './ReferralClient'
import { defaultRepository } from '@/lib/features/entitlement/repository'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Arkadaşını Davet Et — Odi.Pet',
  description: 'Referral kodunla arkadaşlarını Odi.Pet\'e davet et, Pro süreni uzat!',
}

export default async function ReferralPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const { data: userSubscription } = await supabase.from('user_subscriptions').select('current_period_end, status').eq('profile_id', user.id).maybeSingle()
  const hasActiveSub = userSubscription?.status === 'active' || userSubscription?.status === 'trialing'
  let daysLeft = 90;
  if (userSubscription?.current_period_end) {
     const end = new Date(userSubscription.current_period_end).getTime()
     daysLeft = Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)))
  } else if (hasActiveSub) {
     daysLeft = 36500;
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
  const milestoneBonusDays = qualifiedCount >= 5 ? 60 : 0
  const earnedDays = (qualifiedCount * 30) + milestoneBonusDays

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://odi-petcare.vercel.app'
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

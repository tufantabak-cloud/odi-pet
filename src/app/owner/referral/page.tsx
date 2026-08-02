import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import ReferralClient from './ReferralClient'
import { getEntitlement } from '@/lib/subscription/entitlement'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Arkadaşını Davet Et — Odi.Pet',
  description: 'Referral kodunla arkadaşlarını Odi.Pet\'e davet et, Pro süreni uzat!',
}

export default async function ReferralPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()
  const entitlement = await getEntitlement(user.id)

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://odi.pet'
  const referralCode = profile?.referral_code ?? '—'
  const referralUrl = `${appUrl}/register?ref=${referralCode}`

  return (
    <div className="max-w-lg mx-auto p-4">
      <ReferralClient
        referralCode={referralCode}
        referralUrl={referralUrl}
        referralCount={referralCount ?? 0}
        qualifiedCount={qualifiedCount}
        earnedDays={earnedDays}
        daysLeft={entitlement.daysLeft || 90}
        invitesList={invitesList ?? []}
      />
    </div>
  )
}

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  // Referral kodunu al
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code, first_name')
    .eq('id', user.id)
    .single()

  // Kaç kişiyi davet ettiğini say
  const { count: referralCount } = await supabase
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', user.id)

  return NextResponse.json({
    referralCode: profile?.referral_code ?? null,
    referralUrl: `https://odi-petcare.vercel.app?ref=${profile?.referral_code}`,
    referralCount: referralCount ?? 0,
    firstName: profile?.first_name ?? ''
  })
}

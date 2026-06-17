import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

const BADGE_DEFINITIONS = [
  { key: 'first_invite', label: 'İlk Davet', threshold: 1, emoji: '🏅' },
  { key: 'three_friends', label: 'Üç Dost', threshold: 3, emoji: '🥈' },
  { key: 'super_ambassador', label: 'Süper Elçi', threshold: 10, emoji: '🏆' },
]

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  const [{ data: badges }, { count: referralCount }] = await Promise.all([
    supabase.from('user_badges').select('badge_key, earned_at').eq('user_id', user.id),
    supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id),
  ])

  const earnedKeys = new Set(badges?.map(b => b.badge_key) ?? [])
  const count = referralCount ?? 0

  return NextResponse.json({
    referralCount: count,
    badges: BADGE_DEFINITIONS.map(def => ({
      ...def,
      earned: earnedKeys.has(def.key),
      earnedAt: badges?.find(b => b.badge_key === def.key)?.earned_at ?? null,
      progress: Math.min(count, def.threshold),
    }))
  })
}

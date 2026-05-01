import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

// GET: retrieve or create feed token for current user
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  const { data: sub } = await supabase
    .from('user_subscriptions').select('plan').eq('profile_id', user.id).single()
  const plan = sub?.plan ?? 'free'

  const { data: existing } = await supabase
    .from('calendar_feed_tokens').select('*').eq('profile_id', user.id).single()

  if (existing) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    return NextResponse.json({
      token: existing.token,
      feedUrl: `${appUrl}/api/calendar/feed/${existing.token}.ics`,
      scope: existing.scope,
      filters: existing.filters,
      days_ahead: existing.days_ahead,
      last_fetched_at: existing.last_fetched_at,
      plan,
    })
  }

  // Create new token
  const { data: newToken, error } = await supabase
    .from('calendar_feed_tokens')
    .insert({ profile_id: user.id, scope: 'assigned' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.json({
    token: newToken.token,
    feedUrl: `${appUrl}/api/calendar/feed/${newToken.token}.ics`,
    scope: newToken.scope,
    filters: newToken.filters,
    days_ahead: newToken.days_ahead,
    last_fetched_at: null,
    plan,
  })
}

// PATCH: update feed settings
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { scope, filters, days_ahead } = await req.json()
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('calendar_feed_tokens')
    .update({ scope, filters, days_ahead })
    .eq('profile_id', user.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, token: data })
}

// DELETE: regenerate token (revoke old subscriptions)
export async function DELETE() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  await supabase.from('calendar_feed_tokens').delete().eq('profile_id', user.id)

  // Re-insert with new token
  const { data, error } = await supabase
    .from('calendar_feed_tokens').insert({ profile_id: user.id }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.json({
    success: true,
    token: data.token,
    feedUrl: `${appUrl}/api/calendar/feed/${data.token}.ics`,
  })
}

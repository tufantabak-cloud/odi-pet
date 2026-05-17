import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = await createServerSupabaseClient()
  const { id } = await params

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, phone, created_at')
    .eq('id', id)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Fetch pets
  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, species, breed, birth_date, created_at')
    .eq('owner_id', id)
    .order('created_at', { ascending: false })

  // Fetch subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, plan, status, created_at, ends_at')
    .eq('profile_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fetch recent event stream (last 20 events)
  const { data: events } = await supabase
    .from('event_stream')
    .select('id, event, ts, payload')
    .eq('profile_id', id)
    .order('ts', { ascending: false })
    .limit(20)

  return NextResponse.json({
    profile,
    pets: pets ?? [],
    subscription: subscription ?? null,
    events: events ?? [],
  })
}

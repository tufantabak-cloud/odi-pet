import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

// GET  /api/admin/outreach — list pipeline
// POST /api/admin/outreach — add contact
// PATCH /api/admin/outreach — update stage

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('outreach_pipeline')
    .select('*')
    .order('tier', { ascending: true })
    .order('created_at', { ascending: false })

  // Conversion summary
  const total     = data?.length ?? 0
  const contacted = data?.filter(r => r.stage !== 'sourced').length ?? 0
  const activated = data?.filter(r => ['activated','retained_d3','retained_d7'].includes(r.stage)).length ?? 0

  return NextResponse.json({
    contacts: data ?? [],
    summary: {
      total,
      contacted,
      activated,
      conversionPct: contacted > 0 ? Math.round(activated / contacted * 100) : 0,
    }
  })
}

export async function POST(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, type, contact, tier = 2, notes, source } = body
  if (!name || !type) return NextResponse.json({ error: 'name and type required' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('outreach_pipeline')
    .insert({ name, type, contact, tier, notes, source })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, stage, notes, profile_id } = await req.json()
  if (!id || !stage) return NextResponse.json({ error: 'id and stage required' }, { status: 400 })

  const timestamps: Record<string, string> = { updated_at: new Date().toISOString() }
  if (stage === 'contacted')   timestamps.contacted_at   = new Date().toISOString()
  if (stage === 'activated')   timestamps.activated_at   = new Date().toISOString()
  if (stage === 'retained_d7') timestamps.retained_d7_at = new Date().toISOString()
  if (stage === 'replied')     timestamps.replied_at     = new Date().toISOString()

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('outreach_pipeline')
    .update({ stage, notes, profile_id, ...timestamps })
    .eq('id', id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'

type Params = { params: Promise<{ id: string }> }

async function assertOwner(petId: string, userId: string) {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', petId)
    .eq('profile_id', userId)
    .single()
  return !!data
}

// GET — weight log history (last 20 entries, ascending for chart)
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('pet_id', id)
    .order('measured_at', { ascending: true })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data ?? [] })
}

// POST — add weight log
export async function POST(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await assertOwner(id, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('weight_logs')
    .insert({
      pet_id: id,
      weight_kg: Number(body.weight_kg),
      height_cm: body.height_cm ? Number(body.height_cm) : null,
      body_condition_score: body.body_condition_score ? Number(body.body_condition_score) : null,
      measured_at: body.measured_at ?? new Date().toISOString(),
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Track event
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/analytics/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'weight_logged', payload: { pet_id: id, weight_kg: body.weight_kg } }),
  }).catch(() => {})

  revalidatePath(`/owner/pets/${id}/nutrition`)
  return NextResponse.json({ log: data })
}

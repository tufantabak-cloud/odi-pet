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

// GET — last 30 feeding log entries
export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await assertOwner(id, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('feeding_logs')
    .select('*')
    .eq('pet_id', id)
    .order('meal_time', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  return NextResponse.json({ logs: data ?? [] })
}

// POST — add a feeding log entry
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
    .from('feeding_logs')
    .insert({
      pet_id: id,
      meal_time: body.meal_time ?? new Date().toISOString(),
      amount_grams: body.amount_grams != null ? Number(body.amount_grams) : null,
      appetite_score: body.appetite_score != null ? Number(body.appetite_score) : null,
      consumed_percent: body.consumed_percent != null ? Number(body.consumed_percent) : null,
      stool_quality: body.stool_quality != null ? Number(body.stool_quality) : null,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  // Track event to Founder Console
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/analytics/onboarding`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'feeding_logged', payload: { pet_id: id } }),
  }).catch(() => {})

  revalidatePath(`/owner/pets/${id}/nutrition`)
  return NextResponse.json({ log: data })
}

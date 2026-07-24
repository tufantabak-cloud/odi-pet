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
    .maybeSingle()
  return !!data
}

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('pet_nutrition_profiles')
    .select('id, pet_id, allergy_info, sensitivity_notes, created_at, updated_at')
    .eq('pet_id', id)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }

  return NextResponse.json({ profile: data ?? null })
}

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await assertOwner(id, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = await createServerSupabaseClient()

  const { data: existing } = await supabase
    .from('pet_nutrition_profiles')
    .select('*')
    .eq('pet_id', id)
    .maybeSingle()

  // Single Source of Truth: ONLY allergy_info and sensitivity_notes are written to pet_nutrition_profiles
  const payload: any = {
    pet_id: id,
    allergy_info: body.allergy_info !== undefined ? (Array.isArray(body.allergy_info) ? body.allergy_info : (typeof body.allergy_info === 'string' ? body.allergy_info.split(',').map((s: string) => s.trim()).filter(Boolean) : [])) : (existing?.allergy_info ?? []),
    sensitivity_notes: body.sensitivity_notes !== undefined ? body.sensitivity_notes : (existing?.sensitivity_notes ?? null),
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('pet_nutrition_profiles')
    .upsert(payload, { onConflict: 'pet_id' })
    .select('id, pet_id, allergy_info, sensitivity_notes, created_at, updated_at')
    .single()

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  revalidatePath(`/owner/pets/${id}/nutrition`)

  return NextResponse.json({ profile: data })
}

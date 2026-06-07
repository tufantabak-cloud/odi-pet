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

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('pet_nutrition_profiles')
    .select('*')
    .eq('pet_id', id)
    .single()

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

  const payload = {
    pet_id: id,
    food_brand: body.food_brand ?? null,
    food_product: body.food_product ?? null,
    food_type: body.food_type ?? null,
    package_size_grams: body.package_size_grams ? Number(body.package_size_grams) : null,
    daily_grams: body.daily_grams ? Number(body.daily_grams) : null,
    meals_per_day: body.meals_per_day ? Number(body.meals_per_day) : 2,
    allergy_info: Array.isArray(body.allergy_info) ? body.allergy_info : [],
    sensitivity_notes: body.sensitivity_notes ?? null,
  }

  const { data, error } = await supabase
    .from('pet_nutrition_profiles')
    .upsert(payload, { onConflict: 'pet_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })

  revalidatePath(`/owner/pets/${id}/nutrition`)

  return NextResponse.json({ profile: data })
}

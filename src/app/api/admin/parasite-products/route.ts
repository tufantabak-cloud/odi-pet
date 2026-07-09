import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

// GET — liste (filtre + sayfalama)
export async function GET(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const species = searchParams.get('species')  // 'dog' | 'cat' | 'both' | null
  const type    = searchParams.get('type')     // 'internal' | 'external' | 'combined' | null
  const status  = searchParams.get('status')   // 'pending' | 'approved' | 'rejected' | null
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = 20
  const from     = (page - 1) * pageSize
  const to       = from + pageSize - 1

  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('parasite_products')
    .select('*', { count: 'exact' })
    .order('species')
    .order('name')
    .range(from, to)

  if (species) query = query.eq('species', species)
  if (type)    query = query.eq('type', type)
  if (status)  query = query.eq('status', status)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    pagination: { page, pageSize, total: count ?? 0 }
  })
}

// POST — yeni ürün
export async function POST(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    species, name, brand, type, application_method,
    active_ingredient, protection_duration_days, notes,
    is_active, description, image_url, covers_ear_mites, min_age_weeks
  } = body

  if (!species || !name || !brand || !type || !application_method || !protection_duration_days) {
    return NextResponse.json(
      { error: 'species, name, brand, type, application_method ve protection_duration_days zorunlu.' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('parasite_products')
    .insert({
      species,
      name,
      brand,
      type,
      application_method,
      active_ingredient:        active_ingredient        ?? null,
      protection_duration_days,
      notes:                    notes                    ?? null,
      is_active:                is_active                ?? true,
      status:                   'approved',
      admin_note:                null,
      description:               description              ?? null,
      image_url:                 image_url                ?? null,
      covers_ear_mites:          covers_ear_mites          ?? false,
      min_age_weeks:             min_age_weeks             ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

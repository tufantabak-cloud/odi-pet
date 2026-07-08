import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

// GET — liste (filtre + sayfalama)
export async function GET(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const species  = searchParams.get('species')   // 'dog' | 'cat' | null
  const category = searchParams.get('category')  // 'core' | 'risk_based' | null
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = 20
  const from     = (page - 1) * pageSize
  const to       = from + pageSize - 1

  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('vaccine_protocols')
    .select('*', { count: 'exact' })
    .order('species')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('vaccine_code')
    .range(from, to)

  if (species)  query = query.eq('species', species)
  if (category) query = query.eq('category', category)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    pagination: { page, pageSize, total: count ?? 0 }
  })
}

// POST — yeni protokol
export async function POST(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    vaccine_code, protocol_name, species, category,
    doses, repeat_frequency, repeat_interval_days,
    end_condition, notes, is_active, risk_group,
    sort_order
  } = body

  if (!vaccine_code || !protocol_name || !species || !doses) {
    return NextResponse.json(
      { error: 'vaccine_code, protocol_name, species ve doses zorunlu.' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('vaccine_protocols')
    .insert({
      vaccine_code,
      protocol_name,
      species,
      category:             category    ?? 'core',
      doses,
      repeat_frequency:     repeat_frequency      ?? null,
      repeat_interval_days: repeat_interval_days  ?? null,
      end_condition:        end_condition          ?? null,
      notes:                notes                  ?? null,
      is_active:            is_active  ?? true,
      risk_group:           risk_group ?? null,
      sort_order:           sort_order ?? 100,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}

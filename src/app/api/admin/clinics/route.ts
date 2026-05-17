import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

// status query param:
//   'pending'  → is_public = false
//   'active'   → is_public = true
//   'all'      → both

export async function GET(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'all'
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const search = searchParams.get('search')?.trim() ?? ''

  const supabase = await createServerSupabaseClient()

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  // Klinikler + ilk üye (kurucu vet) bilgisiyle birlikte
  let query = supabase
    .from('clinics')
    .select(
      `id, name, contact_email, contact_phone, is_public, created_at,
       clinic_memberships(
         profile_id,
         profiles(first_name, last_name, email)
       )`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status === 'pending') query = query.eq('is_public', false)
  else if (status === 'active') query = query.eq('is_public', true)

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,contact_email.ilike.%${search}%`
    )
  }

  const { data: clinics, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Status tab counts
  const [{ count: pendingCount }, { count: activeCount }, { count: allCount }] =
    await Promise.all([
      supabase.from('clinics').select('id', { count: 'exact', head: true }).eq('is_public', false),
      supabase.from('clinics').select('id', { count: 'exact', head: true }).eq('is_public', true),
      supabase.from('clinics').select('id', { count: 'exact', head: true }),
    ])

  return NextResponse.json({
    clinics: clinics ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
    statusCounts: {
      pending: pendingCount ?? 0,
      active:  activeCount  ?? 0,
      all:     allCount     ?? 0,
    },
  })
}

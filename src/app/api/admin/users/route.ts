import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20
const ALLOWED_ROLES = ['owner', 'vet', 'admin', 'founder', 'all'] as const

export async function GET(req: NextRequest) {
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') ?? 'all'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const search = searchParams.get('search')?.trim() ?? ''

  const supabase = createAdminSupabaseClient()

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, phone, created_at, premium_until, premium_tier', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (role !== 'all' && ALLOWED_ROLES.includes(role as typeof ALLOWED_ROLES[number])) {
    query = query.eq('role', role)
  }

  if (search) {
    query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
  }

  let { data: users, error, count } = await query

  // Fallback to basic profile columns if schema cache lags behind on optional premium columns
  if (error) {
    console.warn('[API/admin/users] Schema query error, executing fallback basic profiles query:', error)

    let fallbackQuery = supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, phone, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (role !== 'all' && ALLOWED_ROLES.includes(role as typeof ALLOWED_ROLES[number])) {
      fallbackQuery = fallbackQuery.eq('role', role)
    }

    if (search) {
      fallbackQuery = fallbackQuery.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`)
    }

    const fallbackRes = await fallbackQuery
    if (!fallbackRes.error) {
      users = fallbackRes.data as any[]
      count = fallbackRes.count
      error = null
    }
  }

  if (error) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 })
  }

  // Role counts for tab badges
  const roleCounts: Record<string, number> = {}
  await Promise.all(
    ['owner', 'vet', 'admin', 'founder'].map(async (r) => {
      const { count: c } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', r)
      roleCounts[r] = c ?? 0
    })
  )

  const { count: totalCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  roleCounts['all'] = totalCount ?? 0

  return NextResponse.json({
    users: users ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
    roleCounts,
  })
}

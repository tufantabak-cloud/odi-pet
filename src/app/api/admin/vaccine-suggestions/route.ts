import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser, requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

// GET — aşı önerilerini durum filtresiyle listeler (admin)
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Lütfen giriş yapın.' }, { status: 401 })
  }

  const actor = await requireRole(['admin', 'founder'])
  if (!actor) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'
  if (!['pending', 'approved', 'rejected', 'all'].includes(status)) {
    return NextResponse.json({ error: 'INVALID_SUGGESTION_FILTER', message: 'Geçersiz durum filtresi.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('vaccine_catalog_suggestions')
    .select('*, profiles!vaccine_catalog_suggestions_suggested_by_fkey(full_name, email)')
    .order('created_at', { ascending: false })

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'SUGGESTION_QUERY_FAILED', message: 'Sorgulama sırasında bir hata oluştu.' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

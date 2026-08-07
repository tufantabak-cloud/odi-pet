import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser, requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']).optional(),
  action: z.enum(['approve', 'reject']).optional(),
  admin_note: z.string().max(500).nullable().optional(),
}).strict()

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Lütfen giriş yapın.' }, { status: 401 })
  }

  const actor = await requireRole(['admin', 'founder'])
  if (!actor) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_REVIEW_DATA', message: 'Geçersiz JSON verisi.' }, { status: 400 })
  }

  const parseResult = reviewSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json({ error: 'INVALID_REVIEW_DATA', message: 'İnceleme verisi geçersiz.' }, { status: 400 })
  }

  const reviewStatus = parseResult.data.status || (parseResult.data.action === 'approve' ? 'approved' : 'rejected')

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('vaccine_catalog_suggestions')
    .update({
      status: reviewStatus,
      admin_note: parseResult.data.admin_note?.trim() || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'SUGGESTION_UPDATE_FAILED', message: 'Öneri güncellenemedi.' }, { status: 500 })
  }

  return NextResponse.json({ data, suggestion: data })
}

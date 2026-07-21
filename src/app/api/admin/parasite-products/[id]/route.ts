import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser, requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

const productUpdateSchema = z.object({
  species: z.enum(['dog', 'cat', 'both']).optional(),
  name: z.string().min(2).max(120).optional(),
  brand: z.string().min(1).max(120).optional(),
  type: z.enum(['internal', 'external', 'combined']).optional(),
  application_method: z.enum(['oral', 'spot-on', 'collar', 'spray', 'injection']).optional(),
  // 0 = tedavi ürünü (kalıcı koruma yok)
  protection_duration_days: z.number().int().min(0).max(1095).optional(),
  active_ingredient: z.string().max(200).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  image_url: z.string().max(1024).nullable().optional(),
  min_age_weeks: z.number().int().min(0).max(520).nullable().optional(),
  covers_ear_mites: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
}).strict()

// PATCH — ürün alanlarını günceller (aktifleştirme dahil)
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Lütfen giriş yapın.' }, { status: 401 })
  }
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
  }

  const { id } = await props.params

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'INVALID_PRODUCT_DATA', message: 'Geçersiz JSON verisi.' }, { status: 400 })
  }

  const parseResult = productUpdateSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json({ error: 'INVALID_PRODUCT_DATA', message: 'Ürün verisi geçersiz.' }, { status: 400 })
  }
  const data = parseResult.data

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'INVALID_PRODUCT_DATA', message: 'Güncellenecek alan gönderilmedi.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  const { data: existing } = await supabase.from('parasite_products').select('id').eq('id', id).single()
  if (!existing) {
    return NextResponse.json({ error: 'PRODUCT_NOT_FOUND', message: 'Ürün bulunamadı.' }, { status: 404 })
  }

  const { data: product, error } = await supabase
    .from('parasite_products')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error || !product) {
    if (error?.code === '23514') {
      return NextResponse.json({ error: 'INVALID_PRODUCT_DATA', message: 'Veriler veritabanı kısıtlamalarını ihlal ediyor.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'PRODUCT_UPDATE_FAILED', message: 'Ürün güncellenemedi.' }, { status: 500 })
  }

  return NextResponse.json(product)
}

// DELETE — SOFT deaktivasyon (is_active=false). Admin panelden gerçek satır
// silme bilinçli olarak YOKTUR: geçmiş kayıtların ürün bağı (provenans) ve
// snapshot süreleri korunur; guardrail kuralı gereği canlıda DELETE çalıştırılmaz.
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Lütfen giriş yapın.' }, { status: 401 })
  }
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
  }

  const { id } = await props.params
  const supabase = await createServerSupabaseClient()

  const { data: existing } = await supabase.from('parasite_products').select('id, is_active').eq('id', id).single()
  if (!existing) {
    return NextResponse.json({ error: 'PRODUCT_NOT_FOUND', message: 'Ürün bulunamadı.' }, { status: 404 })
  }

  const { data: product, error } = await supabase
    .from('parasite_products')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single()

  if (error || !product) {
    return NextResponse.json({ error: 'PRODUCT_UPDATE_FAILED', message: 'Ürün pasife alınamadı.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, product })
}

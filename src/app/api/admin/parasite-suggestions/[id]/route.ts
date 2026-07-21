import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser, requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

// Katalog enum alfabesi: parasite_products.application_method CHECK listesi.
// Öneri alfabesindeki spot_on → spot-on eşlenir; shampoo/other katalogda yok.
const CATALOG_METHODS = ['oral', 'spot-on', 'collar', 'spray', 'injection']

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'merge']),
  admin_note: z.string().max(500).nullable().optional(),
  merged_into_product_id: z.string().uuid().optional(),
  // approve sırasında adminin düzeltebileceği alanlar:
  name: z.string().min(2).max(120).optional(),
  brand: z.string().min(1).max(120).optional(),
  protection_duration_days: z.number().int().positive().max(1095).optional(),
  description: z.string().max(500).optional(),
}).strict()

// PATCH — öneriyi incele: onayla / reddet / mevcut ürünle birleştir
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
  const review = parseResult.data

  const supabase = await createServerSupabaseClient()

  const { data: suggestion } = await supabase
    .from('parasite_product_suggestions')
    .select('*')
    .eq('id', id)
    .single()

  if (!suggestion) {
    return NextResponse.json({ error: 'SUGGESTION_NOT_FOUND', message: 'Öneri bulunamadı.' }, { status: 404 })
  }
  if (suggestion.status !== 'pending') {
    return NextResponse.json({ error: 'SUGGESTION_ALREADY_REVIEWED', message: 'Bu öneri zaten incelenmiş.' }, { status: 409 })
  }

  const reviewFields = {
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
    admin_note: review.admin_note?.trim() || null,
  }

  if (review.action === 'reject') {
    const { data: updated, error } = await supabase
      .from('parasite_product_suggestions')
      .update({ status: 'rejected', ...reviewFields })
      .eq('id', id)
      .select()
      .single()
    if (error || !updated) {
      return NextResponse.json({ error: 'SUGGESTION_UPDATE_FAILED', message: 'Öneri güncellenemedi.' }, { status: 500 })
    }
    return NextResponse.json({ suggestion: updated })
  }

  if (review.action === 'merge') {
    if (!review.merged_into_product_id) {
      return NextResponse.json({ error: 'MERGE_TARGET_REQUIRED', message: 'Birleştirilecek ürün seçilmelidir.' }, { status: 400 })
    }
    const { data: target } = await supabase
      .from('parasite_products')
      .select('id')
      .eq('id', review.merged_into_product_id)
      .single()
    if (!target) {
      return NextResponse.json({ error: 'PRODUCT_NOT_FOUND', message: 'Birleştirilecek ürün bulunamadı.' }, { status: 404 })
    }
    const { data: updated, error } = await supabase
      .from('parasite_product_suggestions')
      .update({ status: 'merged', merged_into_product_id: review.merged_into_product_id, ...reviewFields })
      .eq('id', id)
      .select()
      .single()
    if (error || !updated) {
      return NextResponse.json({ error: 'SUGGESTION_UPDATE_FAILED', message: 'Öneri güncellenemedi.' }, { status: 500 })
    }
    return NextResponse.json({ suggestion: updated })
  }

  // action === 'approve' — öneri katalog ürününe dönüştürülür (enum eşlemesiyle)
  const productType = suggestion.parasite_type === 'collar' ? 'external' : suggestion.parasite_type
  const productMethod = suggestion.application_method === 'spot_on' ? 'spot-on' : suggestion.application_method

  if (!CATALOG_METHODS.includes(productMethod)) {
    return NextResponse.json(
      { error: 'UNSUPPORTED_METHOD_FOR_CATALOG', message: 'Bu uygulama yöntemi (şampuan/diğer) katalogda desteklenmiyor. Öneriyi reddedin veya mevcut ürünle birleştirin.' },
      { status: 400 }
    )
  }
  if (suggestion.parasite_type === 'collar' && productMethod !== 'collar') {
    return NextResponse.json(
      { error: 'INVALID_COLLAR_SUGGESTION', message: 'Tasma tipi öneride uygulama yöntemi de tasma olmalıdır.' },
      { status: 400 }
    )
  }

  const { data: product, error: productError } = await supabase
    .from('parasite_products')
    .insert({
      species: suggestion.species,
      name: review.name?.trim() || suggestion.name_suggested,
      brand: review.brand?.trim() || suggestion.brand || 'Belirtilmedi',
      type: productType,
      application_method: productMethod,
      protection_duration_days: review.protection_duration_days ?? suggestion.protection_duration_days,
      description: review.description?.trim() || null,
      is_active: true,
    })
    .select()
    .single()

  if (productError || !product) {
    return NextResponse.json({ error: 'PRODUCT_CREATE_FAILED', message: 'Katalog ürünü oluşturulamadı.' }, { status: 500 })
  }

  const { data: updated, error: updateError } = await supabase
    .from('parasite_product_suggestions')
    .update({ status: 'approved', approved_product_id: product.id, ...reviewFields })
    .eq('id', id)
    .select()
    .single()

  if (updateError || !updated) {
    // Öneri güncellenemezse yeni ürünü geri al — yarım onay bırakma
    await supabase.from('parasite_products').delete().eq('id', product.id)
    return NextResponse.json({ error: 'SUGGESTION_UPDATE_FAILED', message: 'Öneri güncellenemedi.' }, { status: 500 })
  }

  return NextResponse.json({ suggestion: updated, product })
}

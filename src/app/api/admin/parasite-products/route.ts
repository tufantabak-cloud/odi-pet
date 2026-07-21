import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser, requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

// P3: Ürün kataloğu admin CRUD'u yeniden açıldı (önceden 410 Gone).
// Katalog enum alfabesi kullanılır: species'te 'both' var, method 'spot-on'
// (tire), type'ta 'collar' yok — tasma ürünleri method='collar' ile modellenir.

const productCreateSchema = z.object({
  species: z.enum(['dog', 'cat', 'both']),
  name: z.string().min(2).max(120),
  brand: z.string().min(1).max(120),
  type: z.enum(['internal', 'external', 'combined']),
  application_method: z.enum(['oral', 'spot-on', 'collar', 'spray', 'injection']),
  // 0 = tedavi ürünü (kalıcı koruma yok); kayıt anında süre protokolden gelir
  protection_duration_days: z.number().int().min(0).max(1095),
  active_ingredient: z.string().max(200).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  image_url: z.string().max(1024).nullable().optional(),
  min_age_weeks: z.number().int().min(0).max(520).nullable().optional(),
  covers_ear_mites: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
}).strict()

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

// GET — ürün kataloğunu filtreleyerek listeler
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
  const species = searchParams.get('species')
  const isActive = searchParams.get('is_active')

  if (species && !['dog', 'cat', 'both'].includes(species)) {
    return NextResponse.json({ error: 'INVALID_PRODUCT_DATA', message: 'Geçersiz tür filtresi.' }, { status: 400 })
  }
  if (isActive && isActive !== 'true' && isActive !== 'false') {
    return NextResponse.json({ error: 'INVALID_PRODUCT_DATA', message: 'Geçersiz aktiflik filtresi.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('parasite_products')
    .select('*')
    .order('species', { ascending: true })
    .order('type', { ascending: true })
    .order('name', { ascending: true })

  if (species) query = query.eq('species', species)
  if (isActive !== null && isActive !== undefined) query = query.eq('is_active', isActive === 'true')

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: 'PRODUCT_QUERY_FAILED', message: 'Sorgulama sırasında bir hata oluştu.' }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST — yeni katalog ürünü oluşturur
export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: 'INVALID_PRODUCT_DATA', message: 'Geçersiz JSON verisi.' }, { status: 400 })
  }

  const parseResult = productCreateSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json({ error: 'INVALID_PRODUCT_DATA', message: 'Ürün verisi geçersiz.' }, { status: 400 })
  }
  const data = parseResult.data

  const supabase = await createServerSupabaseClient()

  // Duplicate kontrolü: marka+isim birlikte benzersiz olmalı (aynı ürün adı
  // farklı markalarda meşru — örn. "Kedi Spot-on 4 kg altı")
  const { data: existing } = await supabase.from('parasite_products').select('id, name, brand')
  const keyNorm = normalizeName(`${data.brand} ${data.name}`)
  const dup = (existing || []).find(p => normalizeName(`${p.brand} ${p.name}`) === keyNorm)
  if (dup) {
    return NextResponse.json(
      { error: 'DUPLICATE_PRODUCT_NAME', message: `Bu marka+isimde bir ürün zaten mevcut: ${dup.brand} ${dup.name}` },
      { status: 409 }
    )
  }

  const { data: product, error } = await supabase
    .from('parasite_products')
    .insert({
      species: data.species,
      name: data.name.trim(),
      brand: data.brand.trim(),
      type: data.type,
      application_method: data.application_method,
      protection_duration_days: data.protection_duration_days,
      active_ingredient: data.active_ingredient?.trim() || null,
      description: data.description?.trim() || null,
      image_url: data.image_url?.trim() || null,
      min_age_weeks: data.min_age_weeks ?? null,
      covers_ear_mites: data.covers_ear_mites ?? false,
      notes: data.notes?.trim() || null,
      is_active: data.is_active ?? true,
    })
    .select()
    .single()

  if (error || !product) {
    if (error?.code === '23514') {
      return NextResponse.json({ error: 'INVALID_PRODUCT_DATA', message: 'Veriler veritabanı kısıtlamalarını ihlal ediyor.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'PRODUCT_CREATE_FAILED', message: 'Ürün oluşturulamadı.' }, { status: 500 })
  }

  return NextResponse.json(product, { status: 201 })
}

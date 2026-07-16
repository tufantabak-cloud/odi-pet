import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser, requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

// GET — parasite_protocols listesini filtreleyerek getirir
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
  const parasiteType = searchParams.get('parasite_type')
  const isActive = searchParams.get('is_active')

  // Filtre geçerlilik kontrolleri
  if (species && species !== 'cat' && species !== 'dog') {
    return NextResponse.json({ error: 'INVALID_PROTOCOL_DATA', message: 'Geçersiz tür (species) filtresi.' }, { status: 400 })
  }
  if (parasiteType && !['internal', 'external', 'combined', 'collar'].includes(parasiteType)) {
    return NextResponse.json({ error: 'INVALID_PROTOCOL_DATA', message: 'Geçersiz parazit tipi filtresi.' }, { status: 400 })
  }
  if (isActive && isActive !== 'true' && isActive !== 'false') {
    return NextResponse.json({ error: 'INVALID_PROTOCOL_DATA', message: 'Geçersiz aktiflik filtresi.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from('parasite_protocols')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('protocol_name', { ascending: true })

  if (species) {
    query = query.eq('species', species)
  }
  if (parasiteType) {
    query = query.eq('parasite_type', parasiteType)
  }
  if (isActive !== null && isActive !== undefined) {
    query = query.eq('is_active', isActive === 'true')
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: 'PROTOCOL_QUERY_FAILED', message: 'Sorgulama sırasında bir hata oluştu.' }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST — yeni parazit protokolü oluşturur
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
  } catch (e) {
    return NextResponse.json({ error: 'INVALID_PROTOCOL_DATA', message: 'Geçersiz JSON verisi.' }, { status: 400 })
  }

  // İstemciden gönderilen yabancı alanları ayıkla
  const {
    parasite_code,
    protocol_name,
    parasite_type,
    species,
    default_protection_duration_days,
    allowed_application_methods,
    default_application_method,
    min_age_weeks,
    is_active,
    sort_order,
  } = body

  // Validation: Zorunlu alanlar
  if (
    !parasite_code ||
    !protocol_name ||
    !parasite_type ||
    !species ||
    default_protection_duration_days === undefined ||
    !allowed_application_methods ||
    !default_application_method
  ) {
    return NextResponse.json(
      { error: 'INVALID_PROTOCOL_DATA', message: 'Zorunlu alanlar eksik.' },
      { status: 400 }
    )
  }

  // Ön uygulama kısıt doğrulama
  if (!Array.isArray(allowed_application_methods) || allowed_application_methods.length === 0) {
    return NextResponse.json(
      { error: 'INVALID_PROTOCOL_DATA', message: 'Uygulama yöntemi listesi boş olamaz.' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('parasite_protocols')
    .insert({
      parasite_code,
      protocol_name,
      parasite_type,
      species,
      default_protection_duration_days,
      allowed_application_methods,
      default_application_method,
      min_age_weeks: min_age_weeks ?? null,
      is_active: is_active ?? true,
      sort_order: sort_order ?? 100,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'DUPLICATE_PROTOCOL', message: 'Bu parazit kodu ve evcil hayvan türü kombinasyonu zaten mevcut.' },
        { status: 409 }
      )
    }
    if (error.code === '23514') {
      return NextResponse.json(
        { error: 'INVALID_PROTOCOL_DATA', message: 'Sağlanan veriler veritabanı kısıtlamalarını ihlal ediyor.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'PROTOCOL_CREATE_FAILED', message: 'Protokol oluşturulurken genel bir hata oluştu.' },
      { status: 500 }
    )
  }

  return NextResponse.json(data, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser, requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

// GET — Evcil hayvanın parazit tercihlerini listeler
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Yetki ve oturum kontrolü
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Lütfen giriş yapın.' }, { status: 401 })
  }

  const resolvedParams = await params
  const petId = resolvedParams.id

  const supabase = await createServerSupabaseClient()

  // 2. Pet varlık kontrolü
  const { data: pet, error: petErr } = await supabase
    .from('pets')
    .select('id, species')
    .eq('id', petId)
    .single()

  if (petErr || !pet) {
    return NextResponse.json({ error: 'PET_NOT_FOUND', message: 'Evcil hayvan bulunamadı.' }, { status: 404 })
  }

  // 3. Pet türü (species) doğrulaması
  if (pet.species !== 'cat' && pet.species !== 'dog') {
    return NextResponse.json({ error: 'INVALID_PET_SPECIES', message: 'Evcil hayvan türü kedi veya köpek olmalıdır.' }, { status: 400 })
  }

  // 4. Pet sahiplik kontrolü (pet_owners tablosu üzerinden)
  const { data: petOwner, error: ownerErr } = await supabase
    .from('pet_owners')
    .select('id')
    .eq('pet_id', petId)
    .eq('profile_id', user.id)
    .single()

  if (ownerErr || !petOwner) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu evcil hayvan üzerinde işlem yapmaya yetkiniz yok.' }, { status: 403 })
  }

  // 5. Aktif protokolleri çek (species'e uygun ve is_active = true)
  const { data: protocols, error: protoErr } = await supabase
    .from('parasite_protocols')
    .select('*')
    .eq('species', pet.species)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('protocol_name', { ascending: true })

  if (protoErr) {
    return NextResponse.json({ error: 'PREFERENCE_QUERY_FAILED', message: protoErr.message }, { status: 500 })
  }

  // 6. Mevcut tercih kayıtlarını çek
  const { data: preferences, error: prefErr } = await supabase
    .from('pet_parasite_preferences')
    .select('*')
    .eq('pet_id', petId)

  if (prefErr) {
    return NextResponse.json({ error: 'PREFERENCE_QUERY_FAILED', message: prefErr.message }, { status: 500 })
  }

  // Tercihleri eşleştir
  const prefMap = new Map(preferences?.map(p => [p.parasite_protocol_id, p.enabled]))

  const result = protocols.map(proto => {
    const hasPref = prefMap.has(proto.id)
    const enabled = hasPref ? prefMap.get(proto.id) : true
    const is_default = !hasPref

    return {
      id: proto.id,
      parasite_code: proto.parasite_code,
      protocol_name: proto.protocol_name,
      parasite_type: proto.parasite_type,
      species: proto.species,
      default_protection_duration_days: proto.default_protection_duration_days,
      allowed_application_methods: proto.allowed_application_methods,
      default_application_method: proto.default_application_method,
      min_age_weeks: proto.min_age_weeks,
      enabled,
      is_default,
    }
  })

  return NextResponse.json(result)
}

// PATCH — Parazit tercihini ekler veya günceller
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Yetki ve oturum kontrolü
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Lütfen giriş yapın.' }, { status: 401 })
  }

  const resolvedParams = await params
  const petId = resolvedParams.id

  const supabase = await createServerSupabaseClient()

  // 2. Pet varlık kontrolü
  const { data: pet, error: petErr } = await supabase
    .from('pets')
    .select('id, species')
    .eq('id', petId)
    .single()

  if (petErr || !pet) {
    return NextResponse.json({ error: 'PET_NOT_FOUND', message: 'Evcil hayvan bulunamadı.' }, { status: 404 })
  }

  // 3. Sahiplik kontrolü
  const { data: petOwner, error: ownerErr } = await supabase
    .from('pet_owners')
    .select('id')
    .eq('pet_id', petId)
    .eq('profile_id', user.id)
    .single()

  if (ownerErr || !petOwner) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu evcil hayvan üzerinde işlem yapmaya yetkiniz yok.' }, { status: 403 })
  }

  // 4. Body doğrulama
  let body
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ error: 'INVALID_PREFERENCE_DATA', message: 'Geçersiz JSON verisi.' }, { status: 400 })
  }

  const { parasite_protocol_id, enabled } = body

  if (!parasite_protocol_id || typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'INVALID_PREFERENCE_DATA', message: 'parasite_protocol_id ve enabled alanları zorunlu.' }, { status: 400 })
  }

  // 5. Protokol varlık ve tür kontrolü
  const { data: protocol, error: protoErr } = await supabase
    .from('parasite_protocols')
    .select('id, species, is_active')
    .eq('id', parasite_protocol_id)
    .single()

  if (protoErr || !protocol) {
    return NextResponse.json({ error: 'PROTOCOL_NOT_FOUND', message: 'Protokol bulunamadı.' }, { status: 404 })
  }

  // Protokol evcil hayvan türüyle uyumlu olmalı
  if (protocol.species !== pet.species) {
    return NextResponse.json({ error: 'PROTOCOL_SPECIES_MISMATCH', message: 'Protokol evcil hayvan türü ile uyuşmuyor.' }, { status: 400 })
  }

  // Aktiflik kontrolü (Sadece enabled = true yapılırken aktif olması zorunludur)
  if (enabled === true && !protocol.is_active) {
    return NextResponse.json({ error: 'INACTIVE_PROTOCOL', message: 'Pasif bir protokol aktif hale getirilemez.' }, { status: 409 })
  }

  // 6. Mevcut tercih kaydını sorgula
  const { data: existingPref } = await supabase
    .from('pet_parasite_preferences')
    .select('id')
    .eq('pet_id', petId)
    .eq('parasite_protocol_id', parasite_protocol_id)
    .single()

  // 7. Tercih kaydını ekle veya güncelle (Upsert)
  let resultError
  if (existingPref) {
    const { error: updateErr } = await supabase
      .from('pet_parasite_preferences')
      .update({ enabled })
      .eq('id', existingPref.id)
    resultError = updateErr
  } else {
    // Protokol aktif değilse insert engellenir (enabled=false olsa dahi trigger tarafından engellenir)
    if (!protocol.is_active) {
      return NextResponse.json({ error: 'INACTIVE_PROTOCOL', message: 'Pasif olan bir protokol tercih olarak eklenemez.' }, { status: 409 })
    }
    const { error: insertErr } = await supabase
      .from('pet_parasite_preferences')
      .insert({
        pet_id: petId,
        parasite_protocol_id,
        enabled,
      })
    resultError = insertErr
  }

  if (resultError) {
    if (resultError.code === '23514') {
      return NextResponse.json({ error: 'INVALID_PREFERENCE_DATA', message: 'Veritabanı kısıtlamaları ihlal edildi.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'PREFERENCE_UPDATE_FAILED', message: 'Tercih güncellenirken bir hata oluştu.' }, { status: 400 })
  }

  return NextResponse.json({ success: true, enabled })
}

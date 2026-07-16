import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { normalizeSpecies } from '@/lib/species'

async function verifyOwnership(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, petId: string, userId: string) {
  const { data } = await supabase
    .from('pet_owners')
    .select('pet_id')
    .eq('pet_id', petId)
    .eq('profile_id', userId)
    .maybeSingle()
  return !!data
}

// GET — Evcil hayvanın aşı tercihlerini listeler
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id: petId } = await props.params
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Lütfen oturum açın.' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    const isOwner = await verifyOwnership(supabase, petId, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu evcil hayvan üzerinde işlem yapmaya yetkiniz yok.' }, { status: 403 })
    }

    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, name, species')
      .eq('id', petId)
      .single()

    if (petError || !pet) {
      return NextResponse.json({ error: 'PET_NOT_FOUND', message: 'Evcil hayvan bulunamadı' }, { status: 404 })
    }

    const petSpecies = normalizeSpecies(pet.species)

    // Tüm aktif aşı protokollerini çek (species'e uygun)
    const { data: protocols, error: protocolsError } = await supabase
      .from('vaccine_protocols')
      .select('*')
      .eq('species', petSpecies)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (protocolsError) {
      return NextResponse.json({ error: 'VACCINE_QUERY_FAILED', message: protocolsError.message }, { status: 500 })
    }

    // Tercihleri çek
    const { data: preferences, error: prefError } = await supabase
      .from('pet_vaccine_preferences')
      .select('*')
      .eq('pet_id', petId)

    if (prefError) {
      return NextResponse.json({ error: 'VACCINE_QUERY_FAILED', message: prefError.message }, { status: 500 })
    }

    // Aktif planları çek
    const { data: activePlans } = await supabase
      .from('plans')
      .select('extra_data')
      .eq('pet_id', petId)
      .eq('category', 'asi')
      .in('status', ['active', 'overdue'])

    const activePlansByCode: Record<string, boolean> = {}
    for (const plan of activePlans ?? []) {
      const code = (plan as any).extra_data?.vaccine?.code ?? (plan as any).extra_data?.vaccine_code
      if (code) {
        activePlansByCode[code] = true
      }
    }

    const prefMap = new Map(preferences?.map(p => [p.vaccine_code, p.enabled]))

    // Protokolleri kilit kurallarına göre süzüp tiple
    const result = (protocols ?? []).map(proto => {
      const hasPref = prefMap.has(proto.vaccine_code)
      const prefEnabled = prefMap.get(proto.vaccine_code)

      let enabled = true
      let locked = false
      let is_default = !hasPref

      // Kilit kuralları: legal ve core aşılar her zaman açık ve kilitlidir.
      if (proto.category === 'legal' || proto.category === 'core') {
        enabled = true
        locked = true
        is_default = true
      } else {
        enabled = hasPref ? !!prefEnabled : true
        locked = false
      }

      return {
        vaccine_code: proto.vaccine_code,
        protocol_name: proto.protocol_name,
        species: proto.species,
        category: proto.category,
        enabled,
        locked,
        is_default,
        has_active_plan: !!activePlansByCode[proto.vaccine_code],
      }
    })

    return NextResponse.json({
      pet,
      protocols: result,
      preferences: preferences ?? [],
      activePlansByCode,
    })
  } catch (error: unknown) {
    console.error('vaccine-preferences GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH — Aşı tercihini günceller
export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id: petId } = await props.params
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Lütfen oturum açın.' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()

    const isOwner = await verifyOwnership(supabase, petId, user.id)
    if (!isOwner) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Bu evcil hayvan üzerinde işlem yapmaya yetkiniz yok.' }, { status: 403 })
    }

    const { data: pet } = await supabase
      .from('pets')
      .select('species')
      .eq('id', petId)
      .single()

    const petSpecies = pet ? normalizeSpecies(pet.species) : null

    let body
    try {
      body = await req.json()
    } catch (e) {
      return NextResponse.json({ error: 'INVALID_PREFERENCE_DATA', message: 'Geçersiz JSON verisi.' }, { status: 400 })
    }

    const { vaccine_code, enabled, vet_recommended, risk_reason } = body

    if (!vaccine_code || typeof vaccine_code !== 'string') {
      return NextResponse.json({ error: 'INVALID_PREFERENCE_DATA', message: 'vaccine_code zorunludur' }, { status: 400 })
    }
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'INVALID_PREFERENCE_DATA', message: 'enabled boolean olmalıdır' }, { status: 400 })
    }

    // Protokol bilgisini çek
    const { data: protocol, error: protoErr } = await supabase
      .from('vaccine_protocols')
      .select('id, category, is_core, species, is_active')
      .eq('vaccine_code', vaccine_code)
      .maybeSingle()

    if (protoErr || !protocol) {
      return NextResponse.json({ error: 'VACCINE_NOT_FOUND', message: 'Aşı protokolü bulunamadı.' }, { status: 404 })
    }

    // Tür uyuşmazlığı kontrolü
    if (petSpecies && protocol.species !== petSpecies) {
      return NextResponse.json({ error: 'VACCINE_SPECIES_MISMATCH', message: 'Aşı protokolü evcil hayvan türü ile uyuşmuyor.' }, { status: 400 })
    }

    // Pasif admin protokolü aktifleştirilemez
    if (enabled === true && !protocol.is_active) {
      return NextResponse.json({ error: 'INACTIVE_VACCINE_PROTOCOL', message: 'Pasif bir aşı protokolü aktifleştirilemez.' }, { status: 409 })
    }

    // Kilitli aşı kontrolü (legal veya core)
    const isLocked = protocol.category === 'legal' || protocol.category === 'core'
    if (isLocked) {
      return NextResponse.json({ error: 'LOCKED_VACCINE_PREFERENCE', message: 'Yasal ve zorunlu (core) aşı tercihleri değiştirilemez.' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('pet_vaccine_preferences')
      .select('id, enabled, enabled_at, disabled_at')
      .eq('pet_id', petId)
      .eq('vaccine_code', vaccine_code)
      .maybeSingle()

    const now = new Date().toISOString()
    const enabledAt = enabled ? now : (existing?.enabled_at ?? null)
    const disabledAt = !enabled ? now : (existing?.disabled_at ?? null)

    const { data: record, error } = await supabase
      .from('pet_vaccine_preferences')
      .upsert(
        {
          pet_id: petId,
          vaccine_code,
          enabled,
          vet_recommended: !!vet_recommended,
          risk_reason: risk_reason || null,
          enabled_at: enabledAt,
          disabled_at: disabledAt,
          created_by: existing ? undefined : user.id,
          updated_at: now,
        },
        { onConflict: 'pet_id,vaccine_code' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'VACCINE_PREFERENCE_UPDATE_FAILED', message: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: record })
  } catch (error: unknown) {
    console.error('vaccine-preferences PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

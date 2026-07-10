import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { normalizeSpecies } from '@/lib/species'
import { buildVaccinationSchedule, type ProtocolDose } from '@/lib/vaccines/build-vaccination-schedule'

export async function POST(req: Request, props: { params: Promise<{ id: string; code: string }> }) {
  try {
    const { id: petId, code: vaccineCode } = await props.params
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createServerSupabaseClient()

    // Kullanıcı sahipliği doğrula
    const { data: ownership } = await supabase
      .from('pet_owners')
      .select('pet_id')
      .eq('pet_id', petId)
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!ownership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, species, birth_date')
      .eq('id', petId)
      .single()

    if (petError || !pet) {
      return NextResponse.json({ error: 'Evcil hayvan bulunamadı' }, { status: 404 })
    }

    // preference enabled mi kontrol et
    const { data: preference, error: prefError } = await supabase
      .from('pet_vaccine_preferences')
      .select('*')
      .eq('pet_id', petId)
      .eq('vaccine_code', vaccineCode)
      .maybeSingle()

    if (prefError) {
      return NextResponse.json({ error: prefError.message }, { status: 500 })
    }
    if (!preference || !preference.enabled) {
      return NextResponse.json({ error: 'Bu aşı için tercih etkinleştirilmemiş' }, { status: 400 })
    }

    // Protokol aktif + pet türüne uygun mu kontrol et
    const petSpecies = normalizeSpecies(pet.species)
    const { data: protocol, error: protocolError } = await supabase
      .from('vaccine_protocols')
      .select('*')
      .eq('vaccine_code', vaccineCode)
      .eq('species', petSpecies)
      .eq('is_active', true)
      .maybeSingle()

    if (protocolError) {
      return NextResponse.json({ error: protocolError.message }, { status: 500 })
    }
    if (!protocol) {
      return NextResponse.json({ error: 'Protokol bulunamadı veya bu tür için geçerli değil' }, { status: 404 })
    }

    // Bu pet + aşı için tamamlanmış kayıtları çek (booster mı, ilk seri mi belirlenecek)
    const { data: completedRecords, error: recordsError } = await supabase
      .from('vaccine_records_v2')
      .select('vaccine_code, administered_at, status')
      .eq('pet_id', petId)
      .eq('vaccine_code', vaccineCode)
      .eq('status', 'completed')

    if (recordsError) {
      return NextResponse.json({ error: recordsError.message }, { status: 500 })
    }

    const schedule = buildVaccinationSchedule({
      pet: { id: pet.id, birth_date: pet.birth_date, species: petSpecies },
      protocol: {
        vaccine_code: protocol.vaccine_code,
        protocol_name: protocol.protocol_name,
        doses: (protocol.doses ?? []) as ProtocolDose[],
        repeat_frequency: protocol.repeat_frequency as any,
      },
      existingRecords: completedRecords ?? [],
    })

    if (schedule.length === 0) {
      return NextResponse.json({ error: 'Bu aşı için üretilecek yeni bir doz bulunamadı (protokol tamamlanmış olabilir).' }, { status: 400 })
    }

    // Doz bazlı duplicate kontrolü — herhangi bir doz için zaten aktif plan varsa engelle
    const { data: existingPlans, error: existingPlansError } = await supabase
      .from('plans')
      .select('id, extra_data')
      .eq('pet_id', petId)
      .eq('category', 'asi')
      .eq('status', 'active')

    if (existingPlansError) {
      return NextResponse.json({ error: existingPlansError.message }, { status: 500 })
    }

    const existingDoseKeys = new Set(
      (existingPlans ?? [])
        .filter((p: any) => (p.extra_data?.vaccine_code ?? p.extra_data?.vaccine?.code) === vaccineCode)
        .map((p: any) => `${p.extra_data?.dose_number}`)
    )

    const hasDuplicate = schedule.some((item) => existingDoseKeys.has(`${item.doseNumber}`))
    if (hasDuplicate) {
      return NextResponse.json({ error: 'Bu aşı için zaten aktif bir plan mevcut' }, { status: 409 })
    }

    // Tüm dozları tek toplu insert ile yaz — tek insert çağrısı atomik davranır.
    const plansPayload = schedule.map((item) => ({
      pet_id: petId,
      user_id: user.id,
      category: 'asi',
      sub_type: `${protocol.protocol_name} — ${item.label}`,
      scheduled_at: item.scheduledAt.toISOString(),
      status: 'active',
      extra_data: {
        vaccine: { code: item.vaccineCode, name: item.vaccineName },
        vaccine_code: item.vaccineCode,
        dose_number: item.doseNumber,
        dose_label: item.label,
        preference_id: preference.id,
        source: 'vaccine_settings',
        auto_generated: true,
        schedule_trigger: item.trigger,
        days_offset: item.daysOffset,
        is_booster: item.isBooster,
      },
    }))

    const { data: insertedPlans, error: insertError } = await supabase
      .from('plans')
      .insert(plansPayload as any)
      .select()

    if (insertError) {
      console.error('create-plan insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // preference'ı geri bağla
    await supabase
      .from('pet_vaccine_preferences')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', preference.id)

    return NextResponse.json({ data: { plans: insertedPlans, doseCount: insertedPlans?.length ?? 0 } })
  } catch (error: unknown) {
    console.error('create-plan POST error:', error)
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' }, { status: 500 })
  }
}

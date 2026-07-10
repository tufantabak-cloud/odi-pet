import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { normalizeSpecies } from '@/lib/species'

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
      .select('id, species')
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

    // Aynı vaccine_code için aktif plan var mı?
    const { data: existingPlans } = await supabase
      .from('plans')
      .select('id, extra_data')
      .eq('pet_id', petId)
      .eq('category', 'asi')
      .eq('status', 'active')

    const hasActivePlan = (existingPlans ?? []).some((p: any) => {
      const code = p.extra_data?.vaccine?.code ?? p.extra_data?.vaccine_code
      return code === vaccineCode
    })

    if (hasActivePlan) {
      return NextResponse.json({ error: 'Bu aşı için zaten aktif bir plan mevcut' }, { status: 409 })
    }

    // Tek protokol için plan üret — "hemen" semantiğiyle bugüne planlanır,
    // kullanıcı Plan Yap/Takvim ekranından tarihi düzenleyebilir.
    const scheduledAt = new Date()
    scheduledAt.setHours(9, 0, 0, 0)

    const { data: plan, error: insertError } = await supabase
      .from('plans')
      .insert({
        pet_id: petId,
        user_id: user.id,
        category: 'asi',
        sub_type: protocol.protocol_name,
        scheduled_at: scheduledAt.toISOString(),
        repeat_rule: protocol.repeat_frequency && protocol.repeat_frequency !== 'none' ? protocol.repeat_frequency : null,
        status: 'active',
        extra_data: {
          vaccine: { code: protocol.vaccine_code, name: protocol.protocol_name },
          preference_id: preference.id,
          auto_generated: false,
          source: 'vaccine_settings',
        },
      } as any)
      .select()
      .single()

    if (insertError) {
      console.error('create-plan insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // preference'ı oluşan planla geri bağla
    await supabase
      .from('pet_vaccine_preferences')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', preference.id)

    return NextResponse.json({ data: { plan } })
  } catch (error: unknown) {
    console.error('create-plan POST error:', error)
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' }, { status: 500 })
  }
}

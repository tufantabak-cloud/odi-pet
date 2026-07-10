import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { normalizeSpecies } from '@/lib/species'

import { detectRouteConflict } from '@/features/pets/vaccination-algorithm'
import type { AdministrationRoute } from '@/lib/database.types'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Auth kontrolü
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { pet_id, record_type, parsed_data } = body

    if (!pet_id || !record_type || !parsed_data) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    if (record_type !== 'vaccine_card') {
      return NextResponse.json({ error: 'Desteklenmeyen belge tipi' }, { status: 400 })
    }

    // Pet sahipliği + tür bilgisi
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id, species')
      .eq('id', pet_id)
      .single()

    if (petError || !pet) {
      return NextResponse.json({ error: 'Evcil hayvan bulunamadı' }, { status: 404 })
    }

    const petSpecies = normalizeSpecies(pet.species)

    // ── vaccine_code çözümleme ─────────────────────────────────
    // Kullanıcı SmartScanner ekranında zaten seçim yaptıysa (candidates arasından
    // veya CUSTOM), doğrudan onu kullan — tekrar arama yapma.
    let vaccineCode: string | null = parsed_data.vaccine_code || null
    let brandId: string | null = parsed_data.brand_id || null

    if (!vaccineCode) {
      const searchTerm = (parsed_data.brand || parsed_data.title || '').trim()

      if (searchTerm) {
        const { data: brandMatches } = await supabase
          .from('vaccine_brands')
          .select('id, vaccine_code, brand_name, manufacturer')
          .or(`species.eq.both,species.eq.${petSpecies}`)
          .eq('is_active', true)
          .eq('status', 'approved')
          .ilike('brand_name', `%${searchTerm}%`)

        if (brandMatches && brandMatches.length === 1) {
          vaccineCode = brandMatches[0].vaccine_code
          brandId = brandMatches[0].id
        } else if (brandMatches && brandMatches.length > 1) {
          return NextResponse.json({
            success: false,
            needs_selection: true,
            candidates: brandMatches.map(b => ({
              id: b.id,
              vaccine_code: b.vaccine_code,
              brand_name: b.brand_name,
              manufacturer: b.manufacturer,
            })),
          })
        }
      }

      if (!vaccineCode) {
        vaccineCode = 'CUSTOM'
        brandId = null
      }
    }

    // A5: OCR Rota Çakışması Kontrolü
    if (parsed_data?.brand) {
      const { data: brand } = await supabase
        .from('vaccine_brands')
        .select('administration_route')
        .eq('brand_name', parsed_data.brand)
        .maybeSingle()

      if (brand?.administration_route) {
        const expectedRoute = brand.administration_route as AdministrationRoute
        const recordedRoute = (parsed_data.administration_route || 'parenteral_sc') as AdministrationRoute
        const conflict = detectRouteConflict(expectedRoute, recordedRoute)

        if (conflict.hasConflict && expectedRoute === 'intranasal') {
          return NextResponse.json({ error: conflict.message }, { status: 400 })
        }
      }
    }

    // ── vaccine_records_v2'ye insert ────────────────────────────
    const isBrandSelected = !!brandId
    const { data: record, error: insertError } = await supabase
      .from('vaccine_records_v2')
      .insert({
        pet_id,
        vaccine_name: parsed_data.title || parsed_data.vaccine_name || 'Aşı Kaydı',
        vaccine_code: vaccineCode,
        administered_at: parsed_data.date || null,
        next_due_at: parsed_data.next_date || null,
        lot_number: parsed_data.lot_number || null,
        vet_name: parsed_data.vet_name || null,
        brand_id: isBrandSelected ? brandId : null,
        brand_free_text: isBrandSelected ? null : (parsed_data.brand || null),
        status: 'completed',
        confidence_level: 'user_reported',
        source: 'imported_history',
        administration_route: parsed_data.administration_route || null,
        notes: parsed_data.vet_company ? `Klinik: ${parsed_data.vet_company}` : null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('vaccine_records_v2 insert error:', insertError)
      return NextResponse.json({ error: 'Veritabanına kaydedilirken bir hata oluştu.' }, { status: 500 })
    }

    // ── İlgili planı tamamlama ──────────────────────────────────
    let planCompleted = false
    let planCandidates: any[] = []

    if (vaccineCode !== 'CUSTOM') {
      const { data: candidatePlans } = await supabase
        .from('plans')
        .select('id, scheduled_at, extra_data')
        .eq('pet_id', pet_id)
        .eq('category', 'asi')
        .eq('status', 'active')

      const matches = (candidatePlans ?? []).filter((p: any) => {
        const code = p.extra_data?.vaccine?.code ?? p.extra_data?.vaccine_code
        return code === vaccineCode
      })

      if (matches.length === 1) {
        const plan = matches[0]
        await supabase
          .from('plans')
          .update({
            status: 'completed',
            extra_data: { ...(plan.extra_data || {}), vaccine_record_id: record.id },
          })
          .eq('id', plan.id)
        planCompleted = true
      } else if (matches.length > 1) {
        planCandidates = matches.map((p: any) => ({ id: p.id, scheduled_at: p.scheduled_at }))
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        record,
        planCompleted,
        planCandidates: planCandidates.length > 0 ? planCandidates : undefined,
      },
    })

  } catch (error: unknown) {
    console.error('Confirm Scan Error:', error)
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) || 'Internal server error' }, { status: 500 })
  }
}

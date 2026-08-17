import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { normalizeSpecies } from '@/lib/species'
import { createVaccineRecord } from '@/lib/vaccines/createVaccineRecord'

import { detectRouteConflict } from '@/features/pets/vaccination-algorithm'
import type { AdministrationRoute } from '@/lib/vaccines/vaccination-rules'

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Auth kontrolü
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { pet_id, record_type, parsed_data, document_storage_path } = body

    if (!pet_id || !record_type || !parsed_data) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 })
    }

    if (!['vaccine_card', 'food_packaging'].includes(record_type)) {
      return NextResponse.json({ error: 'Desteklenmeyen belge tipi' }, { status: 400 })
    }

    // document_storage_path opsiyonel — verildiyse {userId}/{pet_id}/ ile başlamalı
    // (başka bir kullanıcıya veya başka bir pet'e ait klasör kabul edilmez).
    let documentStoragePath: string | null = null
    if (document_storage_path) {
      const expectedPrefix = `${user.id}/${pet_id}/`
      if (typeof document_storage_path !== 'string' || !document_storage_path.startsWith(expectedPrefix)) {
        return NextResponse.json({ error: 'Geçersiz belge yolu' }, { status: 400 })
      }
      documentStoragePath = document_storage_path
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

    // ── GIDA / MAMA PAKETİ İŞLEME (food_packaging) ────────────────
    if (record_type === 'food_packaging') {
      const addedGrams = Number(parsed_data.package_size_grams || 0)
      const mealsPerDay = Number(parsed_data.meals_per_day || 0)
      const dailyGrams = Number(parsed_data.daily_grams || 0)
      
      const { data: currentInv } = await supabase
        .from('food_inventory')
        .select('*')
        .eq('pet_id', pet_id)
        .maybeSingle()

      // Eğer mevcut stok varsa tahmini olarak güncelle
      const prevStock = currentInv?.current_stock_grams || 0
      const lastRefill = currentInv?.last_refill_date
      let estimatedStock = prevStock
      
      if (lastRefill && currentInv?.estimated_daily_usage) {
        const passedMs = Date.now() - new Date(lastRefill).getTime()
        const passedDays = Math.max(0, Math.floor(passedMs / (1000 * 60 * 60 * 24)))
        estimatedStock = Math.max(0, prevStock - (passedDays * currentInv.estimated_daily_usage))
      }
      
      const newStockGrams = estimatedStock + addedGrams
      const estimatedDailyUsage = dailyGrams > 0 ? dailyGrams : currentInv?.estimated_daily_usage
      
      let nextRefillEstimate = null
      if (estimatedDailyUsage && estimatedDailyUsage > 0) {
        const daysLeft = Math.floor(newStockGrams / estimatedDailyUsage)
        const nextDate = new Date()
        nextDate.setDate(nextDate.getDate() + daysLeft)
        nextRefillEstimate = nextDate.toISOString()
      }

      const { data: inventoryData, error: inventoryError } = await supabase
        .from('food_inventory')
        .upsert({
          pet_id,
          current_stock_grams: newStockGrams,
          estimated_daily_usage: estimatedDailyUsage || null,
          last_refill_date: new Date().toISOString(),
          next_refill_estimate: nextRefillEstimate,
          low_stock_threshold_days: currentInv?.low_stock_threshold_days || 5
        }, { onConflict: 'pet_id' })
        .select()
        .single()

      if (inventoryError) {
        console.error('Food inventory update error:', inventoryError)
        return NextResponse.json({ error: 'Stok güncellenirken bir hata oluştu.' }, { status: 500 })
      }

      // Ayrıca nutrition_logs'a bir kayıt ekleyelim ki Timeline'da görünsün
      await supabase.from('nutrition_logs').insert({
        pet_id,
        food_form: parsed_data.food_type || 'dry',
        amount_grams: addedGrams,
        meal_type: 'other',
        log_date: new Date().toISOString().split('T')[0],
        notes: `SmartScanner ile ${parsed_data.food_brand || ''} ${parsed_data.food_product || ''} paket eklendi.`
      })

      return NextResponse.json({
        success: true,
        data: {
          record: inventoryData,
          planCompleted: false
        }
      })
    }

    // ── AŞI KARTI İŞLEME (vaccine_card) ─────────────────────────────────
    // vaccine_code çözümleme
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

    // vaccine_records_v2'ye insert (X.1 — createVaccineRecord servisi)
    const isBrandSelected = !!brandId
    const vaccineResult = await createVaccineRecord(supabase, {
      pet_id,
      vaccine_code: vaccineCode,
      vaccine_name: parsed_data.title || parsed_data.vaccine_name || 'Aşı Kaydı',
      administered_at: parsed_data.date || null,
      next_due_at: parsed_data.next_date || null,
      lot_number: parsed_data.lot_number || null,
      vet_name: parsed_data.vet_name || null,
      brand_id: isBrandSelected ? brandId : null,
      brand_free_text: isBrandSelected ? null : (parsed_data.brand || null),
      administration_route: parsed_data.administration_route || null,
      document_storage_path: documentStoragePath,
      notes: parsed_data.vet_company ? `Klinik: ${parsed_data.vet_company}` : null,
      status: 'completed',
      confidence_level: 'user_reported',
      source: 'imported_history',
    })

    if (!vaccineResult.success) {
      console.error('vaccine_records_v2 insert error:', vaccineResult.error)
      return NextResponse.json({ error: 'Veritabanına kaydedilirken bir hata oluştu.' }, { status: 500 })
    }

    const record = vaccineResult.record

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
            extra_data: { ...(plan.extra_data || {}), vaccine_record_id: (record as any).id },
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

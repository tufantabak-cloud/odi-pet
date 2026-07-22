import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { normalizeSpecies } from '@/lib/species'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const profile = await getCurrentProfile()
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = await createServerSupabaseClient()

    // Pet ve Species bilgisini al
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('species')
      .eq('id', id)
      .single()

    if (petError || !pet) {
      return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
    }

    // Sahiplik kontrolü
    if (profile.role !== 'admin' && profile.role !== 'founder') {
      const { data: ownership } = await supabase
        .from('pet_owners')
        .select('pet_id')
        .eq('pet_id', id)
        .eq('profile_id', profile.id)
        .single()

      if (!ownership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Şablonları veritabanından çek (böylece sadece kod gönderilse bile eşleşir)
    // vaccine_templates dropped — vaccine_protocols kullanılıyor (bkz. vaccination-algorithm.ts)
    const { data: protocols } = await supabase
      .from('vaccine_protocols')
      .select('*')
      .in('species', [pet.species, 'both'])
      .eq('is_active', true)

    const templateMap = new Map<string, any>()
    if (protocols) {
      protocols.forEach(p => {
        const doses = p.doses || []
        templateMap.set(p.vaccine_code, {
          vaccine_name: p.protocol_name,
          // vaccine_protocols yalnızca aşı protokolleri içerir — parazit verisi parasite_products'ta ayrı tutulur.
          category: 'vaccine',
          is_core: p.is_core,
          dose_count: doses.length || 1,
          recurrence_days: p.repeat_interval_days,
          has_annual_booster: p.repeat_frequency === 'yearly',
        })
      })
    }

    const body = await request.json()
    const { vaccine_answers } = body
    
    if (!Array.isArray(vaccine_answers)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    // ── P0.5: Aşı Tür Bariyeri ─────────────────────────────────────────────
    // Tüm yazma işlemlerinden ÖNCE, sunucu tarafında doğrula. Otoriter kaynak
    // vaccine_protocols'tur; species CHECK domain'i yalnızca 'dog'/'cat' (bu
    // tabloda 'both' YOKTUR — migration 20260605000001:11). Pet türü pet
    // kaydından okunur, istemciye güvenilmez. Tek bir uyumsuz, bilinmeyen veya
    // kodsuz aşı girdisi bile olsa hiçbir plans insert / pets update yapılmaz.
    const petSpecies = normalizeSpecies(pet.species)
    if (petSpecies !== 'cat' && petSpecies !== 'dog') {
      return NextResponse.json(
        {
          error: 'INVALID_PET_SPECIES',
          message: 'Pet türü çözümlenemedi.',
          details: { pet_species: pet.species },
        },
        { status: 400 }
      )
    }

    // Doğrulama için dar kapsamlı katalog. Mevcut tür-filtreli zenginleştirme
    // sorgusu (yukarıda) DEĞİŞTİRİLMEZ; bu ayrı sorgu yalnızca tür/varlık
    // doğrulaması içindir. is_active'e göre süzülmez → is_active davranışı korunur.
    const { data: catalogRows, error: catalogError } = await supabase
      .from('vaccine_protocols')
      .select('vaccine_code, species')
    if (catalogError) throw catalogError
    const catalogSpeciesByCode = new Map<string, string>(
      (catalogRows ?? []).map((r: any) => [r.vaccine_code, r.species])
    )

    const unknownVaccineCodes: string[] = []
    const speciesMismatches: { vaccine_code: string; protocol_species: string }[] = []
    const missingVaccineCodeIndices: number[] = []
    const seenUnknown = new Set<string>()
    const seenMismatch = new Set<string>()

    for (let idx = 0; idx < vaccine_answers.length; idx++) {
      const item = vaccine_answers[idx]
      // Parazit girdileri vaccine_protocols kapsamı dışıdır (parasite_protocols
      // ayrı otoriter kaynaktır). Parazit tür doğrulaması P0.5 kapsamı DIŞI —
      // ayrı bir takip görevidir.
      if (item?.category === 'parasite') continue

      const code = item?.vaccine_code
      // Kodsuz aşı girdisi: bu akışta (sağlık geçmişi sihirbazı) aşı kodu
      // zorunludur — sihirbaz her zaman katalog kodu gönderir. Kodsuz girdi,
      // istemci serbest metninden doğrulanmamış plan üretmemeli → reddedilir.
      // (CUSTOM aşı yolu bu route'ta YOKTUR; katalogda olmadığından zaten
      //  'unknown' sayılır. vaccines/scanner route'ları ayrı kapsamdır.)
      if (!code) {
        missingVaccineCodeIndices.push(idx)
        continue
      }

      const protoSpecies = catalogSpeciesByCode.get(code)
      if (protoSpecies === undefined) {
        if (!seenUnknown.has(code)) {
          seenUnknown.add(code)
          unknownVaccineCodes.push(code)
        }
        continue
      }
      if (normalizeSpecies(protoSpecies) !== petSpecies) {
        if (!seenMismatch.has(code)) {
          seenMismatch.add(code)
          speciesMismatches.push({ vaccine_code: code, protocol_species: protoSpecies })
        }
      }
    }

    // Herhangi bir sorun varsa: tek 400 yanıt, hiçbir yazma yok.
    // Bilinmeyen veya kodsuz girdi varsa ana kod VACCINE_PROTOCOL_NOT_FOUND'dur;
    // ANCAK details TÜM grupları (unknown + mismatch + missing) eksiksiz taşır —
    // hiçbir uyumsuz kod yanıtta kaybolmaz. Yalnızca tür uyumsuzluğu varsa
    // VACCINE_SPECIES_MISMATCH döner.
    if (unknownVaccineCodes.length > 0 || missingVaccineCodeIndices.length > 0) {
      return NextResponse.json(
        {
          error: 'VACCINE_PROTOCOL_NOT_FOUND',
          message: 'Seçilen aşılardan bazıları doğrulanamadı.',
          details: {
            pet_species: petSpecies,
            unknown_vaccine_codes: unknownVaccineCodes,
            mismatches: speciesMismatches,
            missing_vaccine_code_indices: missingVaccineCodeIndices,
          },
        },
        { status: 400 }
      )
    }
    if (speciesMismatches.length > 0) {
      return NextResponse.json(
        {
          error: 'VACCINE_SPECIES_MISMATCH',
          message: 'Seçilen aşılardan bazıları bu pet türüyle uyumlu değil.',
          details: { pet_species: petSpecies, mismatches: speciesMismatches },
        },
        { status: 400 }
      )
    }

    const tasks: any[] = []

    for (const item of vaccine_answers) {
      const vCode = item.vaccine_code
      const dbTemplate = templateMap.get(vCode) || {}

      // Payload'da yoksa DB şablonundan fallback yap
      const vaccine_code = vCode
      const vaccine_name = item.vaccine_name || dbTemplate.vaccine_name || vCode
      const category = item.category || dbTemplate.category
      const dose_count = item.dose_count !== undefined ? item.dose_count : dbTemplate.dose_count
      const recurrence_days = item.recurrence_days !== undefined ? item.recurrence_days : dbTemplate.recurrence_days
      const has_annual_booster = item.has_annual_booster !== undefined ? item.has_annual_booster : dbTemplate.has_annual_booster

      // answered ve last_date fallback'leri
      const answer = item.answer || item.answered
      const user_date = item.user_date || item.last_date
      const is_approximate = item.is_approximate || false

      const mappedCategory = category === 'parasite' ? 'parazit' : 'asi'
      const baseExtraData = {
        vaccine: { code: vaccine_code, name: vaccine_name },
        vaccination_history_wizard: true
      }

      // Parazitler her zaman bugünden itibaren 3 döngü planlanır (tarih sorulmaz)
      if (category === 'parasite') {
        const rDays = recurrence_days ?? 30
        const firstDoseDate = new Date()
        for (let occurrence = 0; occurrence < 3; occurrence++) {
          const scheduledDate = new Date(firstDoseDate)
          scheduledDate.setDate(firstDoseDate.getDate() + occurrence * rDays)
          tasks.push({
            pet_id: id,
            category: mappedCategory,
            sub_type: vaccine_name,
            scheduled_at: scheduledDate.toISOString(),
            status: 'active',
            extra_data: { ...baseExtraData, auto_generated: true }
          })
        }
        continue
      }

      // Aşı Senaryoları
      if (answer === 'ask_vet') {
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 7)
        tasks.push({
          pet_id: id,
          category: 'saglik',
          sub_type: 'Hatırlatma',
          title: `${vaccine_name} karnesi veterinere sor`,
          scheduled_at: nextWeek.toISOString(),
          status: 'active',
          extra_data: { source: 'user_input', vaccination_history_wizard: true }
        })
      } 
      else if (answer === 'yes') {
        if (is_approximate) {
          // Tarih bilinmiyor (Hatırlamıyorum)
          if (has_annual_booster) {
            const nextYear = new Date()
            nextYear.setFullYear(nextYear.getFullYear() + 1)
            tasks.push({
              pet_id: id,
              category: mappedCategory,
              sub_type: `${vaccine_name} — Yıllık Tekrar`,
              scheduled_at: nextYear.toISOString(),
              status: 'active',
              extra_data: { ...baseExtraData, is_historical: false, source: 'system', approximate_date: true }
            })
          }
        } else if (user_date) {
          // Evet, tarih var
          tasks.push({
            pet_id: id,
            category: mappedCategory,
            sub_type: vaccine_name,
            scheduled_at: new Date(user_date).toISOString(),
            status: 'completed',
            extra_data: { ...baseExtraData, is_historical: true, source: 'user_input' }
          })

          if (has_annual_booster) {
            const nextYear = new Date(user_date)
            nextYear.setFullYear(nextYear.getFullYear() + 1)
            tasks.push({
              pet_id: id,
              category: mappedCategory,
              sub_type: `${vaccine_name} — Yıllık Tekrar`,
              scheduled_at: nextYear.toISOString(),
              status: 'active',
              extra_data: { ...baseExtraData, is_historical: false, source: 'system' }
            })
          }
        }
      }
      else if (answer === 'no_or_unknown') {
        // Hayır / bilmiyorum: Bugün başla
        const firstDoseDate = new Date()
        let lastDoseDate = new Date(firstDoseDate)
        const dCount = dose_count || 1

        if (dCount === 1) {
          tasks.push({
            pet_id: id,
            category: mappedCategory,
            sub_type: vaccine_name,
            scheduled_at: firstDoseDate.toISOString(),
            status: 'active',
            extra_data: { ...baseExtraData, auto_generated: true }
          })
        } else if (dCount > 1 && !recurrence_days) {
          tasks.push({
            pet_id: id,
            category: mappedCategory,
            sub_type: vaccine_name,
            scheduled_at: firstDoseDate.toISOString(),
            status: 'active',
            extra_data: { ...baseExtraData, auto_generated: true, incomplete_schedule: true }
          })
        } else {
          for (let i = 1; i <= dCount; i++) {
            const scheduledDate = new Date(firstDoseDate)
            if (i > 1 && recurrence_days) {
              scheduledDate.setDate(firstDoseDate.getDate() + (i - 1) * recurrence_days)
            }
            lastDoseDate = new Date(scheduledDate)
            tasks.push({
              pet_id: id,
              category: mappedCategory,
              sub_type: vaccine_name,
              scheduled_at: scheduledDate.toISOString(),
              status: 'active',
              extra_data: { ...baseExtraData, auto_generated: true }
            })
          }
        }

        if (has_annual_booster) {
          const boosterDate = new Date(lastDoseDate)
          boosterDate.setFullYear(boosterDate.getFullYear() + 1)
          tasks.push({
            pet_id: id,
            category: mappedCategory,
            sub_type: `${vaccine_name} — Yıllık Tekrar`,
            scheduled_at: boosterDate.toISOString(),
            status: 'active',
            extra_data: { ...baseExtraData, auto_generated: true }
          })
        }
      }
    }

    // Görevleri plans tablosuna yaz
    if (tasks.length > 0) {
      const tasksWithUserId = tasks.map(t => ({ ...t, user_id: profile.id }))
      const { error: insertError } = await supabase.from('plans').insert(tasksWithUserId)
      if (insertError) throw insertError
    }

    // Petin sağlık geçmişi durumunu güncelle
    const { error: updateError } = await supabase
      .from('pets')
      .update({ health_history_status: 'completed' })
      .eq('id', id)

    if (updateError) throw updateError

    return NextResponse.json({ success: true, tasksCreated: tasks.length })

  } catch (error: any) {
    console.error('[health-history] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

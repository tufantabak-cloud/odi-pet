import { SupabaseClient } from '@supabase/supabase-js'

export interface VaccinationTask {
  category: string
  sub_type: string
  scheduled_at: string
  extra_data: Record<string, any>
}

/**
 * Doğum tarihine göre bir pet için otomatik aşı/parazit görev planı oluşturur.
 *
 * Kurallar:
 *  A) Parazit (category='parasite'): ilk doz + recurrence_days arayla 2 tekrar (toplam 3 oluşum)
 *  B) Aşı, tek doz (dose_count=1): ilk doz; has_annual_booster=true ise +1 yıl yıllık tekrar
 *  C) Aşı, çok dozlu, recurrence_days doluysa: her doz için ayrı görev; has_annual_booster=true ise son dozdan +1 yıl
 *  D) Aşı, çok dozlu ama recurrence_days NULL (admin boş bırakmış): sadece 1. doz, incomplete_schedule flag'i
 *
 * Filtre: is_active=true, mandatory_level='core', species eşleşmesi
 */
export async function generateVaccinationPlan(
  birthDateStr: string,
  species: string,
  supabase: SupabaseClient
): Promise<VaccinationTask[]> {
  // 'YYYY-MM-DD' formatındaki string'ler new Date() ile UTC gece yarısı parse edilir.
  // UTC+3 gibi timezone'larda bu bir gün geri kaymasına neden olur (örn. 1 Mayıs → 30 Nisan).
  // T12:00:00 ekleyerek parse'ı her timezone'da güvenli hale getiriyoruz.
  const safeBirthStr = birthDateStr.includes('T') ? birthDateStr : birthDateStr + 'T12:00:00'
  const birthDate = new Date(safeBirthStr)
  if (isNaN(birthDate.getTime())) return []

  // Sadece aktif, zorunlu (core) şablonları çek — opsiyonel aşılar otomatik atanmaz
  const { data: templates, error } = await supabase
    .from('vaccine_templates')
    .select('vaccine_code, vaccine_name, category, species, is_active, mandatory_level, first_dose_week, dose_count, recurrence_days, has_annual_booster')
    .eq('is_active', true)
    .eq('mandatory_level', 'core')
    .eq('species', species)

  if (error || !templates) {
    console.error('[vaccination-algorithm] Fetch error:', error)
    return []
  }

  const tasks: VaccinationTask[] = []

  for (const t of templates) {
    const firstDoseWeek = t.first_dose_week ?? 8
    // Tüm ara tarih hesaplamalarında da aynı güvenli base'i kullan
    const firstDoseDate = new Date(safeBirthStr)
    firstDoseDate.setDate(firstDoseDate.getDate() + firstDoseWeek * 7)

    const mappedCategory = t.category === 'parasite' ? 'parazit' : 'asi'
    const baseExtraData = {
      vaccine: { code: t.vaccine_code, name: t.vaccine_name },
      auto_generated: true,
    }

    // ── Kural A: Parazit ────────────────────────────────────────────
    if (t.category === 'parasite') {
      const recurrenceDays = t.recurrence_days ?? 30
      // 3 oluşum: ilk doz + 2 tekrar
      for (let occurrence = 0; occurrence < 3; occurrence++) {
        const scheduledDate = new Date(firstDoseDate)
        scheduledDate.setDate(firstDoseDate.getDate() + occurrence * recurrenceDays)
        tasks.push({
          category: mappedCategory,
          sub_type: occurrence > 0 ? `${t.vaccine_name} — ${occurrence + 1}. Uygulama` : t.vaccine_name,
          scheduled_at: scheduledDate.toISOString(),
          extra_data: baseExtraData,
        })
      }
      continue
    }

    // ── Kural B: Aşı, tek doz (dose_count = 1) ─────────────────────
    if ((t.dose_count ?? 1) === 1) {
      tasks.push({
        category: mappedCategory,
        sub_type: t.vaccine_name,
        scheduled_at: firstDoseDate.toISOString(),
        extra_data: baseExtraData,
      })

      if (t.has_annual_booster) {
        const boosterDate = new Date(firstDoseDate)
        boosterDate.setFullYear(boosterDate.getFullYear() + 1)
        tasks.push({
          category: mappedCategory,
          sub_type: `${t.vaccine_name} — Yıllık Tekrar`,
          scheduled_at: boosterDate.toISOString(),
          extra_data: baseExtraData,
        })
      }
      continue
    }

    // ── Kural D: Çok dozlu ama recurrence_days boş (güvenli fallback) ──
    if (t.dose_count > 1 && !t.recurrence_days) {
      console.warn(`[vaccination-algorithm] ${t.vaccine_code}: dose_count=${t.dose_count} ama recurrence_days boş — yalnızca 1. doz üretildi.`)
      tasks.push({
        category: mappedCategory,
        sub_type: t.vaccine_name,
        scheduled_at: firstDoseDate.toISOString(),
        extra_data: { ...baseExtraData, incomplete_schedule: true },
      })
      continue
    }

    // ── Kural C: Aşı, çok dozlu, recurrence_days dolu ──────────────
    const doseCount = t.dose_count
    const recurrenceDays = t.recurrence_days as number
    let lastDoseDate = new Date(firstDoseDate)

    for (let i = 1; i <= doseCount; i++) {
      const scheduledDate = new Date(firstDoseDate)
      if (i > 1) {
        scheduledDate.setDate(firstDoseDate.getDate() + (i - 1) * recurrenceDays)
      }
      lastDoseDate = new Date(scheduledDate)

      tasks.push({
        category: mappedCategory,
        sub_type: doseCount > 1 ? `${t.vaccine_name} — ${i}. Doz` : t.vaccine_name,
        scheduled_at: scheduledDate.toISOString(),
        extra_data: baseExtraData,
      })
    }

    if (t.has_annual_booster) {
      const boosterDate = new Date(lastDoseDate)
      boosterDate.setFullYear(boosterDate.getFullYear() + 1)
      tasks.push({
        category: mappedCategory,
        sub_type: `${t.vaccine_name} — Yıllık Tekrar`,
        scheduled_at: boosterDate.toISOString(),
        extra_data: baseExtraData,
      })
    }
  }

  return tasks
}

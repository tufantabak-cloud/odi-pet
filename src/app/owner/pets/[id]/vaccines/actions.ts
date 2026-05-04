'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Setup Mode ─────────────────────────────────────────────────
export async function saveSetupMode(petId: string, mode: 'smart_start' | 'historical_import' | 'fresh_start') {
  const supabase = await createServerSupabaseClient()
  await supabase.from('vaccine_setup_profiles').upsert({ pet_id: petId, setup_mode: mode }, { onConflict: 'pet_id' })
  revalidatePath(`/owner/pets/${petId}/vaccines`)
}

// ── Schedule Generator ─────────────────────────────────────────
export async function generateSchedule(petId: string, mode: 'smart_start' | 'historical_import' | 'fresh_start') {
  const supabase = await createServerSupabaseClient()

  const { data: pet } = await supabase.from('pets').select('species, birth_date').eq('id', petId).single()
  if (!pet) return

  const species = (pet.species || '').toLowerCase() === 'köpek' || (pet.species || '').toLowerCase() === 'dog' ? 'dog' : 'cat'

  // Fetch user templates first (overrides), then system templates
  const { data: allTemplates } = await supabase
    .from('vaccine_templates')
    .select('*')
    .eq('species', species)
    .eq('is_active', true)
    .order('first_dose_week', { ascending: true })

  if (!allTemplates || allTemplates.length === 0) return

  // Deduplicate: user overrides win
  const overriddenKeys = new Set(
    allTemplates.filter((t: any) => t.profile_id !== null).map((t: any) => t.vaccine_code)
  )
  const templates = allTemplates.filter((t: any) => {
    if (t.profile_id !== null) return true
    return !overriddenKeys.has(t.vaccine_code)
  })

  const now = new Date()
  const birthDate = pet.birth_date ? new Date(pet.birth_date) : null

  // Delete existing non-completed records
  await supabase.from('vaccine_records_v2').delete().eq('pet_id', petId).neq('status', 'completed')

  const records: any[] = []

  for (const t of templates) {
    const doseCount = t.dose_count || 1
    const getInterval = (idx: number) => {
      if (Array.isArray(t.dose_interval_days)) return t.dose_interval_days[idx] || 21
      return (t.dose_interval_days as any as number) || 21
    }
    const firstDoseWeek = t.first_dose_week || 6
    const source = mode === 'fresh_start' ? 'fresh_start_plan' : 'system_generated'

    const petAgeYears = birthDate ? Math.floor((now.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0
    const isAdult = petAgeYears >= 1

    // 1. FRESH START LOGIC (Ideal Kurgu)
    if (mode === 'fresh_start') {
      if (t.category === 'parasite') {
        // Parasites: Just one record scheduled for today
        records.push({
          pet_id: petId,
          template_id: t.id,
          vaccine_code: t.vaccine_code,
          vaccine_name: t.vaccine_name,
          dose_number: 1,
          status: 'scheduled',
          due_at: now.toISOString(),
          source,
          confidence_level: 'estimated'
        })
      } else if (isAdult) {
        // Adult Vaccine: Skip puppy series, just schedule annual booster for today
        if (t.has_annual_booster) {
          records.push({
            pet_id: petId,
            template_id: t.id,
            vaccine_code: t.vaccine_code,
            vaccine_name: `${t.vaccine_name} (Yıllık Tekrar)`,
            dose_number: doseCount + 1,
            status: 'scheduled',
            due_at: now.toISOString(),
            source,
            confidence_level: 'estimated'
          })
        }
      } else {
        // Puppy Vaccine: Start puppy series from today
        let currentDue = new Date(now)
        for (let doseNum = 1; doseNum <= doseCount; doseNum++) {
          if (doseNum > 1) {
            currentDue.setDate(currentDue.getDate() + getInterval(doseNum - 2))
          }
          records.push({
            pet_id: petId,
            template_id: t.id,
            vaccine_code: t.vaccine_code,
            vaccine_name: doseCount > 1 ? `${t.vaccine_name} (${doseNum}. Doz)` : t.vaccine_name,
            dose_number: doseNum,
            status: 'scheduled',
            due_at: currentDue.toISOString(),
            source,
            confidence_level: 'estimated'
          })
        }
      }
      continue // Skip default logic for fresh_start
    }

    // 2. DEFAULT LOGIC (Smart Start / Historical Import)
    // Calculate first dose date
    let firstDoseDate: Date
    if (birthDate) {
      firstDoseDate = new Date(birthDate)
      firstDoseDate.setDate(firstDoseDate.getDate() + firstDoseWeek * 7)
    } else {
      firstDoseDate = new Date(now)
    }

    // Generate puppy series
    let currentDue = new Date(firstDoseDate)
    for (let doseNum = 1; doseNum <= doseCount; doseNum++) {
      if (doseNum > 1) {
        currentDue.setDate(currentDue.getDate() + getInterval(doseNum - 2))
      }

      const diffDays = Math.ceil((currentDue.getTime() - now.getTime()) / 86400000)
      const status = diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due' : 'scheduled'

      records.push({
        pet_id: petId,
        template_id: t.id,
        vaccine_code: t.vaccine_code,
        vaccine_name: doseCount > 1 ? `${t.vaccine_name} (${doseNum}. Doz)` : t.vaccine_name,
        dose_number: doseNum,
        status,
        due_at: currentDue.toISOString(),
        source,
        confidence_level: 'estimated',
      })
    }

    // Generate annual boosters
    if (t.has_annual_booster) {
      let lastDoseOfSeries = new Date(firstDoseDate)
      for (let i = 0; i < doseCount - 1; i++) {
        lastDoseOfSeries.setDate(lastDoseOfSeries.getDate() + getInterval(i))
      }
      const yearsSinceBirth = birthDate ? now.getFullYear() - birthDate.getFullYear() : 0
      const maxBoosterYears = Math.max(yearsSinceBirth + 1, 1)

      for (let year = 1; year <= maxBoosterYears; year++) {
        const annualDate = new Date(lastDoseOfSeries)
        annualDate.setFullYear(annualDate.getFullYear() + year)

        const diffDays = Math.ceil((annualDate.getTime() - now.getTime()) / 86400000)
        if (diffDays < 365) {
          const status = diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due' : 'scheduled'
          records.push({
            pet_id: petId,
            template_id: t.id,
            vaccine_code: t.vaccine_code,
            vaccine_name: `${t.vaccine_name} (${year}. Yıl Tekrarı)`,
            dose_number: doseCount + year,
            status,
            due_at: annualDate.toISOString(),
            source,
            confidence_level: 'estimated',
          })
        }
      }
    }
  }

  if (records.length > 0) {
    await supabase.from('vaccine_records_v2').insert(records)
  }
  revalidatePath(`/owner/pets/${petId}/vaccines`)
}

// ── Mark Done ──────────────────────────────────────────────────
export async function markVaccineDone(recordId: string, administeredAt: string, source: string, notes?: string) {
  const supabase = await createServerSupabaseClient()

  const { data: record } = await supabase
    .from('vaccine_records_v2')
    .select('*')
    .eq('id', recordId)
    .single()
  if (!record) return

  // Update the record itself
  await supabase.from('vaccine_records_v2').update({
    status: 'completed',
    administered_at: administeredAt,
    source: source as any,
    confidence_level: source === 'user_detailed' ? 'verified' : 'user_reported',
    notes: notes ?? null,
  }).eq('id', recordId)

  // Fetch the template to understand the full dose structure
  const { data: tmpl } = record.template_id
    ? await supabase.from('vaccine_templates').select('*').eq('id', record.template_id).single()
    : { data: null }

  const doseCount = tmpl?.dose_count || 1
  const isSeriesCompleted = (record.dose_number || 1) >= doseCount

  // ── CORE CLEANUP: purge stale records ─────────────────────────
  // Any overdue/due/scheduled record for same code that is AT or BEFORE
  // the dose we just completed is now orphaned — remove it.
  await supabase
    .from('vaccine_records_v2')
    .update({
      status: 'skipped',
      notes: 'Daha ileri bir doz tamamlandığı için sistem tarafından otomatik temizlendi.',
    })
    .eq('pet_id', record.pet_id)
    .eq('vaccine_code', record.vaccine_code)
    .in('status', ['overdue', 'due', 'scheduled'])
    .neq('id', recordId)
    .lte('due_at', administeredAt) // only past-dated stale records

  // ── NEXT DOSE HANDLING ─────────────────────────────────────────
  if (!isSeriesCompleted) {
    // Series not finished — activate next scheduled dose
    const { data: nextDose } = await supabase
      .from('vaccine_records_v2')
      .select('id')
      .eq('pet_id', record.pet_id)
      .eq('vaccine_code', record.vaccine_code)
      .in('status', ['scheduled', 'overdue'])
      .order('dose_number', { ascending: true })
      .limit(1)
      .single()

    if (nextDose) {
      await supabase.from('vaccine_records_v2').update({ status: 'due' }).eq('id', nextDose.id)
    }
  } else if (tmpl?.has_annual_booster || tmpl?.recurrence_days) {
    // Series complete — recalculate next booster FROM actual administered date
    // This ensures 10.7.23 → 10.7.24, NOT the old theoretically-projected date.
    const nextDue = new Date(administeredAt)
    if (tmpl.recurrence_days) {
      nextDue.setDate(nextDue.getDate() + tmpl.recurrence_days)
    } else {
      nextDue.setFullYear(nextDue.getFullYear() + 1)
    }
    const now = new Date()
    const diffDays = Math.ceil((nextDue.getTime() - now.getTime()) / 86400000)
    const newStatus = diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due' : 'scheduled'

    // Find existing future non-completed booster records for this code
    const { data: existingFuture } = await supabase
      .from('vaccine_records_v2')
      .select('id')
      .eq('pet_id', record.pet_id)
      .eq('vaccine_code', record.vaccine_code)
      .gt('due_at', administeredAt)
      .neq('status', 'completed')

    if (existingFuture && existingFuture.length > 0) {
      // UPDATE the first future booster to the correct date based on actual administered_at
      // Delete any duplicates beyond the first one
      const [first, ...rest] = existingFuture
      await supabase
        .from('vaccine_records_v2')
        .update({ due_at: nextDue.toISOString(), status: newStatus })
        .eq('id', first.id)

      if (rest.length > 0) {
        await supabase
          .from('vaccine_records_v2')
          .delete()
          .in('id', rest.map((r: any) => r.id))
      }
    } else {
      // No future record exists — create a fresh one
      await supabase.from('vaccine_records_v2').insert({
        pet_id: record.pet_id,
        template_id: record.template_id,
        vaccine_code: record.vaccine_code,
        vaccine_name: record.vaccine_name,
        dose_number: (record.dose_number || doseCount) + 1,
        status: newStatus,
        due_at: nextDue.toISOString(),
        source: 'system_generated',
        confidence_level: 'estimated',
      })
    }
  }

  // Care Score Bonus (silent fail ok)
  await supabase.rpc('adjust_care_score', { p_pet_id: record.pet_id, p_delta: 10 })

  revalidatePath(`/owner/pets/${record.pet_id}/vaccines`)
  revalidatePath(`/owner/pets/${record.pet_id}`)
}

// ── Skip Vaccine ───────────────────────────────────────────────
export async function skipVaccine(recordId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: record } = await supabase.from('vaccine_records_v2').select('pet_id').eq('id', recordId).single()
  if (!record) return

  await supabase.from('vaccine_records_v2').update({ status: 'skipped' }).eq('id', recordId)
  revalidatePath(`/owner/pets/${record.pet_id}/vaccines`)
}

// ── Postpone Vaccine ───────────────────────────────────────────
export async function postponeVaccine(recordId: string, days: number) {
  const supabase = await createServerSupabaseClient()
  const { data: record } = await supabase.from('vaccine_records_v2').select('*').eq('id', recordId).single()
  if (!record) return

  const newDate = new Date(record.due_at || new Date())
  newDate.setDate(newDate.getDate() + days)

  await supabase.from('vaccine_records_v2').update({
    due_at: newDate.toISOString(),
    status: 'scheduled',
    notes: record.notes ? `${record.notes} | Ertelendi: +${days} gün` : `Ertelendi: +${days} gün`,
  }).eq('id', recordId)

  // Care Score penalty (silent fail ok)
  await supabase.rpc('adjust_care_score', { p_pet_id: record.pet_id, p_delta: -5 })

  revalidatePath(`/owner/pets/${record.pet_id}/vaccines`)
  revalidatePath(`/owner/pets/${record.pet_id}`)
}

// ── Delete Vaccine Record ──────────────────────────────────────
export async function deleteVaccineRecord(recordId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: record } = await supabase.from('vaccine_records_v2').select('pet_id').eq('id', recordId).single()
  if (!record) return

  await supabase.from('vaccine_records_v2').delete().eq('id', recordId)
  revalidatePath(`/owner/pets/${record.pet_id}/vaccines`)
}

// ── Add Manual Vaccine (custom, outside templates) ─────────────
export async function addManualVaccine(petId: string, data: {
  vaccine_name: string
  vaccine_code?: string
  due_at: string
  administered_at?: string
  vet_name?: string
  clinic?: string
  brand?: string
  batch_no?: string
  notes?: string
  amount?: number
}) {
  const supabase = await createServerSupabaseClient()
  const isCompleted = !!data.administered_at

  const notesParts = [
    data.clinic ? `Klinik: ${data.clinic}` : '',
    data.vet_name ? `Veteriner: ${data.vet_name}` : '',
    data.brand ? `Marka: ${data.brand}` : '',
    data.batch_no ? `Seri No: ${data.batch_no}` : '',
    data.notes || '',
  ].filter(Boolean).join(' | ')

  // Auto-close correlation logic:
  // Use explicit code or extract from brackets
  const codeMatch = (data as any).vaccine_name?.match(/\[(.*?)\]/)
  const extractedCode = data.vaccine_code || (codeMatch ? codeMatch[1] : null)

  if (extractedCode && extractedCode !== 'MANUAL' && isCompleted) {
    // Purge ALL stale (non-completed) records for this code that are on or before the administered date
    // This is the primary guard against Matrix/List desync
    await supabase
      .from('vaccine_records_v2')
      .update({
        status: 'skipped',
        notes: 'Manuel kayıt ile otomatik kapatıldı.',
      })
      .eq('pet_id', petId)
      .eq('vaccine_code', extractedCode)
      .in('status', ['overdue', 'due', 'scheduled'])
      .lte('due_at', data.administered_at!) // only past-due stale records
  }

  await supabase.from('vaccine_records_v2').insert({
    pet_id: petId,
    vaccine_code: extractedCode || 'MANUAL',
    vaccine_name: data.vaccine_name,
    status: isCompleted ? 'completed' : 'scheduled',
    due_at: data.due_at,
    administered_at: data.administered_at || null,
    source: isCompleted ? 'user_detailed' : 'system_generated',
    confidence_level: isCompleted ? 'verified' : 'estimated',
    notes: notesParts || null,
  })

  // Log payment if amount provided
  if (data.amount && data.amount > 0) {
    await supabase.from('payments').insert({
      pet_id: petId,
      amount: data.amount,
      payment_type: data.vaccine_name,
      payment_date: data.administered_at?.split('T')[0] || data.due_at.split('T')[0],
      notes: data.clinic || null,
    })
  }

  if (isCompleted) {
    // Care Score Bonus (silent fail ok)
    await supabase.rpc('adjust_care_score', { p_pet_id: petId, p_delta: 10 })
  }

  revalidatePath(`/owner/pets/${petId}/vaccines`)
  revalidatePath(`/owner/pets/${petId}`)
}

// ── Record Payment ─────────────────────────────────────────────
export async function recordVaccinePayment(petId: string, amount: number, label: string, date: string) {
  const supabase = await createServerSupabaseClient()
  await supabase.from('payments').insert({
    pet_id: petId,
    amount,
    payment_type: label,
    payment_date: date,
  })
  revalidatePath(`/owner/pets/${petId}/vaccines`)
}

// ── Generate Future Schedule From Past Scans ───────────────────
export async function generateFutureScheduleFromPastRecords(petId: string) {
  const supabase = await createServerSupabaseClient()

  // Clear existing non-completed records to build a fresh future plan
  await supabase.from('vaccine_records_v2').delete().eq('pet_id', petId).neq('status', 'completed')

  const { data: pet } = await supabase.from('pets').select('species, birth_date').eq('id', petId).single()
  if (!pet) return

  const species = (pet.species || '').toLowerCase() === 'köpek' || (pet.species || '').toLowerCase() === 'dog' ? 'dog' : 'cat'

  const { data: allTemplates } = await supabase.from('vaccine_templates').select('*').eq('species', species).eq('is_active', true)
  if (!allTemplates || allTemplates.length === 0) return

  const overriddenKeys = new Set(allTemplates.filter((t: any) => t.profile_id !== null).map((t: any) => t.vaccine_code))
  const templates = allTemplates.filter((t: any) => t.profile_id !== null || !overriddenKeys.has(t.vaccine_code))

  const { data: completedRecords } = await supabase
    .from('vaccine_records_v2')
    .select('*')
    .eq('pet_id', petId)
    .eq('status', 'completed')
    .order('administered_at', { ascending: true })

  const newRecords: any[] = []
  const now = new Date()

  for (const t of templates) {
    const code = t.vaccine_code
    const tRecords = (completedRecords || []).filter(r => {
       if (r.vaccine_code === code) return true
       if (r.vaccine_code === 'MANUAL' || !r.vaccine_code) {
         const rName = r.vaccine_name.toLowerCase()
         return rName.includes(code.toLowerCase())
       }
       return false
    })

    if (tRecords.length === 0) {
      // If core vaccine is completely missing from scans, flag it as overdue now
      if (t.mandatory_level === 'core' || t.mandatory_level === 'legal_required') {
         newRecords.push({
            pet_id: petId,
            template_id: t.id,
            vaccine_code: code,
            vaccine_name: `${t.vaccine_name} (1. Doz)`,
            dose_number: 1,
            status: 'overdue',
            due_at: now.toISOString(),
            source: 'system_generated',
            confidence_level: 'estimated'
         })
      }
      continue
    }

    const lastRecord = tRecords[tRecords.length - 1]
    const lastDate = new Date(lastRecord.administered_at || lastRecord.due_at || now)

    let nextDue = new Date(lastDate)
    let doseNumToSchedule = 1
    let isBooster = false

    if (tRecords.length < (t.dose_count || 1)) {
       // Needs next dose in series
       const interval = Array.isArray(t.dose_interval_days) 
           ? t.dose_interval_days[tRecords.length - 1] || 21 
           : (t.dose_interval_days as number) || 21
       nextDue.setDate(nextDue.getDate() + interval)
       doseNumToSchedule = tRecords.length + 1
    } else {
       // Series completed, needs annual booster
       if (!t.has_annual_booster && !t.recurrence_days) continue
       if (t.recurrence_days) {
         nextDue.setDate(nextDue.getDate() + t.recurrence_days)
       } else {
         nextDue.setFullYear(nextDue.getFullYear() + 1)
       }
       doseNumToSchedule = (t.dose_count || 1) + 1
       isBooster = true
    }

    const diffDays = Math.ceil((nextDue.getTime() - now.getTime()) / 86400000)
    const status = diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due' : 'scheduled'

    newRecords.push({
      pet_id: petId,
      template_id: t.id,
      vaccine_code: code,
      vaccine_name: isBooster ? `${t.vaccine_name} (Tekrar)` : `${t.vaccine_name} (${doseNumToSchedule}. Doz)`,
      dose_number: doseNumToSchedule,
      status,
      due_at: nextDue.toISOString(),
      source: 'system_generated',
      confidence_level: 'estimated'
    })
  }

  if (newRecords.length > 0) {
    await supabase.from('vaccine_records_v2').insert(newRecords)
  }

  revalidatePath(`/owner/pets/${petId}/vaccines`)
  revalidatePath(`/owner/pets/${petId}`)
}

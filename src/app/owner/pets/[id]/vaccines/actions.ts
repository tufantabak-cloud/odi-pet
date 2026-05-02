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

  // Get pet info
  const { data: pet } = await supabase.from('pets').select('species, birth_date').eq('id', petId).single()
  if (!pet) return

  // Get templates for this species
  const species = pet.species === 'Köpek' ? 'dog' : 'cat'
  const { data: templates } = await supabase
    .from('vaccine_templates')
    .select('*')
    .eq('species', species)
    .eq('is_active', true)
    .order('min_age_weeks', { ascending: true })

  if (!templates || templates.length === 0) return

  const now = new Date()
  const birthDate = pet.birth_date ? new Date(pet.birth_date) : null

  // Delete existing non-completed records (preserve completed ones)
  await supabase.from('vaccine_records_v2').delete().eq('pet_id', petId).neq('status', 'completed')

  const records = templates.map((t: any) => {
    let dueAt: Date
    let status = 'scheduled'
    const source = mode === 'fresh_start' ? 'fresh_start_plan' : 'system_generated'

    if (mode === 'fresh_start') {
      // Start from today + min_age_weeks offset from now
      dueAt = new Date(now)
      dueAt.setDate(dueAt.getDate() + (t.min_age_weeks - 8) * 7) // relative offset
      if (dueAt < now) dueAt = new Date(now) // cap at today
    } else if (birthDate) {
      // Smart start: calculate from birth date
      dueAt = new Date(birthDate)
      dueAt.setDate(dueAt.getDate() + t.min_age_weeks * 7)
    } else {
      // No birth date: start from today
      dueAt = new Date(now)
    }

    // Determine status
    const diffDays = Math.ceil((dueAt.getTime() - now.getTime()) / 86400000)
    if (diffDays < -30) status = 'overdue'
    else if (diffDays < 0) status = 'overdue'
    else if (diffDays <= 7) status = 'due'
    else status = 'scheduled'

    return {
      pet_id: petId,
      template_id: t.id,
      vaccine_code: t.vaccine_code,
      vaccine_name: t.vaccine_name,
      dose_number: t.dose_number,
      status,
      due_at: dueAt.toISOString(),
      source,
      confidence_level: 'estimated',
    }
  })

  await supabase.from('vaccine_records_v2').insert(records)
  revalidatePath(`/owner/pets/${petId}/vaccines`)
}

// ── Mark Done ──────────────────────────────────────────────────
export async function markVaccineDone(recordId: string, administeredAt: string, source: string, notes?: string) {
  const supabase = await createServerSupabaseClient()

  const { data: record } = await supabase.from('vaccine_records_v2').select('pet_id').eq('id', recordId).single()
  if (!record) return

  await supabase.from('vaccine_records_v2').update({
    status: 'completed',
    administered_at: administeredAt,
    source: source as any,
    confidence_level: source === 'user_detailed' ? 'verified' : 'user_reported',
    notes: notes ?? null,
  }).eq('id', recordId)

  // Check if next dose in same code series exists; if so, mark it as 'due'
  const { data: updated } = await supabase.from('vaccine_records_v2').select('*').eq('id', recordId).single()
  if (updated) {
    const { data: nextDose } = await supabase.from('vaccine_records_v2')
      .select('id')
      .eq('pet_id', updated.pet_id)
      .eq('vaccine_code', updated.vaccine_code)
      .eq('status', 'scheduled')
      .order('dose_number', { ascending: true })
      .limit(1)
      .single()

    if (nextDose) {
      await supabase.from('vaccine_records_v2').update({ status: 'due' }).eq('id', nextDose.id)
    }

    // Auto-skip any previous doses in the same series that are not completed
    await supabase.from('vaccine_records_v2')
      .update({ status: 'skipped', notes: 'Sonraki doz onaylandığı için sistem tarafından otomatik atlandı.' })
      .eq('pet_id', updated.pet_id)
      .eq('vaccine_code', updated.vaccine_code)
      .lt('dose_number', updated.dose_number)
      .neq('status', 'completed')
  }

  // Care Score Bonus
  await supabase.rpc('adjust_care_score', { p_pet_id: record.pet_id, p_delta: 10 }).catch(() => {})

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

  // Care Score penalty
  await supabase.rpc('adjust_care_score', { p_pet_id: record.pet_id, p_delta: -5 }).catch(() => {})

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

  await supabase.from('vaccine_records_v2').insert({
    pet_id: petId,
    vaccine_code: 'MANUAL',
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
    }).catch(() => {})
  }

  if (isCompleted) {
    await supabase.rpc('adjust_care_score', { p_pet_id: petId, p_delta: 10 }).catch(() => {})
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
  }).catch(() => {})
  revalidatePath(`/owner/pets/${petId}/vaccines`)
}

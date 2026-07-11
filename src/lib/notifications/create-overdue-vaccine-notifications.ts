import type { AdminSupabaseClient, OverduePlan } from '@/lib/plans/mark-overdue-plans'

/**
 * markOverduePlans() tarafından 'overdue'ya çevrilen planlardan sadece
 * 'asi' kategorisindekiler için tek seferlik "aşı zamanı geçti" bildirimi
 * üretir. plan_id + type üzerindeki partial unique index sayesinde aynı
 * plan için ikinci bir vaccine_overdue bildirimi asla oluşmaz.
 */
export async function createOverdueVaccineNotifications(
  supabase: AdminSupabaseClient,
  plans: OverduePlan[]
): Promise<{ notified: number; skipped: number }> {
  const vaccinePlans = plans.filter((p) => p.category === 'asi')

  let skipped = 0
  const rows: {
    plan_id: string
    pet_id: string
    profile_id: string
    type: 'vaccine_overdue'
    title: string
    message: string
    is_read: boolean
    sent_email: boolean
    open_delay_minutes: number
  }[] = []

  for (const plan of vaccinePlans) {
    if (!plan.id || !plan.pet_id || !plan.user_id) {
      skipped++
      continue
    }
    rows.push({
      plan_id: plan.id,
      pet_id: plan.pet_id,
      profile_id: plan.user_id,
      type: 'vaccine_overdue',
      title: 'Aşı zamanı geçti',
      message: `${plan.sub_type ?? 'Planlanan aşının'} tarihi geçti. Lütfen kaydı kontrol edin.`,
      is_read: false,
      sent_email: false,
      open_delay_minutes: 0,
    })
  }

  if (rows.length === 0) {
    return { notified: 0, skipped }
  }

  // Toplu upsert dene — partial unique index (plan_id, type) WHERE ... nedeniyle
  // Supabase/Postgres bu conflict target'ı düz kolon listesiyle eşleştiremeyebilir.
  const { data, error } = await supabase
    .from('notifications')
    .upsert(rows, { onConflict: 'plan_id,type', ignoreDuplicates: true })
    .select('id')

  if (!error) {
    const notified = data?.length ?? 0
    return { notified, skipped: skipped + (rows.length - notified) }
  }

  console.error('[createOverdueVaccineNotifications] upsert failed, falling back to per-row insert:', error.message)

  let notified = 0
  for (const row of rows) {
    const { error: insertError } = await supabase.from('notifications').insert(row)
    if (insertError) {
      if (insertError.code !== '23505') {
        console.error('[createOverdueVaccineNotifications] insert error:', insertError.message)
      }
      skipped++
    } else {
      notified++
    }
  }

  return { notified, skipped }
}

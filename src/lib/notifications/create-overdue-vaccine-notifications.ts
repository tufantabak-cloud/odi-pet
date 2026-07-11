import type { AdminSupabaseClient, OverduePlan } from '@/lib/plans/mark-overdue-plans'

/**
 * markOverduePlans() tarafından 'overdue'ya çevrilen planlardan sadece
 * 'asi' kategorisindekiler için tek seferlik "aşı zamanı geçti" bildirimi
 * üretir. plan_id + type üzerindeki partial unique index sayesinde aynı
 * plan için ikinci bir vaccine_overdue bildirimi asla oluşmaz — bu index
 * Postgres/Supabase upsert'in ON CONFLICT hedefi olarak eşleştiremediği bir
 * partial index olduğu için toplu upsert yerine satır satır insert kullanılır.
 */
export async function createOverdueVaccineNotifications(
  supabase: AdminSupabaseClient,
  plans: OverduePlan[]
): Promise<{ notified: number; skipped: number }> {
  const vaccinePlans = plans.filter((p) => p.category === 'asi')

  let invalidCount = 0
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
      invalidCount++
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

  let created = 0
  let skipped = 0

  for (const row of rows) {
    const { error } = await supabase
      .from('notifications')
      .insert(row)

    if (error?.code === '23505') {
      skipped++
      continue
    }

    if (error) throw error

    created++
  }

  console.log(
    `Overdue vaccine notifications: candidates=${rows.length} created=${created} duplicates=${skipped} skipped_invalid=${invalidCount} failed=0`
  )

  return { notified: created, skipped: skipped + invalidCount }
}

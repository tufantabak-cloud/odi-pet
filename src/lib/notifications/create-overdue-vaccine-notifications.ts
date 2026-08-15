import type { AdminSupabaseClient, OverduePlan } from '@/lib/plans/mark-overdue-plans'

/**
 * markOverduePlans() tarafından 'overdue'ya çevrilen planlardan sadece
 * 'asi' kategorisindekiler için tek seferlik "aşı zamanı geçti" bildirimi
 * üretir. plan_id + type üzerindeki partial unique index sayesinde aynı
 * plan için ikinci bir vaccine_overdue bildirimi asla oluşmaz — bu index
 * Postgres/Supabase upsert'in ON CONFLICT hedefi olarak eşleştiremediği bir
 * partial index olduğu için toplu upsert yerine satır satır insert kullanılır.
 */
function getOverdueTitleAndMessage(category: string, subType: string | null): { title: string; message: string } {
  switch (category) {
    case 'asi':
      return {
        title: 'Aşı zamanı geçti',
        message: `${subType ?? 'Planlanan aşının'} tarihi geçti. Lütfen kaydı kontrol edin.`,
      }
    case 'parazit':
      return {
        title: 'Parazit uygulaması zamanı geçti',
        message: `${subType ?? 'Planlanan parazit uygulamasının'} tarihi geçti. Lütfen kaydı kontrol edin.`,
      }
    case 'beslenme':
      return {
        title: 'Beslenme planı zamanı geçti',
        message: `${subType ?? 'Planlanan beslenme görevinin'} tarihi geçti. Lütfen kaydı kontrol edin.`,
      }
    case 'bakim':
      return {
        title: 'Bakım zamanı geçti',
        message: `${subType ?? 'Planlanan bakımın'} tarihi geçti. Lütfen kaydı kontrol edin.`,
      }
    case 'egzersiz':
      return {
        title: 'Egzersiz zamanı geçti',
        message: `${subType ?? 'Planlanan egzersizin'} tarihi geçti. Lütfen kaydı kontrol edin.`,
      }
    case 'kontrol':
      return {
        title: 'Kontrol zamanı geçti',
        message: `${subType ?? 'Planlanan kontrolün'} tarihi geçti. Lütfen kaydı kontrol edin.`,
      }
    default:
      return {
        title: 'Plan zamanı geçti',
        message: `${subType ?? 'Planlanan görevin'} tarihi geçti. Lütfen kaydı kontrol edin.`,
      }
  }
}

export async function createOverdueVaccineNotifications(
  supabase: AdminSupabaseClient,
  plans: OverduePlan[]
): Promise<{ notified: number; skipped: number }> {
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

  for (const plan of plans) {
    if (!plan.id || !plan.pet_id || !plan.user_id) {
      invalidCount++
      continue
    }
    const { title, message } = getOverdueTitleAndMessage(plan.category, plan.sub_type)
    rows.push({
      plan_id: plan.id,
      pet_id: plan.pet_id,
      profile_id: plan.user_id,
      type: 'vaccine_overdue',
      title,
      message,
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


  return { notified: created, skipped: skipped + invalidCount }
}

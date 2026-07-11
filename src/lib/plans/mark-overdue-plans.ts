import { createAdminSupabaseClient } from '@/lib/supabase/server'

export type AdminSupabaseClient = ReturnType<typeof createAdminSupabaseClient>

export type OverduePlan = {
  id: string
  pet_id: string
  user_id: string
  category: string
  sub_type: string | null
  scheduled_at: string
}

export type MarkOverdueResult = {
  updated: number
  wouldUpdate?: number
  plans: OverduePlan[]
  dryRun?: boolean
}

/**
 * scheduled_at'ı bugünden (Europe/Istanbul takvim günü) önce olan ve hâlâ
 * 'active' durumda kalmış planları 'overdue'ya çevirir. Saf servis
 * fonksiyonu — admin client caller tarafından enjekte edilir.
 * dryRun=true iken hiçbir UPDATE yapılmaz, sadece adaylar SELECT edilir.
 */
export async function markOverduePlans(
  supabase: AdminSupabaseClient,
  options?: { dryRun?: boolean }
): Promise<MarkOverdueResult> {
  const dryRun = options?.dryRun ?? false

  const now = new Date()
  const todayStartIstanbul = new Date(
    now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
  ) // Türkiye yerel gece yarısı = UTC'de 3 saat geri

  if (dryRun) {
    const { data, error } = await supabase
      .from('plans')
      .select('id, pet_id, user_id, category, sub_type, scheduled_at')
      .lt('scheduled_at', todayStartIstanbul.toISOString())
      .eq('status', 'active')

    if (error) {
      throw error
    }

    const plans = (data ?? []) as OverduePlan[]
    return { updated: 0, wouldUpdate: plans.length, plans, dryRun: true }
  }

  const { data, error } = await supabase
    .from('plans')
    .update({ status: 'overdue' })
    .lt('scheduled_at', todayStartIstanbul.toISOString())
    .eq('status', 'active')
    .select('id, pet_id, user_id, category, sub_type, scheduled_at')

  if (error) {
    throw error
  }

  const plans = (data ?? []) as OverduePlan[]
  return { updated: plans.length, plans }
}

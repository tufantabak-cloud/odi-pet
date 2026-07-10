import { createAdminSupabaseClient } from '@/lib/supabase/server'

export type AdminSupabaseClient = ReturnType<typeof createAdminSupabaseClient>

/**
 * scheduled_at'ı bugünden (Europe/Istanbul takvim günü) önce olan ve hâlâ
 * 'active' durumda kalmış planları 'overdue'ya çevirir. Saf servis
 * fonksiyonu — admin client caller tarafından enjekte edilir.
 */
export async function markOverduePlans(
  supabase: AdminSupabaseClient
): Promise<{ updated: number }> {
  const now = new Date()
  const todayStartIstanbul = new Date(
    now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' })
  ) // Türkiye yerel gece yarısı = UTC'de 3 saat geri

  const { data, error } = await supabase
    .from('plans')
    .update({ status: 'overdue' })
    .lt('scheduled_at', todayStartIstanbul.toISOString())
    .eq('status', 'active')
    .select('id')

  if (error) {
    throw error
  }

  return { updated: data?.length ?? 0 }
}

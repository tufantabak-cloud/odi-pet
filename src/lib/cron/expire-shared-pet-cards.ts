import type { AdminSupabaseClient } from '@/lib/plans/mark-overdue-plans'

/**
 * Süresi dolmuş (expires_at < now) ve hâlâ is_active=true kalmış
 * shared_pet_cards kayıtlarını pasifleştirir. Saf servis fonksiyonu —
 * admin client caller tarafından enjekte edilir.
 */
export async function expireSharedPetCards(
  supabase: AdminSupabaseClient
): Promise<{ updated: number }> {
  const { data, error } = await supabase
    .from('shared_pet_cards')
    .update({ is_active: false })
    .lt('expires_at', new Date().toISOString())
    .eq('is_active', true)
    .select('id')

  if (error) {
    throw error
  }

  return { updated: data?.length ?? 0 }
}

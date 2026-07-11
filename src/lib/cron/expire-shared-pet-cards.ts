import type { AdminSupabaseClient } from '@/lib/plans/mark-overdue-plans'

/**
 * Süresi dolmuş (expires_at < now) ve hâlâ is_active=true kalmış
 * shared_pet_cards kayıtlarını pasifleştirir. Saf servis fonksiyonu —
 * admin client caller tarafından enjekte edilir.
 * dryRun=true iken hiçbir UPDATE yapılmaz, sadece adaylar sayılır.
 */
export async function expireSharedPetCards(
  supabase: AdminSupabaseClient,
  options?: { dryRun?: boolean }
): Promise<{ updated: number; wouldUpdate?: number; dryRun?: boolean }> {
  const dryRun = options?.dryRun ?? false

  if (dryRun) {
    const { count, error } = await supabase
      .from('shared_pet_cards')
      .select('id', { count: 'exact', head: true })
      .lt('expires_at', new Date().toISOString())
      .eq('is_active', true)

    if (error) {
      throw error
    }

    return { updated: 0, wouldUpdate: count ?? 0, dryRun: true }
  }

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

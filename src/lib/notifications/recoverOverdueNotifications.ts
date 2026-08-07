import type { AdminSupabaseClient, OverduePlan } from '@/lib/plans/mark-overdue-plans'
import { createOverdueVaccineNotifications } from './create-overdue-vaccine-notifications'

export interface RecoverOverdueNotificationsResult {
  recoveredCount: number
  skippedCount: number
  candidateCount: number
}

/**
 * Pure orchestration layer for recovering missing vaccine overdue notifications (Sprint X.4 / C.5.3).
 *
 * 1. Queries 'overdue' vaccine plans from DB.
 * 2. Identifies plans that lack a corresponding 'vaccine_overdue' notification.
 * 3. Delegates notification creation directly to canonical createOverdueVaccineNotifications().
 *
 * Zero logic duplication: No payload generation, no insert SQL, no 23505 handling in this file.
 */
export async function recoverOverdueNotifications(
  supabase: AdminSupabaseClient,
  options?: { category?: string; dryRun?: boolean }
): Promise<RecoverOverdueNotificationsResult> {
  const dryRun = options?.dryRun ?? false

  // 1. Fetch overdue plans
  let query = supabase
    .from('plans')
    .select('id, pet_id, user_id, category, sub_type, scheduled_at')
    .eq('status', 'overdue')

  if (options?.category) {
    query = query.eq('category', options.category)
  }

  const { data: overduePlansData, error: plansError } = await query

  if (plansError) throw plansError
  const overduePlans: OverduePlan[] = (overduePlansData ?? []).filter(
    (p): p is OverduePlan => Boolean(p.id && p.pet_id && p.user_id)
  )

  if (overduePlans.length === 0) {
    return { recoveredCount: 0, skippedCount: 0, candidateCount: 0 }
  }

  // 2. Identify plans that already have a vaccine_overdue notification
  const planIds = overduePlans.map((p) => p.id)
  const { data: existingNotifs, error: notifError } = await supabase
    .from('notifications')
    .select('plan_id')
    .eq('type', 'vaccine_overdue')
    .in('plan_id', planIds)

  if (notifError) throw notifError

  const notifiedPlanIds = new Set(
    (existingNotifs ?? []).map((n) => n.plan_id).filter(Boolean)
  )

  // 3. Filter unnotified candidates
  const unnotifiedPlans = overduePlans.filter((p) => !notifiedPlanIds.has(p.id))

  if (unnotifiedPlans.length === 0) {
    return { recoveredCount: 0, skippedCount: overduePlans.length, candidateCount: overduePlans.length }
  }

  if (dryRun) {
    console.log(`[OverdueRecovery] dry-run: Would recover ${unnotifiedPlans.length} missing vaccine notifications.`)
    return { recoveredCount: unnotifiedPlans.length, skippedCount: 0, candidateCount: unnotifiedPlans.length }
  }

  // 4. Delegate notification creation to canonical createOverdueVaccineNotifications
  const result = await createOverdueVaccineNotifications(supabase, unnotifiedPlans)

  return {
    recoveredCount: result.notified,
    skippedCount: result.skipped,
    candidateCount: unnotifiedPlans.length,
  }
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { runBatchQualityScan } from '@/lib/agents/dataQualityAgent'
import { emitVaccineDueEvents } from '@/lib/agents/petProfileAgent'
import { runUserHealthScan } from '@/lib/agents/userHealthAgent'
import { markOverduePlans } from '@/lib/plans/mark-overdue-plans'
import { createOverdueVaccineNotifications } from '@/lib/notifications/create-overdue-vaccine-notifications'
import { expireSharedPetCards } from '@/lib/cron/expire-shared-pet-cards'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { writeEvent } from './eventContract'
import { randomUUID } from 'crypto'

export interface OrchestratorRunResult {
  run_id: string
  duration_ms: number
  agents_succeeded: string[]
  agents_failed: string[]
  agents_skipped: string[]
  total_users_processed: number
  dry_run: boolean
}

export async function runOrchestratedPipeline(
  triggered_by: 'cron' | 'manual' = 'cron',
  options?: { dryRun?: boolean }
): Promise<OrchestratorRunResult> {
  const dryRun = options?.dryRun ?? false

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      },
    }
  )

  const run_id = randomUUID()
  const started_at = Date.now()

  const agents_succeeded: string[] = []
  const agents_failed: string[] = []
  const agents_skipped: string[] = []
  let total_users_processed = 0

  await writeEvent(supabase, null, 'orchestrator_run_started', {
    run_id,
    triggered_by,
    agents_planned: ['data_quality', 'vaccine_check', 'user_health', 'overdue_plans', 'expire_cards'],
  })

  // ADIM 1 — Data Quality
  try {
    const adminSupabase = createAdminSupabaseClient()
    const dqResult = await runBatchQualityScan(adminSupabase)
    total_users_processed = dqResult.processed
    agents_succeeded.push('data_quality')
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    agents_failed.push('data_quality')
    await writeEvent(supabase, null, 'orchestrator_agent_failed', {
      run_id,
      agent: 'data_quality',
      error,
      downstream_skipped: [],
    })
  }

  // ADIM 2 — Vaccine Check
  try {
    await emitVaccineDueEvents()
    agents_succeeded.push('vaccine_check')
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    agents_failed.push('vaccine_check')
    await writeEvent(supabase, null, 'orchestrator_agent_failed', {
      run_id,
      agent: 'vaccine_check',
      error,
      downstream_skipped: [],
    })
  }

  // ADIM 3 — User Health
  try {
    await runUserHealthScan()
    agents_succeeded.push('user_health')
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    agents_failed.push('user_health')
    await writeEvent(supabase, null, 'orchestrator_agent_failed', {
      run_id,
      agent: 'user_health',
      error,
      downstream_skipped: ['notification — churn_risk_detected event üretilmedi'],
    })
  }

  // ADIM 4 — Overdue Plans (scheduled_at geçmiş 'active' planları 'overdue' yapar)
  // + C.5.1 Recovery: bir önceki çalışmada bildirimi eksik kalmış overdue planları telafi eder.
  try {
    const adminSupabase = createAdminSupabaseClient()

    // 1. Yeni overdue planları bul ve güncelle
    const overdueResult = await markOverduePlans(adminSupabase, { dryRun })
    console.log('Overdue plans marked:', overdueResult.updated, dryRun ? `(dry-run, wouldUpdate=${overdueResult.wouldUpdate})` : '')

    // 2. Önceki çalışmada bildirimi eksik kalan overdue planları bul
    const missedPlansResult = await adminSupabase
      .from('plans')
      .select('id, pet_id, user_id, category, sub_type, scheduled_at')
      .eq('status', 'overdue')
      .eq('category', 'asi')

    if (missedPlansResult.error) throw missedPlansResult.error
    const missedPlans = missedPlansResult.data ?? []

    const missedPlanIds = missedPlans
      .map(p => p.id)
      .filter((id): id is string => Boolean(id))

    let existingNotifs: Array<{ plan_id: string | null }> = []
    if (missedPlanIds.length > 0) {
      const notifResult = await adminSupabase
        .from('notifications')
        .select('plan_id')
        .eq('type', 'vaccine_overdue')
        .in('plan_id', missedPlanIds)
      if (notifResult.error) throw notifResult.error
      existingNotifs = notifResult.data ?? []
    }

    const notifiedIds = new Set(existingNotifs.map(n => n.plan_id))
    const unnotified = missedPlans.filter(p => !notifiedIds.has(p.id))
    const newOverdueIds = new Set(overdueResult.plans.map(p => p.id))
    const recoveryPlans = unnotified.filter(p => !newOverdueIds.has(p.id))

    // 3. Yeni + recovery planları birleştir
    const allToNotify = [...overdueResult.plans, ...recoveryPlans]
    if (!dryRun) {
      const notifResult = await createOverdueVaccineNotifications(adminSupabase, allToNotify)
      console.log('Overdue notifications:', notifResult.notified, 'skipped:', notifResult.skipped, '(recovery:', recoveryPlans.length, ')')
    } else {
      console.log('Overdue notifications skipped (dry-run). Would notify:', allToNotify.length, '(recovery:', recoveryPlans.length, ')')
    }

    agents_succeeded.push('overdue_plans')
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    agents_failed.push('overdue_plans')
    await writeEvent(supabase, null, 'orchestrator_agent_failed', {
      run_id,
      agent: 'overdue_plans',
      error,
      downstream_skipped: [],
    })
  }

  // ADIM 5 — Expire Shared Pet Cards (süresi geçmiş paylaşım kartlarını pasifleştirir)
  try {
    const adminSupabase = createAdminSupabaseClient()
    const result = await expireSharedPetCards(adminSupabase, { dryRun })
    console.log('Shared pet cards expired:', result.updated, dryRun ? `(dry-run, wouldUpdate=${result.wouldUpdate})` : '')
    agents_succeeded.push('expire_cards')
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    agents_failed.push('expire_cards')
    await writeEvent(supabase, null, 'orchestrator_agent_failed', {
      run_id,
      agent: 'expire_cards',
      error,
      downstream_skipped: [],
    })
  }

  const duration_ms = Date.now() - started_at

  await writeEvent(supabase, null, 'orchestrator_run_completed', {
    run_id,
    duration_ms,
    agents_succeeded,
    agents_failed,
    total_users_processed,
  })

  return { run_id, duration_ms, agents_succeeded, agents_failed, agents_skipped, total_users_processed, dry_run: dryRun }
}

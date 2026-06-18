import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { runBatchQualityScan } from '@/lib/agents/dataQualityAgent'
import { emitVaccineDueEvents } from '@/lib/agents/petProfileAgent'
import { runUserHealthScan } from '@/lib/agents/userHealthAgent'
import { writeEvent } from './eventContract'
import { randomUUID } from 'crypto'

export interface OrchestratorRunResult {
  run_id: string
  duration_ms: number
  agents_succeeded: string[]
  agents_failed: string[]
  total_users_processed: number
}

export async function runOrchestratedPipeline(
  triggered_by: 'cron' | 'manual' = 'cron'
): Promise<OrchestratorRunResult> {
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
  let total_users_processed = 0

  await writeEvent(supabase, null, 'orchestrator_run_started', {
    run_id,
    triggered_by,
    agents_planned: ['data_quality', 'vaccine_check', 'user_health'],
  })

  // ADIM 1 — Data Quality
  try {
    const dqResult = await runBatchQualityScan()
    total_users_processed = dqResult.processed
    agents_succeeded.push('data_quality')
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    agents_failed.push('data_quality')
    await writeEvent(supabase, null, 'orchestrator_agent_failed', {
      run_id,
      agent: 'data_quality',
      error,
      downstream_skipped: ['user_health'],
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
  if (!agents_failed.includes('data_quality')) {
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
  }

  const duration_ms = Date.now() - started_at

  await writeEvent(supabase, null, 'orchestrator_run_completed', {
    run_id,
    duration_ms,
    agents_succeeded,
    agents_failed,
    total_users_processed,
  })

  return { run_id, duration_ms, agents_succeeded, agents_failed, total_users_processed }
}

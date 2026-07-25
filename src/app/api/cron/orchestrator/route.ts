import { runOrchestratedPipeline } from '@/lib/agents/orchestrator/orchestratorAgent'
import { authorizeCronRequest } from '@/lib/security/cron-auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authorizationError = authorizeCronRequest(req)
  if (authorizationError) return authorizationError

  const dryRun = new URL(req.url).searchParams.get('dry_run') === 'true'
  const result = await runOrchestratedPipeline('cron', { dryRun })

  const status = result.agents_failed.length === 0 ? 200 : 207
  return NextResponse.json(result, { status })
}

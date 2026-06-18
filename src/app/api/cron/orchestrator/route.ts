import { runOrchestratedPipeline } from '@/lib/agents/orchestrator/orchestratorAgent'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    new URL(req.url).searchParams.get('token') !== process.env.CRON_SECRET
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runOrchestratedPipeline('cron')
  
  const status = result.agents_failed.length === 0 ? 200 : 207
  return NextResponse.json(result, { status })
}

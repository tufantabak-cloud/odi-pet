import { generateWeeklyReport } from '@/lib/agents/orchestrator/weeklyReportAgent'
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

  const report = await generateWeeklyReport()
  return NextResponse.json(report)
}

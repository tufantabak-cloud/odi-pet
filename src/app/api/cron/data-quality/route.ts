import { runBatchQualityScan } from '@/lib/agents/dataQualityAgent'
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

  try {
    const result = await runBatchQualityScan()
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Data Quality Cron Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

import { emitVaccineDueEvents } from '@/lib/agents/petProfileAgent'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      new URL(req.url).searchParams.get('token') !== process.env.CRON_SECRET
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const emitted = await emitVaccineDueEvents()
    
    return NextResponse.json({
      success: true,
      message: 'Vaccine checks completed',
      emitted
    })
  } catch (error: any) {
    console.error('Vaccine Check Cron Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

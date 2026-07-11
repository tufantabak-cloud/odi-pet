import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    )
  }

  const authHeader = req.headers.get('authorization')
  const queryToken = new URL(req.url).searchParams.get('token')

  if (
    authHeader !== `Bearer ${cronSecret}` &&
    queryToken !== cronSecret
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    status: 'disabled',
    reason: 'moved_to_orchestrator'
  })
}

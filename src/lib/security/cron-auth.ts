import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'

function secretsMatch(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)

  if (providedBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(providedBuffer, expectedBuffer)
}

export function authorizeCronRequest(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'SERVER_MISCONFIGURATION' },
      { status: 503 }
    )
  }

  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const providedSecret = authorization.slice('Bearer '.length)
  if (!secretsMatch(providedSecret, cronSecret)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  return null
}

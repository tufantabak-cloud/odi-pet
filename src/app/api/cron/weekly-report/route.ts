import { NextResponse } from 'next/server'
import { authorizeCronRequest } from '@/lib/security/cron-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authorizationError = authorizeCronRequest(req)
  if (authorizationError) return authorizationError

  return NextResponse.json({
    status: 'disabled',
    reason: 'not_implemented'
  })
}

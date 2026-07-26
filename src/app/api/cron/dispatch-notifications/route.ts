import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { authorizeCronRequest } from '@/lib/security/cron-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const authorizationError = authorizeCronRequest(req)
  if (authorizationError) return authorizationError

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Notification dispatch is not configured')
    return NextResponse.json(
      { error: 'SERVER_MISCONFIGURATION' },
      { status: 503 }
    )
  }

  const requestId = randomUUID()

  try {
    const edgeResponse = await fetch(
      `${supabaseUrl}/functions/v1/dispatch-notifications`,
      {
        method: 'POST',
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
        headers: {
          apikey: serviceRoleKey,
          authorization: `Bearer ${serviceRoleKey}`,
          'content-type': 'application/json',
          'x-request-id': requestId,
        },
        body: '{}',
      }
    )

    const edgeBody = await edgeResponse.json().catch(() => null) as
      | { request_id?: string; [key: string]: unknown }
      | null

    if (!edgeResponse.ok || edgeBody?.request_id !== requestId) {
      console.error('Notification Edge Function dispatch failed', {
        requestId,
        edgeStatus: edgeResponse.status,
        responseVerified: edgeBody?.request_id === requestId,
      })
      return NextResponse.json(
        {
          error: 'EDGE_DISPATCH_FAILED',
          request_id: requestId,
          edge_status: edgeResponse.status,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      status: 'success',
      request_id: requestId,
      edge_status: edgeResponse.status,
      result: edgeBody,
    })
  } catch (error) {
    console.error('Notification Edge Function request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        error: 'EDGE_DISPATCH_UNAVAILABLE',
        request_id: requestId,
      },
      { status: 502 }
    )
  }
}

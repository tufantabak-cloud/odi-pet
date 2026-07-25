import { NextResponse } from 'next/server'

import { getSessionUser } from '@/lib/auth/get-current-profile'
import { lostReportLocationSchema } from '@/lib/lost-reports/validation'

const responseHeaders = { 'Cache-Control': 'no-store' }

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'UNAUTHORIZED' },
      { status: 401, headers: responseHeaders }
    )
  }

  const body = await request.json().catch(() => null)
  const candidate = body?.manualAddress
    ? {
        isManual: true,
        address: body.manualAddress,
      }
    : {
        isManual: false,
        lat: body?.lat,
        lng: body?.lng,
        ...(body?.address ? { address: body.address } : {}),
      }

  const parsed = lostReportLocationSchema.safeParse(candidate)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'INVALID_OR_OUTSIDE_TURKEY_LOCATION' },
      { status: 400, headers: responseHeaders }
    )
  }

  return NextResponse.json(
    { success: true, ...parsed.data },
    { headers: responseHeaders }
  )
}

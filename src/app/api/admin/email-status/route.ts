import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { getAdminEmailStatus } from '@/lib/email/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()

  // Ensure authorized user
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get admin status
  const emailStatus = getAdminEmailStatus()

  // Ensure secrets are never sent to client
  return NextResponse.json({
    success: true,
    data: emailStatus,
  })
}

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/get-current-profile'

// POST /api/notifications/trigger  — admin-only manual dispatch trigger
export async function POST() {
  const profile = await requireRole(['admin', 'founder'])
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/dispatch-notifications`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: '{}',
    })

    const data = await res.json()

    return NextResponse.json({
      success: res.ok,
      status:  res.status,
      result:  data,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

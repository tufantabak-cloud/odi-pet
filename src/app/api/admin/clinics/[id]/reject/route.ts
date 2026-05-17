import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

// Reject = delete clinic's memberships (effectively removing access)
// We also delete the clinic itself so the queue is cleared.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const clinicId = params.id

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Delete memberships first (foreign-key ordering)
  const { error: membershipError } = await adminClient
    .from('clinic_memberships')
    .delete()
    .eq('clinic_id', clinicId)

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 })
  }

  // Delete the clinic record
  const { error: clinicError } = await adminClient
    .from('clinics')
    .delete()
    .eq('id', clinicId)

  if (clinicError) {
    return NextResponse.json({ error: clinicError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

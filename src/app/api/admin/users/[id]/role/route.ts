import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getCurrentProfile, canAssignRole } from '@/lib/auth/get-current-profile'

/**
 * PATCH /api/admin/users/:id/role
 * Body: { role: 'owner' | 'admin' | 'founder' | 'vet' }
 *
 * Authorization rules:
 *  - Caller must be `admin` or `founder`
 *  - Only a `founder` may promote someone to `founder`
 *  - A founder cannot demote themselves (safety guard)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params
  const actor = await getCurrentProfile()
  if (!actor) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Actor must be admin or founder to reach this endpoint
  if (actor.role !== 'admin' && actor.role !== 'founder') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const targetRole: string | undefined = body?.role

  if (!targetRole) {
    return NextResponse.json({ error: 'Missing `role` in request body' }, { status: 400 })
  }

  const allowedRoles = ['owner', 'vet', 'admin', 'founder']
  if (!allowedRoles.includes(targetRole)) {
    return NextResponse.json(
      { error: `Invalid role. Allowed: ${allowedRoles.join(', ')}` },
      { status: 400 }
    )
  }

  // Founder-gate: only a founder may grant the founder role
  if (!canAssignRole(actor.role, targetRole)) {
    return NextResponse.json(
      { error: 'Only a founder can assign the founder role.' },
      { status: 403 }
    )
  }

  // Safety: prevent a founder from removing their own founder status
  if (targetId === actor.id && actor.role === 'founder' && targetRole !== 'founder') {
    return NextResponse.json(
      { error: 'A founder cannot demote themselves. Ask another founder.' },
      { status: 400 }
    )
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: targetRole })
    .eq('id', targetId)
    .select('id, role, first_name, email')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, profile: data })
}

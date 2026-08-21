import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { revalidatePath } from 'next/cache'
import { hasPetCapability } from '@/lib/pets/access'

type Params = { params: Promise<{ id: string; logId: string }> }

async function assertOwner(petId: string, userId: string) {
  const supabase = await createServerSupabaseClient()
  const canManage = await hasPetCapability(supabase, petId, 'can_manage_pet_care')
  if (canManage) return true

  const { data } = await supabase
    .from('pet_owners')
    .select('role')
    .eq('pet_id', petId)
    .eq('profile_id', userId)
    .maybeSingle()

  return !!data
}

// DELETE — delete a weight log
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, logId } = await params
  if (!(await assertOwner(id, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('weight_logs')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString()
    })
    .eq('id', logId)
    .eq('pet_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath(`/owner/pets/${id}/nutrition`)
  return NextResponse.json({ success: true })
}

// PATCH — update a weight log
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, logId } = await params
  if (!(await assertOwner(id, user.id))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = await createServerSupabaseClient()

  const updates: Record<string, any> = {}
  if (body.weight_kg != null) {
    const w = Number(body.weight_kg)
    if (isNaN(w) || w <= 0) {
      return NextResponse.json({ error: 'Geçerli bir kilo değeri giriniz.' }, { status: 400 })
    }
    updates.weight_kg = w
  }

  if (body.measured_at) {
    updates.measured_at = body.measured_at
  }

  if (body.height_cm !== undefined) {
    updates.height_cm = body.height_cm ? Number(body.height_cm) : null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek veri belirtilmedi.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('weight_logs')
    .update(updates)
    .eq('id', logId)
    .eq('pet_id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath(`/owner/pets/${id}/nutrition`)
  return NextResponse.json({ success: true, log: data })
}

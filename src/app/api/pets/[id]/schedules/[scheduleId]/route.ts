import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  const { id: petId, scheduleId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = await createServerSupabaseClient()

  const updates: any = {};
  if (body.status !== undefined) {
    updates.status = body.status;
    updates.completed_at = body.status === 'completed' || body.status === 'done' ? new Date().toISOString() : null;
  }
  if (body.due_date !== undefined) updates.due_date = body.due_date;
  if (body.title !== undefined) updates.title = body.title;
  if (body.metadata !== undefined) updates.metadata = body.metadata;

  // Sadece yetkili pet_id ve schedule_id güncellenebilir (SSOT - Canonical)
  const { data, error } = await supabase
    .from('health_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .eq('pet_id', petId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  const { id: petId, scheduleId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  // OPOS Cilt 5 gereği: hard delete yapılmaz, iptal durumuna (cancelled) veya arşiv durumuna çekilir.
  // "Sağlık Verisi Silinemez, Sadece Arşivlenir (Health Data Archival Only - Cilt 5)"
  const { error } = await supabase
    .from('health_schedules')
    .update({ status: 'cancelled' })
    .eq('id', scheduleId)
    .eq('pet_id', petId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

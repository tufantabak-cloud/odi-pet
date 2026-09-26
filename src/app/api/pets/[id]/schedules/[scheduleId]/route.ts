import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { hasPetCapability } from '@/lib/pets/access'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  const { id: petId, scheduleId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  if (typeof (supabase as any)?.rpc === 'function') {
    const canManage = await hasPetCapability(supabase, petId, 'can_manage_pet_care')
    if (!canManage) {
      return NextResponse.json({ error: 'Bu evcil hayvanın planlarını yönetme yetkiniz bulunmuyor.' }, { status: 403 })
    }
  }

  const body = await req.json()

  const updates: any = {};
  if (body.status !== undefined) {
    updates.status = (body.status === 'completed' || body.status === 'done') ? 'done' : body.status;
  }
  if (body.due_date !== undefined) updates.due_date = body.due_date;
  if (body.scheduled_at !== undefined) updates.due_date = body.scheduled_at;
  if (body.title !== undefined) updates.title = body.title;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.metadata !== undefined) updates.metadata = body.metadata;
  if (body.extra_data !== undefined) {
    updates.metadata = { ...(updates.metadata || {}), ...body.extra_data };
  }
  if (body.postpone_count !== undefined) updates.postpone_count = body.postpone_count;

  // 1. health_schedules tablosunda güncelle
  const scheduleQuery = supabase
    .from('health_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .eq('pet_id', petId)
    .select()

  let scheduleData = null
  let scheduleError = null

  try {
    const res = typeof scheduleQuery.maybeSingle === 'function'
      ? await scheduleQuery.maybeSingle()
      : await scheduleQuery.single()
    scheduleData = res.data
    scheduleError = res.error
  } catch (err: any) {
    scheduleError = err
  }

  const isPgrst116 = scheduleError && (
    scheduleError.code === 'PGRST116' ||
    String(scheduleError.message || scheduleError).includes('Cannot coerce') ||
    String(scheduleError.message || scheduleError).includes('0 rows')
  )

  if (scheduleError && !isPgrst116) {
    console.error('[API/schedules PATCH] health_schedules error:', scheduleError)
    return NextResponse.json({ error: 'Görev güncellenirken bir hata oluştu.' }, { status: 500 })
  }

  if (scheduleData) {
    return NextResponse.json(scheduleData)
  }

  // 2. Resilience Fallback: health_schedules'da bulunamadıysa plans tablosunu kontrol et
  // (SSOT: 'plans' tablosundan gelen bir görevin yanlış rotaya yönlenmesi durumunda veri kaybını önler)
  const planUpdates: any = {}
  if (body.status !== undefined) {
    planUpdates.status = (body.status === 'done' || body.status === 'completed') ? 'completed' : body.status;
  }
  if (body.due_date !== undefined || body.scheduled_at !== undefined) {
    planUpdates.scheduled_at = body.due_date || body.scheduled_at;
  }
  if (body.notes !== undefined || body.note !== undefined) {
    planUpdates.note = body.notes || body.note;
  }
  if (body.extra_data !== undefined) {
    planUpdates.extra_data = body.extra_data;
  }

  try {
    const planQuery = supabase
      .from('plans')
      .update(planUpdates)
      .eq('id', scheduleId)
      .eq('pet_id', petId)
      .select()

    let planRes = null
    if (typeof planQuery.maybeSingle === 'function') {
      planRes = await planQuery.maybeSingle()
    } else {
      try {
        planRes = await planQuery.single()
      } catch {
        planRes = { data: null, error: null }
      }
    }

    if (planRes?.data) {
      return NextResponse.json(planRes.data)
    }
  } catch (err) {
    console.error('[API/schedules PATCH] plans fallback error:', err)
  }

  // 3. Her iki tabloda da kayıt bulunamadı
  return NextResponse.json({ error: 'Görev veya plan kaydı bulunamadı.' }, { status: 404 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  const { id: petId, scheduleId } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  if (typeof (supabase as any)?.rpc === 'function') {
    const canManage = await hasPetCapability(supabase, petId, 'can_manage_pet_care')
    if (!canManage) {
      return NextResponse.json({ error: 'Bu evcil hayvanın planlarını silme yetkiniz bulunmuyor.' }, { status: 403 })
    }
  }

  // OPOS Cilt 5 gereği: hard delete yapılmaz, iptal durumuna (cancelled) veya arşiv durumuna çekilir.
  // 1. health_schedules tablosunda iptal et
  const { error: scheduleError } = await supabase
    .from('health_schedules')
    .update({ status: 'cancelled' })
    .eq('id', scheduleId)
    .eq('pet_id', petId)

  if (!scheduleError) {
    return NextResponse.json({ success: true })
  }

  // 2. Resilience Fallback: plans tablosunda iptal et
  const { error: planError } = await supabase
    .from('plans')
    .update({ status: 'cancelled' })
    .eq('id', scheduleId)
    .eq('pet_id', petId)

  if (!planError) {
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Görev veya plan kaydı bulunamadı.' }, { status: 404 })
}

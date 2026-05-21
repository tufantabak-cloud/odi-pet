import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

// POST: Assign a task to a member
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { schedule_id, assigned_to, pet_id } = await req.json()
  if (!schedule_id || !pet_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const supabase = await createServerSupabaseClient()

  // Permission: must be owner or admin
  const { data: role } = await supabase.rpc('user_pet_role', { p_pet_id: pet_id })
  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Yalnızca sahip veya admin görev atayabilir' }, { status: 403 })
  }

  // If assigned_to given, verify they are a pet member
  if (assigned_to) {
    const { data: member } = await supabase
      .from('pet_members')
      .select('id')
      .eq('pet_id', pet_id)
      .eq('profile_id', assigned_to)
      .single()
    if (!member) return NextResponse.json({ error: 'Bu kullanıcı bakım ekibinde değil' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('health_schedules')
    .update({
      assigned_to: assigned_to ?? null,
      assigned_by: assigned_to ? user.id : null,
      assigned_at: assigned_to ? new Date().toISOString() : null,
      assignment_status: assigned_to ? 'assigned' : 'unassigned',
    })
    .eq('id', schedule_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log activity
  if (assigned_to) {
    await supabase.from('pet_activity_log').insert({
      pet_id,
      actor_id: user.id,
      action: 'assigned_task',
      entity_type: 'health_schedule',
      entity_id: schedule_id,
      description: `Görev atandı: ${data.title || 'Bakım görevi'}`,
    })
  }

  return NextResponse.json({ success: true, schedule: data })
}

// PATCH: Accept or decline a task assignment
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { schedule_id, action, decline_reason } = await req.json()
  if (!schedule_id || !['accept', 'decline', 'complete'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // Verify the task is assigned to this user
  const { data: schedule } = await supabase
    .from('health_schedules')
    .select('*, pets(id, name)')
    .eq('id', schedule_id)
    .single()

  if (!schedule) return NextResponse.json({ error: 'Görev bulunamadı' }, { status: 404 })
  if (schedule.assigned_to !== user.id) {
    return NextResponse.json({ error: 'Bu görev size atanmamış' }, { status: 403 })
  }

  const statusMap: Record<string, string> = {
    accept: 'accepted',
    decline: 'declined',
    complete: 'completed',
  }

  const updateData: any = { assignment_status: statusMap[action] }
  if (action === 'decline') updateData.decline_reason = decline_reason ?? null
  if (action === 'complete') updateData.status = 'done'

  const { data, error } = await supabase
    .from('health_schedules')
    .update(updateData)
    .eq('id', schedule_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log activity
  const actionLabels: Record<string, string> = { accept: 'kabul etti', decline: 'reddetti', complete: 'tamamladı' }
  await supabase.from('pet_activity_log').insert({
    pet_id: schedule.pet_id,
    actor_id: user.id,
    action: `task_${action}ed`,
    entity_type: 'health_schedule',
    entity_id: schedule_id,
    description: `Görevi ${actionLabels[action]}: ${schedule.title || 'Bakım görevi'}`,
  })

  // Care points for completing
  if (action === 'complete') {
    await supabase.rpc('increment_care_points', { p_profile_id: user.id, p_amount: 10 })
  }

  return NextResponse.json({ success: true, schedule: data })
}

// GET: My assigned tasks + notification inbox
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const petId = req.nextUrl.searchParams.get('pet_id')

  const query = supabase
    .from('health_schedules')
    .select('*, vaccines(name), pets(name), profiles!health_schedules_assigned_to_fkey(first_name, last_name)')
    .eq('assigned_to', user.id)
    .neq('assignment_status', 'completed')
    .order('due_date')

  if (petId) query.eq('pet_id', petId)

  const [{ data: tasks }, { data: notifications }] = await Promise.all([
    query,
    supabase
      .from('pet_notifications')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0

  return NextResponse.json({ tasks, notifications, unreadCount })
}


import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'

// GET: All calendar events for household (tasks + appointments)
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const from = sp.get('from') ?? new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const to   = sp.get('to')   ?? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  const petId = sp.get('pet_id')
  const memberId = sp.get('member_id')

  const supabase = await createServerSupabaseClient()

  // Get all pets user has access to
  const { data: memberPets } = await supabase
    .from('pet_members')
    .select('pet_id, role, pets(id, name, species)')
    .eq('profile_id', user.id)

  const { data: ownedPets } = await supabase
    .from('pets')
    .select('id, name, species')
    .eq('owner_id', user.id)

  const allPetIds = [
    ...new Set([
      ...(memberPets?.map(m => m.pet_id) ?? []),
      ...(ownedPets?.map(p => p.id) ?? []),
    ])
  ].filter(Boolean)

  if (allPetIds.length === 0) return NextResponse.json({ events: [], members: [], workload: [] })

  const petsMap = Object.fromEntries([
    ...(ownedPets ?? []).map(p => [p.id, p]),
    ...(memberPets ?? []).map(m => [m.pet_id, (m as any).pets]),
  ])

  // Build queries
  let schedulesQ = supabase
    .from('health_schedules')
    .select('id, pet_id, title, due_date, status, plan_type, priority, escalation_level, assignment_status, assigned_to, vaccines(name), profiles!health_schedules_assigned_to_fkey(first_name, last_name)')
    .in('pet_id', petId ? [petId] : allPetIds)
    .gte('due_date', from)
    .lte('due_date', to)
    .order('due_date')

  let appointmentsQ = supabase
    .from('appointments')
    .select('id, pet_id, scheduled_at, status, clinics(name)')
    .in('pet_id', petId ? [petId] : allPetIds)
    .gte('scheduled_at', from + 'T00:00:00')
    .lte('scheduled_at', to + 'T23:59:59')

  if (memberId) {
    schedulesQ = schedulesQ.eq('assigned_to', memberId)
  }

  const [{ data: schedules }, { data: appointments }] = await Promise.all([schedulesQ, appointmentsQ])

  // Build unified event list
  const events = [
    ...(schedules ?? []).map((s: any) => ({
      id: s.id,
      type: 'task',
      plan_type: s.plan_type,
      title: s.title || s.vaccines?.name || 'Bakım Görevi',
      date: s.due_date,
      pet_id: s.pet_id,
      pet_name: petsMap[s.pet_id]?.name ?? '',
      pet_species: petsMap[s.pet_id]?.species ?? '',
      status: s.status,
      assignment_status: s.assignment_status,
      escalation_level: s.escalation_level ?? 'none',
      priority: s.priority ?? 'normal',
      assigned_to: s.assigned_to,
      assignee_name: s.profiles ? `${s.profiles.first_name ?? ''} ${s.profiles.last_name ?? ''}`.trim() : null,
    })),
    ...(appointments ?? []).map((a: any) => ({
      id: a.id,
      type: 'appointment',
      plan_type: 'appointment',
      title: a.clinics?.name ?? 'Randevu',
      date: a.scheduled_at?.split('T')[0],
      pet_id: a.pet_id,
      pet_name: petsMap[a.pet_id]?.name ?? '',
      status: a.status,
      escalation_level: 'none',
      priority: 'high',
      assigned_to: null,
      assignee_name: null,
    })),
  ]

  // Member workload summary
  const workload: Record<string, { name: string; count: number; overdue: number }> = {}
  for (const e of events) {
    if (e.assigned_to && e.assignee_name) {
      if (!workload[e.assigned_to]) workload[e.assigned_to] = { name: e.assignee_name, count: 0, overdue: 0 }
      workload[e.assigned_to].count++
      if (e.status !== 'done' && new Date(e.date) < new Date()) workload[e.assigned_to].overdue++
    }
  }

  return NextResponse.json({ events, workload: Object.entries(workload).map(([id, v]) => ({ id, ...v })) })
}

// POST: Trigger escalation check manually (also callable by cron)
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('run_escalation_check')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ escalated: data?.length ?? 0, items: data })
}

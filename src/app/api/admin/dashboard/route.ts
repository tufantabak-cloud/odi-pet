import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/get-current-profile'

export const dynamic = 'force-dynamic'

function startOf(unit: 'day' | 'week' | 'month') {
  const now = new Date()
  if (unit === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  }
  if (unit === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
  }
  // month
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export async function GET() {
  const actor = await requireRole(['admin', 'founder'])
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const supabase = createAdminSupabaseClient()

  const todayISO = startOf('day')
  const weekISO = startOf('week')
  const monthISO = startOf('month')

  // ── New signups ──────────────────────────────────────────────
  const [
    { count: signupsToday },
    { count: signupsWeek },
    { count: signupsMonth },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekISO),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthISO),
  ])

  // ── New pets ─────────────────────────────────────────────────
  const [
    { count: petsToday },
    { count: petsWeek },
    { count: petsMonth },
  ] = await Promise.all([
    supabase.from('pets').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('pets').select('id', { count: 'exact', head: true }).gte('created_at', weekISO),
    supabase.from('pets').select('id', { count: 'exact', head: true }).gte('created_at', monthISO),
  ])

  // ── Pro subscriptions (total + this month) ───────────────────
  const [
    { count: proTotal },
    { count: proMonth },
    { count: totalProfiles },
  ] = await Promise.all([
    supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).in('plan', ['pro', 'ai_plus']),
    supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).in('plan', ['pro', 'ai_plus']).gte('created_at', monthISO),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  // ── Overdue vaccines ─────────────────────────────────────────
  const now = new Date().toISOString()
  const { count: overdueVaccines } = await supabase
    .from('vaccine_records_v2')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'overdue')
    .lte('due_at', now)

  // ── Clinic approval queue (pending clinics) ──────────────────
  // Clinics that exist but is_public is false = awaiting approval
  const { count: clinicQueue } = await supabase
    .from('clinics')
    .select('id', { count: 'exact', head: true })
    .eq('is_public', false)

  // ── Last 5 registered users ──────────────────────────────────
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const proRate =
    totalProfiles && totalProfiles > 0
      ? Math.round(((proTotal ?? 0) / totalProfiles) * 100)
      : 0

  return NextResponse.json({
    signups: {
      today: signupsToday ?? 0,
      week: signupsWeek ?? 0,
      month: signupsMonth ?? 0,
    },
    pets: {
      today: petsToday ?? 0,
      week: petsWeek ?? 0,
      month: petsMonth ?? 0,
    },
    subscriptions: {
      proTotal: proTotal ?? 0,
      proMonth: proMonth ?? 0,
      proRatePct: proRate,
    },
    overdueVaccines: overdueVaccines ?? 0,
    clinicQueue: clinicQueue ?? 0,
    recentUsers: recentUsers ?? [],
  })
}

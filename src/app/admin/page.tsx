import { createAdminSupabaseClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  // SSR: initial data fetch so the page is never blank on first load
  const supabase = createAdminSupabaseClient()

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
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  }

  const todayISO = startOf('day')
  const weekISO = startOf('week')
  const monthISO = startOf('month')
  const now = new Date().toISOString()

  const [
    { count: signupsToday },
    { count: signupsWeek },
    { count: signupsMonth },
    { count: petsToday },
    { count: petsWeek },
    { count: petsMonth },
    { count: proTotal },
    { count: proMonth },
    { count: totalProfiles },
    { count: overdueVaccines },
    { data: recentUsers },
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekISO),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthISO),
    supabase.from('pets').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('pets').select('id', { count: 'exact', head: true }).gte('created_at', weekISO),
    supabase.from('pets').select('id', { count: 'exact', head: true }).gte('created_at', monthISO),
    supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).in('plan', ['pro', 'ai_plus']),
    supabase.from('user_subscriptions').select('id', { count: 'exact', head: true }).in('plan', ['pro', 'ai_plus']).gte('created_at', monthISO),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('vaccine_records').select('id', { count: 'exact', head: true }).lte('next_due_date', now),
    supabase.from('profiles').select('id, first_name, last_name, email, role, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  const proRatePct =
    totalProfiles && totalProfiles > 0
      ? Math.round(((proTotal ?? 0) / totalProfiles) * 100)
      : 0

  const initialData = {
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
      proRatePct,
    },
    overdueVaccines: overdueVaccines ?? 0,
    recentUsers: recentUsers ?? [],
  }

  return <DashboardClient initialData={initialData} />
}

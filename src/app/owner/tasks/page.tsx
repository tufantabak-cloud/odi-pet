import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MyTasksClient from './MyTasksClient'

export default async function MyTasksPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const supabase = await createServerSupabaseClient()

  const [{ data: tasks }, { data: notifications }] = await Promise.all([
    supabase
      .from('health_schedules')
      .select('*, vaccines(name), pets(name, species)')
      .eq('assigned_to', user.id)
      .neq('assignment_status', 'completed')
      .order('due_date'),
    supabase
      .from('pet_notifications')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  return <MyTasksClient tasks={tasks ?? []} notifications={notifications ?? []} />
}

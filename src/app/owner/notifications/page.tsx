import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import NotificationsClient from './NotificationsClient'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const user = await getSessionUser()
  const supabase = await createServerSupabaseClient()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, message, is_read, created_at, pet_id')
    .eq('profile_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return <NotificationsClient initialNotifications={notifications ?? []} />
}

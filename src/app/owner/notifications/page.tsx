import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import NotificationsClient from './NotificationsClient'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const user = await getSessionUser()
  const supabase = await createServerSupabaseClient()

  const { data: rawNotifications } = await supabase
    .from('notifications')
    .select('id, type, title, message, is_read, created_at, pet_id, open_delay_minutes')
    .eq('profile_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Vadesi (teslimat zamanı) henüz gelmemiş bildirimleri filtrele
  const now = Date.now()
  const notifications = (rawNotifications ?? [])
    .filter((n: any) => {
      if (!n.open_delay_minutes || n.open_delay_minutes <= 0) return true
      const createdAtMs = n.created_at ? new Date(n.created_at).getTime() : now
      const deliveryTimeMs = createdAtMs + n.open_delay_minutes * 60 * 1000
      return deliveryTimeMs <= now
    })
    .slice(0, 50)

  // Sahiplik ve aktif pet_memberships üzerindeki tüm erişilebilir petleri tekilleştir
  const [{ data: ownedPets }, { data: memberships }] = await Promise.all([
    supabase
      .from('pets')
      .select('id, name')
      .eq('owner_id', user?.id),
    supabase
      .from('pet_memberships')
      .select('pet_id, pets(id, name)')
      .eq('profile_id', user?.id)
      .eq('status', 'active')
  ])

  const petMap = new Map<string, { id: string; name: string }>()
  for (const p of ownedPets ?? []) {
    if (p?.id) petMap.set(p.id, { id: p.id, name: p.name })
  }
  for (const m of memberships ?? []) {
    const p = m.pets as any
    if (p?.id && !petMap.has(p.id)) {
      petMap.set(p.id, { id: p.id, name: p.name })
    }
  }

  const accessiblePets = Array.from(petMap.values())

  return <NotificationsClient initialNotifications={notifications} pets={accessiblePets} />
}

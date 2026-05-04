import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function NotificationsPage() {
  const user = await getSessionUser()
  const supabase = await createServerSupabaseClient()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', user?.id)
    .order('created_at', { ascending: false })

  const mockNotifications = [
    { id: 'm1', title: 'Aşı Hatırlatması', message: 'Mia\'nın kuduz aşısının üzerinden 1 yıl geçti. Yenileme zamanı!', is_read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 'm2', title: 'Randevu Onaylandı', message: 'Cuma saat 14:00 randevunuz Odi Veteriner Kliniği tarafından onaylandı.', is_read: false, created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'm3', title: 'Stok Uyarısı', message: 'Max\'in mama stoku 3 güne yetecek kadar kaldı. Sipariş vermeyi unutmayın.', is_read: true, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  ]

  const display = (notifications && notifications.length > 0) ? notifications : mockNotifications

  const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (mins < 60) return `${mins} dk önce`
    if (mins < 1440) return `${Math.floor(mins / 60)} saat önce`
    return `${Math.floor(mins / 1440)} gün önce`
  }

  const iconFor = (title: string) => {
    if (title.toLowerCase().includes('aşı') || title.toLowerCase().includes('bakım'))
      return { icon: '💉', bg: 'bg-success/10 text-success' }
    if (title.toLowerCase().includes('randevu'))
      return { icon: '📅', bg: 'bg-primary-soft text-primary' }
    if (title.toLowerCase().includes('stok') || title.toLowerCase().includes('mama'))
      return { icon: '⚠️', bg: 'bg-warning/10 text-warning' }
    return { icon: '🔔', bg: 'bg-border-main text-text-secondary' }
  }

  return (
    <div className="flex flex-col gap-6 pb-10 w-full mx-auto">
      <div className="flex items-center justify-between border-b border-border-main pb-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Bildirimler</h1>
          <p className="text-text-secondary mt-1 text-[15px] font-medium">
            {display.filter((n: any) => !n.is_read).length} okunmamış
          </p>
        </div>
        {display.some((n: any) => !n.is_read) && (
          <button className="text-[13px] font-bold text-primary hover:underline">Tümünü Okundu Say</button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {display.map((notif: any) => {
          const { icon, bg } = iconFor(notif.title)
          return (
            <div key={notif.id}
              className={`card-base flex gap-4 p-5 transition-all ${!notif.is_read ? 'border-l-4 border-l-primary' : 'opacity-70'}`}>
              <div className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center text-[20px] shrink-0 font-bold`}>
                {icon}
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`font-extrabold text-text-primary text-[15px] ${!notif.is_read ? '' : 'font-semibold'}`}>
                    {notif.title}
                  </p>
                  {!notif.is_read && (
                    <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0"/>
                  )}
                </div>
                <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">{notif.message}</p>
                <p className="text-[12px] text-text-secondary/60 font-semibold mt-2">{timeAgo(notif.created_at)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

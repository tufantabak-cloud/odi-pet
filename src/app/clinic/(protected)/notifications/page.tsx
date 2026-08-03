import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function ClinicNotificationsPage() {
  const user = await getSessionUser()
  const supabase = await createServerSupabaseClient()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('profile_id', user?.id)
    .order('created_at', { ascending: false })

  const list = notifications ?? []

  const timeAgo = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (mins < 60) return `${mins} dk önce`
    if (mins < 1440) return `${Math.floor(mins / 60)} saat önce`
    return `${Math.floor(mins / 1440)} gün önce`
  }

  const iconFor = (title: string) => {
    if (title.toLowerCase().includes('randevu')) return '📅'
    if (title.toLowerCase().includes('aşı')) return '💉'
    return '🔔'
  }

  return (
    <div className="flex flex-col gap-6 pb-10 w-full max-w-xl mx-auto">
      <div className="border-b border-border-main pb-4">
        <h1 className="text-[28px] font-extrabold text-text-primary tracking-tight">Klinik Bildirimleri</h1>
        <p className="text-text-secondary mt-1 text-base font-medium">
          {list.filter((n: any) => !n.is_read).length} okunmamış
        </p>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-border-main/50 flex items-center justify-center text-[40px]">
            🔔
          </div>
          <p className="text-[18px] font-extrabold text-text-primary">Henüz bildirim yok</p>
          <p className="text-[14px] text-text-secondary max-w-[280px] leading-relaxed">
            Yeni randevu talepleri, iptal bildirimleri ve diğer klinik güncellemeleri burada görünecek.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((notif: any) => (
            <div key={notif.id}
              className={`card-base flex gap-4 p-5 ${!notif.is_read ? 'border-l-4 border-l-primary' : 'opacity-70'}`}>
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[20px] shrink-0 font-bold ${!notif.is_read ? 'bg-primary-soft text-primary' : 'bg-border-main text-text-secondary'}`}>
                {iconFor(notif.title)}
              </div>
              <div className="flex flex-col flex-1">
                <p className={`font-extrabold text-text-primary text-base ${!notif.is_read ? '' : 'font-semibold'}`}>{notif.title}</p>
                <p className="text-[13px] text-text-secondary mt-1 leading-relaxed">{notif.message}</p>
                <p className="text-[12px] text-text-secondary/60 font-semibold mt-2">{timeAgo(notif.created_at)}</p>
              </div>
              {!notif.is_read && <span className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0"/>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


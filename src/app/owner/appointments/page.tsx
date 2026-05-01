import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function OwnerAppointmentsPage() {
  const user = await getSessionUser()
  const supabase = await createServerSupabaseClient()

  // Sahibin tüm petlerinin randevuları
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, pets(name, species), clinics(name)')
    .in(
      'pet_id',
      (await supabase.from('pets').select('id').eq('owner_id', user?.id)).data?.map(p => p.id) ?? []
    )
    .order('scheduled_at', { ascending: true })

  const statusConfig: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'Onay Bekleniyor', cls: 'bg-warning/10 text-warning' },
    confirmed: { label: 'Onaylandı',       cls: 'bg-success/10 text-success' },
    cancelled: { label: 'İptal Edildi',    cls: 'bg-error/10 text-error' },
    completed: { label: 'Tamamlandı',      cls: 'bg-border-main text-text-secondary' },
  }

  return (
    <div className="flex flex-col gap-8 w-full pb-10">
      <div className="border-b border-border-main pb-4">
        <h1 className="text-[32px] font-extrabold text-text-primary tracking-tight">Randevularım</h1>
        <p className="text-[16px] text-text-secondary font-medium mt-1">Tüm klinik randevularınızı buradan takip edin.</p>
      </div>

      {(!appointments || appointments.length === 0) ? (
        <div className="card-base p-16 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-primary-soft rounded-[18px] flex items-center justify-center text-primary mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
          <h3 className="text-[18px] font-bold text-text-primary">Henüz randevunuz yok</h3>
          <p className="text-text-secondary text-[14px] mt-2 max-w-sm">
            Pati dostunuzun profiline giderek klinik randevusu oluşturabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {appointments.map((apt) => {
            const dt = new Date(apt.scheduled_at)
            const date = dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
            const time = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
            const s = statusConfig[apt.status] ?? statusConfig.pending
            const isPast = dt < new Date()

            return (
              <div key={apt.id} className={`card-base flex flex-col sm:flex-row sm:items-center gap-5 p-6 ${isPast && apt.status !== 'completed' ? 'opacity-60' : ''}`}>
                <div className="flex sm:flex-col items-center sm:items-center gap-3 sm:gap-1 bg-bg-main border border-border-main rounded-[14px] p-4 min-w-[100px] text-center shrink-0">
                  <p className="text-[20px] font-black text-text-primary leading-none">{time}</p>
                  <p className="text-[12px] font-semibold text-text-secondary leading-snug">{date}</p>
                </div>

                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-full bg-primary-soft text-primary font-black flex items-center justify-center text-[15px]">
                      {apt.pets?.name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                      <p className="font-bold text-text-primary text-[16px]">{apt.pets?.name}</p>
                      <p className="text-[13px] text-text-secondary">{apt.clinics?.name ?? 'Klinik'}</p>
                    </div>
                  </div>
                  {apt.owner_reason && (
                    <p className="text-[13px] text-text-secondary mt-1 pl-1">📋 {apt.owner_reason}</p>
                  )}
                </div>

                <span className={`text-[12px] font-bold px-3 py-1.5 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

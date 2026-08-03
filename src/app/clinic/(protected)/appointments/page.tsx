import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import AppointmentActions from '@/components/AppointmentActions'

export default async function ClinicAppointmentsPage() {
  const user = await getSessionUser()
  const supabase = await createServerSupabaseClient()

  const { data: memberships } = await supabase
    .from('clinic_memberships').select('clinic_id').eq('profile_id', user?.id)
  const clinicId = memberships?.[0]?.clinic_id ?? null

  const { data: appointments } = clinicId
    ? await supabase
        .from('appointments')
        .select('*, pets(id, name, species, breed)')
        .eq('clinic_id', clinicId)
        .order('scheduled_at', { ascending: true })
    : { data: [] }

  const statusConfig: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'Bekliyor',    cls: 'bg-warning/10 text-warning border-warning/20' },
    confirmed: { label: 'Onaylandı',   cls: 'bg-success/10 text-success border-success/20' },
    cancelled: { label: 'İptal',       cls: 'bg-error/10 text-error border-error/20' },
    completed: { label: 'Tamamlandı',  cls: 'bg-border-main text-text-secondary' },
  }

  // Bugünkü / Gelecek / Geçmiş gruplandırması
  const now = Date.now()
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
  const today   = appointments?.filter(a => new Date(a.scheduled_at).getTime() <= todayEnd.getTime() && new Date(a.scheduled_at).getTime() >= new Date().setHours(0,0,0,0)) ?? []
  const upcoming = appointments?.filter(a => new Date(a.scheduled_at).getTime() > todayEnd.getTime()) ?? []
  const past    = appointments?.filter(a => new Date(a.scheduled_at).getTime() < new Date().setHours(0,0,0,0)) ?? []

  const RenderGroup = ({ title, items, emptyMsg }: { title: string; items: any[]; emptyMsg: string }) => (
    <div className="flex flex-col gap-3">
      <h2 className="text-[14px] font-extrabold text-text-secondary uppercase tracking-widest">{title}</h2>
      {items.length === 0 ? (
        <p className="text-[13px] text-text-secondary/60 pl-1">{emptyMsg}</p>
      ) : items.map((apt) => {
        const dt = new Date(apt.scheduled_at)
        const date = dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' })
        const time = dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        const s = statusConfig[apt.status] ?? statusConfig.pending

        return (
          <div key={apt.id} className="card-base flex flex-col sm:flex-row sm:items-center gap-4 p-5 group">
            {/* Time */}
            <div className="flex sm:flex-col items-center sm:text-center gap-3 bg-bg-main rounded-input px-4 py-3 border border-border-main shrink-0 min-w-[90px]">
              <p className="text-[20px] font-black text-text-primary leading-none">{time}</p>
              <p className="text-[12px] font-semibold text-text-secondary">{date}</p>
            </div>

            {/* Pet info */}
            <Link href={`/clinic/pets/${apt.pets?.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-full bg-primary-soft text-primary font-extrabold flex items-center justify-center text-base shrink-0">
                {apt.pets?.name?.charAt(0) ?? '?'}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-text-primary text-[16px] truncate">{apt.pets?.name}</p>
                <p className="text-[13px] text-text-secondary">{apt.pets?.species}{apt.pets?.breed ? ` • ${apt.pets.breed}` : ''}</p>
              </div>
            </Link>

            {/* Status + Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border hidden sm:flex ${s.cls}`}>{s.label}</span>
              <AppointmentActions appointmentId={apt.id} currentStatus={apt.status}/>
            </div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="flex flex-col gap-8 pb-10 w-full">
      <div className="border-b border-border-main pb-4">
        <h1 className="text-[32px] font-extrabold text-text-primary tracking-tight">Randevular</h1>
        <p className="text-text-secondary mt-1 font-medium">
          {appointments?.filter(a => a.status === 'pending').length ?? 0} randevu onay bekliyor
        </p>
      </div>

      {(!appointments || appointments.length === 0) ? (
        <div className="card-base p-16 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-primary-soft rounded-[18px] flex items-center justify-center text-primary mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          </div>
          <h3 className="text-[18px] font-bold text-text-primary">Henüz randevu yok</h3>
          <p className="text-text-secondary text-[14px] mt-2">Pet sahipleri randevu oluşturduğunda burada görünür.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <RenderGroup title="Bugün" items={today} emptyMsg="Bugün için randevu bulunmuyor"/>
          <RenderGroup title="Yaklaşan" items={upcoming} emptyMsg="Planlı randevu yok"/>
          <RenderGroup title="Geçmiş" items={past} emptyMsg="Geçmiş randevu yok"/>
        </div>
      )}
    </div>
  )
}

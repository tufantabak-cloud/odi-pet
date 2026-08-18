import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ClinicDashboard() {
  const user = await getSessionUser()
  const supabase = await createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, role')
    .eq('id', user?.id)
    .single()

  // Bu klinisyenin bağlı olduğu klinik(ler)
  const { data: memberships } = await supabase
    .from('clinic_memberships')
    .select('clinic_id, clinics(id, name)')
    .eq('profile_id', user?.id)

  const clinicId = memberships?.[0]?.clinic_id ?? null

  // Bugünkü randevular (tüm durumlarda)
  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

  const { data: todayAppointments } = clinicId
    ? await supabase
        .from('appointments')
        .select('*, pets(name, species)')
        .eq('clinic_id', clinicId)
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay)
        .order('scheduled_at', { ascending: true })
    : { data: [] }

  // Geciken bakımlar (due_date geçmiş)
  const { data: overduePlans } = clinicId
    ? await supabase
        .from('care_plans')
        .select('*, pets(name)')
        .eq('clinic_id', clinicId)
        .lt('due_date', new Date().toISOString())
    : { data: [] }

  const pendingCount = todayAppointments?.filter(a => a.status === 'pending').length ?? 0
  const confirmedCount = todayAppointments?.filter(a => a.status === 'confirmed').length ?? 0

  return (
    <div className="flex flex-col gap-8 w-full pb-10">
      {/* Greeting */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] font-extrabold text-text-primary tracking-tight">
          {profile?.first_name && profile.first_name.toLowerCase() !== 'kullanıcı' && profile.first_name.toLowerCase() !== 'kullanici'
            ? `Günaydın, Dr. ${profile.first_name} 👋`
            : 'Günaydın, Doktor 👋'}
        </h1>
        <p className="text-[16px] font-normal text-text-secondary">
          Günlük operasyon görünümü. Randevu ve geciken bakımları buradan yönetin.
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card-base p-6 flex flex-col gap-3 border-l-4 border-l-primary">
          <h3 className="text-[12px] font-bold text-text-secondary uppercase tracking-widest">Bugün Toplam</h3>
          <p className="text-[42px] font-black text-text-primary leading-none">{todayAppointments?.length ?? 0}</p>
          <p className="text-[13px] font-bold text-text-secondary">randevu</p>
        </div>
        <div className="card-base p-6 flex flex-col gap-3 border-l-4 border-l-warning">
          <h3 className="text-[12px] font-bold text-text-secondary uppercase tracking-widest">Bekleyen</h3>
          <p className="text-[42px] font-black text-warning leading-none">{pendingCount}</p>
          <p className="text-[13px] font-bold text-text-secondary">onay bekliyor</p>
        </div>
        <div className="card-base p-6 flex flex-col gap-3 border-l-4 border-l-success">
          <h3 className="text-[12px] font-bold text-text-secondary uppercase tracking-widest">Onaylı</h3>
          <p className="text-[42px] font-black text-success leading-none">{confirmedCount}</p>
          <p className="text-[13px] font-bold text-text-secondary">randevu</p>
        </div>
        <div className="card-base p-6 flex flex-col gap-3 border-l-4 border-l-error">
          <h3 className="text-[12px] font-bold text-text-secondary uppercase tracking-widest">Gecikmiş Bakım</h3>
          <p className="text-[42px] font-black text-error leading-none">{overduePlans?.length ?? 0}</p>
          <p className="text-[13px] font-bold text-text-secondary">müdahale gerekli</p>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="card-base p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-extrabold text-text-primary flex items-center gap-3">
            <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
            </div>
            Bugünün Takvimi
          </h2>
          <Link href="/clinic/appointments" className="text-[13px] font-bold text-primary hover:underline">Tamamını Gör →</Link>
        </div>

        {(!todayAppointments || todayAppointments.length === 0) ? (
          <div className="bg-bg-main rounded-card border border-border-main p-10 text-center">
            <p className="text-text-secondary font-normal">Bugün için planlanmış randevu bulunmuyor.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {todayAppointments.map((apt) => {
              const time = new Date(apt.scheduled_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
              const statusConfig: Record<string, { label: string; cls: string }> = {
                pending:   { label: 'Bekliyor',  cls: 'bg-warning/10 text-warning' },
                confirmed: { label: 'Onaylı',    cls: 'bg-success/10 text-success' },
                cancelled: { label: 'İptal',     cls: 'bg-error/10 text-error' },
                completed: { label: 'Tamamlandı',cls: 'bg-border-main text-text-secondary' },
              }
              const s = statusConfig[apt.status] ?? statusConfig.pending

              return (
                <div key={apt.id} className="flex items-center gap-5 p-4 rounded-card border border-border-main bg-surface hover:border-primary/20 hover:shadow-soft transition-all group">
                  <div className="bg-primary-soft text-primary font-extrabold text-[16px] px-4 py-3 rounded-input shrink-0 min-w-[60px] text-center">
                    {time}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="font-bold text-text-primary text-[16px] truncate">{apt.pets?.name ?? '—'}</p>
                    <p className="text-[13px] font-normal text-text-secondary">{apt.pets?.species ?? '—'} • {apt.owner_reason || 'Belirtilmedi'}</p>
                  </div>
                  <span className={`text-[12px] font-bold px-3 py-1.5 rounded-full shrink-0 ${s.cls}`}>{s.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Overdue Care Plans */}
      {overduePlans && overduePlans.length > 0 && (
        <div className="card-base p-6 sm:p-8 border-l-4 border-l-error">
          <h2 className="text-[20px] font-extrabold text-text-primary mb-5 flex items-center gap-3">
            <div className="bg-error/10 text-error p-2.5 rounded-xl">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            Gecikmiş Bakımlar
          </h2>
          <div className="flex flex-col gap-3">
            {overduePlans.map(plan => (
              <div key={plan.id} className="flex items-center justify-between p-4 rounded-input bg-error/5 border border-error/20">
                <div>
                  <p className="font-bold text-text-primary">{plan.pets?.name} — {plan.title}</p>
                  <p className="text-[13px] text-error font-bold mt-0.5">Vade: {new Date(plan.due_date).toLocaleDateString('tr-TR')}</p>
                </div>
                <button className="btn-primary text-[13px] py-2 px-4 bg-error hover:bg-red-700">Aksiyon Al</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

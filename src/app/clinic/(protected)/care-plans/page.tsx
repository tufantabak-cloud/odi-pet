import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { updateAppointmentStatus } from '@/features/clinic/actions'

export default async function ClinicCarePlansPage() {
  const user = await getSessionUser()
  const supabase = await createServerSupabaseClient()

  const { data: memberships } = await supabase
    .from('clinic_memberships').select('clinic_id').eq('profile_id', user?.id)
  const clinicId = memberships?.[0]?.clinic_id ?? null

  // Tüm clinic'e bağlı care_plans
  const { data: plans } = clinicId
    ? await supabase
        .from('care_plans')
        .select('*, pets(name, species, owner_id)')
        .eq('clinic_id', clinicId)
        .order('due_date', { ascending: true })
    : { data: [] }

  // Gruplama: Gecikmiş / Bu Hafta / Planlı
  const now = Date.now()
  const inWeek = now + 7 * 86400000

  const overdue  = plans?.filter(p => new Date(p.due_date).getTime() < now) ?? []
  const thisWeek = plans?.filter(p => new Date(p.due_date).getTime() >= now && new Date(p.due_date).getTime() <= inWeek) ?? []
  const planned  = plans?.filter(p => new Date(p.due_date).getTime() > inWeek) ?? []

  const PlanCard = ({ plan, urgency }: { plan: any; urgency: 'overdue' | 'soon' | 'planned' }) => {
    const styles = {
      overdue: { cls: 'border-l-error bg-error/5',     badge: 'bg-error/10 text-error border-error/20',     label: 'Gecikti' },
      soon:    { cls: 'border-l-warning bg-warning/5', badge: 'bg-warning/10 text-warning border-warning/20', label: 'Bu Hafta' },
      planned: { cls: 'border-l-success',              badge: 'bg-success/10 text-success border-success/20', label: 'Planlı' },
    }
    const s = styles[urgency]
    const dueDate = new Date(plan.due_date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' })

    return (
      <div className={`card-base border-l-4 ${s.cls} flex items-center gap-5 p-5`}>
        <div className="flex flex-col items-center bg-surface rounded-[12px] px-3 py-2.5 shrink-0 min-w-[52px] text-center border border-border-main">
          <p className="text-[18px] font-black text-text-primary leading-none">{new Date(plan.due_date).getDate()}</p>
          <p className="text-[11px] font-bold text-text-secondary">{new Date(plan.due_date).toLocaleString('tr-TR', { month: 'short' })}</p>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <p className="font-extrabold text-text-primary text-[15px]">{plan.title}</p>
          <p className="text-[13px] text-text-secondary mt-0.5">
            {plan.pets?.name} &bull; {plan.pets?.species}
          </p>
          {plan.description && <p className="text-[12px] text-text-secondary/70 mt-0.5 truncate">{plan.description}</p>}
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1.5 rounded-full border shrink-0 ${s.badge}`}>{s.label}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pb-10 w-full">
      <div className="flex items-end justify-between flex-wrap gap-4 border-b border-border-main pb-4">
        <div>
          <h1 className="text-[32px] font-extrabold text-text-primary tracking-tight">Aşı & Bakım Takvimi</h1>
          <p className="text-text-secondary mt-1 text-[15px] font-medium">
            {overdue.length > 0 && <span className="text-error font-bold">{overdue.length} gecikmiş • </span>}
            {thisWeek.length} bu hafta • {planned.length} planlı
          </p>
        </div>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[15px] font-extrabold text-error flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Gecikmiş ({overdue.length})
          </h2>
          {overdue.map(p => <PlanCard key={p.id} plan={p} urgency="overdue"/>)}
        </div>
      )}

      {/* This Week */}
      {thisWeek.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[15px] font-extrabold text-warning flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Bu Hafta ({thisWeek.length})
          </h2>
          {thisWeek.map(p => <PlanCard key={p.id} plan={p} urgency="soon"/>)}
        </div>
      )}

      {/* Planned */}
      {planned.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-[15px] font-extrabold text-success flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            İleriki Planlar ({planned.length})
          </h2>
          {planned.map(p => <PlanCard key={p.id} plan={p} urgency="planned"/>)}
        </div>
      )}

      {(!plans || plans.length === 0) && (
        <div className="card-base p-16 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-success/10 rounded-[18px] flex items-center justify-center text-success mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h3 className="text-[18px] font-bold text-text-primary">Tüm takvim temiz!</h3>
          <p className="text-text-secondary text-[14px] mt-2">Bu klinike ait bakım veya aşı planı bulunmuyor.</p>
        </div>
      )}
    </div>
  )
}

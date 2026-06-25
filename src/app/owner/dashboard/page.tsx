"use no memo"
export const dynamic = 'force-dynamic'

import { getSessionUser } from '@/lib/auth/get-current-profile'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import DashboardOnboardingWrapper from './DashboardOnboardingWrapper'
import DashboardSmartCards from './DashboardSmartCards'
import { calcAge } from '@/lib/pets/utils'
import { getNowTR } from '@/lib/utils'
import Image from 'next/image'
import { getCachedDashboardData } from './dashboard-queries'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import EmptyState from '@/components/ui/EmptyState'
import { PawPrint, Calendar, Phone, Pencil, Bell, ChevronRight, Info } from 'lucide-react'

// Sağlık halkası rengi — gecikmiş varsa kırmızı, yaklaşan varsa turuncu, hepsi güncel ise yeşil
function getHealthHaloColor(overdueCount: number, upcomingCount: number): string {
  if (overdueCount > 0) return '#E4474F'
  if (upcomingCount > 0) return '#F2A23A'
  return '#16A87A'
}

function getHealthStatus(overdueCount: number, upcomingCount: number): { label: string; color: string; bg: string } {
  if (overdueCount > 0) return { label: `${overdueCount} gecikmiş`, color: '#E4474F', bg: '#FEF2F2' }
  if (upcomingCount > 0) return { label: `${upcomingCount} yaklaşıyor`, color: '#F2A23A', bg: '#FFFBEB' }
  return { label: 'İyi durumda', color: '#16A87A', bg: '#ECFDF5' }
}

export default async function OwnerDashboard() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { profile, pets, upcomingSchedules, completedSchedules, allFeedingLogs, allWeightLogs } =
    await getCachedDashboardData(user.id)

  const supabase = await createServerSupabaseClient()
  const { data: lostReportsRaw } = await supabase
    .from('lost_reports')
    .select('*, pets(name, avatar_url, species, breed, city)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50)

  const userCities = Array.from(new Set((pets || []).map((p: any) => p.city).filter(Boolean)))
  const lostReports = lostReportsRaw?.filter((report: any) => {
    if (userCities.length === 0) return false
    const reportCity = report.pets?.city
    if (!reportCity) return false
    return userCities.includes(reportCity)
  }).slice(0, 10)

  const now = getNowTR()
  const in30 = getNowTR()
  in30.setDate(in30.getDate() + 30)

  const timelineSchedules = upcomingSchedules
    .filter((s: any) => new Date(s.due_date) <= in30)
    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5)

  const petsWithStats = (pets || []).map((pet: any) => {
    let lastFeedingDate = ''
    let weightVal = ''

    const feeding = allFeedingLogs.find((f: any) => f.pet_id === pet.id)
    if (feeding) {
      const diffHrs = Math.floor((now.getTime() - new Date(feeding.created_at).getTime()) / (1000 * 60 * 60))
      if (diffHrs < 24) lastFeedingDate = `${diffHrs} s. once`
      else lastFeedingDate = `${Math.floor(diffHrs / 24)} g. once`
    }

    const weight = allWeightLogs.find((w: any) => w.pet_id === pet.id)
    if (weight?.weight_kg) weightVal = `${weight.weight_kg} kg`

    const overdueCount = upcomingSchedules.filter(
      (s: any) => s.pet_id === pet.id && new Date(s.due_date) < now
    ).length
    const upcomingCount = upcomingSchedules.filter(
      (s: any) => s.pet_id === pet.id && new Date(s.due_date) >= now
    ).length

    return { ...pet, lastFeedingDate, weightVal, overdueCount, upcomingCount }
  })

  const primaryPet = petsWithStats[0]
  const primaryWeight = primaryPet?.weightVal || ''
  const primaryOverdue = primaryPet?.overdueCount || 0
  const primaryUpcoming = primaryPet?.upcomingCount || 0
  const haloColor = primaryPet ? getHealthHaloColor(primaryOverdue, primaryUpcoming) : '#9AA3B2'
  const healthStatus = primaryPet ? getHealthStatus(primaryOverdue, primaryUpcoming) : { label: 'Veri yok', color: '#9AA3B2', bg: '#F0F2F6' }

  const profileFields = [profile?.first_name, profile?.last_name, profile?.phone, profile?.city, profile?.avatar_url]
  const filledFields = profileFields.filter(Boolean).length
  const profileCompletion = Math.round((filledFields / profileFields.length) * 100)

  const nextSchedule = timelineSchedules[0]
  const nextDate = nextSchedule
    ? new Date(nextSchedule.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
    : ''

  const weightLogs = allWeightLogs.filter((w: any) => primaryPet && w.pet_id === primaryPet.id)
  let insightText = ''
  if (weightLogs.length >= 3) {
    const latest = weightLogs[0]?.weight_kg
    const oldest = weightLogs[weightLogs.length - 1]?.weight_kg
    if (latest && oldest) {
      const diff = (latest - oldest).toFixed(1)
      const diffNum = parseFloat(diff)
      if (Math.abs(diffNum) < 0.5) insightText = `${primaryPet?.name}'nin kilosu son olcumlerde dengeli kaldi.`
      else if (diffNum > 0) insightText = `${primaryPet?.name} son olcumlerde ${diff} kg aldi. Beslenme planini gozden gecirebilirsin.`
      else insightText = `${primaryPet?.name} son olcumlerde ${Math.abs(diffNum)} kg verdi. Kilo takibini surdur.`
    }
  }

  const firstName = profile?.first_name || 'Hos Geldin'
  const greeting = (() => {
    const h = now.getHours()
    if (h < 12) return 'Gunaydin'
    if (h < 18) return 'Iyi gunler'
    return 'Iyi aksamlar'
  })()

  return (
    <DashboardOnboardingWrapper>
      <div className="flex flex-col gap-[var(--space-5)] pb-4">

        {/* Header */}
        <div className="flex items-center justify-between px-[var(--space-4)] pt-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[var(--color-primary)] rounded-[8px] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <span className="text-[16px] font-800 text-[var(--color-text-primary)]">Odi.Pet</span>
          </div>
          <Link href="/owner/notifications" aria-label="Bildirimler"
            className="w-9 h-9 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center shadow-[var(--shadow-sm)] hover:bg-[var(--color-surface-secondary)] transition-colors">
            <Bell size={16} className="text-[var(--color-text-secondary)]" />
          </Link>
        </div>

        {/* Smart Cards */}
        {pets && pets.length > 0 && (
          <div className="px-[var(--space-4)]">
            <DashboardSmartCards
              pets={pets}
              upcomingSchedules={upcomingSchedules}
              completedSchedules={completedSchedules}
            />
          </div>
        )}

        {/* Pet Hero */}
        {pets && pets.length > 0 && primaryPet ? (
          <div className="mx-[var(--space-4)] bg-[var(--color-surface)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-md)] border border-[var(--color-border)]">
            <div className="relative w-full h-[160px] bg-gradient-to-br from-[var(--color-primary-soft)] to-[var(--color-surface-secondary)]">
              {primaryPet.avatar_url && (
                <Image src={primaryPet.avatar_url} alt={primaryPet.name} fill sizes="400px" className="object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              <div className="absolute bottom-[-14px] left-[16px]">
                <div className="relative w-[76px] h-[76px]">
                  <svg width="76" height="76" viewBox="0 0 76 76" className="absolute inset-0">
                    <circle cx="38" cy="38" r="35" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                    <circle cx="38" cy="38" r="35" fill="none" stroke={haloColor} strokeWidth="3"
                      strokeDasharray="219.9" strokeDashoffset="0" strokeLinecap="round"
                      style={{ transform: 'rotate(-90deg)', transformOrigin: '38px 38px' }}/>
                  </svg>
                  <div className="absolute inset-[5px] rounded-full overflow-hidden border-2 border-white bg-[var(--color-primary-soft)]">
                    {primaryPet.avatar_url ? (
                      <Image src={primaryPet.avatar_url} alt={primaryPet.name} fill sizes="66px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[24px] font-800 text-[var(--color-primary)] opacity-40">
                        {(primaryPet.name || '?').charAt(0)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-5 pb-3 pl-[104px] pr-[var(--space-4)]">
              <p className="text-[10px] font-600 text-[var(--color-text-muted)] uppercase tracking-[0.5px]">{greeting},</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[18px] font-800 text-[var(--color-text-primary)]">{primaryPet.name}</span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-xs)] text-[10px] font-700"
                  style={{ background: healthStatus.bg, color: healthStatus.color }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: healthStatus.color }} />
                  {healthStatus.label}
                </div>
              </div>
              <p className="text-[11px] font-500 text-[var(--color-text-secondary)] mt-0.5">
                {primaryPet.species}{primaryPet.breed ? ` · ${primaryPet.breed}` : ''} · {calcAge(primaryPet.birth_date).text}
              </p>
            </div>
            <div className="flex gap-2 px-[var(--space-4)] pb-[var(--space-3)] border-t border-[var(--color-border)] pt-[var(--space-3)]">
              <Link href={`/owner/pets/${primaryPet.id}/share`}
                className="flex-1 h-9 rounded-[var(--radius-sm)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center gap-1.5 text-[11px] font-600 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Paylas
              </Link>
              <Link href={`/owner/pets/${primaryPet.id}?tab=saglik`}
                className="flex-1 h-9 rounded-[var(--radius-sm)] bg-[var(--color-danger-soft)] border border-[var(--color-danger)]/20 flex items-center justify-center gap-1.5 text-[11px] font-600 text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.44C1.6 3.36 2.35 2.44 3.42 2.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                Acil Durum
              </Link>
            </div>
          </div>
        ) : (
          <div className="mx-[var(--space-4)]">
            <EmptyState
              icon={<PawPrint />}
              title="Henuz pet eklemediniz"
              message="Ilk petinizi eklemek icin asagidaki butona dokunun."
              cta={{ label: "Pet Ekle", href: "/owner/pets/add" }}
            />
          </div>
        )}

        {/* 3 Metrik */}
        {pets && pets.length > 0 && (
          <div className="mx-[var(--space-4)] grid grid-cols-3 gap-2">
            {[
              {
                value: primaryWeight !== '' ? primaryWeight.replace(' kg','') : '-',
                unit: primaryWeight !== '' ? 'kg' : '',
                label: 'Kilo',
                sub: primaryWeight !== '' ? 'Son olcum' : 'Kayit yok',
                subType: 'neutral' as const,
              },
              {
                value: `${profileCompletion}`,
                unit: '%',
                label: 'Profil',
                sub: profileCompletion >= 80 ? 'Tamamlandi' : 'Eksik alan var',
                subType: profileCompletion >= 80 ? 'success' as const : 'warning' as const,
              },
              {
                value: nextDate || '-',
                unit: '',
                label: 'Siradaki',
                sub: nextSchedule ? (nextSchedule as any).title?.slice(0,10) || 'Bakim' : 'Yok',
                subType: primaryOverdue > 0 ? 'warning' as const : 'neutral' as const,
              },
            ].map((m) => (
              <div key={m.label} className="bg-[var(--color-surface)] rounded-[var(--radius-md)] p-3 flex flex-col items-center text-center border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-[18px] font-800 text-[var(--color-text-primary)] leading-none tabular-nums">{m.value}</span>
                  {m.unit && <span className="text-[10px] font-600 text-[var(--color-text-muted)]">{m.unit}</span>}
                </div>
                <span className="text-[10px] font-500 text-[var(--color-text-muted)] mt-1">{m.label}</span>
                <span className={`text-[9px] font-600 mt-0.5 ${
                  m.subType === 'success' ? 'text-[var(--color-success)]' :
                  m.subType === 'warning' ? 'text-[var(--color-warning)]' :
                  'text-[var(--color-text-muted)]'
                }`}>{m.sub}</span>
              </div>
            ))}
          </div>
        )}

        {/* AI Insight */}
        {insightText && (
          <div className="mx-[var(--space-4)] flex items-start gap-3 p-[var(--space-4)] rounded-[var(--radius-lg)] bg-[var(--color-primary-soft)] border border-[#C4B5FD]">
            <div className="w-9 h-9 rounded-[10px] bg-[var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5">
              <Info size={16} color="white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-600 text-[var(--color-primary)] opacity-70 mb-0.5 uppercase tracking-wide">Son 30 gunde</p>
              <p className="text-[12px] font-500 text-[#4E24C8] leading-relaxed">{insightText}</p>
              <Link href={`/owner/pets/${primaryPet?.id}?tab=saglik`}
                className="text-[11px] font-700 text-[var(--color-primary)] mt-1.5 inline-block hover:underline">
                Kilo gecmisini gor
              </Link>
            </div>
          </div>
        )}

        {/* Bugun */}
        {pets && pets.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-700 text-[var(--color-text-muted)] uppercase tracking-[0.8px] px-[var(--space-4)]">Bugun</p>
            <div className="mx-[var(--space-4)] bg-[var(--color-surface)] rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)] shadow-[var(--shadow-sm)] divide-y divide-[var(--color-border)]">
              {timelineSchedules.length > 0 ? timelineSchedules.slice(0, 3).map((plan: any) => {
                const dateStr = plan.due_date.includes('T') ? plan.due_date.split('T')[0] : plan.due_date
                const [y, m, d] = dateStr.split('-').map(Number)
                const timeStr = plan.due_time ? plan.due_time.slice(0, 5) : ''
                const taskDT = new Date(y, m - 1, d, ...(plan.due_time ? plan.due_time.split(':').map(Number) : [12, 0]))
                const isOverdue = taskDT < now
                const today = new Date(now); today.setHours(0,0,0,0)
                const target = new Date(y, m - 1, d)
                const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)

                let badge = ''; let dotColor = ''; let badgeBg = ''; let badgeColor = ''
                if (isOverdue) {
                  const dm = Math.floor((now.getTime() - taskDT.getTime()) / 60000)
                  badge = dm < 60 ? `${Math.max(1,dm)} dk gecikti` : `${Math.floor(dm/60)} sa gecikti`
                  dotColor = 'var(--color-danger)'; badgeBg = 'var(--color-danger-soft)'; badgeColor = 'var(--color-danger)'
                } else if (diffDays === 0) {
                  badge = `Bugun${timeStr ? ' '+timeStr : ''}`
                  dotColor = 'var(--color-warning)'; badgeBg = 'var(--color-warning-soft)'; badgeColor = 'var(--color-warning)'
                } else if (diffDays === 1) {
                  badge = 'Yarin'
                  dotColor = 'var(--color-primary)'; badgeBg = 'var(--color-primary-soft)'; badgeColor = 'var(--color-primary)'
                } else {
                  badge = `${diffDays} gun`
                  dotColor = 'var(--color-success)'; badgeBg = 'var(--color-success-soft)'; badgeColor = 'var(--color-success)'
                }

                return (
                  <Link key={plan.id} href={`/owner/pets/${plan.pet_id}#pet-tasks`}
                    className="flex items-center gap-3 px-[var(--space-4)] py-3 hover:bg-[var(--color-surface-secondary)] transition-colors group">
                    <span className="text-[11px] font-700 text-[var(--color-text-muted)] w-10 shrink-0 tabular-nums">{timeStr || '-'}</span>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: dotColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-600 text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                        {plan.title || (plan as any).vaccines?.name || 'Saglik Islemi'}
                      </p>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{(plan as any).pets?.name}</p>
                    </div>
                    <span className="text-[10px] font-700 px-2 py-1 rounded-[var(--radius-xs)] shrink-0 whitespace-nowrap"
                      style={{ background: badgeBg, color: badgeColor }}>
                      {badge}
                    </span>
                  </Link>
                )
              }) : (
                <div className="flex flex-col items-center justify-center py-6 px-4 text-center gap-2">
                  <p className="text-[13px] font-600 text-[var(--color-text-secondary)]">Bugun planli bakim yok</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">{primaryPet?.name} ile guzel bir gun gecirin!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Kayip Ilanlari */}
        {lostReports && lostReports.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-[var(--space-4)]">
              <div className="w-2 h-2 rounded-full bg-[var(--color-danger)] animate-pulse" />
              <h2 className="text-[11px] font-700 text-[var(--color-danger)] uppercase tracking-[0.8px]">Kayip Ilanlari</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto px-[var(--space-4)] pb-2 scrollbar-none snap-x snap-mandatory">
              {lostReports.map((report: any) => (
                <div key={report.id}
                  className="snap-start shrink-0 w-[200px] bg-[var(--color-danger-soft)] border border-[var(--color-danger)]/20 rounded-[var(--radius-lg)] p-[var(--space-3)] flex flex-col gap-2 shadow-[var(--shadow-sm)]">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 relative rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-danger)]/15 bg-[var(--color-surface)] shrink-0">
                      {report.pets?.avatar_url ? (
                        <Image src={report.pets.avatar_url} alt={report.pets.name} fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--color-danger)]">
                          <PawPrint size={18} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-700 text-[var(--color-text-primary)] text-[13px] truncate">{report.pets?.name}</p>
                      <p className="text-[10px] text-[var(--color-text-secondary)] truncate">{report.pets?.species}</p>
                    </div>
                  </div>
                  <div className="bg-[var(--color-surface)] rounded-[var(--radius-xs)] p-2 border border-[var(--color-danger)]/10">
                    <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5 font-600">Son Gorulme</p>
                    <p className="text-[11px] font-600 text-[var(--color-text-primary)] leading-tight line-clamp-2">{report.last_seen_location}</p>
                  </div>
                  <a href={`tel:${report.contact_phone}`}
                    className="w-full bg-[var(--color-danger)] text-white font-700 text-[11px] rounded-[var(--radius-sm)] py-2 flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all">
                    <Phone size={12} /> Hemen Ara
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Diger Petler */}
        {petsWithStats && petsWithStats.length > 1 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-[var(--space-4)]">
              <p className="text-[11px] font-700 text-[var(--color-text-muted)] uppercase tracking-[0.8px]">Petlerim</p>
              <Link href="/owner/pets/add"
                className="flex items-center gap-1 px-2.5 h-7 rounded-[var(--radius-xs)] bg-[var(--color-primary)] text-white text-[11px] font-600 hover:bg-[var(--color-primary-dark)] transition-colors">
                + Ekle
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto px-[var(--space-4)] pb-1 scrollbar-none snap-x">
              {petsWithStats.map((pet: any) => (
                <Link key={pet.id} href={`/owner/pets/${pet.id}`} data-testid="pet-card"
                  className="snap-start shrink-0 w-[120px] rounded-[var(--radius-md)] overflow-hidden shadow-[var(--shadow-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <div className="relative w-full h-[80px] bg-[var(--color-primary-soft)]">
                    {pet.avatar_url ? (
                      <Image src={pet.avatar_url} alt={pet.name} fill sizes="120px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[28px] font-800 text-[var(--color-primary)] opacity-30">
                        {(pet.name || '?').charAt(0)}
                      </div>
                    )}
                    {pet.overdueCount > 0 && (
                      <div className="absolute top-1 left-1 bg-[var(--color-danger)] text-white text-[8px] font-700 px-1 py-0.5 rounded-full">
                        {pet.overdueCount}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <p className="absolute bottom-1.5 left-2 text-white text-[11px] font-700 leading-none drop-shadow truncate">{pet.name}</p>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-[9px] text-[var(--color-text-muted)] font-500">{pet.weightVal || '-'}</span>
                    <span className="text-[9px] text-[var(--color-primary)] font-700">-&gt;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Hizli Erisim */}
        {pets && pets.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-700 text-[var(--color-text-muted)] uppercase tracking-[0.8px] px-[var(--space-4)]">Hizli Erisim</p>
            <div className="grid grid-cols-3 gap-2 px-[var(--space-4)]">
              {[
                { label: 'Saglik', href: pets.length === 1 ? `/owner/pets/${pets[0].id}/treatments` : '/owner/pets', bg: 'var(--color-health-soft)', color: 'var(--color-danger)', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
                { label: 'Beslenme', href: pets.length === 1 ? `/owner/pets/${pets[0].id}/nutrition` : '/owner/pets', bg: 'var(--color-nutrition-soft)', color: 'var(--color-warning)', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> },
                { label: 'Bakim', href: pets.length === 1 ? `/owner/plan-yap/bakim?pet_id=${pets[0].id}` : '/owner/pets', bg: 'var(--color-care-soft)', color: '#EC4899', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
                { label: 'AI Vet', href: '/owner/ai-vet', bg: 'var(--color-activity-soft)', color: 'var(--color-primary)', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5s-5-2.24-5-5a5 5 0 0 1 5-5z"/><path d="M12 14c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z"/></svg> },
                { label: 'Vet Bul', href: '/owner/vets', bg: 'var(--color-vet-soft)', color: '#4F46E5', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
                { id: 'onb-journal-add', label: 'Gunluk', href: pets.length === 1 ? `/owner/pets/${pets[0].id}/journal` : '/owner/pets', bg: 'var(--color-hygiene-soft)', color: '#0D9488', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> },
              ].map((mod) => (
                <Link key={(mod as any).id || mod.href} href={mod.href} id={(mod as any).id}
                  className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:shadow-[var(--shadow-sm)] hover:border-[var(--color-primary)]/30 active:scale-[0.97] transition-all duration-200">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                    style={{ background: mod.bg, color: mod.color }}>
                    {mod.icon}
                  </div>
                  <span className="text-[10px] font-700 text-[var(--color-text-secondary)] text-center leading-tight">{mod.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Davet Et */}
        {pets && pets.length > 0 && (
          <Link id="onb-referral" href="/owner/referral"
            className="mx-[var(--space-4)] flex items-center gap-2 p-[var(--space-3)] rounded-[var(--radius-lg)] bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/15 hover:border-[var(--color-primary)]/30 active:scale-[0.98] transition-all duration-200 group">
            <div className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-primary)]">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-700 text-[var(--color-text-primary)] text-[12px]">Arkadaslarini Davet Et</p>
              <p className="text-[10px] text-[var(--color-text-secondary)] font-500">Can dostunu tanistir, rozetler kazan!</p>
            </div>
            <span className="text-[11px] font-700 text-[var(--color-primary)] shrink-0 whitespace-nowrap">Davet Et</span>
          </Link>
        )}

        {/* Pet Gunlugu */}
        {pets && pets.length > 0 && (
          <div className="mx-[var(--space-4)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-[var(--space-4)] flex items-center justify-between gap-3 shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-[var(--radius-xs)] bg-[var(--color-primary-soft)] flex items-center justify-center shrink-0">
                <Pencil size={16} className="text-[var(--color-primary)]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-700 text-[var(--color-text-primary)]">Pet Gunlugu</p>
                <p className="text-[11px] text-[var(--color-text-muted)]">Istah, ruh hali, notlar...</p>
              </div>
            </div>
            <Link href={pets.length === 1 ? `/owner/pets/${pets[0].id}/journal/new` : `/owner/journal/select-pet?redirect=new`}
              className="shrink-0 h-8 px-3 rounded-[var(--radius-xs)] bg-[var(--color-primary)] text-white text-[12px] font-600 flex items-center hover:bg-[var(--color-primary-dark)] transition-colors">
              Kaydet +
            </Link>
          </div>
        )}

      </div>
    </DashboardOnboardingWrapper>
  )
}
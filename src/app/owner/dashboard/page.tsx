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
import { PawPrint, Calendar, Phone, Activity, Syringe, Pencil } from 'lucide-react'
import { SectionHeader } from '@/components/ui/primitives'

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
    .filter(s => new Date(s.due_date) <= in30)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5)

  const petsWithStats = (pets || []).map((pet: any) => {
    let lastFeedingDate = 'Veri Yok'
    let weightVal = 'Veri Yok'

    const feeding = allFeedingLogs.find((f: any) => f.pet_id === pet.id)
    if (feeding) {
      const diffHrs = Math.floor((now.getTime() - new Date(feeding.created_at).getTime()) / (1000 * 60 * 60))
      if (diffHrs < 24) lastFeedingDate = `${diffHrs} s. önce`
      else lastFeedingDate = `${Math.floor(diffHrs / 24)} g. önce`
    }

    const weight = allWeightLogs.find((w: any) => w.pet_id === pet.id)
    if (weight?.weight_kg) weightVal = `${weight.weight_kg} kg`

    const overdueCount = upcomingSchedules.filter(
      (s: any) => s.pet_id === pet.id && new Date(s.due_date) < now
    ).length

    return { ...pet, lastFeedingDate, weightVal, overdueCount }
  })

  const firstName = profile?.first_name || 'Hoş Geldin'

  return (
    <DashboardOnboardingWrapper>
      <div className="flex flex-col gap-6 pb-4">

        {/* Selamlama */}
        <div className="px-[var(--space-4)] pt-2">
          <h1 className="text-[24px] font-800 text-[var(--color-text-primary)] tracking-tight leading-tight">
            Merhaba, {firstName}
          </h1>
          <p className="text-[13px] font-500 text-[var(--color-text-secondary)] mt-1">
            Petlerinizin günlük özeti aşağıda.
          </p>
        </div>

        {/* Smart Cards */}
        {pets && pets.length > 0 && (
          <DashboardSmartCards
            pets={pets}
            upcomingSchedules={upcomingSchedules}
            completedSchedules={completedSchedules}
          />
        )}

        {/* Pet Slider */}
        {petsWithStats && petsWithStats.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-[var(--space-4)]">
              <h2 className="text-[15px] font-700 text-[var(--color-text-primary)]">Petlerim</h2>
              <Link
                href="/owner/pets/add"
                className="flex items-center gap-1 px-3 h-8 rounded-[var(--radius-xs)] bg-[var(--color-primary)] text-white text-[12px] font-600 hover:bg-[var(--color-primary-dark)] active:scale-[0.97] transition-all"
              >
                + Pet Ekle
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto px-[var(--space-4)] pb-2 scrollbar-none snap-x snap-mandatory">
              {petsWithStats.map((pet: any) => (
                <Link
                  key={pet.id}
                  href={`/owner/pets/${pet.id}`}
                  data-testid="pet-card"
                  aria-label={`${pet.name} profiline git`}
                  className="snap-start shrink-0 w-[160px] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] transition-all duration-200 bg-[var(--color-surface)] border border-[var(--color-border)]"
                >
                  {/* Fotoğraf */}
                  <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
                    {pet.avatar_url ? (
                      <Image
                        src={pet.avatar_url}
                        alt={pet.name}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--color-primary-soft)] flex items-center justify-center">
                        <span className="text-[56px] font-800 text-[var(--color-primary)] opacity-30 leading-none select-none">
                          {(pet.name || '?').charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* Gecikmiş badge */}
                    {pet.overdueCount > 0 && (
                      <div className="absolute top-2 left-2 bg-[var(--color-danger)] text-white text-[9px] font-700 px-1.5 py-0.5 rounded-full">
                        {pet.overdueCount} gecikti
                      </div>
                    )}

                    {/* İsim */}
                    <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2">
                      <p className="font-700 text-white text-[13px] leading-tight truncate drop-shadow">{pet.name}</p>
                      <p className="text-white/70 text-[10px] font-500 leading-tight">
                        {pet.species} · {calcAge(pet.birth_date).text}
                      </p>
                    </div>
                  </div>

                  {/* Alt şerit */}
                  <div className="flex items-center justify-between px-2.5 py-2 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
                    <span className="text-[10px] font-600 text-[var(--color-text-muted)] truncate">
                      {pet.weightVal !== 'Veri Yok' ? pet.weightVal : 'Profili Gör'}
                    </span>
                    <span className="text-[10px] font-700 text-[var(--color-primary)]">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-[var(--space-4)]">
            <EmptyState
              icon={<PawPrint />}
              title="Henüz pet eklemediniz"
              message="İlk petinizi eklemek için aşağıdaki butona dokunun."
              cta={{ label: "Pet Ekle", href: "/owner/pets/add" }}
            />
          </div>
        )}

        {/* Kayıp İlanları — korundu */}
        {lostReports && lostReports.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-[var(--space-4)]">
              <div className="w-2 h-2 rounded-full bg-[var(--color-danger)] animate-pulse" />
              <h2 className="text-[15px] font-700 text-[var(--color-danger)]">Kayıp İlanları</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto px-[var(--space-4)] pb-2 scrollbar-none snap-x snap-mandatory">
              {lostReports.map((report: any) => (
                <div
                  key={report.id}
                  className="snap-start shrink-0 w-[220px] bg-[var(--color-danger-soft)] border border-[var(--color-danger)]/20 rounded-[var(--radius-lg)] p-[var(--space-4)] flex flex-col gap-3 shadow-[var(--shadow-sm)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 relative rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-danger)]/15 bg-[var(--color-surface)] shrink-0">
                      {report.pets?.avatar_url ? (
                        <Image src={report.pets.avatar_url} alt={report.pets.name} fill sizes="44px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--color-danger)]">
                          <PawPrint size={20} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-700 text-[var(--color-text-primary)] text-[14px] truncate">{report.pets?.name}</p>
                      <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                        {report.pets?.species} · {report.pets?.breed || 'Bilinmiyor'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-[var(--color-surface)] rounded-[var(--radius-xs)] p-2.5 border border-[var(--color-danger)]/10">
                    <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5 font-600">Son Görülme</p>
                    <p className="text-[12px] font-600 text-[var(--color-text-primary)] leading-tight line-clamp-2">{report.last_seen_location}</p>
                  </div>
                  <a
                    href={`tel:${report.contact_phone}`}
                    className="w-full bg-[var(--color-danger)] text-white font-700 text-[12px] rounded-[var(--radius-sm)] py-2.5 flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    <Phone size={13} />
                    Hemen Ara
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Davet Et Banner */}
        {pets && pets.length > 0 && (
          <Link
            id="onb-referral"
            href="/owner/referral"
            className="mx-[var(--space-4)] flex items-center gap-3 p-[var(--space-4)] rounded-[var(--radius-lg)] bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/15 hover:border-[var(--color-primary)]/30 active:scale-[0.98] transition-all duration-200 group shadow-[var(--shadow-sm)]"
          >
            <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-primary)]">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-700 text-[var(--color-text-primary)] text-[13px] leading-tight">Arkadaşlarını Davet Et</p>
              <p className="text-[11px] text-[var(--color-text-secondary)] font-500 mt-0.5">Can dostunu tanıştır, rozetler kazan!</p>
            </div>
            <span className="text-[12px] font-700 text-[var(--color-primary)] shrink-0 group-hover:translate-x-0.5 transition-transform duration-200">
              Davet Et →
            </span>
          </Link>
        )}

        {/* Hızlı Erişim */}
        {pets && pets.length > 0 && (
          <div className="flex flex-col gap-2 px-[var(--space-4)]">
            <h2 className="text-[11px] font-700 text-[var(--color-text-muted)] uppercase tracking-[0.8px]">Hızlı Erişim</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: 'Sağlık & Aşı',
                  href: pets.length === 1 ? `/owner/pets/${pets[0].id}/treatments` : '/owner/journal/select-pet?redirect=health',
                  iconBg: 'var(--color-health-soft)',
                  iconColor: 'var(--color-danger)',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                  ),
                },
                {
                  label: 'Beslenme',
                  href: pets.length === 1 ? `/owner/pets/${pets[0].id}/nutrition` : '/owner/journal/select-pet?redirect=nutrition',
                  iconBg: 'var(--color-nutrition-soft)',
                  iconColor: 'var(--color-warning)',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 11l19-9-9 19-2-8-8-2z"/>
                    </svg>
                  ),
                },
                {
                  label: 'Bakım',
                  href: pets.length === 1 ? `/owner/plan-yap/bakim?pet_id=${pets[0].id}` : '/owner/journal/select-pet?redirect=care',
                  iconBg: 'var(--color-care-soft)',
                  iconColor: '#EC4899',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  ),
                },
                {
                  label: 'AI Vet',
                  href: '/owner/ai-vet',
                  iconBg: 'var(--color-activity-soft)',
                  iconColor: 'var(--color-primary)',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5s-5-2.24-5-5a5 5 0 0 1 5-5z"/>
                      <path d="M12 14c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z"/>
                    </svg>
                  ),
                },
                {
                  label: 'Vet Bul',
                  href: '/owner/vets',
                  iconBg: 'var(--color-vet-soft)',
                  iconColor: '#4F46E5',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  ),
                },
                {
                  label: 'Günlük',
                  id: 'onb-journal-add',
                  href: pets.length === 1 ? `/owner/pets/${pets[0].id}/journal` : '/owner/journal/select-pet?redirect=journal',
                  iconBg: 'var(--color-hygiene-soft)',
                  iconColor: '#0D9488',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                  ),
                },
              ].map((mod) => (
                <Link
                  key={mod.href}
                  id={(mod as any).id}
                  href={mod.href}
                  className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 hover:shadow-[var(--shadow-sm)] active:scale-[0.97] transition-all duration-200"
                >
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                    style={{ background: mod.iconBg, color: mod.iconColor }}
                  >
                    {mod.icon}
                  </div>
                  <span className="text-[10px] font-700 text-[var(--color-text-secondary)] text-center leading-tight">
                    {mod.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
        {/* Pet Günlüğü Quick Action */}
        {pets && pets.length > 0 && (
          <div className="flex flex-col gap-2 px-[var(--space-4)]">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-700 text-[var(--color-text-primary)]">Pet Günlüğü</h2>
              <Link
                href={pets.length === 1 ? `/owner/pets/${pets[0].id}/journal` : `/owner/journal/select-pet?redirect=journal`}
                className="text-[12px] font-700 text-[var(--color-primary)] hover:underline"
              >
                Tümünü Gör
              </Link>
            </div>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-[var(--space-4)] flex items-center justify-between gap-3 hover:border-[var(--color-primary)]/30 transition-colors shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-[var(--radius-xs)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                  <Pencil size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-700 text-[var(--color-text-primary)] truncate">Yeni Durum Kaydet</p>
                  <p className="text-[11px] font-500 text-[var(--color-text-muted)] truncate">İştah, ruh hali, notlar...</p>
                </div>
              </div>
              <Link
                href={pets.length === 1 ? `/owner/pets/${pets[0].id}/journal/new` : `/owner/journal/select-pet?redirect=new`}
                className="shrink-0 h-8 px-3 rounded-[var(--radius-xs)] bg-[var(--color-primary)] text-white text-[12px] font-600 flex items-center hover:bg-[var(--color-primary-dark)] active:scale-[0.97] transition-all"
              >
                Kaydet +
              </Link>
            </div>
          </div>
        )}

        {/* Yaklaşan Etkinlikler */}
        {pets && pets.length > 0 && (
          <div className="mx-[var(--space-4)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-2.5 px-[var(--space-4)] py-[var(--space-3)] border-b border-[var(--color-border)]">
              <div className="w-7 h-7 rounded-[var(--radius-xs)] bg-[var(--color-warning-soft)] flex items-center justify-center">
                <Calendar size={14} className="text-[var(--color-warning)]" />
              </div>
              <h2 className="text-[15px] font-700 text-[var(--color-text-primary)]">Yaklaşan Etkinlikler</h2>
            </div>

            {timelineSchedules.length > 0 ? (
              <div className="flex flex-col divide-y divide-[var(--color-border)]">
                {timelineSchedules.map(plan => {
                  const dateStr = plan.due_date.includes('T') ? plan.due_date.split('T')[0] : plan.due_date
                  const [y, m, d] = dateStr.split('-').map(Number)
                  const due = new Date(y, m - 1, d)

                  const timeStr = plan.due_time || '12:00:00'
                  const [th, tm] = timeStr.split(':').map(Number)
                  const taskDT = new Date(y, m - 1, d, th || 12, tm || 0)
                  const isOverdue = taskDT < now

                  const today = new Date(now)
                  today.setHours(0, 0, 0, 0)
                  const target = new Date(y, m - 1, d)
                  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)

                  let badgeText = ''
                  let badgeClass = ''

                  if (isOverdue) {
                    const dm = Math.floor((now.getTime() - taskDT.getTime()) / 60000)
                    badgeText = dm < 60 ? `${Math.max(1, dm)} dk gecikti` : dm < 1440 ? `${Math.floor(dm / 60)} sa gecikti` : `${Math.floor(dm / 1440)} gün gecikti`
                    badgeClass = 'bg-[var(--color-danger-soft)] text-[var(--color-danger)]'
                  } else if (diffDays === 0) {
                    badgeText = `Bugün${plan.due_time ? ' ' + timeStr.slice(0, 5) : ''}`
                    badgeClass = 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]'
                  } else if (diffDays === 1) {
                    badgeText = `Yarın`
                    badgeClass = 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                  } else {
                    badgeText = `${diffDays} gün kaldı`
                    badgeClass = diffDays <= 3
                      ? 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]'
                      : 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                  }

                  return (
                    <Link
                      key={plan.id}
                      href={`/owner/pets/${plan.pet_id}#pet-tasks`}
                      className="flex items-center gap-3 px-[var(--space-4)] py-3 hover:bg-[var(--color-surface-secondary)] transition-colors group"
                    >
                      <div className="flex flex-col items-center bg-[var(--color-surface-secondary)] rounded-[var(--radius-xs)] px-2.5 py-1.5 shrink-0 min-w-[44px] text-center">
                        <p className="text-[16px] font-800 text-[var(--color-text-primary)] leading-none tabular-nums">{due.getDate()}</p>
                        <p className="text-[10px] font-600 text-[var(--color-text-muted)] uppercase">
                          {due.toLocaleString('tr-TR', { month: 'short' })}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-600 text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                          {plan.title || (plan as any).vaccines?.name || 'Sağlık İşlemi'}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] font-500 flex items-center gap-1 mt-0.5">
                          <PawPrint size={9} />
                          {(plan as any).pets?.name}
                        </p>
                      </div>
                      <span className={`text-[10px] font-700 px-2 py-1 rounded-[var(--radius-xs)] shrink-0 whitespace-nowrap ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="p-[var(--space-5)]">
                <EmptyState
                  icon={<Calendar />}
                  title="Yaklaşan etkinlik yok"
                  message="Petinizin sağlık takvimi henüz oluşturulmadı."
                />
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardOnboardingWrapper>
  )
}
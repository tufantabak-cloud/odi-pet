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
import { getCachedDashboardData, DashboardPet } from './dashboard-queries'
import { getTimelineSchedules, getPetsWithStats, getGreeting, getActiveCount } from './dashboard-utils'
import EmptyState from '@/components/ui/EmptyState'
import {
  DefaultCatAvatar, DefaultDogAvatar, PawIcon, CarrierIcon,
  VaccineIcon, BowlIcon, ShampooIcon,
} from '@/components/icons/PetIcons'

// Paylaşılan AI Vet ikonu — iki yerde kullanıldığı için dışarı alındı
const AiVetIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5s-5-2.24-5-5a5 5 0 0 1 5-5z"/>
    <path d="M12 14c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z"/>
  </svg>
)

// ── Modül Kısayol Izgarası ───────────────────────────────────────
function ModuleGrid({ pets }: { pets: DashboardPet[] }) {
  const single = pets.length === 1
  const pid = pets[0]?.id ?? ''
  const petHref = (key: string, path: string) =>
    single ? `/owner/pets/${pid}${path}` : `/owner/journal/select-pet?redirect=${key}`

  const modules = [
    {
      label: 'Sağlık & Aşı',
      href: petHref('health', ''),
      gradient: 'from-blue-500/15 to-sky-400/10',
      iconBg: 'bg-blue-500/15',
      color: 'text-blue-700',
      icon: <VaccineIcon width={24} height={24} />,
    },
    {
      label: 'Beslenme',
      href: petHref('nutrition', '/nutrition'),
      gradient: 'from-amber-500/15 to-orange-400/10',
      iconBg: 'bg-amber-500/15',
      color: 'text-amber-700',
      icon: <BowlIcon width={24} height={24} />,
    },
    {
      label: 'Bakım',
      href: petHref('care', '/care'),
      gradient: 'from-pink-500/15 to-fuchsia-400/10',
      iconBg: 'bg-pink-500/15',
      color: 'text-pink-700',
      icon: <ShampooIcon width={24} height={24} />,
    },
    {
      label: 'AI Vet',
      href: '/owner/ai-vet',
      gradient: 'from-primary/15 to-violet-500/10',
      iconBg: 'bg-primary/15',
      color: 'text-primary',
      icon: AiVetIcon,
    },
    {
      label: 'Vet Bul',
      href: '/owner/vets',
      gradient: 'from-indigo-500/15 to-purple-400/10',
      iconBg: 'bg-indigo-500/15',
      color: 'text-indigo-700',
      icon: <CarrierIcon width={24} height={24} />,
    },
    {
      label: 'Günlük',
      href: petHref('journal', '/journal'),
      gradient: 'from-teal-500/15 to-emerald-400/10',
      iconBg: 'bg-teal-500/15',
      color: 'text-teal-700',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[15px] font-extrabold text-text-primary">Hızlı Erişim</h2>
      <div className="grid grid-cols-3 gap-2.5">
        {modules.map((mod) => (
          <Link
            key={mod.href}
            href={mod.href}
            className={`flex flex-col items-center gap-2 p-3 rounded-[16px] bg-gradient-to-br ${mod.gradient} border border-white/80 hover:scale-[1.04] active:scale-[0.97] transition-all duration-200 shadow-sm`}
          >
            <div className={`w-10 h-10 rounded-[12px] ${mod.iconBg} flex items-center justify-center ${mod.color}`}>
              {mod.icon}
            </div>
            <span className={`text-[11px] font-bold ${mod.color} text-center leading-tight`}>
              {mod.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Boş Durum — Pet Yok ──────────────────────────────────────────
function EmptyDashboard({ firstName }: { firstName: string }) {
  const features = [
    { label: 'Sağlık & Aşılar', bg: 'bg-blue-50',   color: 'text-blue-600',   icon: <VaccineIcon width={22} height={22} /> },
    { label: 'Beslenme',         bg: 'bg-amber-50',  color: 'text-amber-600',  icon: <BowlIcon width={22} height={22} /> },
    { label: 'Bakım',            bg: 'bg-pink-50',   color: 'text-pink-600',   icon: <ShampooIcon width={22} height={22} /> },
    { label: 'AI Vet',           bg: 'bg-purple-50', color: 'text-purple-600', icon: AiVetIcon },
  ]

  return (
    <div className="flex flex-col gap-6 animate-fadeInUp">
      <div className="card-base p-6 flex flex-col items-center text-center gap-4 border border-primary/10 bg-gradient-to-b from-primary-soft to-white">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <PawIcon width={40} height={40} />
        </div>
        <div>
          <h2 className="text-[20px] font-black text-text-primary tracking-tight">
            Hoş Geldiniz, {firstName}!
          </h2>
          <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed max-w-xs mx-auto">
            Premium evcil hayvan bakım paneronuz Odi.Pet ile tanışın. Can dostunuzun profilini oluşturun, aşı takibini başlatın.
          </p>
        </div>
        <Link
          href="/owner/pets/add"
          className="w-full btn-primary py-3.5 text-[15px] font-black shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          İlk Can Dostunu Ekle
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[12px] font-black text-text-secondary uppercase tracking-widest">Neler yapabilirsiniz?</p>
        <div className="grid grid-cols-2 gap-3">
          {features.map(f => (
            <div key={f.label} className={`${f.bg} rounded-[16px] p-4 flex items-center gap-3`}>
              <div className={`${f.color} shrink-0`}>{f.icon}</div>
              <span className={`text-[12px] font-bold ${f.color} leading-tight`}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function OwnerDashboard() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { profile, pets, upcomingSchedules, completedSchedules, allFeedingLogs, allWeightLogs } =
    await getCachedDashboardData(user.id)

  const now = getNowTR()

  const timelineSchedules = getTimelineSchedules(upcomingSchedules, now)
  const petsWithStats = getPetsWithStats(pets || [], allFeedingLogs, allWeightLogs, upcomingSchedules, now)
  const greeting = getGreeting(now)
  const activeCount = getActiveCount(upcomingSchedules, now)

  const dateLabel = now.toLocaleString('tr-TR', { day: 'numeric', month: 'long' })
  const firstName = profile?.first_name || 'Hoş Geldin'
  const hasPets = pets && pets.length > 0

  // Pet Günlüğü linkleri — iki kez kullanıldığı için değişkene alındı
  const journalListHref = pets && pets.length === 1
    ? `/owner/pets/${pets[0].id}/journal`
    : `/owner/journal/select-pet?redirect=journal`
  const journalNewHref = pets && pets.length === 1
    ? `/owner/pets/${pets[0].id}/journal/new`
    : `/owner/journal/select-pet?redirect=new`

  return (
    <DashboardOnboardingWrapper>
      <div className="flex flex-col gap-6 pb-4">

        {/* Selamlama */}
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-extrabold text-text-primary tracking-tight leading-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-[13px] text-text-secondary font-medium mt-1">
            {dateLabel}
            {activeCount > 0 && (
              <span className="ml-2 text-warning font-bold">• {activeCount} Aktif Görev</span>
            )}
          </p>
        </div>

        {/* Pet yok */}
        {!hasPets && <EmptyDashboard firstName={firstName} />}

        {/* Pet var */}
        {hasPets && (
          <>
            {/* Pet Slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-extrabold text-text-primary">Petlerim</h2>
                <Link
                  href="/owner/pets/add"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-white text-[12px] font-bold hover:bg-primary-hover active:scale-[0.97] transition-all shadow-sm"
                >
                  <span className="text-[13px] leading-none">+</span> Pet Ekle
                </Link>
              </div>

              <div className={petsWithStats.length === 1 ? "flex" : "flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory -mx-1 px-1"}>
                {petsWithStats.map((pet) => {
                  const r = 13
                  const circ = 2 * Math.PI * r
                  const fill = circ * (pet.score / 100)
                  const scoreColor = pet.score >= 75 ? '#22C55E' : pet.score >= 40 ? '#FACC15' : '#EF4444'
                  const isCat = pet.species?.toLowerCase().includes('kedi') || pet.species?.toLowerCase().includes('cat')

                  return (
                    <Link
                      key={pet.id}
                      href={`/owner/pets/${pet.id}`}
                      data-testid="pet-card"
                      aria-label={`${pet.name} profiline git`}
                      className={`${petsWithStats.length === 1 ? "w-full" : "snap-start shrink-0 w-[160px] sm:w-[175px]"} rounded-[22px] overflow-hidden group cursor-pointer shadow-sm hover:shadow-lg transition-all duration-300 bg-surface border border-border-main/40`}
                    >
                      <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
                        {pet.avatar_url ? (
                          <Image src={pet.avatar_url} alt={pet.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full">{isCat ? <DefaultCatAvatar /> : <DefaultDogAvatar />}</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />

                        {/* Sağlık skoru halkası */}
                        <div className="absolute top-2 right-2 z-10">
                          <svg width="32" height="32" viewBox="0 0 30 30" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="15" cy="15" r={r} fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
                            <circle cx="15" cy="15" r={r} fill="none" stroke={scoreColor} strokeWidth="2.5" strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white">{pet.score}</span>
                        </div>

                        {/* Gecikmiş görev badge */}
                        {pet.overdueCount > 0 && (
                          <div className="absolute top-2 left-2 z-10 bg-error text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                            {pet.overdueCount} gecikti
                          </div>
                        )}

                        {/* İsim + yaş */}
                        <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5 z-10">
                          <p className="font-extrabold text-white text-[14px] leading-tight truncate drop-shadow">{pet.name}</p>
                          <p className="text-white/70 text-[10px] font-medium">{pet.species} · {calcAge(pet.birth_date).text}</p>
                        </div>
                      </div>

                      {/* Alt şerit: besleme + kilo */}
                      {(pet.lastFeedingLabel || pet.weightLabel) && (
                        <div className="flex items-center justify-between px-3 py-2 bg-white gap-1.5">
                          {pet.lastFeedingLabel ? (
                            <span className="flex items-center gap-1 text-[10px] text-text-secondary font-semibold truncate">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-500 shrink-0" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 11l19-9-9 19-2-8-8-2z"/>
                              </svg>
                              {pet.lastFeedingLabel}
                            </span>
                          ) : <span />}
                          {pet.weightLabel && (
                            <span className="text-[10px] font-bold text-text-secondary bg-bg-main px-1.5 py-0.5 rounded-lg shrink-0">{pet.weightLabel}</span>
                          )}
                        </div>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Hızlı Erişim modülleri */}
            <ModuleGrid pets={pets} />

            {/* Akıllı aksiyon kartı */}
            <DashboardSmartCards
              pets={pets}
              upcomingSchedules={upcomingSchedules}
              completedSchedules={completedSchedules}
            />

            {/* Pet Günlüğü hızlı işlem */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-text-primary">Pet Günlüğü</h2>
                <Link href={journalListHref} className="text-[12px] font-bold text-primary hover:underline">
                  Tümünü Gör
                </Link>
              </div>
              <div className="card-base p-3.5 flex items-center justify-between gap-3 border border-border-main hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold text-text-primary truncate">Yeni Durum Kaydet</p>
                    <p className="text-[11px] text-text-secondary font-medium truncate">İştah, ruh hali, notlar…</p>
                  </div>
                </div>
                <Link href={journalNewHref} className="btn-primary py-2 px-3.5 text-[12px] font-bold whitespace-nowrap shrink-0 shadow-sm">
                  Kaydet +
                </Link>
              </div>
            </div>

            {/* Yaklaşan Etkinlikler */}
            <div className="card-base p-5">
              <h2 className="text-[16px] font-extrabold text-text-primary mb-4 flex items-center gap-2.5">
                <div className="bg-warning/10 text-warning p-1.5 rounded-lg">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect width="18" height="18" x="3" y="4" rx="2"/>
                    <line x1="16" x2="16" y1="2" y2="6"/>
                    <line x1="8" x2="8" y1="2" y2="6"/>
                    <line x1="3" x2="21" y1="10" y2="10"/>
                  </svg>
                </div>
                Yaklaşan Etkinlikler
              </h2>

              {timelineSchedules.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {timelineSchedules.map((plan) => {
                    const ds = plan.due_date.includes('T') ? plan.due_date.split('T')[0] : plan.due_date
                    const [y, m, d] = ds.split('-').map(Number)
                    const due = getNowTR(); due.setFullYear(y, m - 1, d)
                    const ts = plan.due_time || '12:00:00'
                    const [th, tm] = ts.split(':').map(Number)
                    const taskDT = getNowTR(); taskDT.setFullYear(y, m - 1, d); taskDT.setHours(th || 12, tm || 0, 0, 0)
                    const isOverdue = taskDT < now
                    const tod = getNowTR(); tod.setHours(0, 0, 0, 0)
                    const tgt = getNowTR(); tgt.setFullYear(y, m - 1, d); tgt.setHours(0, 0, 0, 0)
                    const dd = Math.round((tgt.getTime() - tod.getTime()) / 86400000)
                    const tl = plan.due_time ? ' ' + ts.slice(0, 5) : ''
                    let badge = ''; let badgeClass = ''; let rowBorder = ''

                    if (isOverdue) {
                      const dm = Math.floor((now.getTime() - taskDT.getTime()) / 60000)
                      badge = dm < 60 ? `${Math.max(1, dm)} dk gecikti` : dm < 1440 ? `${Math.floor(dm / 60)} saat gecikti` : `${Math.floor(dm / 1440)} gün gecikti`
                      badgeClass = 'bg-error/10 text-error border-error/20'
                      rowBorder = 'border-l-error'
                    } else if (dd === 0) {
                      badge = 'Bugün' + tl; badgeClass = 'bg-warning/10 text-warning border-warning/20'; rowBorder = 'border-l-warning'
                    } else if (dd === 1) {
                      badge = 'Yarın' + tl; badgeClass = 'bg-primary/10 text-primary border-primary/20'; rowBorder = 'border-l-primary'
                    } else {
                      badge = `${dd} gün kaldı`
                      badgeClass = dd <= 3 ? 'bg-warning/10 text-warning border-warning/20' : 'bg-success/10 text-success border-success/20'
                      rowBorder = dd <= 3 ? 'border-l-warning' : 'border-l-success'
                    }

                    return (
                      <Link
                        href={`/owner/pets/${plan.pet_id}#pet-tasks`}
                        key={plan.id}
                        className={`flex items-center gap-3 p-3 border border-border-main border-l-4 ${rowBorder} rounded-[14px] bg-surface hover:shadow-sm transition-all group`}
                      >
                        <div className="flex flex-col items-center bg-bg-main rounded-[10px] px-2 py-1 shrink-0 min-w-[40px]">
                          <p className="text-[15px] font-black text-text-primary leading-none">{due.getDate()}</p>
                          <p className="text-[9px] font-bold text-text-secondary">{due.toLocaleString('tr-TR', { month: 'short' })}</p>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <p className="font-bold text-text-primary text-[13px] truncate group-hover:text-primary transition-colors">
                            {plan.title || (plan.vaccines && plan.vaccines.name) || 'Sağlık İşlemi'}
                          </p>
                          <p className="text-[11px] text-text-secondary">{plan.pets && plan.pets.name}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${badgeClass}`}>
                          {badge}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<CarrierIcon width={40} height={40} />}
                  title="Yaklaşan etkinlik yok"
                  message="Sağlık takvimi henüz oluşturulmadı."
                />
              )}
            </div>
          </>
        )}

      </div>
    </DashboardOnboardingWrapper>
  )
}

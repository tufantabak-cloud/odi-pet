"use no memo"
export const dynamic = 'force-dynamic'

import { getSessionUser } from '@/lib/auth/get-current-profile'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import DashboardOnboardingWrapper from './DashboardOnboardingWrapper'
import DashboardSmartCards from './DashboardSmartCards'
import { getNowTR } from '@/lib/utils'
import Image from 'next/image'
import { getCachedDashboardData } from './dashboard-queries'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PawPrint, Calendar, Pencil, Gift, ChevronRight } from 'lucide-react'
import SmartQuestionCard from '@/components/profiling/SmartQuestionCard'
import SmartInsightCard from '@/components/profiling/SmartInsightCard'
import SocialShortcuts from '@/components/dashboard/SocialShortcuts'
import QuickJournalWidget from '@/components/dashboard/QuickJournalWidget'

export default async function OwnerDashboard() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const { profile, pets, upcomingSchedules, completedSchedules, allFeedingLogs, allWeightLogs, plans, activeQuestion, activeInsight } =
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
  }).slice(0, 10) || []

  const now = getNowTR()
  const in30 = getNowTR()
  in30.setDate(in30.getDate() + 30)

  // Yaklaşan Etkinlikler (Planlar hariç, aşı vb.)
  const upcomingEvents = upcomingSchedules
    .filter((s: any) => s._source !== 'plans' && new Date(s.due_date) <= in30)
    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 3)

  // Aktif Planlar
  const activePlans = plans || []

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

  const firstName = profile?.first_name || 'Hos Geldin'
  const greeting = (() => {
    const h = now.getHours()
    if (h < 12) return 'Günaydın'
    if (h < 18) return 'İyi günler'
    return 'İyi akşamlar'
  })()

  const dateStr = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
  const activeTasksCount = upcomingSchedules.filter((s: any) => s.status !== 'done').length

  return (
    <DashboardOnboardingWrapper>
      <div className="flex flex-col gap-[var(--space-5)] pb-8 pb-safe">

        {(!pets || pets.length === 0) ? (
          <div className="px-[var(--space-4)] pt-6 flex flex-col gap-4">
            <h1 className="text-[22px] font-black text-[var(--color-text-primary)] leading-tight tracking-tight">
              {greeting}, {firstName}
            </h1>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] rounded-[24px] p-8 text-center flex flex-col items-center mt-4">
              <div className="text-5xl mb-4">🐾</div>
              <h2 className="text-[17px] font-black text-[var(--color-text-primary)] mb-2">
                Hoş Geldiniz!
              </h2>
              <p className="text-[13px] text-[var(--color-text-secondary)] mb-6 max-w-[250px] mx-auto leading-relaxed">
                Başlamak için ilk dostunuzu ekleyin ve Odi.Pet dünyasını keşfedin.
              </p>
              <Link href="/owner/pets/add" className="h-12 w-full max-w-[200px] flex items-center justify-center bg-[var(--color-primary)] text-white rounded-[18px] font-800 text-[14px] hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md shadow-primary/20">
                İlk Dostumu Ekle 🐾
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* 1. Üst Header / Karşılama */}
            <div className="px-[var(--space-4)] pt-6 pb-1 flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-[22px] font-black text-[var(--color-text-primary)] leading-tight tracking-tight">
                  {greeting}, {firstName}
                </h1>
                <p className="text-[12px] text-[var(--color-text-secondary)] font-600 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[var(--color-primary)]" />
                  <span>{dateStr}</span>
                  <span className="text-[var(--color-text-muted)]">•</span>
                  <span className="bg-[var(--color-primary-soft)] text-[var(--color-primary)] px-1.5 py-0.5 rounded text-[10px] font-700">
                    {activeTasksCount} Aktif Görev
                  </span>
                </p>
              </div>
            </div>

            {/* 2. Petlerim (Dairesel Avatar - Fotoğraf Kesilmesini Önler) */}
            {petsWithStats && petsWithStats.length > 0 && (
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center justify-between px-[var(--space-4)]">
                  <p className="text-[11px] font-800 text-[var(--color-text-muted)] uppercase tracking-[1.2px]">Petlerim</p>
                  <Link href="/owner/pets/add" className="text-[12px] font-800 text-[var(--color-primary)]">
                    + Ekle
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto px-[var(--space-4)] pb-2 scrollbar-none snap-x">
                  {petsWithStats.map((pet: any) => (
                    <Link key={pet.id} href={`/owner/pets/${pet.id}`} data-testid="pet-card"
                      className="snap-start shrink-0 flex flex-col items-center gap-2 w-[76px] group">
                      <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden shadow-sm border-2 border-[var(--color-border)] group-hover:border-[var(--color-primary)] transition-colors bg-[var(--color-primary-soft)] shrink-0">
                        {pet.avatar_url ? (
                          <Image src={pet.avatar_url} alt={pet.name} fill sizes="72px" className="object-cover object-center" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[28px] font-800 text-[var(--color-primary)] opacity-40">
                            {(pet.name || '?').charAt(0)}
                          </div>
                        )}
                        {pet.overdueCount > 0 && (
                          <div className="absolute top-0 right-0 bg-[var(--color-danger)] text-white text-[10px] font-800 w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                            {pet.overdueCount}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center w-full">
                        <span className="text-[12px] font-800 text-[var(--color-text-primary)] truncate w-full text-center leading-tight">{pet.name}</span>
                        <span className="text-[9px] text-[var(--color-text-muted)] font-600 truncate w-full text-center mt-0.5">{pet.weightVal || '-'}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Profiling Engine Questions & Insights */}
            {(activeQuestion || activeInsight) && (
              <div className="px-[var(--space-4)] flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                {activeInsight && <SmartInsightCard insight={activeInsight} />}
                {activeQuestion && <SmartQuestionCard question={activeQuestion} />}
              </div>
            )}

            {/* 4. Pet Günlüğü Hızlı Giriş Widget'ı (Kullanım sıklığından dolayı üstte) */}
            {pets && pets.length > 0 && (
              <QuickJournalWidget pets={pets} />
            )}

            {/* 5. Smart Cards */}
            {pets && pets.length > 0 && (
              <div className="px-[var(--space-4)] pt-2">
                <DashboardSmartCards
                  pets={pets}
                  upcomingSchedules={upcomingSchedules}
                  completedSchedules={completedSchedules}
                />
              </div>
            )}

            {/* 6. Ajanda (Yaklaşan Etkinlikler & Aktif Planlar Birleşimi) */}
            <div className="flex flex-col gap-2.5 px-[var(--space-4)] pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-800 text-[var(--color-text-muted)] uppercase tracking-[1.2px]">Ajanda</h2>
              </div>
              
              {(upcomingEvents.length > 0 || activePlans.length > 0) ? (
                <div className="flex flex-col gap-2">
                  {/* Etkinlikler */}
                  {upcomingEvents.map((event: any) => {
                    const eventDate = new Date(event.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
                    return (
                      <div key={event.id} className="flex items-center justify-between p-3.5 rounded-card bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:border-[var(--color-primary)]/20 transition-all duration-200">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xs bg-[var(--color-health-soft)] text-[var(--color-danger)] flex items-center justify-center shrink-0">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/><path d="M12 6V12L16 14"/></svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-700 text-[var(--color-text-primary)] truncate">{event.title || event.vaccines?.name || 'Sağlık Takibi'}</p>
                            <p className="text-[10px] text-[var(--color-text-secondary)] font-600 truncate">{event.pets?.name || 'Pet'}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-700 text-[var(--color-text-primary)]">{eventDate}</span>
                          {event.due_time && <p className="text-[9px] text-[var(--color-text-muted)] font-500 mt-0.5">{event.due_time.substring(0, 5)}</p>}
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* Rutin Planlar */}
                  {activePlans.slice(0, 3).map((plan: any) => {
                    const planDate = plan.next_run ? new Date(plan.next_run).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : 'Belirtilmemiş'
                    return (
                      <div key={plan.id} className="flex items-center justify-between p-3.5 rounded-card bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:border-[var(--color-primary)]/20 transition-all duration-200">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xs bg-[var(--color-primary-soft)] text-[var(--color-primary)] flex items-center justify-center shrink-0">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-700 text-[var(--color-text-primary)] truncate">{plan.sub_type || plan.category || 'Plan'}</p>
                            <p className="text-[10px] text-[var(--color-text-secondary)] font-600 truncate">{plan.pets?.name || 'Pet'}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-700 text-[var(--color-text-primary)]">{planDate}</span>
                          <p className="text-[9px] text-[var(--color-text-muted)] font-500 mt-0.5">Sıradaki</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-card bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
                  <p className="text-[11px] text-[var(--color-text-muted)] font-600">Yakın zamanda planlanmış bir ajanda öğesi bulunmuyor.</p>
                </div>
              )}
            </div>

            {/* 7. Hızlı Erişim */}
            {pets && pets.length > 0 && (
              <div className="flex flex-col gap-2 pt-2">
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
                    <Link key={(mod as any).id || mod.label} href={mod.href} id={(mod as any).id}
                      className="flex flex-col items-center gap-2 p-3 rounded-md bg-[var(--color-surface)] border border-[var(--color-border)] hover:shadow-[var(--shadow-sm)] hover:border-[var(--color-primary)]/30 active:scale-[0.97] transition-all duration-200">
                      <div className="w-9 h-9 rounded-xs flex items-center justify-center"
                        style={{ background: mod.bg, color: mod.color }}>
                        {mod.icon}
                      </div>
                      <span className="text-[10px] font-700 text-[var(--color-text-secondary)] text-center leading-tight">{mod.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 8. Davet Et (Mini Banner) */}
            {pets && pets.length > 0 && (
              <div className="px-[var(--space-4)] pt-2">
                <Link href="/owner/referral" className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 flex items-center gap-3 hover:border-[var(--color-primary)]/30 transition-all duration-200">
                  <div className="w-8 h-8 bg-[var(--color-primary-soft)] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Gift size={16} className="text-[var(--color-primary)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[12px] font-800 text-[var(--color-text-primary)]">Arkadaşını davet et</p>
                    <p className="text-[10px] text-[var(--color-text-secondary)] font-600">Her davet için 1 ay ücretsiz premium</p>
                  </div>
                  <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
                </Link>
              </div>
            )}

            {/* Social Shortcuts Grid / SOS Banner */}
            <div className="pt-2">
              <SocialShortcuts lostReportsCount={lostReports.length} />
            </div>

          </>
        )}
      </div>
    </DashboardOnboardingWrapper>
  )
}

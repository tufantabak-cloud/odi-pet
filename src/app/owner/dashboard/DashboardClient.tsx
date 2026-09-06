'use client'

import { useState } from 'react'
import Link from 'next/link'
import SocialShortcuts from '@/components/dashboard/SocialShortcuts'
import { PetSlider } from '@/components/dashboard/PetSlider'
import DashboardSmartCards from './DashboardSmartCards'
import SmartQuestionCard from '@/components/profiling/SmartQuestionCard'
import SmartInsightCard from '@/components/profiling/SmartInsightCard'
import { getPlanDisplayTitle } from '@/lib/plans/utils'
import OnboardingProgressCard from '@/components/OnboardingProgressCard'
import PermissionOnboarding from '@/components/permissions/PermissionOnboarding'

import PetRecommendationsCard from '@/components/dashboard/PetRecommendationsCard'
import PendingInviteModal from '@/components/pets/family/PendingInviteModal'
import WeatherPawAlert from '@/components/dashboard/WeatherPawAlert'
import OdiNoticedWeightCard from '@/components/dashboard/OdiNoticedWeightCard'
import { Stethoscope, Shield, Calendar, Sparkles, ChevronRight, Gift, Scan, Syringe, Bug, Scale, Utensils, Scissors, Activity, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/primitives'

function getAgendaCategoryStyle(item: any) {
  const title = (item.title || item.vaccines?.name || getPlanDisplayTitle(item) || '').toLowerCase()
  const category = (item.category || item.sub_category || item.sub_type || '').toLowerCase()

  if (title.includes('aşı') || title.includes('asi') || title.includes('kuduz') || title.includes('karma') || title.includes('lösemi') || title.includes('bordetella') || category.includes('asi')) {
    return { icon: Syringe, bg: 'bg-blue-100', text: 'text-blue-600', tag: 'Aşı' }
  }
  if (title.includes('parazit') || category.includes('parazit')) {
    return { icon: Bug, bg: 'bg-teal-100', text: 'text-teal-600', tag: 'Parazit' }
  }
  if (title.includes('kilo') || title.includes('boy') || title.includes('tartı') || title.includes('ölçüm')) {
    return { icon: Scale, bg: 'bg-indigo-100', text: 'text-indigo-600', tag: 'Kilo & Ölçüm' }
  }
  if (title.includes('mama') || title.includes('beslenme') || title.includes('öğün') || category.includes('beslenme')) {
    return { icon: Utensils, bg: 'bg-amber-100', text: 'text-amber-600', tag: 'Beslenme' }
  }
  if (title.includes('taram') || title.includes('bakım') || title.includes('banyo') || title.includes('tırnak') || category.includes('bakim')) {
    return { icon: Scissors, bg: 'bg-pink-100', text: 'text-pink-600', tag: 'Bakım' }
  }
  if (title.includes('veteriner') || title.includes('randevu') || title.includes('muayene') || title.includes('klinik')) {
    return { icon: Stethoscope, bg: 'bg-purple-100', text: 'text-purple-600', tag: 'Veteriner' }
  }
  if (title.includes('yürüyüş') || title.includes('egzersiz') || title.includes('oyun') || category.includes('aktivite')) {
    return { icon: Activity, bg: 'bg-orange-100', text: 'text-orange-600', tag: 'Aktivite' }
  }

  return { icon: Sparkles, bg: 'bg-violet-100', text: 'text-violet-600', tag: 'Rutin' }
}

export default function DashboardClient({
  greeting,
  firstName,
  dateStr,
  headerTaskLabel,
  headerTaskTone,
  petsWithStats,
  pets,
  activeQuestion,
  activeInsight,
  upcomingSchedules,
  completedSchedules,
  upcomingEvents,
  activePlans,
  lostReports,
  allWeightLogs,
  journalEntries,
  pendingUserInvites,
}: any) {
  const [activePetId, setActivePetId] = useState(pets[0]?.id)
  const activePet = petsWithStats?.find((p: any) => p.id === activePetId) || pets?.find((p: any) => p.id === activePetId) || pets?.[0]

  // ── ADIM C: Koordinasyon Katmanı & Tekilleştirme ──────────────
  // 1. Sağlık Geçmişi Sihirbazı Koşulu (Sadece activePetId için)
  const isHealthWizardEligible = (pet: any) => {
    if (!pet) return false
    const op = pet.onboarding_progress as any
    const isDone = pet.health_history_status === 'completed' || pet.health_history_status === 'skipped' || op?.vaccine_plan === true
    if (!pet.birth_date || isDone) return false
    const born = new Date(pet.birth_date)
    const now = new Date()
    const ageInMonths = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
    return ageInMonths >= 6
  }

  const showHealthWizardForActivePet = isHealthWizardEligible(activePet)

  // 2. SmartCards içindeki acil durum kişisi ve parazit kart durumları (Sadece activePetId)
  const hasEmergencyContactSmartCard = activePet && (!activePet.sos_contacts || !Array.isArray(activePet.sos_contacts) || activePet.sos_contacts.length === 0)

  const todayDate = new Date()
  todayDate.setHours(0,0,0,0)
  const hasParasiteSmartCard = activePet && upcomingSchedules?.some((s: any) => {
    if (s.pet_id !== activePet.id || s.status === 'done') return false
    const isParasite = (s.title || '').toLowerCase().includes('parazit') || (s.sub_category || '').toLowerCase().includes('parazit')
    if (!isParasite) return false
    const dueDate = new Date(s.due_date)
    dueDate.setHours(0,0,0,0)
    return dueDate <= todayDate
  })

  // 3. Bastırılacak (Suppressed) Onboarding Adımları
  const suppressedOnboardingStepIds: string[] = []
  if (hasEmergencyContactSmartCard) suppressedOnboardingStepIds.push('emergency_contact')
  if (hasParasiteSmartCard) suppressedOnboardingStepIds.push('parasite_first')
  if (showHealthWizardForActivePet) suppressedOnboardingStepIds.push('vaccine_plan')

  return (
    <>
      <PendingInviteModal pendingInvites={pendingUserInvites} />
      <PermissionOnboarding />
      {/* 1. Üst Header / Karşılama */}
      <div className="px-[var(--space-4)] pt-6 pb-1 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-text-primary leading-tight tracking-tight">
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </h1>
          <div className="text-xs text-text-secondary font-medium flex items-center gap-1.5">
            <i className="ti ti-calendar text-primary text-xs" />
            <span>{dateStr}</span>
            <span className="text-text-tertiary">•</span>
            <Badge variant={headerTaskTone === 'overdue' ? 'error' : 'primary'} className="text-2xs">
              {headerTaskLabel}
            </Badge>
          </div>
        </div>
      </div>

      {/* 2. Petlerim Slider */}
      {petsWithStats && petsWithStats.length > 0 && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between px-[var(--space-4)]">
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Petlerim</h2>
            <Link
              id="onb-pet-add"
              href="/owner/pets/add"
              data-testid="add-first-pet-button"
              className="text-xs font-semibold text-primary min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-3 py-1.5 rounded-xl hover:bg-primary/5 active:scale-[0.98] transition-all"
            >
              + Ekle
            </Link>
          </div>
          <PetSlider pets={petsWithStats} onActiveChange={setActivePetId} />
        </div>
      )}

      {/* 3. Bugünkü Odak / Smart Cards */}
      {pets && pets.length > 0 && (
        <div className="px-[var(--space-4)] pt-2 flex flex-col gap-2">
          {activePet && <WeatherPawAlert activePet={activePet} />}
          {activePet && (
            <OdiNoticedWeightCard
              activePet={activePet}
              allWeightLogs={allWeightLogs}
            />
          )}
          <DashboardSmartCards
            pets={pets}
            activePetId={activePetId}
            upcomingSchedules={upcomingSchedules}
            completedSchedules={completedSchedules}
            allWeightLogs={allWeightLogs}
            journalEntries={journalEntries}
            suppressSixMonthAlerts={showHealthWizardForActivePet}
          />
        </div>
      )}

      {/* 4. Ajanda (Yaklaşan Etkinlikler & Aktif Planlar Birleşimi) */}
      <div className="flex flex-col gap-2.5 px-[var(--space-4)] pt-2" id="section-ajanda">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Ajanda</h2>
            {activePet && (
              <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-text-secondary">
                {activePet.name}
              </span>
            )}
          </div>
          <Link
            href="/owner/takvim"
            className="text-xs font-semibold text-primary inline-flex items-center gap-0.5 hover:underline py-1 px-2 rounded-lg hover:bg-primary/5 transition-all"
          >
            <span>Takvime Git</span>
            <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
          </Link>
        </div>

        {(upcomingEvents.length > 0 || activePlans.length > 0) ? (
          <div className="flex flex-col gap-2">
            {/* Etkinlikler */}
            {upcomingEvents.map((event: any) => {
              const eventDate = new Date(event.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
              const title = event.title || event.vaccines?.name || 'Sağlık Takibi'
              const petName = event.pets?.name || 'Pet'
              const petId = event.pet_id || event.pets?.id
              const { icon: ItemIcon, bg, text, tag } = getAgendaCategoryStyle(event)
              const isSelectedPet = activePetId && petId === activePetId

              return (
                <Link
                  key={`event-${event.id}`}
                  href={petId ? `/owner/pets/${petId}?tab=health` : '/owner/takvim'}
                  className={`flex items-center justify-between p-4 rounded-[24px] border bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 ${
                    isSelectedPet ? 'border-primary/30 ring-1 ring-primary/10' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${bg} ${text}`}>
                      <ItemIcon className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-text-primary truncate">{title}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-text-secondary shrink-0">
                          {tag}
                        </span>
                      </div>
                      <p className="text-2xs text-text-secondary font-medium truncate mt-0.5">{petName}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-text-primary">{eventDate}</span>
                    {event.due_time ? (
                      <p className="text-2xs text-text-tertiary mt-0.5">{event.due_time.substring(0, 5)}</p>
                    ) : (
                      <p className="text-2xs text-emerald-600 font-semibold mt-0.5">Yaklaşıyor</p>
                    )}
                  </div>
                </Link>
              )
            })}

            {/* Rutin Planlar */}
            {activePlans.slice(0, 3).map((plan: any) => {
              const dateVal = plan.scheduled_at || plan.next_run
              const planDate = dateVal ? new Date(dateVal).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : 'Belirtilmemiş'
              const title = getPlanDisplayTitle(plan)
              const petName = plan.pets?.name || 'Pet'
              const petId = plan.pet_id || plan.pets?.id
              const { icon: ItemIcon, bg, text, tag } = getAgendaCategoryStyle(plan)
              const isSelectedPet = activePetId && petId === activePetId

              return (
                <Link
                  key={`plan-${plan.id}`}
                  href={petId ? `/owner/pets/${petId}?tab=health` : '/owner/takvim'}
                  className={`flex items-center justify-between p-4 rounded-[24px] border bg-white shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 ${
                    isSelectedPet ? 'border-primary/30 ring-1 ring-primary/10' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${bg} ${text}`}>
                      <ItemIcon className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-text-primary truncate">{title}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-text-secondary shrink-0">
                          {tag}
                        </span>
                      </div>
                      <p className="text-2xs text-text-secondary font-medium truncate mt-0.5">{petName}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-text-primary">{planDate}</span>
                    <p className="text-2xs text-primary font-semibold mt-0.5">Sıradaki Rutin</p>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="p-6 rounded-[24px] border border-dashed border-slate-200 bg-white text-center flex flex-col items-center justify-center">
            <Calendar className="w-8 h-8 text-text-tertiary stroke-[1.5] mb-2" />
            <p className="text-xs text-text-tertiary font-medium">Yakın zamanda planlanmış bir ajanda öğesi yok</p>
            <Link
              href="/owner/plan-yap"
              className="mt-3 text-xs font-bold text-primary inline-flex items-center gap-1 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Rutin veya Plan Oluştur</span>
            </Link>
          </div>
        )}
      </div>

      {/* 4.5. {PetAdı} İçin Öneriler */}
      {activePet && (
        <div className="px-[var(--space-4)] pt-2">
          <PetRecommendationsCard activePet={activePet} />
        </div>
      )}

      {/* 5. Hızlı Erişim (Mobilde 2 sütun · 4 işlem görünür) */}
      {pets && pets.length > 0 && (
        <div className="flex flex-col gap-2 pt-2">
          <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider px-[var(--space-4)]">
            Hızlı Erişim
          </h2>
          <div className="grid grid-cols-2 gap-2 px-[var(--space-4)]">

            {/* AI Vet — Primary */}
            <Link href="/owner/ai-vet" prefetch={false}
              className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-[24px] min-h-[96px] cursor-pointer bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)] hover:border-slate-200 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600">
                <Sparkles className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-text-primary leading-tight">Odi AI Vet</div>
                <div className="text-2xs text-text-secondary mt-0.5 leading-tight">Yapay zeka asistanı</div>
              </div>
            </Link>

            {/* Akıllı Tarama */}
            <Link id="onb-scanner-capture" href="/owner/scanner" prefetch={false}
              className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-[24px] min-h-[96px] cursor-pointer bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)] hover:border-slate-200 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]">
              <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600">
                <Scan className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-text-primary leading-tight">Akıllı Tarama</div>
                <div className="text-2xs text-text-secondary mt-0.5 leading-tight">Fotoğrafla tara</div>
              </div>
            </Link>

            {/* Vet Bul */}
            <Link href="/owner/vets"
              className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-[24px] min-h-[96px] cursor-pointer bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)] hover:border-slate-200 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]">
              <div className="w-11 h-11 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-600">
                <Stethoscope className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-text-primary leading-tight">Vet Bul</div>
                <div className="text-2xs text-text-secondary mt-0.5 leading-tight">En yakın klinik</div>
              </div>
            </Link>

            {/* Rutin Planla */}
            <Link id="onb-plan-add" href="/owner/plan-yap" prefetch={false}
              className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-[24px] min-h-[96px] cursor-pointer bg-white border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)] hover:border-slate-200 hover:scale-[1.02] transition-all duration-200 active:scale-[0.98]">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                <Calendar className="w-5 h-5 stroke-[2]" />
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-text-primary leading-tight">Rutin Planla</div>
                <div className="text-2xs text-text-secondary mt-0.5 leading-tight">Yeni plan oluştur</div>
              </div>
            </Link>

          </div>
        </div>
      )}

      {/* 6. Kurulum Rehberi */}
      {activePetId && (
        <div className="px-[var(--space-4)] pt-1">
          <OnboardingProgressCard
            petId={activePetId}
            petName={activePet?.name || ''}
            suppressStepIds={suppressedOnboardingStepIds}
          />
        </div>
      )}

      {/* 7. Profiling Engine Questions & Insights */}
      {((activeQuestion && activeQuestion.type !== 'weight') || activeInsight) && (
        <div className="px-[var(--space-4)] flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          {activeInsight && <SmartInsightCard insight={activeInsight} />}
          {activeQuestion && activeQuestion.type !== 'weight' && <SmartQuestionCard question={activeQuestion} />}
        </div>
      )}

      {/* 8. Sağlık Geçmişi Sihirbazı Hatırlatıcısı */}
      {showHealthWizardForActivePet && activePet && (
        <div key={`health-wizard-${activePet.id}`} className="px-[var(--space-4)] pt-3 pb-1">
          <Link href={`/owner/plan-yap/asi?pet_id=${activePet.id}&mode=log`} className="block w-full bg-white border border-slate-100 rounded-[24px] p-4 text-left shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)] hover:border-slate-200 transition-all duration-200 active:scale-[0.98]">
            <div className="flex items-start gap-3">
              <i className="ti ti-clock text-xl text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-text-primary">{activePet.name} için sağlık geçmişini ekle</p>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Daha önceki aşılarını sisteme tanıtarak hatırlatıcıların doğru çalışmasını sağlayın. <strong>Sadece 2 dakika sürer.</strong>
                </p>
                <p className="text-xs font-semibold text-primary mt-2">Şimdi Ekle →</p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* 9. Social Shortcuts Grid / SOS Banner */}
      <div className="pt-2">
        <SocialShortcuts lostReportsCount={lostReports.length} />
      </div>

      {/* 10. Davet Et (Mini Banner) */}
      {pets && pets.length > 0 && (
        <div className="px-[var(--space-4)] pt-2">
          <Link href="/owner/referral" className="rounded-[24px] border border-slate-100 bg-white px-4 py-3 flex items-center gap-3 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_-4px_rgba(15,23,42,0.08)] hover:border-slate-200 transition-all duration-200 active:scale-[0.98]">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 stroke-[2] text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-text-primary">Arkadaşını davet et</p>
              <p className="text-2xs text-text-secondary">Bir dostuna öner, o da can dostuna daha iyi baksın</p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
          </Link>
        </div>
      )}
    </>
  )
}

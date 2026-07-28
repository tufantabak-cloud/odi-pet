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

import PetRecommendationsCard from '@/components/dashboard/PetRecommendationsCard'
import PendingInviteModal from '@/components/pets/family/PendingInviteModal'
import { ShieldCheckIcon, BugIcon, ScaleIcon, UtensilsIcon, SparklesIcon, CalendarIcon, StethoscopeIcon } from '@/components/icons/PetIcons'

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
      {/* 1. Üst Header / Karşılama */}
      <div className="px-[var(--space-4)] pt-6 pb-1 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-black text-[var(--color-text-primary)] leading-tight tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-[12px] text-[var(--color-text-secondary)] font-600 flex items-center gap-1.5">
            <i className="ti ti-calendar text-[var(--color-primary)]" style={{ fontSize: '13px' }} />
            <span>{dateStr}</span>
            <span className="text-[var(--color-text-muted)]">•</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-700 ${
              headerTaskTone === 'overdue'
                ? 'bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
                : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
            }`}>
              {headerTaskLabel}
            </span>
          </p>
        </div>
      </div>

      {/* 2. Petlerim (Overlap Tasarım) */}
      {petsWithStats && petsWithStats.length > 0 && (
        <div className="flex flex-col gap-3 pt-2">


          <div className="flex items-center justify-between px-[var(--space-4)]">
            <p className="text-[11px] font-800 text-[var(--color-text-muted)] uppercase tracking-[1.2px]">Petlerim</p>
            <Link href="/owner/pets/add" data-testid="add-first-pet-button" className="text-[12px] font-800 text-[var(--color-primary)]">
              + Ekle
            </Link>
          </div>
          <PetSlider pets={petsWithStats} onActiveChange={setActivePetId} />
        </div>
      )}

      {/* 3. Bugünkü Odak / Smart Cards */}
      {pets && pets.length > 0 && (
        <div className="px-[var(--space-4)] pt-2">
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
                    <ShieldCheckIcon badgeSize="sm" size={18} />
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
                    <SparklesIcon badgeSize="sm" size={18} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-700 text-[var(--color-text-primary)] truncate">{getPlanDisplayTitle(plan)}</p>
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
          <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] text-center">
            <i className="ti ti-calendar-event block mb-1" style={{fontSize: '22px', color: '#cac4d6'}} />
            <p className="text-[11px] text-[var(--color-text-muted)] font-600">Yakın zamanda planlanmış bir ajanda öğesi yok</p>
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
          <p className="text-[11px] font-800 text-[var(--color-text-muted)] uppercase tracking-[0.8px] px-[var(--space-4)]">
            Hızlı Erişim
          </p>
          <div className="grid grid-cols-2 gap-2 px-[var(--space-4)]">

            {/* AI Vet — Primary */}
            <Link href="/owner/ai-vet" prefetch={false}
              className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl min-h-[90px] cursor-pointer bg-white border-[1.5px] border-[#e8e4f8] hover:border-[var(--color-primary)]/30 transition-colors">
              <StethoscopeIcon badgeSize="md" size={20} />
              <div className="text-center">
                <div className="text-[11px] font-800 text-[var(--color-text-primary)] leading-tight">
                  Odi AI Vet
                </div>
                <div className="text-[9px] text-[var(--color-text-muted)] font-500 mt-0.5 leading-tight">
                  Yapay zeka asistanı
                </div>
              </div>
            </Link>

            {/* Akıllı Tarama */}
            <Link href="/owner/scanner" prefetch={false}
              className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl min-h-[90px] cursor-pointer bg-white border-[1.5px] border-[#e8e4f8] hover:border-[var(--color-primary)]/30 transition-colors">
              <ShieldCheckIcon badgeSize="md" size={20} />
              <div className="text-center">
                <div className="text-[11px] font-800 text-[var(--color-text-primary)] leading-tight">
                  Akıllı Tarama
                </div>
                <div className="text-[9px] text-[var(--color-text-muted)] font-500 mt-0.5 leading-tight">
                  Fotoğrafla tara
                </div>
              </div>
            </Link>

            {/* Vet Bul */}
            <Link href="/owner/vets"
              className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl min-h-[90px] cursor-pointer bg-white border-[1.5px] border-[#e8e4f8] hover:border-[var(--color-primary)]/30 transition-colors">
              <StethoscopeIcon badgeSize="md" size={20} />
              <div className="text-center">
                <div className="text-[11px] font-800 text-[var(--color-text-primary)] leading-tight">
                  Vet Bul
                </div>
                <div className="text-[9px] text-[var(--color-text-muted)] font-500 mt-0.5 leading-tight">
                  En yakın klinik
                </div>
              </div>
            </Link>

            {/* Rutin Planla — mobilde de görünür */}
            <Link href="/owner/plan-yap" prefetch={false}
              className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl min-h-[90px] cursor-pointer bg-white border-[1.5px] border-[#e8e4f8] hover:border-[var(--color-primary)]/30 transition-colors">
              <CalendarIcon badgeSize="md" size={20} />
              <div className="text-center">
                <div className="text-[11px] font-800 text-[var(--color-text-primary)] leading-tight">
                  Rutin Planla
                </div>
                <div className="text-[9px] text-[var(--color-text-muted)] font-500 mt-0.5 leading-tight">
                  Yeni plan oluştur
                </div>
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

      {/* 8. Sağlık Geçmişi Sihirbazı Hatırlatıcısı (Yalnızca activePetId için) */}
      {showHealthWizardForActivePet && activePet && (
        <div key={`health-wizard-${activePet.id}`} className="px-[var(--space-4)] pt-3 pb-1">
          <Link href={`/owner/plan-yap/asi?pet_id=${activePet.id}&mode=log`} className="block w-full bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[12px] p-4 text-left hover:bg-[var(--color-surface-2)] transition-colors shadow-sm">
            <div className="flex items-start gap-3">
              <i className="ti ti-clock text-[20px] text-[var(--color-primary)] mt-0.5 shrink-0" />
              <div>
                <p className="text-[14px] font-bold text-[var(--color-text-primary)]">{activePet.name} için sağlık geçmişini ekle</p>
                <p className="text-[12px] text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                  Daha önceki aşılarını sisteme tanıtarak hatırlatıcıların doğru çalışmasını sağlayın. <strong>Sadece 2 dakika sürer.</strong>
                </p>
                <p className="text-[12px] font-bold text-[var(--color-primary)] mt-2">Şimdi Ekle →</p>
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
          <Link href="/owner/referral" className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 flex items-center gap-3 hover:border-[var(--color-primary)]/30 transition-all duration-200">
            <div className="w-8 h-8 bg-[var(--color-primary-soft)] rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="ti ti-gift text-[var(--color-primary)]" style={{ fontSize: '16px' }} />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-800 text-[var(--color-text-primary)]">Arkadaşını davet et</p>
              <p className="text-[10px] text-[var(--color-text-secondary)] font-600">Bir dostuna öner, o da can dostuna daha iyi baksın</p>
            </div>
            <i className="ti ti-chevron-right text-[var(--color-text-muted)]" style={{ fontSize: '14px' }} />
          </Link>
        </div>
      )}
    </>
  )
}

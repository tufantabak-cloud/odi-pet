'use client'

import { useState } from 'react'
import Link from 'next/link'
import SocialShortcuts from '@/components/dashboard/SocialShortcuts'
import { PetSlider } from '@/components/dashboard/PetSlider'
import DashboardSmartCards from './DashboardSmartCards'
import SmartQuestionCard from '@/components/profiling/SmartQuestionCard'
import SmartInsightCard from '@/components/profiling/SmartInsightCard'

export default function DashboardClient({
  greeting,
  firstName,
  dateStr,
  activeTasksCount,
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
  journalEntries
}: any) {
  const [activePetId, setActivePetId] = useState(pets[0]?.id)
  const activePet = petsWithStats.find((p: any) => p.id === activePetId)

  return (
    <>
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
            <span className="bg-[var(--color-primary-soft)] text-[var(--color-primary)] px-1.5 py-0.5 rounded text-[10px] font-700">
              {activeTasksCount} Aktif Görev
            </span>
          </p>
        </div>
      </div>

      {/* 2. Petlerim (Overlap Tasarım) */}
      {petsWithStats && petsWithStats.length > 0 && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between px-[var(--space-4)]">
            <p className="text-[11px] font-800 text-[var(--color-text-muted)] uppercase tracking-[1.2px]">Petlerim</p>
            <Link href="/owner/pets/add" className="text-[12px] font-800 text-[var(--color-primary)]">
              + Ekle
            </Link>
          </div>
          <PetSlider pets={petsWithStats} onActiveChange={setActivePetId} />
        </div>
      )}

      {/* 3. Hızlı Erişim */}
      {pets && pets.length > 0 && (
        <div className="flex flex-col gap-2 pt-2">
          <p className="text-[11px] font-800 text-[var(--color-text-muted)] uppercase tracking-[0.8px] px-[var(--space-4)]">
            Hızlı Erişim
          </p>
          <div className="grid grid-cols-3 gap-2 px-[var(--space-4)]">
            
            {/* AI Vet — Primary */}
            <Link href="/owner/ai-vet"
              className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl min-h-[90px] cursor-pointer bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] transition-colors">
              <div className="w-[38px] h-[38px] rounded-[10px] bg-white/20 flex items-center justify-center">
                <i className="ti ti-robot text-white text-[20px]" />
              </div>
              <div className="text-center">
                <div className="text-[11px] font-800 text-white leading-tight">
                  Odi AI Vet
                </div>
                <div className="text-[9px] text-white/70 font-500 mt-0.5 leading-tight">
                  Yapay zeka asistanı
                </div>
              </div>
            </Link>

            {/* Vet Bul — Secondary */}
            <Link href="/owner/vets"
              className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl min-h-[90px] cursor-pointer bg-white border-[1.5px] border-[#e8e4f8] hover:border-[var(--color-primary)]/30 transition-colors">
              <div className="w-[38px] h-[38px] rounded-[10px] bg-[var(--color-danger)]/10 flex items-center justify-center">
                <i className="ti ti-stethoscope text-[20px] text-[var(--color-danger)]" />
              </div>
              <div className="text-center">
                <div className="text-[11px] font-800 text-[var(--color-text-primary)] leading-tight">
                  Vet Bul
                </div>
                <div className="text-[9px] text-[var(--color-text-muted)] font-500 mt-0.5 leading-tight">
                  En yakın klinik
                </div>
              </div>
            </Link>

            {/* Akıllı Tarama — Tertiary */}
            <Link href="/owner/scanner"
              className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl min-h-[90px] cursor-pointer bg-white border-[1.5px] border-[#e8e4f8] hover:border-[var(--color-primary)]/30 transition-colors">
              <div className="w-[38px] h-[38px] rounded-[10px] bg-[var(--color-success)]/10 flex items-center justify-center">
                <i className="ti ti-scan text-[20px] text-[var(--color-success)]" />
              </div>
              <div className="text-center">
                <div className="text-[11px] font-800 text-[var(--color-text-primary)] leading-tight">
                  Akıllı Tarama
                </div>
                <div className="text-[9px] text-[var(--color-text-muted)] font-500 mt-0.5 leading-tight">
                  Fotoğrafla tara
                </div>
              </div>
            </Link>

          </div>
        </div>
      )}

      {/* 3. Profiling Engine Questions & Insights */}
      {((activeQuestion && activeQuestion.type !== 'weight') || activeInsight) && (
        <div className="px-[var(--space-4)] flex flex-col gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
          {activeInsight && <SmartInsightCard insight={activeInsight} />}
          {activeQuestion && activeQuestion.type !== 'weight' && <SmartQuestionCard question={activeQuestion} />}
        </div>
      )}

      {/* 5. Smart Cards */}
      {pets && pets.length > 0 && (
        <div className="px-[var(--space-4)] pt-2">
          <DashboardSmartCards
            pets={pets}
            activePetId={activePetId}
            upcomingSchedules={upcomingSchedules}
            completedSchedules={completedSchedules}
            allWeightLogs={allWeightLogs}
            journalEntries={journalEntries}
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
                    <div className="w-9 h-9 rounded-xs flex items-center justify-center shrink-0"
                         style={{background: 'rgba(255,107,107,0.12)'}}>
                      <i className="ti ti-vaccine" style={{fontSize: '17px', color: 'var(--color-danger)'}} />
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
                    <div className="w-9 h-9 rounded-xs flex items-center justify-center shrink-0"
                         style={{background: 'rgba(93,63,211,0.12)'}}>
                      <i className="ti ti-refresh" style={{fontSize: '17px', color: 'var(--color-primary)'}} />
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
          <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-dashed border-[var(--color-border)] text-center">
            <i className="ti ti-calendar-event block mb-1" style={{fontSize: '22px', color: '#cac4d6'}} />
            <p className="text-[11px] text-[var(--color-text-muted)] font-600">Yakın zamanda planlanmış bir ajanda öğesi yok</p>
          </div>
        )}
      </div>

      {/* Social Shortcuts Grid / SOS Banner */}
      <div className="pt-2">
        <SocialShortcuts lostReportsCount={lostReports.length} />
      </div>

      {/* 8. Davet Et (Mini Banner) */}
      {pets && pets.length > 0 && (
        <div className="px-[var(--space-4)] pt-2">
          <Link href="/owner/referral" className="rounded-card border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 flex items-center gap-3 hover:border-[var(--color-primary)]/30 transition-all duration-200">
            <div className="w-8 h-8 bg-[var(--color-primary-soft)] rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="ti ti-gift text-[var(--color-primary)]" style={{ fontSize: '16px' }} />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-800 text-[var(--color-text-primary)]">Arkadaşını davet et</p>
              <p className="text-[10px] text-[var(--color-text-secondary)] font-600">Her davet için 1 ay ücretsiz premium</p>
            </div>
            <i className="ti ti-chevron-right text-[var(--color-text-muted)]" style={{ fontSize: '14px' }} />
          </Link>
        </div>
      )}
    </>
  )
}

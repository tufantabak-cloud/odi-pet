'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics/track'
import {
  saveSetupMode,
  generateSchedule,
  markVaccineDone,
  skipVaccine,
} from './actions'

// ── Types ──────────────────────────────────────────────────────
type Pet = { id: string; name: string; species: string; birth_date: string | null; avatar_url?: string }
type Template = { id: string; vaccine_code: string; vaccine_name: string; mandatory_level: string; dose_number: number; min_age_weeks: number; interval_days: number | null; recurrence_type: string; protects_against: string[] }
type VRecord = { id: string; pet_id: string; vaccine_code: string; vaccine_name: string; dose_number: number | null; status: string; administered_at: string | null; due_at: string | null; source: string; confidence_level: string; notes: string | null }
type SetupProfile = { id: string; pet_id: string; setup_mode: string } | null

const STATUS_ICON: Record<string, string> = {
  completed: '✅', due: '⏳', scheduled: '🔜', overdue: '🔴', skipped: '⏭️', invalid: '❌', needs_review: '🔍',
}
const STATUS_LABEL: Record<string, string> = {
  completed: 'Yapıldı', due: 'Sırası Geldi', scheduled: 'Planlandı', overdue: 'Gecikti', skipped: 'Atlandı', invalid: 'Geçersiz', needs_review: 'İncelenmeli',
}
const LEVEL_BADGE: Record<string, string> = {
  legal_required: 'bg-red-100 text-red-700 border-red-200',
  core: 'bg-blue-100 text-blue-700 border-blue-200',
  optional: 'bg-gray-100 text-gray-600 border-gray-200',
}
const LEVEL_LABEL: Record<string, string> = {
  legal_required: 'Yasal Zorunlu', core: 'Temel', optional: 'Opsiyonel',
}

// ── Setup Flow ─────────────────────────────────────────────────
function SetupFlow({ pet, templates, onComplete }: { pet: Pet; templates: Template[]; onComplete: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<'mode' | 'warning' | 'processing'>('mode')
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showWarning, setShowWarning] = useState(false)

  const modes = [
    { id: 'smart_start', icon: '🧬', title: 'Akıllı Başlangıç', desc: 'Doğum tarihine göre standart takvim oluştur.' },
    { id: 'historical_import', icon: '📋', title: 'Geçmiş Kayıtlarım Var', desc: 'Eski aşı kayıtlarını manuel eklemek istiyorum.' },
    { id: 'fresh_start', icon: '🌱', title: 'Bugünden Başla', desc: 'Geçmişi dikkate alma, bundan sonrası için plan oluştur.' },
  ]

  function handleSelect(mode: string) {
    setSelectedMode(mode)
    if (mode === 'fresh_start') setShowWarning(true)
    else setShowWarning(false)
  }

  function handleConfirm() {
    if (!selectedMode) return
    setStep('processing')
    startTransition(async () => {
      await saveSetupMode(pet.id, selectedMode as any)
      await generateSchedule(pet.id, selectedMode as any)
      trackEvent('vaccine_setup_mode_selected', { pet_id: pet.id, mode: selectedMode })
      trackEvent('vaccine_schedule_generated', { pet_id: pet.id, mode: selectedMode })
      router.refresh()
      onComplete()
    })
  }

  if (step === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-[14px] text-text-secondary font-medium">Aşı takvimi oluşturuluyor...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto pt-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-[20px] flex items-center justify-center text-[36px] mx-auto mb-4">💉</div>
        <h2 className="text-[22px] font-extrabold text-text-primary">Aşı Planını Başlat</h2>
        <p className="text-[14px] text-text-secondary mt-1">{pet.name} için aşı takip sistemini nasıl kurmak istersiniz?</p>
      </div>

      <div className="flex flex-col gap-3">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => handleSelect(m.id)}
            className={`text-left p-5 rounded-2xl border-2 transition-all ${selectedMode === m.id ? 'border-primary bg-primary/5' : 'border-border-main bg-surface hover:border-primary/40'}`}
          >
            <div className="flex items-start gap-4">
              <span className="text-[28px] shrink-0">{m.icon}</span>
              <div>
                <p className={`font-extrabold text-[15px] ${selectedMode === m.id ? 'text-primary' : 'text-text-primary'}`}>{m.title}</p>
                <p className="text-[13px] text-text-secondary mt-0.5">{m.desc}</p>
              </div>
              {selectedMode === m.id && (
                <div className="ml-auto w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-[12px] shrink-0">✓</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {showWarning && (
        <div className="p-4 bg-warning/10 border border-warning/30 rounded-2xl flex items-start gap-3">
          <span className="text-[20px]">⚠️</span>
          <p className="text-[13px] text-warning font-medium leading-relaxed">
            Bu plan geçmiş aşı geçmişini doğrulamaz. Sadece bugünden sonrası için oluşturulur.
          </p>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!selectedMode || isPending}
        className="btn-primary py-4 text-[15px] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? 'Oluşturuluyor...' : 'Takvimi Oluştur →'}
      </button>
    </div>
  )
}

// ── Quick Mark Modal ───────────────────────────────────────────
function QuickMarkModal({ record, onClose, onDone }: { record: VRecord; onClose: () => void; onDone: () => void }) {
  const [dateMode, setDateMode] = useState<'today' | 'custom'>('today')
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0])
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    const date = dateMode === 'today' ? new Date().toISOString() : new Date(customDate).toISOString()
    startTransition(async () => {
      await markVaccineDone(record.id, date, 'user_quick_marked')
      trackEvent('vaccine_quick_marked', { record_id: record.id, vaccine_code: record.vaccine_code })
      onDone()
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-[28px] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-[18px] font-extrabold text-text-primary mb-1">{record.vaccine_name}</h3>
        <p className="text-[13px] text-text-secondary mb-5">Aşı ne zaman yapıldı?</p>
        <div className="flex flex-col gap-3 mb-5">
          {[{ id: 'today', label: 'Bugün yapıldı' }, { id: 'custom', label: 'Farklı tarih seç' }].map(opt => (
            <button key={opt.id} onClick={() => setDateMode(opt.id as any)}
              className={`py-3 px-4 rounded-xl border-2 text-left font-bold text-[14px] transition-all ${dateMode === opt.id ? 'border-primary bg-primary/5 text-primary' : 'border-border-main text-text-secondary'}`}>
              {opt.label}
            </button>
          ))}
          {dateMode === 'custom' && (
            <input type="date" className="input-base" value={customDate} onChange={e => setCustomDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border-main text-text-secondary font-bold">İptal</button>
          <button onClick={handleConfirm} disabled={isPending} className="flex-1 btn-primary py-3 disabled:opacity-40">
            {isPending ? '...' : 'Kaydet ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
export default function VaccineOSClient({ pet, setupProfile, vaccineRecords, templates }: {
  pet: Pet; setupProfile: SetupProfile; vaccineRecords: VRecord[]; templates: Template[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'records' | 'settings'>('overview')
  const [setupDone, setSetupDone] = useState(!!setupProfile)
  const [quickMarkRecord, setQuickMarkRecord] = useState<VRecord | null>(null)
  const [isPending, startTransition] = useTransition()

  function refreshData() {
    router.refresh()
    setQuickMarkRecord(null)
  }

  // Computed stats
  const overdueCount = vaccineRecords.filter(r => r.status === 'overdue').length
  const completedCount = vaccineRecords.filter(r => r.status === 'completed').length
  const dueRecords = vaccineRecords.filter(r => r.status === 'due' || r.status === 'scheduled')
    .sort((a, b) => new Date(a.due_at || '').getTime() - new Date(b.due_at || '').getTime())
  const nextDue = dueRecords[0]

  const TABS = [
    { id: 'overview', label: 'Genel Bakış', icon: '🏠' },
    { id: 'schedule', label: 'Takvim', icon: '📅' },
    { id: 'records', label: 'Kayıtlar', icon: '📋' },
    { id: 'settings', label: 'Ayarlar', icon: '⚙️' },
  ] as const

  // ── Render: NOT SETUP ──
  if (!setupDone) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary mb-6">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          {pet.name}
        </Link>
        <SetupFlow pet={pet} templates={templates} onComplete={() => setSetupDone(true)} />
      </div>
    )
  }

  // ── Render: MAIN UI ──
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-20 flex flex-col gap-5">
      {quickMarkRecord && (
        <QuickMarkModal record={quickMarkRecord} onClose={() => setQuickMarkRecord(null)} onDone={refreshData} />
      )}

      {/* Back */}
      <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary -mb-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        {pet.name}
      </Link>

      {/* Header */}
      <div className="card-base overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-violet-500" />
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-[24px]">💉</div>
            <div>
              <h1 className="text-[20px] font-extrabold text-text-primary">Aşı Takvimi</h1>
              <p className="text-[13px] text-text-secondary">{pet.name} • {setupProfile?.setup_mode === 'smart_start' ? 'Akıllı Başlangıç' : setupProfile?.setup_mode === 'fresh_start' ? 'Bugünden Başla' : 'Geçmiş İçe Aktarma'}</p>
            </div>
          </div>
          {overdueCount > 0 && (
            <span className="bg-error/10 text-error text-[12px] font-black px-3 py-1.5 rounded-full border border-error/20">
              ⚠ {overdueCount} Gecikmiş
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tamamlandı', value: completedCount, color: 'text-success' },
          { label: 'Bekleyen', value: dueRecords.length, color: 'text-warning' },
          { label: 'Gecikmiş', value: overdueCount, color: 'text-error' },
        ].map(s => (
          <div key={s.label} className="card-base p-4 text-center">
            <p className={`text-[26px] font-black ${s.color}`}>{s.value}</p>
            <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wide mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Next due banner */}
      {nextDue && (
        <div className="card-base p-4 flex items-center justify-between gap-3 border-l-4 border-l-primary">
          <div className="flex items-center gap-3">
            <span className="text-[22px]">💉</span>
            <div>
              <p className="text-[13px] font-black text-text-secondary uppercase tracking-wider">Sonraki Aşı</p>
              <p className="font-extrabold text-text-primary text-[15px]">{nextDue.vaccine_name}</p>
              {nextDue.due_at && (
                <p className="text-[12px] text-text-secondary">{new Date(nextDue.due_at).toLocaleDateString('tr-TR')}</p>
              )}
            </div>
          </div>
          <button onClick={() => setQuickMarkRecord(nextDue)} className="btn-primary text-[13px] py-2 px-4 shrink-0">
            Yapıldı ✓
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-bg-main border border-border-main rounded-2xl p-1 gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === t.id ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
            <span>{t.icon}</span><span className="hidden sm:block">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-4">
          {overdueCount > 0 && (
            <div className="p-4 bg-error/5 border border-error/20 rounded-2xl flex items-start gap-3">
              <span className="text-[22px]">🔴</span>
              <div>
                <p className="font-bold text-error text-[14px]">{overdueCount} aşı gecikmiş durumda</p>
                <p className="text-[12px] text-text-secondary mt-0.5">Bu aşıları en kısa sürede yaptırmanız önerilir.</p>
              </div>
            </div>
          )}
          {dueRecords.slice(0, 3).map(r => (
            <div key={r.id} className="card-base p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-[20px]">{STATUS_ICON[r.status] ?? '📌'}</span>
                <div>
                  <p className="font-bold text-text-primary text-[14px]">{r.vaccine_name}</p>
                  {r.due_at && <p className="text-[12px] text-text-secondary">{new Date(r.due_at).toLocaleDateString('tr-TR')}</p>}
                </div>
              </div>
              <button onClick={() => setQuickMarkRecord(r)} className="text-[12px] font-bold text-primary hover:underline shrink-0">Yapıldı</button>
            </div>
          ))}
          {dueRecords.length === 0 && completedCount > 0 && (
            <div className="card-base p-8 text-center">
              <p className="text-[32px] mb-2">🎉</p>
              <p className="font-extrabold text-text-primary text-[16px]">Tüm aşılar güncel!</p>
              <p className="text-[13px] text-text-secondary mt-1">Bekleyen aşı işlemi bulunmuyor.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: SCHEDULE ── */}
      {activeTab === 'schedule' && (
        <div className="flex flex-col gap-3">
          {vaccineRecords.length === 0 ? (
            <div className="card-base p-8 text-center text-text-secondary">Henüz planlanmış aşı bulunmuyor.</div>
          ) : vaccineRecords.map((r, i) => {
            const isLocked = r.status === 'scheduled' && i > 0 && vaccineRecords[i - 1]?.status !== 'completed'
            return (
              <div key={r.id} className={`card-base p-4 flex items-center gap-4 ${isLocked ? 'opacity-50' : ''}`}>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className="text-[22px]">{isLocked ? '🔒' : STATUS_ICON[r.status] ?? '📌'}</span>
                  {i < vaccineRecords.length - 1 && <div className="w-0.5 h-6 bg-border-main" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-[14px] truncate ${r.status === 'completed' ? 'text-success' : 'text-text-primary'}`}>{r.vaccine_name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.status === 'completed' ? 'bg-success/10 text-success border-success/20' : r.status === 'overdue' ? 'bg-error/10 text-error border-error/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    {r.due_at && <span className="text-[11px] text-text-secondary">{new Date(r.due_at).toLocaleDateString('tr-TR')}</span>}
                    {r.administered_at && <span className="text-[11px] text-success">Yapıldı: {new Date(r.administered_at).toLocaleDateString('tr-TR')}</span>}
                  </div>
                </div>
                {!isLocked && r.status !== 'completed' && (
                  <button onClick={() => setQuickMarkRecord(r)} className="shrink-0 text-[12px] font-bold text-primary hover:underline">Yapıldı</button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── TAB: RECORDS ── */}
      {activeTab === 'records' && (
        <div className="flex flex-col gap-3">
          {vaccineRecords.filter(r => r.status === 'completed').length === 0 ? (
            <div className="card-base p-8 text-center text-text-secondary">Henüz tamamlanan aşı kaydı yok.</div>
          ) : vaccineRecords.filter(r => r.status === 'completed').map(r => (
            <div key={r.id} className="card-base p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-text-primary text-[14px]">{r.vaccine_name}</p>
                  {r.administered_at && <p className="text-[12px] text-success mt-0.5">✓ {new Date(r.administered_at).toLocaleDateString('tr-TR')}</p>}
                  <p className="text-[11px] text-text-secondary mt-1 capitalize">{r.confidence_level === 'verified' ? 'Onaylı kayıt' : r.confidence_level === 'user_reported' ? 'Kullanıcı beyanı' : 'Tahmini'}</p>
                </div>
                <span className="text-[11px] bg-success/10 text-success border border-success/20 px-2 py-1 rounded-full font-bold">Tamamlandı</span>
              </div>
              {r.notes && <p className="text-[12px] text-text-secondary mt-2 p-2 bg-bg-main rounded-lg">{r.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: SETTINGS ── */}
      {activeTab === 'settings' && (
        <div className="flex flex-col gap-4">
          <div className="card-base p-5">
            <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-4">Plan Bilgisi</h3>
            <div className="flex items-center justify-between p-3 bg-bg-main rounded-xl border border-border-main">
              <div>
                <p className="font-bold text-text-primary text-[14px]">Başlangıç Modu</p>
                <p className="text-[12px] text-text-secondary">{setupProfile?.setup_mode === 'smart_start' ? 'Akıllı Başlangıç' : setupProfile?.setup_mode === 'fresh_start' ? 'Bugünden Başla' : 'Geçmiş İçe Aktarma'}</p>
              </div>
              <span className="text-[22px]">{setupProfile?.setup_mode === 'smart_start' ? '🧬' : setupProfile?.setup_mode === 'fresh_start' ? '🌱' : '📋'}</span>
            </div>
          </div>
          <div className="card-base p-5">
            <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-4">Tehlikeli Alan</h3>
            <p className="text-[13px] text-text-secondary mb-4">Aşı planını sıfırlarsanız tüm planlanmış kayıtlar silinir. Tamamlanan kayıtlar korunur.</p>
            <button
              onClick={() => {
                if (confirm('Aşı planını sıfırlamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
                  startTransition(async () => {
                    // Reset setup profile to force re-setup
                    await saveSetupMode(pet.id, 'smart_start')
                    setSetupDone(false)
                    router.refresh()
                  })
                }
              }}
              disabled={isPending}
              className="w-full py-3 rounded-xl border-2 border-error/40 text-error font-bold text-[14px] hover:bg-error/5 transition-colors disabled:opacity-40"
            >
              Planı Sıfırla
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

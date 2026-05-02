'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics/track'
import {
  saveSetupMode,
  generateSchedule,
  markVaccineDone,
  skipVaccine,
  postponeVaccine,
  deleteVaccineRecord,
  addManualVaccine,
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

// ── Vaccine Action Modal (2 yol) ───────────────────────────────
function VaccineActionModal({ record, allRecords, onClose, onDone }: { record: VRecord; allRecords: VRecord[]; onClose: () => void; onDone: () => void }) {
  const [path, setPath] = useState<'choose' | 'quick' | 'detailed'>('choose')
  const [dateMode, setDateMode] = useState<'today' | 'custom'>('today')
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0])
  const [isPending, startTransition] = useTransition()

  // Detailed form fields
  const [detailDate, setDetailDate] = useState(new Date().toISOString().split('T')[0])
  const [clinicName, setClinicName] = useState('')
  const [vetName, setVetName] = useState('')
  const [brand, setBrand] = useState('')
  const [batchNo, setBatchNo] = useState('')
  const [notes, setNotes] = useState('')

  function handleQuickConfirm() {
    const date = dateMode === 'today' ? new Date().toISOString() : new Date(customDate).toISOString()
    startTransition(async () => {
      await markVaccineDone(record.id, date, 'user_quick_marked')
      trackEvent('vaccine_quick_marked', { record_id: record.id, vaccine_code: record.vaccine_code })
      onDone()
    })
  }

  function handleDetailedConfirm() {
    if (!detailDate) return
    const notesFull = [
      clinicName ? `Klinik: ${clinicName}` : '',
      vetName ? `Veteriner: ${vetName}` : '',
      brand ? `Marka: ${brand}` : '',
      batchNo ? `Seri No: ${batchNo}` : '',
      notes ? notes : '',
    ].filter(Boolean).join(' | ')

    startTransition(async () => {
      await markVaccineDone(record.id, new Date(detailDate).toISOString(), 'user_detailed', notesFull)
      trackEvent('vaccine_detailed_logged', { record_id: record.id, vaccine_code: record.vaccine_code, has_clinic: !!clinicName, has_batch: !!batchNo })
      onDone()
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border-main">
          <p className="text-[12px] font-black text-text-secondary uppercase tracking-widest mb-0.5">Aşı Kaydı</p>
          <h3 className="text-[17px] font-extrabold text-text-primary leading-snug">{record.vaccine_name}</h3>
        </div>

        {/* ── CHOOSE PATH ── */}
        {path === 'choose' && (
          <div className="p-6 flex flex-col gap-3">
            <p className="text-[13px] text-text-secondary mb-1">Nasıl kaydetmek istersiniz?</p>
            <button onClick={() => setPath('quick')}
              className="flex items-start gap-4 p-4 rounded-2xl border-2 border-border-main hover:border-primary/50 hover:bg-primary/5 text-left transition-all group">
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center text-[20px] shrink-0">⚡</div>
              <div>
                <p className="font-extrabold text-text-primary text-[14px] group-hover:text-primary">Hızlı Onay</p>
                <p className="text-[12px] text-text-secondary mt-0.5">Tarih seç, hemen kaydet. Detay gerekmez.</p>
              </div>
            </button>
            <button onClick={() => setPath('detailed')}
              className="flex items-start gap-4 p-4 rounded-2xl border-2 border-border-main hover:border-primary/50 hover:bg-primary/5 text-left transition-all group">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-[20px] shrink-0">📋</div>
              <div>
                <p className="font-extrabold text-text-primary text-[14px] group-hover:text-primary">Detaylı Kayıt</p>
                <p className="text-[12px] text-text-secondary mt-0.5">Klinik, veteriner, marka, seri no, notlar.</p>
              </div>
            </button>
            <button onClick={onClose} className="mt-1 text-center text-[13px] text-text-secondary font-medium hover:text-text-primary py-2">
              İptal
            </button>
          </div>
        )}

        {/* ── QUICK PATH ── */}
        {path === 'quick' && (
          <div className="p-6 flex flex-col gap-4">
            <button onClick={() => setPath('choose')} className="flex items-center gap-1.5 text-[12px] text-text-secondary hover:text-primary font-bold -mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              Geri
            </button>
            <p className="text-[13px] font-bold text-text-secondary">Aşı ne zaman yapıldı?</p>
            <div className="flex flex-col gap-2">
              {[{ id: 'today', label: '✓ Bugün yapıldı' }, { id: 'custom', label: '📅 Farklı tarih seç' }].map(opt => (
                <button key={opt.id} onClick={() => setDateMode(opt.id as any)}
                  className={`py-3 px-4 rounded-xl border-2 text-left font-bold text-[14px] transition-all ${dateMode === opt.id ? 'border-primary bg-primary/5 text-primary' : 'border-border-main text-text-secondary'}`}>
                  {opt.label}
                </button>
              ))}
              {dateMode === 'custom' && (
                <input type="date" className="input-base" value={customDate} onChange={e => setCustomDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
              )}
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mt-1 flex flex-col gap-2">
              <p className="text-[12px] text-primary font-medium leading-relaxed">
                💡 <span className="font-bold">Bilgi:</span> Bu onayı verdiğinizde serinin varsa önceki dozları tamamlanmış sayılır.
              </p>
              {(() => {
                const nextDose = allRecords
                  .filter(r => r.vaccine_code === record.vaccine_code && r.dose_number > record.dose_number)
                  .sort((a, b) => a.dose_number - b.dose_number)[0]
                if (!nextDose) return null
                return (
                  <div className="pt-2 border-t border-primary/10 mt-1">
                    <p className="text-[12px] text-primary font-medium">
                      Bir sonraki doz (<span className="font-bold">{nextDose.vaccine_name}</span>) otomatik olarak <span className="font-bold">{new Date(nextDose.due_at || '').toLocaleDateString('tr-TR')}</span> tarihine planlanacaktır.
                    </p>
                  </div>
                )
              })()}
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border-main text-text-secondary font-bold text-[14px]">İptal</button>
              <button onClick={handleQuickConfirm} disabled={isPending}
                className="flex-1 btn-primary py-3 disabled:opacity-40 text-[14px]">
                {isPending ? '...' : 'Kaydet ✓'}
              </button>
            </div>
          </div>
        )}

        {/* ── DETAILED PATH ── */}
        {path === 'detailed' && (
          <div className="p-6 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <button onClick={() => setPath('choose')} className="flex items-center gap-1.5 text-[12px] text-text-secondary hover:text-primary font-bold -mb-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              Geri
            </button>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Tarih *</label>
              <input type="date" className="input-base" value={detailDate} onChange={e => setDetailDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Klinik / Hastane</label>
              <input type="text" className="input-base" placeholder="Örn: Beşiktaş Veteriner Kliniği" value={clinicName} onChange={e => setClinicName(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Veteriner Adı</label>
              <input type="text" className="input-base" placeholder="Örn: Dr. Ayşe Kaya" value={vetName} onChange={e => setVetName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Marka / Üretici</label>
                <input type="text" className="input-base" placeholder="Örn: Nobivac" value={brand} onChange={e => setBrand(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Seri / Lot No</label>
                <input type="text" className="input-base" placeholder="Örn: A2024B" value={batchNo} onChange={e => setBatchNo(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Notlar</label>
              <textarea className="input-base resize-none" rows={3} placeholder="Yan etki, reaksiyon, ek bilgi..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border-main text-text-secondary font-bold text-[14px]">İptal</button>
              <button onClick={handleDetailedConfirm} disabled={isPending || !detailDate}
                className="flex-1 btn-primary py-3 disabled:opacity-40 text-[14px]">
                {isPending ? '...' : 'Kaydet ✓'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Postpone Modal ─────────────────────────────────────────────
function PostponeModal({ record, onClose, onDone }: { record: VRecord; onClose: () => void; onDone: () => void }) {
  const [days, setDays] = useState(7)
  const [isPending, startTransition] = useTransition()
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-border-main">
          <p className="text-[11px] font-black text-warning uppercase tracking-widest">⚠️ Ertele</p>
          <h3 className="text-[17px] font-extrabold text-text-primary">{record.vaccine_name}</h3>
          <p className="text-[12px] text-text-secondary mt-1">Care Score -5 puan uygulanacak.</p>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <p className="text-[13px] font-bold text-text-secondary">Kaç gün ertelensin?</p>
          <div className="grid grid-cols-3 gap-2">
            {[7, 14, 30].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`py-3 rounded-xl border-2 font-black text-[14px] transition-all ${days === d ? 'border-warning bg-warning/10 text-warning' : 'border-border-main text-text-secondary'}`}>
                {d} gün
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border-main text-text-secondary font-bold">İptal</button>
            <button onClick={() => startTransition(async () => { await postponeVaccine(record.id, days); onDone() })}
              disabled={isPending}
              className="flex-1 py-3 rounded-xl bg-warning/10 text-warning border-2 border-warning/30 font-black disabled:opacity-40">
              {isPending ? '...' : `+${days} Gün Ertele`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Manual Vaccine Modal ────────────────────────────────────────
function ManualVaccineModal({ petId, onClose, onDone }: { petId: string; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<'plan' | 'record'>('record')
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [clinic, setClinic] = useState('')
  const [vet, setVet] = useState('')
  const [brand, setBrand] = useState('')
  const [batchNo, setBatchNo] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleSave() {
    if (!name.trim()) { setError('Aşı adı zorunludur.'); return }
    if (!date) { setError('Tarih zorunludur.'); return }
    setError('')
    startTransition(async () => {
      await addManualVaccine(petId, {
        vaccine_name: name,
        due_at: new Date(date).toISOString(),
        administered_at: mode === 'record' ? new Date(date).toISOString() : undefined,
        vet_name: vet || undefined,
        clinic: clinic || undefined,
        brand: brand || undefined,
        batch_no: batchNo || undefined,
        notes: notes || undefined,
        amount: amount ? parseFloat(amount) : undefined,
      })
      onDone()
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-border-main">
          <p className="text-[11px] font-black text-primary uppercase tracking-widest">➕ Manuel Aşı Ekle</p>
          <p className="text-[12px] text-text-secondary mt-1">Protokol dışı aşı veya plan oluştur.</p>
        </div>
        <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* Mode */}
          <div className="grid grid-cols-2 gap-2">
            {[{ id:'record', label:'✅ Yapıldı Kaydı' }, { id:'plan', label:'📅 Planlama' }].map(m => (
              <button key={m.id} onClick={() => setMode(m.id as any)}
                className={`py-2.5 rounded-xl border-2 font-bold text-[13px] transition-all ${mode === m.id ? 'border-primary bg-primary/5 text-primary' : 'border-border-main text-text-secondary'}`}>
                {m.label}
              </button>
            ))}
          </div>
          {error && <p className="text-[12px] text-error font-bold">{error}</p>}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Aşı Adı *</label>
            <input className="input-base" placeholder="Örn: Parazit, Karma Aşı..." value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">{mode === 'record' ? 'Yapıldığı Tarih *' : 'Planlanan Tarih *'}</label>
            <input type="date" className="input-base" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          {mode === 'record' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Klinik</label>
                  <input className="input-base" placeholder="Klinik adı" value={clinic} onChange={e => setClinic(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Veteriner</label>
                  <input className="input-base" placeholder="Dr. ..." value={vet} onChange={e => setVet(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Marka</label>
                  <input className="input-base" placeholder="Nobivac..." value={brand} onChange={e => setBrand(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Seri No</label>
                  <input className="input-base" placeholder="Lot..." value={batchNo} onChange={e => setBatchNo(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Ücret (₺)</label>
                <input type="number" className="input-base" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
            </>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Notlar</label>
            <textarea className="input-base resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border-main text-text-secondary font-bold">İptal</button>
            <button onClick={handleSave} disabled={isPending}
              className="flex-1 btn-primary py-3 disabled:opacity-40">
              {isPending ? '...' : 'Kaydet ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Protocol Table Component ───────────────────────────────────
function ProtocolTable({ pet, templates, records, onCellClick }: { pet: Pet; templates: Template[]; records: VRecord[]; onCellClick?: (record: VRecord) => void }) {
  const isDog = pet.species.toLowerCase() === 'köpek' || pet.species.toLowerCase() === 'dog'

  const baseProtocols = isDog ? [
    { code: 'PUPPY_DP', annualCode: null },
    { code: 'DHPPI', annualCode: 'DHPPI_Y' },
    { code: 'LEPTO', annualCode: 'LEPTO_Y' },
    { code: 'RABIES', annualCode: 'RABIES' },
    { code: 'BORDET', annualCode: 'BORDET_Y' },
    { code: 'CCV', annualCode: 'CCV_Y' }
  ] : [
    { code: 'FVRCP', annualCode: 'FVRCP_Y' },
    { code: 'FELV', annualCode: 'FELV_Y' },
    { code: 'RABIES_CAT', annualCode: 'RABIES_CAT' }
  ];

  // Kullanıcının oluşturduğu özel şablonları matrise dahil et
  templates.filter(t => t.vaccine_code.startsWith('CUSTOM_')).forEach(ct => {
    if (!baseProtocols.find(bp => bp.code === ct.vaccine_code)) {
      baseProtocols.push({ 
        code: ct.vaccine_code, 
        annualCode: ct.recurrence_type === 'annual' ? ct.vaccine_code : null 
      });
    }
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear().toString().slice(-2)}`;
  }

  const getRecord = (code: string, dose: number) => {
    return records.find(r => r.vaccine_code === code && r.dose_number === dose);
  }

  const rows = baseProtocols.map(bp => {
    const tBase1 = templates.find(t => t.vaccine_code === bp.code && t.dose_number === 1);
    const tBase2 = templates.find(t => t.vaccine_code === bp.code && t.dose_number === 2);
    
    if (!tBase1) return null;

    const rBase1 = getRecord(bp.code, 1);
    const rBase2 = getRecord(bp.code, 2);
    const rAnnual1 = bp.annualCode ? getRecord(bp.annualCode, 1) : null;
    
    let base1Date = rBase1?.administered_at || rBase1?.due_at;
    let base2Date = rBase2?.administered_at || rBase2?.due_at;
    let annual1Date = rAnnual1?.administered_at || rAnnual1?.due_at;

    if (!base1Date && pet.birth_date) {
      const d = new Date(pet.birth_date);
      d.setDate(d.getDate() + (tBase1.min_age_weeks * 7));
      base1Date = d.toISOString();
    } else if (!base1Date) {
      base1Date = new Date().toISOString();
    }

    if (!base2Date && tBase2 && base1Date) {
      const d = new Date(base1Date);
      d.setDate(d.getDate() + (tBase2.interval_days || 21));
      base2Date = d.toISOString();
    }

    if (!annual1Date && bp.annualCode) {
      const refDate = base2Date || base1Date;
      if (refDate) {
        const d = new Date(refDate);
        d.setFullYear(d.getFullYear() + 1);
        annual1Date = d.toISOString();
      }
    }
    
    let annual2Date = null;
    if (annual1Date) {
      const d = new Date(annual1Date);
      d.setFullYear(d.getFullYear() + 1);
      annual2Date = d.toISOString();
    }

    const getCellState = (record: VRecord | undefined | null, projectedDate: string | null) => {
      if (record) {
        if (record.status === 'completed') return { date: record.administered_at || projectedDate, bg: 'bg-[#4CAF50] text-black border-slate-300 cursor-default', record, title: `Yapıldı: ${new Date(record.administered_at || '').toLocaleDateString('tr-TR')}` };
        if (record.status === 'skipped' || record.status === 'overdue') return { date: record.due_at || projectedDate, bg: 'bg-[#F44336] text-white border-slate-300 hover:opacity-80 cursor-pointer transition-all', record, title: `Gecikti/Atlandı. Hedef: ${new Date(record.due_at || '').toLocaleDateString('tr-TR')}\nTıklayarak tamamlandı olarak işaretle.` };
        return { date: record.due_at || projectedDate, bg: 'bg-white text-text-primary border-slate-300 hover:bg-primary/10 cursor-pointer transition-all shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]', record, title: `Planlandı: ${new Date(record.due_at || projectedDate || '').toLocaleDateString('tr-TR')}\nTıklayarak tamamlandı olarak işaretle.` };
      }
      return { date: projectedDate, bg: 'bg-white text-text-primary border-slate-300 opacity-60', record: null, title: `Tahmini Planlanan: ${projectedDate ? new Date(projectedDate).toLocaleDateString('tr-TR') : ''}\nHenüz sistemde aktif kayıt oluşturulmadı.` };
    }

    const cellBase1 = getCellState(rBase1, base1Date);
    const cellBase2 = tBase2 ? getCellState(rBase2, base2Date) : null;
    const cellAnnual1 = bp.annualCode ? getCellState(rAnnual1, annual1Date) : null;
    const cellAnnual2 = bp.annualCode ? { date: annual2Date, bg: 'bg-white text-text-primary border-slate-300 opacity-60', title: 'Tahmini Planlanan', record: null } : null;

    let name = tBase1.vaccine_name
      .replace(/\s*1\.\s*Doz/gi, '')
      .replace(/\s*Yıllık Tekrar/gi, '')
      .trim();

    return {
      name,
      code: tBase1.vaccine_code,
      mandatory: tBase1.mandatory_level,
      diseases: tBase1.protects_against.join(', '),
      base1: cellBase1,
      base2: cellBase2,
      annual1: cellAnnual1,
      annual2: cellAnnual2
    };
  }).filter(Boolean);

  return (
    <div className="mb-8">
      <h3 className="text-[16px] font-extrabold text-text-primary mb-3">Aşı Takvimi Matrisi</h3>
      <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-sm">
        <table className="w-full text-[12px] text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-500 text-white">
              <th colSpan={4} className="p-2 border-r border-slate-600"></th>
              <th colSpan={2} className="p-2 border-r border-slate-600 text-center font-bold">İlk Yıl</th>
              <th colSpan={2} className="p-2 border-r border-slate-600 text-center font-bold">1.Yaş</th>
              <th colSpan={2} className="p-2 border-slate-600 text-center font-bold">2.Yaş</th>
            </tr>
            <tr className="bg-slate-400 text-white">
              <th className="p-2 border border-slate-500 font-bold whitespace-nowrap">Aşı Adı</th>
              <th className="p-2 border border-slate-500 font-bold">Kod</th>
              <th className="p-2 border border-slate-500 font-bold">Zorunluluk</th>
              <th className="p-2 border border-slate-500 font-bold">Koruduğu Hastalıklar</th>
              <th className="p-2 border border-slate-500 font-bold text-center">1.Doz</th>
              <th className="p-2 border border-slate-500 font-bold text-center">2.Doz</th>
              <th className="p-2 border border-slate-500 font-bold text-center">1.Doz</th>
              <th className="p-2 border border-slate-500 font-bold text-center">2.Doz</th>
              <th className="p-2 border border-slate-500 font-bold text-center">1.Doz</th>
              <th className="p-2 border border-slate-500 font-bold text-center">2.Doz</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="p-2 border border-slate-300 font-bold whitespace-nowrap bg-white text-text-primary">{row.name}</td>
                <td className="p-2 border border-slate-300 bg-white text-text-primary">{row.code}</td>
                <td className={`p-2 border border-slate-300 whitespace-nowrap bg-white text-text-primary ${row.mandatory === 'legal_required' ? 'font-bold' : ''}`}>
                  {row.mandatory === 'core' ? 'Temel (Core)' : row.mandatory === 'optional' ? 'Seçmeli' : 'Yasal Zorunlu'}
                </td>
                <td className="p-2 border border-slate-300 text-[11px] bg-white text-text-primary leading-tight">{row.diseases}</td>
                
                {row.base2 ? (
                  <>
                    <td 
                      className={`p-2 border text-center font-medium ${row.base1.bg}`}
                      title={row.base1.title}
                      onClick={() => row.base1.record && row.base1.record.status !== 'completed' && onCellClick?.(row.base1.record)}
                    >
                      {formatDate(row.base1.date)}
                    </td>
                    <td 
                      className={`p-2 border text-center font-medium ${row.base2.bg}`}
                      title={row.base2.title}
                      onClick={() => row.base2.record && row.base2.record.status !== 'completed' && onCellClick?.(row.base2.record)}
                    >
                      {formatDate(row.base2.date)}
                    </td>
                  </>
                ) : (
                  <td 
                    colSpan={2} 
                    className={`p-2 border text-center font-medium ${row.base1.bg}`}
                    title={row.base1.title}
                    onClick={() => row.base1.record && row.base1.record.status !== 'completed' && onCellClick?.(row.base1.record)}
                  >
                    {formatDate(row.base1.date)}
                  </td>
                )}

                {/* 1.Yaş - Tek Doza Düşer */}
                <td 
                  colSpan={2}
                  className={`p-2 border text-center font-medium ${row.annual1 ? row.annual1.bg : 'bg-white border-slate-300 opacity-60'}`}
                  title={row.annual1?.title}
                  onClick={() => row.annual1?.record && row.annual1.record.status !== 'completed' && onCellClick?.(row.annual1.record)}
                >
                  {row.annual1 ? formatDate(row.annual1.date) : ''}
                </td>

                {/* 2.Yaş - Tek Doza Düşer */}
                <td 
                  colSpan={2}
                  className={`p-2 border text-center font-medium ${row.annual2 ? row.annual2.bg : 'bg-white border-slate-300 opacity-60'}`}
                  title={row.annual2?.title}
                  onClick={() => row.annual2?.record && row.annual2.record.status !== 'completed' && onCellClick?.(row.annual2.record)}
                >
                  {row.annual2 ? formatDate(row.annual2.date) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 flex gap-4 text-[12px] font-bold">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#4CAF50] border border-slate-300 rounded"></div>
          <span className="text-text-primary">Yapıldı</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#F44336] border border-slate-300 rounded"></div>
          <span className="text-text-primary">Atlandı / Gecikti</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-white border border-slate-300 rounded"></div>
          <span className="text-text-primary">Planlandı</span>
        </div>
      </div>
    </div>
  )
}

export default function VaccineOSClient({ pet, setupProfile, vaccineRecords, templates }: {
  pet: Pet; setupProfile: SetupProfile; vaccineRecords: VRecord[]; templates: Template[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'records' | 'settings'>('overview')
  const [setupDone, setSetupDone] = useState(!!setupProfile)
  const [quickMarkRecord, setQuickMarkRecord] = useState<VRecord | null>(null)
  const [postponeRecord, setPostponeRecord] = useState<VRecord | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Computed stats
  const overdueCount = vaccineRecords.filter(r => r.status === 'overdue').length
  const completedCount = vaccineRecords.filter(r => r.status === 'completed').length
  const dueRecords = vaccineRecords.filter(r => r.status === 'due' || r.status === 'scheduled')
    .sort((a, b) => new Date(a.due_at || '').getTime() - new Date(b.due_at || '').getTime())
  const nextDue = dueRecords[0]

  // Fire analytics for overdue detection and chain completion
  useEffect(() => {
    if (!setupDone) return
    if (overdueCount > 0) {
      trackEvent('vaccine_overdue_detected', { pet_id: pet.id, overdue_count: overdueCount })
    }
    const allCompleted = vaccineRecords.length > 0 && vaccineRecords.every(r => r.status === 'completed')
    if (allCompleted) {
      trackEvent('vaccine_chain_completed', { pet_id: pet.id, total: vaccineRecords.length })
    }
  }, [setupDone, overdueCount])

  function refreshData() {
    router.refresh()
    setQuickMarkRecord(null)
  }

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
        <VaccineActionModal record={quickMarkRecord} allRecords={vaccineRecords} onClose={() => setQuickMarkRecord(null)} onDone={refreshData} />
      )}
      {postponeRecord && (
        <PostponeModal record={postponeRecord} onClose={() => setPostponeRecord(null)} onDone={() => { setPostponeRecord(null); refreshData() }} />
      )}
      {showManual && (
        <ManualVaccineModal petId={pet.id} onClose={() => setShowManual(false)} onDone={() => { setShowManual(false); refreshData() }} />
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
          <div className="flex items-center gap-2">
            <button onClick={() => setShowManual(true)}
              className="text-[12px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors">
              + Manuel Ekle
            </button>
            {overdueCount > 0 && (
              <span className="bg-error/10 text-error text-[12px] font-black px-3 py-1.5 rounded-full border border-error/20">
                ⚠ {overdueCount} Gecikmiş
              </span>
            )}
          </div>
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
            <div className="card-base p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center text-[32px] mb-4">📅</div>
              <p className="font-extrabold text-text-primary text-[16px]">Takvim Boş</p>
              <p className="text-[13px] text-text-secondary mt-1 mb-5">Planlanmış herhangi bir aşı bulunmuyor. Manuel olarak yeni bir aşı planlayabilirsiniz.</p>
              <button onClick={() => setShowManual(true)} className="btn-primary py-2 px-6 text-[13px]">
                + Aşı Planla
              </button>
            </div>
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
                  <div className="flex flex-col gap-1 shrink-0 items-end">
                    <button onClick={() => setQuickMarkRecord(r)}
                      className="text-[11px] font-bold bg-success/10 text-success px-2.5 py-1 rounded-lg hover:bg-success/20 transition-colors whitespace-nowrap">
                      ✓ Yapıldı
                    </button>
                    <button onClick={() => setPostponeRecord(r)}
                      className="text-[11px] font-bold bg-warning/10 text-warning px-2.5 py-1 rounded-lg hover:bg-warning/20 transition-colors whitespace-nowrap">
                      ⏩ Ertele
                    </button>
                    <button onClick={() => {
                      if (confirm('Bu aşı kaydını silmek istiyor musunuz?')) {
                        startTransition(async () => { await deleteVaccineRecord(r.id); refreshData() })
                      }
                    }} className="text-[11px] font-bold text-error/60 hover:text-error px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
                      🗑 Sil
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── TAB: RECORDS ── */}
      {activeTab === 'records' && (
        <div className="flex flex-col gap-3">
          <ProtocolTable 
            pet={pet} 
            templates={templates} 
            records={vaccineRecords} 
            onCellClick={(record) => {
              setQuickMarkRecord(record)
            }} 
          />
          
          <h3 className="text-[16px] font-extrabold text-text-primary mb-1">Kayıt Geçmişi</h3>
          {vaccineRecords.filter(r => r.status === 'completed').length === 0 ? (
            <div className="card-base p-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-[32px] mb-4">💉</div>
              <p className="font-extrabold text-text-primary text-[16px]">Kayıt Bulunamadı</p>
              <p className="text-[13px] text-text-secondary mt-1 mb-5">Henüz tamamlanan aşı kaydı yok. Geçmişte yapılan bir aşıyı manuel olarak ekleyebilirsiniz.</p>
              <button onClick={() => setShowManual(true)} className="btn-primary py-2 px-6 text-[13px]">
                + İlk Aşınızı Ekleyin
              </button>
            </div>
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

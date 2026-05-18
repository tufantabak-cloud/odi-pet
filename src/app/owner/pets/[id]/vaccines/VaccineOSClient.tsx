'use client'

import { useState, useEffect, useTransition, useMemo, Fragment, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { COMMON_ALIASES, getDisplayName } from '@/lib/vaccines/utils'
import { toTitleCase } from '@/lib/utils'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics/track'
import ConfirmModal from '@/components/ui/ConfirmModal'
import CoachMark from '@/components/ui/CoachMark'
import {
  saveSetupMode,
  generateSchedule,
  markVaccineDone,
  skipVaccine,
  postponeVaccine,
  deleteVaccineRecord,
  addManualVaccine,
  generateFutureScheduleFromPastRecords,
} from './actions'
import { analyzeVaccineLabel } from './ai-actions'

function ScanButton({ onBatchScan }: { onBatchScan: () => void }) {
  return (
    <button 
      onClick={onBatchScan}
      className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 transition-all rounded-xl border border-primary/20 font-bold text-[12px] shadow-sm"
    >
      <span className="text-[16px]">📸</span> Etiketi / Karneyi Tara
    </button>
  )
}

// ── Types ──────────────────────────────────────────────────────
type Pet = { id: string; name: string; species: string; birth_date: string | null; avatar_url?: string; vet_name?: string | null }
type Template = { id: string; vaccine_code: string; vaccine_name: string; category: string; mandatory_level: string; dose_count: number; first_dose_week: number; dose_interval_days: number[] | number | null; has_annual_booster: boolean; recurrence_days: number | null; protects_against: string[]; profile_id: string | null; is_active: boolean; components?: string[] }
type VComponent = { code: string; name: string; description: string; is_zoonotic: boolean; risk_level: string; annual_required: boolean }
type VRecord = { id: string; pet_id: string; vaccine_code: string; vaccine_name: string; dose_number: number | null; status: string; administered_at: string | null; due_at: string | null; source: string; confidence_level: string; notes: string | null }
type SetupProfile = { id: string; pet_id: string; setup_mode: string } | null


function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}


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

const handleMatrixClick = (cellOrDose: any, row: any, petId: string, onCellClick?: (record: any) => void) => {
  if (!row.is_active || !cellOrDose) return;
  if (cellOrDose.record) {
    onCellClick?.(cellOrDose.record);
  } else if (cellOrDose.date) {
    onCellClick?.({
      id: `virtual_${row.code}_new`,
      pet_id: petId,
      vaccine_code: row.code,
      vaccine_name: row.name,
      status: 'due',
      due_at: cellOrDose.date,
      _isVirtual: true
    });
  }
};

// ── Setup Flow ─────────────────────────────────────────────────
function SetupFlow({ pet, templates, onComplete, onHistoricalImport }: { pet: Pet; templates: Template[]; onComplete: () => void; onHistoricalImport: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<'mode' | 'processing' | 'success'>('mode')
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [showWarning, setShowWarning] = useState(false)
  const [scheduleStats, setScheduleStats] = useState<{ total: number; overdue: number } | null>(null)

  const modes = [
    { id: 'smart_start', icon: '🧬', title: 'Akıllı Başlangıç', desc: 'Doğum tarihine göre standart takvim oluştur.' },
    { id: 'historical_import', icon: '📸', title: 'Geçmiş Kayıtlarım Var', desc: 'Karnedeki etiketleri yapay zekaya okutarak otomatik ekle.' },
    { id: 'fresh_start', icon: '🌱', title: 'Bugünden Başla', desc: 'Geçmişi dikkate alma, bundan sonrası için plan oluştur.' },
  ]

  // Auto-transition from success to main UI after 3 seconds
  useEffect(() => {
    if (step !== 'success') return
    const timer = setTimeout(() => {
      onComplete()
    }, 3000)
    return () => clearTimeout(timer)
  }, [step, onComplete])

  function handleSelect(mode: string) {
    setSelectedMode(mode)
    if (mode === 'fresh_start') setShowWarning(true)
    else setShowWarning(false)
  }

  function handleConfirm() {
    if (!selectedMode) return

    if (selectedMode === 'historical_import') {
      setStep('processing')
      startTransition(async () => {
        await saveSetupMode(pet.id, selectedMode as any)
        trackEvent('vaccine_setup_mode_selected', { pet_id: pet.id, mode: selectedMode })
        onHistoricalImport()
      })
      return
    }

    setStep('processing')
    startTransition(async () => {
      await saveSetupMode(pet.id, selectedMode as any)
      const result = await generateSchedule(pet.id, selectedMode as any)
      trackEvent('vaccine_setup_mode_selected', { pet_id: pet.id, mode: selectedMode })
      trackEvent('vaccine_schedule_generated', { pet_id: pet.id, mode: selectedMode })
      router.refresh()
      setScheduleStats(result ?? { total: 0, overdue: 0 })
      setStep('success')
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

  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 animate-fade-in">
        {/* Big success checkmark */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white text-[11px] font-black">✓</span>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-[22px] font-extrabold text-text-primary">Takvim Oluşturuldu!</h2>
          <p className="text-[14px] text-text-secondary mt-1">{pet.name} için aşı takip sistemi hazır</p>
        </div>

        {/* Stats summary */}
        {scheduleStats && scheduleStats.total > 0 && (
          <div className="w-full flex flex-col gap-3">
            <div className="flex items-center gap-3 p-4 bg-success/8 border border-success/20 rounded-2xl">
              <span className="text-[24px]">💉</span>
              <div>
                <p className="text-[15px] font-extrabold text-success">
                  {scheduleStats.total} aşı protokolü oluşturuldu
                </p>
                <p className="text-[12px] text-text-secondary mt-0.5">
                  {pet.name} artık tam koruma altında
                </p>
              </div>
            </div>

            {scheduleStats.overdue > 0 && (
              <div className="flex items-center gap-3 p-4 bg-warning/8 border border-warning/20 rounded-2xl">
                <span className="text-[24px]">⚠️</span>
                <div>
                  <p className="text-[15px] font-extrabold text-warning">
                    {scheduleStats.overdue} gecikmiş aşın var
                  </p>
                  <p className="text-[12px] text-text-secondary mt-0.5">
                    Veterinerinize en kısa sürede danışmanızı öneririz
                  </p>
                </div>
              </div>
            )}

            {scheduleStats.overdue === 0 && (
              <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/15 rounded-2xl">
                <span className="text-[24px]">🎉</span>
                <div>
                  <p className="text-[15px] font-extrabold text-primary">
                    Tüm aşılar güncel!
                  </p>
                  <p className="text-[12px] text-text-secondary mt-0.5">
                    Harika, gecikmiş aşı yok
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auto-redirect hint */}
        <div className="flex items-center gap-2 text-[12px] text-text-secondary">
          <div className="w-3 h-3 rounded-full border-2 border-text-secondary/40 border-t-text-secondary animate-spin" />
          <span>Takvime yönlendiriliyorsunuz...</span>
        </div>

        {/* Manual skip button */}
        <button
          onClick={onComplete}
          className="text-[13px] font-bold text-primary hover:underline"
        >
          Hemen Geç →
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full mx-auto pt-4">
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
// Helper to standardize text casing (Title Case)
// Removed local definition, using @/lib/utils/toTitleCase

function VaccineActionModal({ record, allRecords, suggestions, templates, components, onClose, onDone, defaultVetName }: { 
  record: VRecord & { _startInDetailed?: boolean }; 
  allRecords: VRecord[]; 
  suggestions: { clinics: string[], vets: string[], brands: string[] };
  templates: Template[];
  components: VComponent[];
  onClose: () => void; 
  onDone: () => void;
  defaultVetName?: string;
}) {
  const isEditing = record.status === 'completed'
  const [detailDate, setDetailDate] = useState(isEditing && record.administered_at ? new Date(record.administered_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
  const [showDetails, setShowDetails] = useState(isEditing || !!record._startInDetailed)
  const [isPending, startTransition] = useTransition()

  // Parse notes for pre-filling
  const parsedNotes = useMemo(() => {
    if (!record.notes) return { clinic: '', vet: '', brand: '', batch: '', text: '' }
    const parts = record.notes.split(' | ')
    const find = (prefix: string) => parts.find(p => p.startsWith(prefix))?.split(': ')[1] || ''
    const text = parts.find(p => !p.includes(': ')) || ''
    return {
      clinic: find('Klinik'),
      vet: find('Veteriner'),
      brand: find('Marka'),
      batch: find('Seri No'),
      text
    }
  }, [record.notes])

  // Detailed form fields
  const [clinicName, setClinicName] = useState(parsedNotes.clinic)
  const [vetName, setVetName] = useState(parsedNotes.vet || defaultVetName || '')
  const [brand, setBrand] = useState(parsedNotes.brand)
  const [batchNo, setBatchNo] = useState(parsedNotes.batch)
  const [notes, setNotes] = useState(parsedNotes.text)
  const tmplForRecurrence = templates.find(t => t.vaccine_code === record.vaccine_code)
  // Recurrence — stored in days, displayed as value+unit
  const parseRecurrenceInit = (days: number | '') => {
    if (!days) return { val: '', unit: 'gun' as 'gun' | 'ay' | 'yil' }
    const d = Number(days)
    if (d % 365 === 0 && d >= 365) return { val: String(d / 365), unit: 'yil' as const }
    if (d % 30 === 0 && d >= 30) return { val: String(d / 30), unit: 'ay' as const }
    return { val: String(d), unit: 'gun' as const }
  }
  const initRec = parseRecurrenceInit(tmplForRecurrence?.recurrence_days || '')
  const [recurrenceVal, setRecurrenceVal] = useState(initRec.val)
  const [recurrenceUnit, setRecurrenceUnit] = useState<'gun' | 'ay' | 'yil'>(initRec.unit)
  const recurrenceDays = recurrenceVal ? Number(recurrenceVal) * (recurrenceUnit === 'yil' ? 365 : recurrenceUnit === 'ay' ? 30 : 1) : ''
  const [amount, setAmount] = useState<number | ''>('')

  function handleConfirm() {
    const sClinic = toTitleCase(clinicName);
    const sVet = toTitleCase(vetName);
    const sBrand = toTitleCase(brand);

    let notesFull = [
      sClinic ? `Klinik: ${sClinic}` : '',
      sVet ? `Veteriner: ${sVet}` : '',
      sBrand ? `Marka: ${sBrand}` : '',
      batchNo ? `Seri No: ${batchNo.toUpperCase()}` : '',
      notes ? notes : '',
    ].filter(Boolean).join(' | ')

    startTransition(async () => {
      if ((record as any)._isVirtual) {
        await addManualVaccine(record.pet_id, {
          vaccine_name: record.vaccine_name,
          vaccine_code: record.vaccine_code,
          due_at: record.due_at || new Date(detailDate).toISOString(),
          administered_at: new Date(detailDate).toISOString(),
          vet_name: sVet || undefined,
          clinic: sClinic || undefined,
          brand: sBrand || undefined,
          batch_no: batchNo ? batchNo.toUpperCase() : undefined,
          notes: notesFull || undefined,
          recurrence_days: recurrenceDays ? Number(recurrenceDays) : undefined,
          amount: amount ? Number(amount) : undefined
        })
      } else {
        await markVaccineDone(record.id, new Date(detailDate).toISOString(), 'user_action', notesFull || undefined, recurrenceDays ? Number(recurrenceDays) : undefined, amount ? Number(amount) : undefined)
      }
      trackEvent('vaccine_logged', { record_id: record.id, vaccine_code: record.vaccine_code })
      onDone()
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-[28px] shadow-2xl overflow-y-auto max-h-[90dvh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border-main">
          <p className="text-[12px] font-black text-text-secondary uppercase tracking-widest mb-0.5">
            {isEditing ? 'Kayıt Düzenle' : 'Aşı Kaydı'}
          </p>
          <h3 className="text-[17px] font-extrabold text-text-primary leading-snug">{getDisplayName(record.vaccine_name, record.vaccine_code)}</h3>
          {(() => {
            const tmpl = templates.find(t => t.vaccine_code === record.vaccine_code);
            if (tmpl && tmpl.components && tmpl.components.length > 0) {
              const matchedComponents = components.filter(c => tmpl.components!.includes(c.code));
              return (
                <div className="mt-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-[11px] font-black text-primary uppercase tracking-wider mb-2">🛡️ Koruma İçeriği</p>
                  <div className="flex flex-col gap-1.5">
                    {matchedComponents.map(c => (
                      <div key={c.code} className="flex items-start gap-2">
                        <span className="text-primary text-[14px]">✓</span>
                        <div>
                          <p className="text-[12px] font-bold text-text-primary">{c.name}</p>
                          {c.is_zoonotic && <p className="text-[10px] text-error font-medium">⚠️ İnsana bulaşabilir (Zoonotik)</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            } else if (COMMON_ALIASES[record.vaccine_code]) {
              return (
                <p className="text-[11px] text-primary font-bold mt-1 italic">
                  Etikette: {COMMON_ALIASES[record.vaccine_code].join(', ')}
                </p>
              );
            }
            return null;
          })()}
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1 -mt-1">
            <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Uygulama Tarihi *</label>
            <input type="date" className="input-base text-[14px] py-3" value={detailDate} onChange={e => setDetailDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          </div>

          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mt-1 flex flex-col gap-2">
            <p className="text-[12px] text-primary font-medium leading-relaxed">
              💡 <span className="font-bold">Bilgi:</span> Kaydettiğinizde sistem sonraki dozu veya yıllık tekrarı varsa otomatik takvime işler.
            </p>
          </div>

          {!showDetails ? (
            <button 
              onClick={() => setShowDetails(true)} 
              className="text-center py-2 text-[13px] font-bold text-text-secondary hover:text-primary transition-colors border-2 border-dashed border-border-main rounded-xl hover:border-primary/30 hover:bg-primary/5"
            >
              + İsteğe Bağlı Detay Ekle (Klinik, Marka vb.)
            </button>
          ) : (
            <div className="flex flex-col gap-3 animate-fade-in pt-2 border-t border-border-main mt-1">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-black text-text-primary uppercase tracking-wider">Detaylar</p>
                <button onClick={() => setShowDetails(false)} className="text-[11px] font-bold text-text-secondary hover:text-text-primary">Gizle</button>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">Klinik / Hastane</label>
                <input type="text" className="input-base text-[15px] py-2.5 h-11" placeholder="Örn: Beşiktaş Veteriner Kliniği" list="clinics-list" value={clinicName} onChange={e => setClinicName(e.target.value)} />
                <datalist id="clinics-list">
                  {suggestions.clinics.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">Veteriner Adı</label>
                <input type="text" className="input-base text-[15px] py-2.5 h-11" placeholder="Örn: Dr. Ayşe Kaya" list="vets-list" value={vetName} onChange={e => setVetName(e.target.value)} />
                <datalist id="vets-list">
                  {suggestions.vets.map(v => <option key={v} value={v} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary">Marka</label>
                  <input type="text" className="input-base text-[15px] py-2.5 h-11" placeholder="Örn: Nobivac" list="brands-list" value={brand} onChange={e => setBrand(e.target.value)} />
                  <datalist id="brands-list">
                    {suggestions.brands.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary">Seri No</label>
                  <input type="text" className="input-base text-[15px] py-2.5 h-11" placeholder="Örn: A2024B" value={batchNo} onChange={e => setBatchNo(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">Notlar</label>
                <textarea className="input-base resize-none text-[15px] py-2.5" rows={2} placeholder="Yan etki, reaksiyon..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary">Tavsiye Edilen Tekrar</label>
                  <div className="flex gap-1">
                    <input type="number" min="1" className="input-base text-[15px] py-2.5 h-11 flex-1 min-w-0" placeholder="Örn: 3" value={recurrenceVal} onChange={e => setRecurrenceVal(e.target.value)} />
                    <select className="input-base text-[15px] py-2.5 h-11 pr-1 flex-shrink-0" value={recurrenceUnit} onChange={e => setRecurrenceUnit(e.target.value as any)}>
                      <option value="gun">Gün</option>
                      <option value="ay">Ay</option>
                      <option value="yil">Yıl</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-text-secondary">Ücret (₺)</label>
                  <input type="number" className="input-base text-[15px] py-2.5 h-11" placeholder="Örn: 450" value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-xl border-2 border-border-main text-text-secondary font-bold text-[14px]">İptal</button>
            <button onClick={handleConfirm} disabled={isPending || !detailDate}
              className="flex-[2] btn-primary py-3.5 disabled:opacity-40 text-[14px] shadow-sm">
              {isPending ? 'Kaydediliyor...' : 'Kaydet ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Postpone Modal ─────────────────────────────────────────────
function PostponeModal({ record, onClose, onDone }: { record: VRecord; onClose: () => void; onDone: () => void }) {
  const [days, setDays] = useState(7)
  const [isPending, startTransition] = useTransition()
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-[28px] shadow-2xl overflow-y-auto max-h-[90dvh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-border-main">
          <p className="text-[11px] font-black text-warning uppercase tracking-widest">⚠️ Ertele</p>
          <h3 className="text-[17px] font-extrabold text-text-primary">{record.vaccine_name}</h3>
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
function ManualVaccineModal({ 
  petId, 
  templates, 
  components,
  suggestions,
  onClose, 
  onDone, 
  initialMode = 'record', 
  fixedMode = false,
  initialData,
  defaultVetName
}: { 
  petId: string; 
  templates: Template[]; 
  components: VComponent[];
  suggestions: { clinics: string[], vets: string[], brands: string[] };
  onClose: () => void; 
  onDone: () => void; 
  initialMode?: 'plan' | 'record'; 
  fixedMode?: boolean;
  initialData?: { name: string; code: string; date: string; brand?: string; batch_no?: string; clinic?: string } | null;
  defaultVetName?: string;
}) {
  const [mode, setMode] = useState<'plan' | 'record'>(initialMode)
  const [name, setName] = useState(initialData?.name || '')
  const [selectedCode, setSelectedCode] = useState<string | null>(initialData?.code || null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
  const [clinic, setClinic] = useState(initialData?.clinic || '')
  const [vet, setVet] = useState(defaultVetName || '')
  const [brand, setBrand] = useState(initialData?.brand || '')
  const [batchNo, setBatchNo] = useState(initialData?.batch_no || '')
  const [notes, setNotes] = useState('')
  // Recurrence — value+unit → days
  const [recurrenceVal, setRecurrenceVal] = useState('')
  const [recurrenceUnit, setRecurrenceUnit] = useState<'gun' | 'ay' | 'yil'>('gun')
  const recurrenceDays = recurrenceVal ? Number(recurrenceVal) * (recurrenceUnit === 'yil' ? 365 : recurrenceUnit === 'ay' ? 30 : 1) : ''
  const setRecurrenceDays = (days: number) => {
    if (!days) {
      setRecurrenceVal('')
      return
    }
    if (days % 365 === 0 && days >= 365) {
      setRecurrenceVal(String(days / 365))
      setRecurrenceUnit('yil')
    } else if (days % 30 === 0 && days >= 30) {
      setRecurrenceVal(String(days / 30))
      setRecurrenceUnit('ay')
    } else {
      setRecurrenceVal(String(days))
      setRecurrenceUnit('gun')
    }
  }
  const [amount, setAmount] = useState<number | ''>('')
  const [showDetails, setShowDetails] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [scanError, setScanError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const vaccineSuggestions = name.length >= 1 ? Array.from(new Map(templates.filter(t => {
    const search = name.toLowerCase()
    const matchName = t.vaccine_name.toLowerCase().includes(search)
    const matchCode = t.vaccine_code.toLowerCase().includes(search)
    const aliases = COMMON_ALIASES[t.vaccine_code] || []
    const matchAlias = aliases.some(a => a.toLowerCase().includes(search))
    const matchDisease = (t.protects_against || []).some(d => d.toLowerCase().includes(search))
    return matchName || matchCode || matchAlias || matchDisease
  }).map(t => [t.vaccine_code, t])).values()).slice(0, 8) : []

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsScanning(true)
    setScanError('')
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1]
        const res = await analyzeVaccineLabel(base64, file.type)
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const data = res.data[0]
          if (data.vaccineName) setName(toTitleCase(data.vaccineName))
          if (data.date) setDate(new Date(data.date).toISOString().split('T')[0])
          if (data.brand) setBrand(toTitleCase(data.brand))
          if (data.batchNo) setBatchNo(data.batchNo.toUpperCase())
          if (data.clinicName) setClinic(toTitleCase(data.clinicName))
        } else if (res.success) {
          setScanError('Etiket okunamadı. Lütfen daha net ve iyi aydınlatılmış bir fotoğraf çekin.')
        } else {
          setScanError('Etiket okunamadı: ' + (res.error || 'Bilinmeyen hata.'))
        }
        setIsScanning(false)
      }
      reader.readAsDataURL(file)
    } catch (e) {
      console.error(e)
      setIsScanning(false)
    }
  }

  function handleSave() {
    if (!name.trim()) { setError('Aşı adı zorunludur.'); return }
    if (!date) { setError('Tarih zorunludur.'); return }
    setError('')
    startTransition(async () => {
      const result = await addManualVaccine(petId, {
        vaccine_name: name,
        vaccine_code: selectedCode || undefined,
        due_at: new Date(date).toISOString(),
        administered_at: mode === 'record' ? new Date(date).toISOString() : undefined,
        vet_name: toTitleCase(vet) || undefined,
        clinic: toTitleCase(clinic) || undefined,
        brand: toTitleCase(brand) || undefined,
        batch_no: batchNo ? batchNo.toUpperCase() : undefined,
        notes: notes || undefined,
        recurrence_days: recurrenceDays ? Number(recurrenceDays) : undefined,
        amount: amount ? Number(amount) : undefined
      })
      if ((result as any)?.error) {
        setError('Kaydetme hatası: ' + (result as any).error)
        return
      }
      if (mode === 'plan') {
        setShowSuccess(true)
      } else {
        onDone()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain" onClick={onClose}>
      {isScanning && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl min-w-[240px]">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <div className="text-center">
              <p className="font-extrabold text-[15px] text-text-primary">📸 Etiket Okunuyor...</p>
              <p className="text-[12px] font-medium text-text-secondary mt-1">Yapay zeka analiz ediyor</p>
            </div>
          </div>
        </div>
      )}
      <div className="bg-surface w-full max-w-sm rounded-[28px] shadow-2xl overflow-y-auto max-h-[90dvh]" onClick={e => e.stopPropagation()}>
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 px-6 gap-4 text-center animate-fade-in">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[32px] mb-2 shadow-sm">📅</div>
            <h4 className="font-extrabold text-[20px] text-text-primary">Plan Oluşturuldu!</h4>
            <p className="text-[14px] text-text-secondary leading-relaxed">
              <span className="font-bold text-text-primary">{name}</span> aşısı takvimine eklendi. Zamanı geldiğinde seni bilgilendireceğiz.
            </p>
            <button onClick={onDone} className="w-full mt-4 py-3.5 rounded-xl btn-primary font-bold shadow-sm">
              Tamam
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 pt-6 pb-4 border-b border-border-main flex justify-between items-start">
          <div>
            <p className="text-[11px] font-black text-primary uppercase tracking-widest">
              {mode === 'record' ? '➕ Yapıldı Kaydı Ekle' : '📅 Yeni Aşı Planla'}
            </p>
            <p className="text-[12px] text-text-secondary mt-1">
              {mode === 'record' ? 'Gerçekleşen bir aşı kaydını sisteme işle.' : 'Gelecek için yeni bir aşı takvimi oluştur.'}
            </p>
          </div>
          {mode === 'record' && (
            <label className={`relative flex items-center justify-center p-2 rounded-xl border border-primary/30 text-primary cursor-pointer hover:bg-primary/5 transition-colors ${isScanning ? 'opacity-50 pointer-events-none' : ''}`} title="Fotoğraftan Otomatik Doldur">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScan} />
              {isScanning ? (
                 <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              ) : (
                 <span className="text-[20px]">📸</span>
              )}
            </label>
          )}
        </div>
        <div className="p-6 flex flex-col gap-4">
          {/* Mode - Only show if not fixed */}
          {!fixedMode && (
            <div className="grid grid-cols-2 gap-2">
              {[{ id:'record', label:'✅ Yapıldı Kaydı' }, { id:'plan', label:'📅 Planlama' }].map(m => (
                <button key={m.id} onClick={() => setMode(m.id as any)}
                  className={`py-2.5 rounded-xl border-2 font-bold text-[13px] transition-all ${mode === m.id ? 'border-primary bg-primary/5 text-primary' : 'border-border-main text-text-secondary'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          )}
          

          {scanError && (
            <div className="flex items-start gap-2.5 p-3 bg-warning/10 border border-warning/30 rounded-xl">
              <span className="text-[16px] flex-shrink-0">📸</span>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-warning leading-relaxed">{scanError}</p>
                <button onClick={() => setScanError('')} className="text-[11px] text-text-secondary hover:text-text-primary mt-1 font-medium">Kapat ×</button>
              </div>
            </div>
          )}
          {error && <p className="text-[12px] text-error font-bold">{error}</p>}
          <div className="flex flex-col gap-1 relative -mt-2">
            <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Aşı Adı / Etiket Kodu *</label>
            <input 
              className="input-base text-[15px] py-3 h-12" 
              placeholder="Aşı adını yazmaya başlayın (Karma, Kuduz, İç Parazit...)" 
              value={name} 
              onChange={e => { setName(e.target.value); setShowSuggestions(true) }}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && vaccineSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border-main rounded-xl shadow-xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-1">
                {vaccineSuggestions.map(t => (
                  <button key={t.id} onClick={() => { 
                    const primaryAlias = COMMON_ALIASES[t.vaccine_code]?.[0] || '';
                    setName(`${t.vaccine_name}${primaryAlias ? ' ' + primaryAlias : ''}`); 
                    setSelectedCode(t.vaccine_code);
                    if (t.recurrence_days) setRecurrenceDays(t.recurrence_days);
                    setShowSuggestions(false) 
                  }}
                    className="w-full text-left p-3 hover:bg-bg-main transition-colors border-b border-border-main last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-[13px] text-text-primary">{getDisplayName(t.vaccine_name, t.vaccine_code)}</p>
                      <span className="text-[10px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">{t.vaccine_code}</span>
                    </div>
                    {t.protects_against && t.protects_against.length > 0 && (
                      <p className="text-[10px] text-text-secondary mt-0.5">
                        <span className="font-bold">Hastalıklar:</span> {t.protects_against.join(', ')}
                      </p>
                    )}
                    <p className="text-[10px] text-text-secondary italic mt-0.5">Etikette: {COMMON_ALIASES[t.vaccine_code]?.join(', ') || '-'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {selectedCode && (() => {
            const tmpl = templates.find(t => t.vaccine_code === selectedCode);
            if (tmpl && tmpl.components && tmpl.components.length > 0) {
              const matchedComponents = components.filter(c => tmpl.components!.includes(c.code));
              return (
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 -mt-1 animate-fade-in">
                  <p className="text-[11px] font-black text-primary uppercase tracking-wider mb-2">🛡️ Koruma İçeriği</p>
                  <div className="flex flex-col gap-1.5">
                    {matchedComponents.map(c => (
                      <div key={c.code} className="flex items-start gap-2">
                        <span className="text-primary text-[14px]">✓</span>
                        <div>
                          <p className="text-[12px] font-bold text-text-primary">{c.name}</p>
                          {c.is_zoonotic && <p className="text-[10px] text-error font-medium">⚠️ İnsana bulaşabilir (Zoonotik)</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            } else if (COMMON_ALIASES[selectedCode]) {
              return (
                <p className="text-[11px] text-primary font-bold mt-1 italic -mt-1">
                  Etikette: {COMMON_ALIASES[selectedCode].join(', ')}
                </p>
              );
            }
            return null;
          })()}

          {selectedCode && recurrenceDays && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-2 animate-fade-in -mt-1">
              <span className="text-[14px]">💡</span>
              <p className="text-[11px] text-primary font-medium leading-relaxed">
                <span className="font-bold">Bilgi:</span> Bu aşı genellikle {recurrenceVal} {recurrenceUnit === 'yil' ? 'yılda' : recurrenceUnit === 'ay' ? 'ayda' : 'günde'} bir tekrarlanır. Sistem otomatik hatırlatıcı kuracaktır.
              </p>
            </div>
          )}
          
          <div className="flex flex-col gap-1 -mt-1">
            <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">{mode === 'record' ? 'Yapıldığı Tarih *' : 'Planlanan Tarih *'}</label>
            <input type="date" className="input-base text-[15px] py-3 h-12" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {mode === 'plan' && (
            <div className="flex flex-col gap-1 mt-1 animate-fade-in">
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">Tekrarlama Sıklığı (Periyot)</label>
              <div className="flex gap-2">
                <input type="number" min="1" className="input-base text-[15px] py-2.5 h-12 flex-1 min-w-0" placeholder="Örn: 3" value={recurrenceVal} onChange={e => setRecurrenceVal(e.target.value)} />
                <select className="input-base text-[15px] py-2.5 h-12 pr-1 flex-shrink-0" value={recurrenceUnit} onChange={e => setRecurrenceUnit(e.target.value as any)}>
                  <option value="gun">Gün</option>
                  <option value="ay">Ay</option>
                  <option value="yil">Yıl</option>
                </select>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5 leading-normal">
                Bu planın ne kadar sürede bir yenileneceğini belirtir (örn. 3 Ayda bir). Hatırlatıcılar bu periyoda göre kurulur.
              </p>
            </div>
          )}

          {!showDetails ? (
            <button 
              onClick={() => setShowDetails(true)} 
              className="text-center py-2 text-[13px] font-bold text-text-secondary hover:text-primary transition-colors border-2 border-dashed border-border-main rounded-xl hover:border-primary/30 hover:bg-primary/5 mt-1"
            >
              + İsteğe Bağlı Detay Ekle (Notlar{mode === 'record' ? ', Klinik, Marka vb.' : ''})
            </button>
          ) : (
            <div className="flex flex-col gap-3 animate-fade-in pt-2 border-t border-border-main mt-1">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-black text-text-primary uppercase tracking-wider">Detaylar</p>
                <button onClick={() => setShowDetails(false)} className="text-[11px] font-bold text-text-secondary hover:text-text-primary">Gizle</button>
              </div>
              
              {mode === 'record' && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-text-secondary">Klinik / Hastane</label>
                    <input type="text" className="input-base text-[15px] py-2.5 h-11" placeholder="Örn: Beşiktaş Veteriner Kliniği" list="m-clinics-list" value={clinic} onChange={e => setClinic(e.target.value)} />
                    <datalist id="m-clinics-list">
                      {suggestions.clinics.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-text-secondary">Veteriner Adı</label>
                    <input type="text" className="input-base text-[15px] py-2.5 h-11" placeholder="Örn: Dr. Ayşe Kaya" list="m-vets-list" value={vet} onChange={e => setVet(e.target.value)} />
                    <datalist id="m-vets-list">
                      {suggestions.vets.map(v => <option key={v} value={v} />)}
                    </datalist>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-text-secondary">Marka</label>
                      <input type="text" className="input-base text-[15px] py-2.5 h-11" placeholder="Örn: Nobivac" list="m-brands-list" value={brand} onChange={e => setBrand(e.target.value)} />
                      <datalist id="m-brands-list">
                        {suggestions.brands.map(b => <option key={b} value={b} />)}
                      </datalist>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-text-secondary">Seri No</label>
                      <input type="text" className="input-base text-[15px] py-2.5 h-11" placeholder="Örn: A2024B" value={batchNo} onChange={e => setBatchNo(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-text-secondary">Notlar</label>
                <textarea className="input-base resize-none text-[15px] py-2.5" rows={2} placeholder="Yan etki, reaksiyon..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {mode === 'record' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-text-secondary">Tavsiye Edilen Tekrar</label>
                      <div className="flex gap-1">
                        <input type="number" min="1" className="input-base text-[15px] py-2.5 h-11 flex-1 min-w-0" placeholder="Örn: 3" value={recurrenceVal} onChange={e => setRecurrenceVal(e.target.value)} />
                        <select className="input-base text-[15px] py-2.5 h-11 pr-1 flex-shrink-0" value={recurrenceUnit} onChange={e => setRecurrenceUnit(e.target.value as any)}>
                          <option value="gun">Gün</option>
                          <option value="ay">Ay</option>
                          <option value="yil">Yıl</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-text-secondary">Ücret (₺)</label>
                      <input type="number" className="input-base text-[15px] py-2.5 h-11" placeholder="Örn: 450" value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-xl border-2 border-border-main text-text-secondary font-bold text-[14px]">İptal</button>
            <button onClick={handleSave} disabled={isPending}
              className="flex-[2] btn-primary py-3.5 disabled:opacity-40 text-[14px] shadow-sm">
              {isPending ? 'Kaydediliyor...' : 'Kaydet ✓'}
            </button>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  )
}

// ── Batch Scan Modal ──────────────────────────────────────────
function BatchScanModal({ 
  petId, 
  templates, 
  allRecords,
  isSetupPhase = false,
  onClose, 
  onDone,
  defaultVetName
}: { 
  petId: string; 
  templates: Template[]; 
  allRecords: VRecord[];
  isSetupPhase?: boolean;
  onClose: () => void; 
  onDone: () => void;
  defaultVetName?: string;
}) {
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)
  const [isPending, startTransition] = useTransition()
  const [selections, setSelections] = useState<Record<number, boolean>>({})
  const [showSuccessPrompt, setShowSuccessPrompt] = useState(false)
  const [scanError, setScanError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    setScanError('')
    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1]
        const res = await analyzeVaccineLabel(base64, file.type)
        if (res.success && Array.isArray(res.data)) {
          // Eğer AI hiç etiket bulamazsa
          if (res.data.length === 0) {
            setScanError('Bu görselde herhangi bir aşı etiketi tespit edilemedi. Lütfen karneyi daha net ve yakından çekin.')
            setScanning(false);
            return;
          }

          const enriched = res.data.map(item => {
            let isDuplicate = false
            if (item.vaccineName || item.date) {
               isDuplicate = allRecords.some(r => 
                 r.status === 'completed' &&
                 ((r.vaccine_name && item.vaccineName && r.vaccine_name.toLowerCase().includes(item.vaccineName.toLowerCase())) || 
                  (r.vaccine_code && item.vaccineName && (COMMON_ALIASES[r.vaccine_code] || []).some(a => a.toLowerCase().includes(item.vaccineName.toLowerCase())))) &&
                 (item.date ? r.administered_at?.startsWith(item.date) : true)
               )
            }
            return { ...item, isDuplicate }
          })
          setResults(enriched)
          
          const initialSel: Record<number, boolean> = {}
          enriched.forEach((r, i) => { initialSel[i] = !r.isDuplicate && !!r.vaccineName })
          setSelections(initialSel)
        } else {
          setScanError('Etiketler okunamadı: ' + (res.error || 'Bilinmeyen hata. Lütfen tekrar deneyin.'))
        }
        setScanning(false)
      }
      reader.readAsDataURL(file)
    } catch (e) {
      console.error(e)
      setScanning(false)
    }
  }

  function updateResult(index: number, field: string, value: string) {
    if (!results) return
    const newResults = [...results]
    newResults[index] = { ...newResults[index], [field]: value }
    setResults(newResults)
  }

  function handleSave() {
    if (!results) return
    startTransition(async () => {
      const selectedItems = results.filter((_, i) => selections[i]);
      for (const item of selectedItems) {
        const search = (item.vaccineName || '').toLowerCase()
        const matchedTmpl = templates.find(t => 
           t.vaccine_name.toLowerCase().includes(search) || 
           t.vaccine_code.toLowerCase().includes(search) ||
           (COMMON_ALIASES[t.vaccine_code] || []).some(a => a.toLowerCase().includes(search))
        )
        
        await addManualVaccine(petId, {
          vaccine_name: toTitleCase(item.vaccineName || 'Bilinmeyen Aşı'),
          vaccine_code: matchedTmpl ? matchedTmpl.vaccine_code : undefined,
          due_at: new Date(item.date || new Date()).toISOString(),
          administered_at: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
          clinic: toTitleCase(item.clinicName) || undefined,
          vet_name: defaultVetName || undefined,
          brand: toTitleCase(item.brand) || undefined,
          batch_no: item.batchNo ? item.batchNo.toUpperCase() : undefined,
          notes: '[TOPLU_TARAMA_AI]'
        })
      }
      onDone()
      setResults(null)
      setShowSuccessPrompt(true)
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-[28px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-border-main">
          <p className="text-[11px] font-black text-primary uppercase tracking-widest">📷 Toplu Tarama</p>
          <h3 className="text-[17px] font-extrabold text-text-primary">Karneden Sayfa Tara</h3>
          <p className="text-[12px] text-text-secondary mt-1">
            Aşı defterinin bir sayfasını çekerek çoklu etiketlerin otomatik tanınmasını ve kaydedilmesini sağlayın.
          </p>
        </div>
        
        <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {scanError && (
            <div className="flex items-start gap-2.5 p-3 bg-warning/10 border border-warning/30 rounded-xl animate-fade-in">
              <span className="text-[18px] flex-shrink-0">📷</span>
              <div className="flex-1">
                <p className="text-[12px] font-bold text-warning leading-relaxed">{scanError}</p>
                <button onClick={() => setScanError('')} className="text-[11px] text-text-secondary hover:text-text-primary mt-1 font-medium">Tekrar Dene</button>
              </div>
            </div>
          )}
          {showSuccessPrompt && (
            <div className="flex flex-col items-center justify-center py-6 gap-5 text-center animate-fade-in">
               <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[32px]">✓</div>
               <div>
                 <h4 className="font-extrabold text-[18px] text-text-primary">Kayıtlar Eklendi</h4>
                 <p className="text-[13px] text-text-secondary mt-1">Karnede taratılmamış başka aşı sayfası kaldı mı?</p>
               </div>
               <div className="flex flex-col gap-3 w-full mt-2">
                 <button onClick={() => setShowSuccessPrompt(false)} className="w-full py-3.5 rounded-xl border-2 border-border-main text-text-primary font-bold hover:bg-bg-main transition-colors flex items-center justify-center gap-2">
                   <span>📸</span> Evet, Başka Sayfa Tara
                 </button>
                 <button onClick={onClose} className="w-full py-3.5 rounded-xl btn-primary font-bold flex items-center justify-center gap-2">
                   {isSetupPhase ? 'Taramayı Bitir ve Takvimi Oluştur' : 'Taramayı Bitir ve Kapat'}
                 </button>
               </div>
            </div>
          )}

          {!scanning && !results && !showSuccessPrompt && (
             <div className="relative w-full animate-fade-in">
                <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className="flex flex-col items-center justify-center gap-2 py-10 bg-primary/5 hover:bg-primary/10 transition-colors border-2 border-dashed border-primary/30 rounded-2xl">
                   <span className="text-[40px]">📸</span>
                   <p className="font-bold text-primary text-[14px]">Sayfayı Çek / Yükle</p>
                </div>
             </div>
          )}

          {scanning && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-text-secondary font-bold text-[14px]">Yapay Zeka Okuyor...</p>
            </div>
          )}

          {results && (
            <div className="flex flex-col gap-3">
              <p className="text-[13px] font-bold text-text-secondary mb-1">Bulunan Kayıtlar ({results.length})</p>
              {results.map((r, i) => (
                <div key={i} className={`p-4 rounded-xl border-2 flex items-start gap-3 transition-colors ${selections[i] ? 'border-primary bg-primary/5 shadow-sm' : r.isDuplicate ? 'border-warning/30 bg-warning/5 opacity-70' : 'border-border-main opacity-50'}`}>
                  <input type="checkbox" checked={!!selections[i]} disabled={r.isDuplicate} onChange={e => setSelections({...selections, [i]: e.target.checked})} className="mt-1.5 w-5 h-5 accent-primary rounded cursor-pointer" />
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {r.isDuplicate && <p className="text-[11px] text-warning font-black uppercase tracking-wide">⚠️ Zaten kayıtlı. Yoksayıldı.</p>}
                    
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-text-secondary uppercase">Aşı Adı / Türü</label>
                      <input 
                        className="bg-white border border-border-main rounded-lg px-2.5 py-1.5 text-[13px] font-bold focus:border-primary focus:outline-none transition-colors disabled:bg-bg-main" 
                        value={r.vaccineName || ''} onChange={e => updateResult(i, 'vaccineName', e.target.value)} disabled={r.isDuplicate} placeholder="Örn: Karma, Kuduz" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-text-secondary uppercase">Tarih</label>
                        <input type="date" className="bg-white border border-border-main rounded-lg px-2.5 py-1.5 text-[13px] font-bold focus:border-primary focus:outline-none transition-colors disabled:bg-bg-main" 
                          value={r.date || ''} onChange={e => updateResult(i, 'date', e.target.value)} disabled={r.isDuplicate} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-text-secondary uppercase">Marka</label>
                        <input className="bg-white border border-border-main rounded-lg px-2.5 py-1.5 text-[13px] font-bold focus:border-primary focus:outline-none transition-colors disabled:bg-bg-main" 
                          value={r.brand || ''} onChange={e => updateResult(i, 'brand', e.target.value)} disabled={r.isDuplicate} placeholder="Marka" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-text-secondary uppercase">Seri No</label>
                        <input className="bg-white border border-border-main rounded-lg px-2.5 py-1.5 text-[13px] font-bold focus:border-primary focus:outline-none transition-colors disabled:bg-bg-main" 
                          value={r.batchNo || ''} onChange={e => updateResult(i, 'batchNo', e.target.value)} disabled={r.isDuplicate} placeholder="Lot/Seri" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-text-secondary uppercase">Klinik / Veteriner</label>
                        <input className="bg-white border border-border-main rounded-lg px-2.5 py-1.5 text-[13px] font-bold focus:border-primary focus:outline-none transition-colors disabled:bg-bg-main" 
                          value={r.clinicName || ''} onChange={e => updateResult(i, 'clinicName', e.target.value)} disabled={r.isDuplicate} placeholder="Kaşe bilgisi" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="flex gap-3 mt-2">
                <button onClick={() => setResults(null)} className="flex-1 py-3 rounded-xl border border-border-main text-text-secondary font-bold">Tekrar Çek</button>
                <button onClick={handleSave} disabled={isPending || !Object.values(selections).some(v => v)}
                  className="flex-1 btn-primary py-3 disabled:opacity-40">
                  {isPending ? '...' : 'Seçilenleri Ekle'}
                </button>
              </div>
            </div>
          )}
          
          {!results && !scanning && !showSuccessPrompt && (
            <button onClick={onClose} className={`w-full py-3 mt-2 rounded-xl font-bold border transition-colors ${isSetupPhase ? 'btn-primary border-transparent' : 'text-text-secondary border-border-main hover:bg-bg-main'}`}>
               {isSetupPhase ? 'Taramayı Bitir ve Takvimi Oluştur' : 'İptal'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Protocol Table Component ───────────────────────────────────
function ProtocolTable({ pet, templates, records, onCellClick, onNewRecord, onNewPlan, onBatchScan, wizardDismissed = true }: { 
  pet: Pet; 
  templates: Template[]; 
  records: VRecord[]; 
  onCellClick?: (record: VRecord) => void;
  onNewRecord?: (name: string, code: string, date: string) => void;
  onNewPlan?: (name: string, code: string, date: string) => void;
  onBatchScan?: () => void;
  wizardDismissed?: boolean;
}) {

  // Use templates directly as rows (new schema: 1 template = 1 protocol)
  const vaccineTemplates = templates.filter(t => t.category === 'vaccine' || !t.category);

  const currentYear = new Date().getFullYear();
  const birthYear = pet.birth_date ? new Date(pet.birth_date).getFullYear() : currentYear;
  const petAge = currentYear - birthYear;
  const maxYearsToShow = Math.max(petAge + 1, 2);

  const years = Array.from({ length: maxYearsToShow + 1 }, (_, i) => i);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear().toString().slice(-2)}`;
  }

  const getRecordByCodeAndDose = (code: string, doseNum: number, projectedDate: string | null) => {
    const aliases = (COMMON_ALIASES[code] || []).map(a => a.toLowerCase());

    // Priority 1a: Exact dose match
    const exactCompleted = records.find(r => r.status === 'completed' && r.vaccine_code === code && r.dose_number === doseNum);
    if (exactCompleted) return exactCompleted;

    // Priority 1b: Sequential assignment for manual records in the birth year
    const manualCompletedMatches = records.filter(r => {
      if (r.status !== 'completed') return false;
      if (r.dose_number) return false; // Already has a strict dose slot
      if (r.vaccine_code && r.vaccine_code !== code && r.vaccine_code !== 'MANUAL') return false;
      
      const rName = r.vaccine_name.toLowerCase();
      const checkMatch = (term: string) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(\\b|_)${escaped}(\\b|_)`, 'i').test(rName);
      };
      const matchesIdentity = r.vaccine_code === code || checkMatch(code) || aliases.some(a => checkMatch(a));
      if (!matchesIdentity) return false;

      const rYear = new Date(r.administered_at || r.due_at || '').getFullYear();
      if (rYear !== birthYear) return false;

      return true;
    }).sort((a,b) => new Date(a.administered_at || '').getTime() - new Date(b.administered_at || '').getTime());

    if (manualCompletedMatches[doseNum - 1]) return manualCompletedMatches[doseNum - 1];

    // 2. Secondary: Find any exact match by dose number and code (scheduled/overdue)
    const exact = records.find(r => r.vaccine_code === code && r.dose_number === doseNum);
    if (exact) return exact;

    // 3. Tertiary: Find any manual match (scheduled/overdue)
    if (projectedDate) {
      const pDate = new Date(projectedDate);
      return records.find(r => {
        if (r.vaccine_code && r.vaccine_code !== code && r.vaccine_code !== 'MANUAL') return false;
        if (r.dose_number) return false; 

        const rName = r.vaccine_name.toLowerCase();
        const checkMatch = (term: string) => {
          const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`(\\b|_)${escaped}(\\b|_)`, 'i').test(rName);
        };
        const matchesIdentity = r.vaccine_code === code || checkMatch(code) || aliases.some(a => checkMatch(a));
        if (!matchesIdentity) return false;
        
        const rDate = new Date(r.administered_at || r.due_at || '');
        const diffDays = Math.abs((rDate.getTime() - pDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays < 45; 
      });
    }
    return null;
  }

  const getRecordByYear = (code: string, year: number, minDose: number, projectedDate: string | null) => {
    const targetYear = birthYear + year;
    const aliases = (COMMON_ALIASES[code] || []).map(a => a.toLowerCase());

    // 1. Priority: Find COMPLETED records for this year
    const completedMatch = records.find(r => {
      if (r.status !== 'completed') return false;
      const rDateStr = r.administered_at || r.due_at;
      if (!rDateStr) return false;

      // Logic for Intended Year (metadata check)
      const intendedMatch = r.notes?.match(/\[INTENDED_YEAR:(\d{4})\]/);
      const rYear = intendedMatch ? parseInt(intendedMatch[1]) : new Date(rDateStr).getFullYear();

      if (rYear !== targetYear) return false;

      if (r.vaccine_code && r.vaccine_code !== code && r.vaccine_code !== 'MANUAL') return false;

      const rName = r.vaccine_name.toLowerCase();
      const checkMatch = (term: string) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(\\b|_)${escaped}(\\b|_)`, 'i').test(rName);
      };
      return r.vaccine_code === code || checkMatch(code) || aliases.some(a => checkMatch(a));
    });
    if (completedMatch) return completedMatch;

    // 2. Secondary: Exact match by year and dose number (scheduled/overdue)
    const exact = records.find(r => {
      const rDateStr = r.administered_at || r.due_at;
      if (!rDateStr) return false;
      const rYear = new Date(rDateStr).getFullYear();
      return r.vaccine_code === code && rYear === targetYear && (r.dose_number || 0) >= minDose;
    });
    if (exact) return exact;

    // 3. Tertiary: Any alias match by year
    return records.find(r => {
      const rDateStr = r.administered_at || r.due_at;
      if (!rDateStr) return false;
      const rYear = new Date(rDateStr).getFullYear();
      if (rYear !== targetYear) return false;

      if (r.vaccine_code && r.vaccine_code !== code && r.vaccine_code !== 'MANUAL') return false;

      const rName = r.vaccine_name.toLowerCase();
      const checkMatch = (term: string) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(\\b|_)${escaped}(\\b|_)`, 'i').test(rName);
      };
      return checkMatch(code) || aliases.some(a => checkMatch(a));
    });
  }

  const getCellState = (record: VRecord | undefined | null, projectedDate: string | null) => {
    if (record) {
      if (record.status === 'completed') return { date: record.administered_at || projectedDate, bg: 'bg-[#4CAF50] text-black border-slate-300 hover:opacity-80 cursor-pointer transition-all', emoji: '✅', record, title: `Yapıldı: ${new Date(record.administered_at || '').toLocaleDateString('tr-TR')}` };
      if (record.status === 'skipped' || record.status === 'overdue') return { date: record.due_at || projectedDate, bg: 'bg-[#F44336] text-white border-slate-300 hover:opacity-80 cursor-pointer transition-all', emoji: '⚠️', record, title: `Gecikti/Atlandı.` };
      return { date: record.due_at || projectedDate, bg: 'bg-white text-text-primary border-slate-300 hover:bg-primary/10 cursor-pointer transition-all', emoji: '🔜', record, title: `Planlandı: ${new Date(record.due_at || projectedDate || '').toLocaleDateString('tr-TR')}` };
    }
    return { date: projectedDate, bg: 'bg-white text-text-primary border-slate-300 opacity-60', emoji: '', record: null, title: `Tahmini: ${projectedDate ? new Date(projectedDate).toLocaleDateString('tr-TR') : ''}` };
  }

  const rows = vaccineTemplates.map(tmpl => {
    const isMultiDose = (tmpl.dose_count || 1) > 1;
    const getInterval = (doseIdx: number) => {
      if (Array.isArray(tmpl.dose_interval_days)) {
        return tmpl.dose_interval_days[doseIdx] || 21;
      }
      return (tmpl.dose_interval_days as unknown as number) || 21;
    };
    const aliases = (COMMON_ALIASES[tmpl.vaccine_code] || []).map(a => a.toLowerCase());

    // 1. Gather all potentially matching records for this row
    const rowRecords = records.filter(r => {
      if (r.vaccine_code === tmpl.vaccine_code) return true;
      if (r.vaccine_code === 'MANUAL' || !r.vaccine_code) {
        const rName = r.vaccine_name.toLowerCase();
        const checkMatch = (term: string) => {
          const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`(\\b|_)${escaped}(\\b|_)`, 'i').test(rName);
        };
        return checkMatch(tmpl.vaccine_code) || aliases.some(a => checkMatch(a));
      }
      return false;
    });

    const completedRowRecords = rowRecords
      .filter(r => r.status === 'completed')
      .sort((a, b) => new Date(a.administered_at || '').getTime() - new Date(b.administered_at || '').getTime());

    const otherRowRecords = rowRecords.filter(r => r.status !== 'completed');

    // 2. Build Puppy Series (Year 0)
    const doseCells: any[] = [];
    const doseDates: (string | null)[] = [];
    
    for (let d = 1; d <= (tmpl.dose_count || 1); d++) {
      let projectedDate: string | null = null;
      if (d === 1) {
        if (pet.birth_date) {
          const bd = new Date(pet.birth_date);
          bd.setDate(bd.getDate() + (tmpl.first_dose_week || 6) * 7);
          projectedDate = bd.toISOString();
        } else {
          projectedDate = new Date().toISOString();
        }
      } else {
        const prevDate = doseDates[d - 2];
        if (prevDate) {
          const bd = new Date(prevDate);
          bd.setDate(bd.getDate() + getInterval(d - 2));
          projectedDate = bd.toISOString();
        }
      }

      const activeRecord = getRecordByCodeAndDose(tmpl.vaccine_code, d, projectedDate);
      const displayDate = activeRecord?.administered_at || activeRecord?.due_at || projectedDate;
      
      doseCells.push(getCellState(activeRecord, displayDate));
      doseDates.push(displayDate);
    }

    const lastDoseDate = doseDates[doseDates.length - 1];

    // 3. Build Annual Boosters (Years 1..N)
    const yearCells: any[] = [];
    yearCells.push({ doses: doseCells }); // Year 0 slot

    const seriesCount = tmpl.dose_count || 1;

    for (let year = 1; year <= maxYearsToShow; year++) {
      if (!tmpl.has_annual_booster) {
        yearCells.push(null);
        continue;
      }
      const targetYear = birthYear + year;

      // Calculate projected date — base it on previous ACTUAL administered date if available
      let prevRef: string | null = null;
      if (year === 1) {
        const lastActual = getRecordByCodeAndDose(tmpl.vaccine_code, seriesCount, lastDoseDate);
        prevRef = lastActual?.administered_at || lastDoseDate;
      } else {
        const prevCell = yearCells[year - 1];
        prevRef = prevCell?.record?.administered_at || prevCell?.date || null;
      }

      let projectedAnnualDate: string | null = null;
      if (prevRef) {
        const d = new Date(prevRef);
        if (tmpl.recurrence_days) {
          d.setDate(d.getDate() + tmpl.recurrence_days);
        } else {
          d.setFullYear(d.getFullYear() + 1);
        }
        projectedAnnualDate = d.toISOString();
      }

      const activeRecord = getRecordByYear(tmpl.vaccine_code, year, seriesCount + year, projectedAnnualDate);
      const annualDate = activeRecord?.administered_at || activeRecord?.due_at || projectedAnnualDate;
      
      yearCells.push(getCellState(activeRecord, annualDate));
    }


    return {
      name: tmpl.vaccine_name,
      code: tmpl.vaccine_code,
      mandatory: tmpl.mandatory_level,
      diseases: (tmpl.protects_against || []).join(', '),
      isMultiDose,
      doseCount: tmpl.dose_count || 1,
      hasAnnual: tmpl.has_annual_booster,
      is_active: tmpl.is_active,
      yearCells
    };
  });

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-[16px] font-extrabold text-text-primary">Aşı Takvimi Matrisi</h3>
          {onBatchScan && (
            <div className="relative">
              <CoachMark
                hintKey="vaccine_scan_hint"
                title="Karneyi / Etiketi Tara"
                message="Dostunun aşı defterinin veya ilacın üzerindeki etiketin fotoğrafını çekerek aşıyı saniyeler içinde otomatik olarak takvime işleyebilirsin."
                icon="📸"
                position="bottom"
                condition={records.filter((r: any) => r.status === 'completed').length === 0 && wizardDismissed}
                delay={3000}
              />
              <ScanButton onBatchScan={onBatchScan} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNewRecord && (
            <div className="relative">
              <CoachMark
                hintKey="vaccine_manual_record_intro"
                title="Elle Aşı Kaydı Ekle"
                message="Dostunun geçmişte yapılmış bir aşısını doğrudan elle kaydetmek istersen bu butona dokunarak bilgileri girebilirsin."
                icon="✅"
                position="bottom"
                condition={records.filter((r: any) => r.status === 'completed').length === 0 && wizardDismissed}
                delay={2500}
              />
              <button 
                onClick={() => onNewRecord('', '', new Date().toISOString())}
                className="flex items-center gap-2 px-3 py-2 bg-success/5 text-success hover:bg-success/10 transition-all rounded-xl border border-success/20 group shadow-sm animate-pulse-slow"
              >
                <span className="text-[16px] group-hover:scale-110 transition-transform">✅</span>
                <span className="text-[11px] font-black uppercase tracking-wider">Yapıldı Kaydı Ekle</span>
              </button>
            </div>
          )}
          {onNewPlan && (
            <button 
              onClick={() => onNewPlan('', '', new Date().toISOString())}
              className="flex items-center gap-2 px-3 py-2 bg-primary/5 text-primary hover:bg-primary/10 transition-all rounded-xl border border-primary/20 group shadow-sm"
            >
              <span className="text-[16px] group-hover:scale-110 transition-transform">📅</span>
              <span className="text-[11px] font-black uppercase tracking-wider">Yeni Plan Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* Legend — tablonun üstünde, her zaman görünür */}
      <div className="mb-3 flex flex-wrap gap-3 text-[12px] font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-1.5"><span className="text-[14px]">✅</span><div className="w-4 h-4 bg-[#4CAF50] border border-slate-300 rounded"></div><span className="text-text-primary">Yapıldı — tıkla, düzenle</span></div>
        <div className="flex items-center gap-1.5"><span className="text-[14px]">⚠️</span><div className="w-4 h-4 bg-[#F44336] border border-slate-300 rounded"></div><span className="text-text-primary">Gecikti / Atlandı</span></div>
        <div className="flex items-center gap-1.5"><span className="text-[14px]">🔜</span><div className="w-4 h-4 bg-white border border-slate-300 rounded"></div><span className="text-text-primary">Planlandı</span></div>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {rows.map((row: any, i: number) => {
          const dose1 = row.yearCells[0]?.doses?.[0];
          const dose2 = row.yearCells[0]?.doses?.[1];
          const mandatoryLabel = row.mandatory === 'core' ? 'Temel' : row.mandatory === 'optional' ? 'Seçmeli' : 'Yasal Zorunlu';
          const mandatoryColor = row.mandatory === 'legal_required' ? 'bg-red-100 text-red-700' : row.mandatory === 'core' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600';
          return (
            <div key={i} className={`border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm ${!row.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex flex-col gap-0.5">
                  <span className={`font-extrabold text-[13px] ${!row.is_active ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                    {getDisplayName(row.name, row.code)}
                  </span>
                  {row.diseases && <span className="text-[10px] text-text-secondary leading-tight">{row.diseases}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${mandatoryColor}`}>{mandatoryLabel}</span>
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{row.code}</span>
                  {!row.is_active && <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">Pasif</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                {dose1 && (
                  <button
                    className={`flex flex-col items-center px-3 py-2 rounded-xl border text-[11px] font-bold min-w-[70px] transition-all ${!row.is_active ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : dose1.bg}`}
                    onClick={() => handleMatrixClick(dose1, row, pet.id, onCellClick)}
                  >
                    <span className="text-[11px] uppercase tracking-wide opacity-70 mb-0.5">1. Doz</span>
                    <span>{!row.is_active ? 'Pasif' : (dose1.record ? formatDate(dose1.date) : '—')}</span>
                  </button>
                )}
                {dose2 && (
                  <button
                    className={`flex flex-col items-center px-3 py-2 rounded-xl border text-[11px] font-bold min-w-[70px] transition-all ${!row.is_active ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : dose2.bg}`}
                    onClick={() => handleMatrixClick(dose2, row, pet.id, onCellClick)}
                  >
                    <span className="text-[11px] uppercase tracking-wide opacity-70 mb-0.5">2. Doz</span>
                    <span>{!row.is_active ? 'Pasif' : (dose2.record ? formatDate(dose2.date) : '—')}</span>
                  </button>
                )}
                {row.yearCells.slice(1).map((cell: any, idx: number) => {
                  if (!row.hasAnnual) return null;
                  const yearNum = idx + 1;
                  return (
                    <button
                      key={idx}
                      className={`flex flex-col items-center px-3 py-2 rounded-xl border text-[11px] font-bold min-w-[70px] transition-all ${(!row.is_active || !cell) ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : cell.bg}`}
                      onClick={() => handleMatrixClick(cell, row, pet.id, onCellClick)}
                    >
                      <span className="text-[11px] uppercase tracking-wide opacity-70 mb-0.5">{yearNum}. Yaş</span>
                      <span>{!row.is_active ? 'Pasif' : (cell?.record ? formatDate(cell.date) : '—')}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="hidden md:block overflow-x-auto border border-slate-300 rounded-lg shadow-sm">
        <table className="w-full text-[12px] text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-500 text-white">
              <th colSpan={4} className="p-2 border-r border-slate-600"></th>
              {years.map(year => (
                <th key={year} colSpan={year === 0 ? 2 : 1} className="p-2 border-r border-slate-600 text-center font-bold">
                  <div>{year === 0 ? 'İlk Yıl' : `${year}. Yaş`}</div>
                  <div className="text-[10px] font-normal opacity-80 mt-0.5">{birthYear + year}</div>
                </th>
              ))}
            </tr>
            <tr className="bg-slate-400 text-white">
              <th className="p-2 border border-slate-500 font-bold whitespace-nowrap sticky left-0 z-10 bg-slate-400">Aşı Adı</th>
              <th className="p-2 border border-slate-500 font-bold">Kod</th>
              <th className="p-2 border border-slate-500 font-bold">Zorunluluk</th>
              <th className="p-2 border border-slate-500 font-bold">Koruduğu Hastalıklar</th>
              {years.map(year => (
                <Fragment key={year}>
                  {year === 0 ? (
                    <>
                      <th className="p-2 border border-slate-500 font-bold text-center">1.Doz</th>
                      <th className="p-2 border border-slate-500 font-bold text-center">2.Doz</th>
                    </>
                  ) : (
                    <th className="p-2 border border-slate-500 font-bold text-center">Tekrar</th>
                  )}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className={`p-2 border border-slate-300 font-bold whitespace-nowrap sticky left-0 z-10 bg-white ${!row.is_active ? 'text-text-secondary opacity-60' : 'text-text-primary'}`}>
                  <div className="flex items-center gap-2">
                    <span className={!row.is_active ? 'line-through' : ''}>{getDisplayName(row.name, row.code)}</span>
                    {!row.is_active && (
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">Pasif</span>
                    )}
                  </div>
                </td>
                <td className="p-2 border border-slate-300 bg-white text-text-primary">{row.code}</td>
                <td className={`p-2 border border-slate-300 whitespace-nowrap bg-white text-text-primary ${row.mandatory === 'legal_required' ? 'font-bold' : ''}`}>
                  {row.mandatory === 'core' ? 'Temel' : row.mandatory === 'optional' ? 'Seçmeli' : 'Yasal Zorunlu'}
                </td>
                <td className="p-2 border border-slate-300 text-[11px] bg-white text-text-primary leading-tight">{row.diseases}</td>

                {row.yearCells.map((cell: any, idx: number) => {
                  if (idx === 0) {
                    // First year: render each dose
                    const dose1 = row.yearCells[0].doses?.[0];
                    const dose2 = row.yearCells[0].doses?.[1];
                    return (
                      <Fragment key={idx}>
                        <td
                          className={`p-2 border text-center font-medium transition-all ${
                            !row.is_active 
                              ? 'bg-slate-100/50 border-slate-200 text-slate-300 cursor-not-allowed'
                              : (dose1?.bg || 'bg-white border-slate-300 opacity-60')
                          }`}
                          style={!row.is_active ? { 
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px)' 
                          } : {}}
                          title={!row.is_active ? 'Bu aşı pasif durumdadır.' : (dose1?.title || '')}
                          onClick={() => handleMatrixClick(dose1, row, pet.id, onCellClick)}
                        >
                          {!row.is_active ? <span className="font-bold text-[10px] tracking-wider uppercase text-slate-400">Pasif</span> : dose1?.record ? <span className="flex flex-col items-center gap-0"><span className="text-[11px]">{dose1.emoji}</span><span>{formatDate(dose1.date)}</span></span> : ''}
                        </td>
                        {dose2 ? (
                          <td
                            className={`p-2 border text-center font-medium transition-all ${
                              !row.is_active 
                                ? 'bg-slate-100/50 border-slate-200 text-slate-300 cursor-not-allowed'
                                : (dose2.bg)
                            }`}
                            style={!row.is_active ? { 
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px)' 
                            } : {}}
                            title={!row.is_active ? 'Bu aşı pasif durumdadır.' : (dose2.title || '')}
                            onClick={() => handleMatrixClick(dose2, row, pet.id, onCellClick)}
                          >
                            {!row.is_active ? <span className="font-bold text-[10px] tracking-wider uppercase text-slate-400">Pasif</span> : dose2.record ? <span className="flex flex-col items-center gap-0"><span className="text-[11px]">{dose2.emoji}</span><span>{formatDate(dose2.date)}</span></span> : ''}
                          </td>
                        ) : (
                          <td className="p-2 border border-slate-300 bg-slate-100 opacity-30"></td>
                        )}
                      </Fragment>
                    );
                  }
                  // Subsequent years: annual booster or grayed out
                  return (
                    <Fragment key={idx}>
                      <td
                        className={`p-2 border text-center font-medium transition-all ${
                          (!row.is_active || !cell) 
                            ? 'bg-slate-100/50 border-slate-200 text-slate-300 cursor-not-allowed'
                            : (cell.bg)
                        }`}
                        style={(!row.is_active || !cell) ? { 
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px)' 
                        } : {}}
                        title={!row.is_active ? 'Bu aşı pasif durumdadır.' : (!cell ? 'Bu protokol yıllık tekrar gerektirmez.' : (cell.title || ''))}
                        onClick={() => handleMatrixClick(cell, row, pet.id, onCellClick)}
                      >
                        {!row.is_active ? <span className="font-bold text-[10px] tracking-wider uppercase text-slate-400">Pasif</span> : cell?.record ? <span className="flex flex-col items-center gap-0"><span className="text-[11px]">{cell.emoji}</span><span>{formatDate(cell.date)}</span></span> : ''}
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}

// ── Parasite Protocol Table Component ───────────────────────────────────
function ParasiteTable({ pet, templates, records, onCellClick, onNewRecord, onNewPlan, onBatchScan, wizardDismissed = true }: { 
  pet: Pet; 
  templates: Template[]; 
  records: VRecord[]; 
  onCellClick?: (record: VRecord) => void;
  onNewRecord?: (name: string, code: string, date: string) => void;
  onNewPlan?: (name: string, code: string, date: string) => void;
  onBatchScan?: () => void;
  wizardDismissed?: boolean;
}) {
  const parasiteTemplates = templates.filter(t => t.category === 'parasite');

  if (parasiteTemplates.length === 0) return null;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear().toString().slice(-2)}`;
  }

  const getCellState = (record: VRecord | undefined | null, projectedDate: string | null) => {
    if (record) {
      if (record.status === 'completed') return { date: record.administered_at || projectedDate, bg: 'bg-[#4CAF50] text-black border-slate-300 hover:opacity-80 cursor-pointer transition-all', emoji: '✅', record, title: `Yapıldı: ${new Date(record.administered_at || '').toLocaleDateString('tr-TR')}` };
      if (record.status === 'skipped' || record.status === 'overdue') return { date: record.due_at || projectedDate, bg: 'bg-[#F44336] text-white border-slate-300 hover:opacity-80 cursor-pointer transition-all', emoji: '⚠️', record, title: `Gecikti/Atlandı.` };
      return { date: record.due_at || projectedDate, bg: 'bg-white text-text-primary border-slate-300 hover:bg-primary/10 cursor-pointer transition-all', emoji: '🔜', record, title: `Planlandı: ${new Date(record.due_at || projectedDate || '').toLocaleDateString('tr-TR')}` };
    }
    return { date: projectedDate, bg: 'bg-white text-text-primary border-slate-300 opacity-60', emoji: '', record: null, title: `Tahmini: ${projectedDate ? new Date(projectedDate).toLocaleDateString('tr-TR') : ''}` };
  }

  const columns = ['Son Uygulama', 'Sıradaki Bekleyen', 'Gelecek Plan 1', 'Gelecek Plan 2', 'Gelecek Plan 3', 'Gelecek Plan 4'];

  const rows = parasiteTemplates.map(tmpl => {
    const tmplNameLower = tmpl.vaccine_name.toLowerCase()
    const tmplCodeLower = tmpl.vaccine_code.toLowerCase()

    const sortedRecords = records
      .filter(r => {
        if (r.vaccine_code === tmpl.vaccine_code) return true
        // MANUAL or missing code — match by name similarity
        if (!r.vaccine_code || r.vaccine_code === 'MANUAL') {
          const rName = r.vaccine_name.toLocaleLowerCase('tr-TR')
          const tName = tmpl.vaccine_name.toLocaleLowerCase('tr-TR')
          const aliases = (COMMON_ALIASES[tmpl.vaccine_code] || []).map(a => a.toLocaleLowerCase('tr-TR'));
          
          if (rName.includes(tName) || tName.includes(rName)) return true;
          if (aliases.some(a => rName.includes(a) || a.includes(rName))) return true;

          // Parazit spesifik kelime eşleşmesi
          if (rName.includes('parazit') && tName.includes('parazit')) {
             if (rName.includes('iç') && tName.includes('iç')) return true;
             if (rName.includes('dış') && tName.includes('dış')) return true;
          }

          return rName.includes(tmplNameLower) ||
                 rName.includes(tmplCodeLower) ||
                 tmplNameLower.split(' ').some((part: string) => part.length > 3 && rName.includes(part)) ||
                 tmplCodeLower.split('_').some((part: string) => part.length > 2 && rName.includes(part))
        }
        return false
      })
      .sort((a, b) => new Date(a.due_at || '').getTime() - new Date(b.due_at || '').getTime());

    const completedRecords = sortedRecords.filter(r => r.status === 'completed').sort((a, b) => new Date(b.administered_at || b.due_at || '').getTime() - new Date(a.administered_at || a.due_at || '').getTime());
    const pendingRecords = sortedRecords.filter(r => r.status !== 'completed' && r.status !== 'skipped' && r.status !== 'invalid');

    const lastCompleted = completedRecords.length > 0 ? completedRecords[0] : null;
    const nextPending = pendingRecords.length > 0 ? pendingRecords[0] : null;

    const cells: any[] = [];
    
    // 1. Son Uygulama (Last)
    cells.push(getCellState(lastCompleted, lastCompleted?.administered_at || null));

    // 2. Sıradaki (Next Due)
    let nextDateStr = nextPending?.due_at || null;
    if (!nextDateStr && lastCompleted && tmpl.recurrence_days) {
      const d = new Date(lastCompleted.administered_at || lastCompleted.due_at || new Date().toISOString());
      d.setDate(d.getDate() + tmpl.recurrence_days);
      nextDateStr = d.toISOString();
    }
    if (!nextDateStr && !lastCompleted && !nextPending) {
      nextDateStr = new Date().toISOString();
    }
    cells.push(getCellState(nextPending, nextDateStr));

    // 3, 4, 5, 6. Gelecek (Future Projections)
    let refDate = nextDateStr || new Date().toISOString();
    for (let i = 0; i < 4; i++) {
      if (tmpl.recurrence_days) {
        const d = new Date(refDate);
        d.setDate(d.getDate() + tmpl.recurrence_days);
        refDate = d.toISOString();
        
        const targetYear = d.getFullYear();
        const targetMonth = d.getMonth();
        const futureRec = pendingRecords.find(r => r !== nextPending && new Date(r.due_at || '').getFullYear() === targetYear && new Date(r.due_at || '').getMonth() === targetMonth);
        cells.push(getCellState(futureRec, refDate));
      } else {
        cells.push(null);
      }
    }

    return {
      name: tmpl.vaccine_name,
      code: tmpl.vaccine_code,
      frequency: tmpl.recurrence_days ? `${tmpl.recurrence_days} günde bir` : 'Tek Seferlik',
      is_active: tmpl.is_active,
      cells
    };
  });

  return (
    <div className="mb-8 mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-[16px] font-extrabold text-text-primary">Parazit Takvimi Matrisi</h3>
          {onBatchScan && (
            <div className="relative">
              <CoachMark
                hintKey="parasite_scan_hint"
                title="Parazit Etiketini Tara"
                message="Uyguladığın dış/iç parazit damla veya hap kutusunun üzerindeki etiketi fotoğraflayarak koruma kaydını anında sisteme ekleyebilirsin."
                icon="📸"
                position="bottom"
                condition={records.filter((r: any) => r.status === 'completed').length === 0 && wizardDismissed}
                delay={3000}
              />
              <ScanButton onBatchScan={onBatchScan} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onNewRecord && (
            <div className="relative">
              <CoachMark
                hintKey="parasite_manual_record_intro"
                title="Elle Parazit Kaydı Ekle"
                message="Geçmişte uyguladığın parazit tedavilerini (hap/damla) doğrudan elle kaydetmek için bu butonu kullanabilirsin."
                icon="✅"
                position="bottom"
                condition={records.filter((r: any) => r.status === 'completed').length === 0 && wizardDismissed}
                delay={2500}
              />
              <button 
                onClick={() => onNewRecord('', '', new Date().toISOString())}
                className="flex items-center gap-2 px-3 py-2 bg-success/5 text-success hover:bg-success/10 transition-all rounded-xl border border-success/20 group shadow-sm"
              >
                <span className="text-[16px] group-hover:scale-110 transition-transform">✅</span>
                <span className="text-[11px] font-black uppercase tracking-wider">Yapıldı Kaydı Ekle</span>
              </button>
            </div>
          )}
          {onNewPlan && (
            <button 
              onClick={() => onNewPlan('', '', new Date().toISOString())}
              className="flex items-center gap-2 px-3 py-2 bg-primary/5 text-primary hover:bg-primary/10 transition-all rounded-xl border border-primary/20 group shadow-sm"
            >
              <span className="text-[16px] group-hover:scale-110 transition-transform">📅</span>
              <span className="text-[11px] font-black uppercase tracking-wider">Yeni Plan Ekle</span>
            </button>
          )}
        </div>
      </div>

      {/* Legend — tablonun üstünde, her zaman görünür */}
      <div className="mb-3 flex flex-wrap gap-3 text-[12px] font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-1.5"><span className="text-[14px]">✅</span><div className="w-4 h-4 bg-[#4CAF50] border border-slate-300 rounded"></div><span className="text-text-primary">Yapıldı — tıkla, düzenle</span></div>
        <div className="flex items-center gap-1.5"><span className="text-[14px]">⚠️</span><div className="w-4 h-4 bg-[#F44336] border border-slate-300 rounded"></div><span className="text-text-primary">Gecikti / Atlandı</span></div>
        <div className="flex items-center gap-1.5"><span className="text-[14px]">🔜</span><div className="w-4 h-4 bg-white border border-slate-300 rounded"></div><span className="text-text-primary">Planlandı</span></div>
      </div>

      <div className="md:hidden flex flex-col gap-3">
        {rows.map((row: any, i: number) => (
          <div key={i} className={`border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm ${!row.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div className="flex flex-col gap-0.5">
                <span className={`font-extrabold text-[13px] ${!row.is_active ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                  {getDisplayName(row.name, row.code)}
                </span>
                <span className="text-[10px] text-text-secondary">{row.frequency}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{row.code}</span>
                {!row.is_active && <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">Pasif</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 p-3">
              {row.cells.map((cell: any, idx: number) => (
                <button
                  key={idx}
                  className={`flex flex-col items-center px-3 py-2 rounded-xl border text-[11px] font-bold min-w-[80px] transition-all ${!row.is_active ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : (cell ? cell.bg : 'bg-slate-100 border-slate-200 text-slate-400')}`}
                  onClick={() => handleMatrixClick(cell, row, pet.id, onCellClick)}
                >
                  <span className="text-[11px] uppercase tracking-wide opacity-70 mb-0.5">{columns[idx]}</span>
                  {!row.is_active ? <span>Pasif</span> : cell?.record ? <><span className="text-[12px]">{cell.emoji}</span><span>{formatDate(cell.date)}</span></> : cell?.date ? <><span className="text-[12px] opacity-40">🔜</span><span className="opacity-60">{formatDate(cell.date)}</span></> : <span>{idx === 0 ? '—' : ''}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto border border-slate-300 rounded-lg shadow-sm">
        <table className="w-full text-[12px] text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-500 text-white">
              <th colSpan={3} className="p-2 border-r border-slate-600"></th>
              <th colSpan={6} className="p-2 border-slate-600 text-center font-bold">Uygulama Zaman Çizelgesi</th>
            </tr>
            <tr className="bg-slate-400 text-white">
              <th className="p-2 border border-slate-500 font-bold whitespace-nowrap sticky left-0 z-10 bg-slate-400">Parazit Koruması</th>
              <th className="p-2 border border-slate-500 font-bold">Kod</th>
              <th className="p-2 border border-slate-500 font-bold">Sıklık</th>
              {columns.map(col => (
                <th key={col} className="p-2 border border-slate-500 font-bold text-center whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className={`p-2 border border-slate-300 font-bold whitespace-nowrap sticky left-0 z-10 bg-white ${!row.is_active ? 'text-text-secondary opacity-60' : 'text-text-primary'}`}>
                  <div className="flex items-center gap-2">
                    <span className={!row.is_active ? 'line-through' : ''}>{getDisplayName(row.name, row.code)}</span>
                    {!row.is_active && (
                      <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">Pasif</span>
                    )}
                  </div>
                </td>
                <td className="p-2 border border-slate-300 bg-white text-text-primary">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-text-secondary text-[10px] font-bold">{row.code}</span>
                </td>
                <td className={`p-2 border border-slate-300 text-[11px] bg-white text-text-primary leading-tight font-medium whitespace-nowrap ${!row.is_active ? 'opacity-50' : ''}`}>
                  {row.frequency}
                </td>

                {row.cells.map((cell: any, idx: number) => (
                  <td
                    key={idx}
                    className={`p-2 border text-center font-medium transition-all ${
                      !row.is_active 
                        ? 'bg-slate-100/50 border-slate-200 text-slate-300 cursor-not-allowed'
                        : (cell ? cell.bg : 'bg-slate-200 opacity-40')
                    }`}
                    style={!row.is_active ? { 
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px)' 
                    } : {}}
                    title={!row.is_active ? 'Bu protokol pasif durumdadır.' : (cell?.title || '')}
                    onClick={() => handleMatrixClick(cell, row, pet.id, onCellClick)}
                  >
                    {!row.is_active ? <span className="font-bold text-[10px] tracking-wider uppercase text-slate-400">Pasif</span> : cell?.record ? <span className="flex flex-col items-center gap-0"><span className="text-[11px]">{cell.emoji}</span><span>{formatDate(cell.date)}</span></span> : cell?.date ? <span className="flex flex-col items-center gap-0"><span className="text-[11px] opacity-40">🔜</span><span className="opacity-60">{formatDate(cell.date)}</span></span> : <span>{idx === 0 ? '-' : ''}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function VaccineOSClient({ pet, setupProfile, vaccineRecords: allRecords, templates: allTemplates, components = [], isTab = false, categoryFilter }: {
  pet: Pet; setupProfile: SetupProfile; vaccineRecords: VRecord[]; templates: Template[]; components?: VComponent[]; isTab?: boolean; categoryFilter?: 'vaccine' | 'parasite'
}) {
  const router = useRouter()


  // Filter templates and records based on categoryFilter and is_active status
  const templates = (categoryFilter 
    ? allTemplates.filter(t => categoryFilter === 'parasite' ? t.category === 'parasite' : t.category !== 'parasite')
    : allTemplates);

  const baseRecords = categoryFilter
    ? allRecords.filter(r => {
        const tmpl = allTemplates.find(t => t.vaccine_code === r.vaccine_code);
        if (!tmpl) return categoryFilter === 'vaccine';
        return categoryFilter === 'parasite' ? tmpl.category === 'parasite' : tmpl.category !== 'parasite';
      })
    : allRecords;

  // Synchronize dynamic Matrix projections with actual lists (overdue/due)
  const vaccineRecords = useMemo(() => {
    const augmented = [...baseRecords];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    templates.forEach(tmpl => {
      if (!tmpl.is_active) return;
      
      const aliases = (COMMON_ALIASES[tmpl.vaccine_code] || []).map(a => a.toLowerCase());
      const tmplRecords = baseRecords.filter(r => {
         if (r.vaccine_code === tmpl.vaccine_code) return true;
         if (r.vaccine_code === 'MANUAL' || !r.vaccine_code) {
             const rName = r.vaccine_name.toLowerCase();
             const checkMatch = (term: string) => {
               const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
               return new RegExp(`(\\b|_)${escaped}(\\b|_)`, 'i').test(rName);
             };
             return checkMatch(tmpl.vaccine_code) || aliases.some(a => checkMatch(a));
         }
         return false;
      });

      const completedDoses = tmplRecords.filter(r => r.status === 'completed').length;
      
      // 1. Missing first dose
      if (tmplRecords.length === 0) {
        let projectedDate = new Date();
        if (pet.birth_date) {
           projectedDate = new Date(pet.birth_date);
           projectedDate.setDate(projectedDate.getDate() + (tmpl.first_dose_week || 6) * 7);
        }
        const pDateStr = projectedDate.toISOString();
        const isOverdue = projectedDate < now && pDateStr.split('T')[0] !== todayStr;
        
        augmented.push({
           id: `virtual_${tmpl.vaccine_code}_1`,
           pet_id: pet.id,
           vaccine_code: tmpl.vaccine_code,
           vaccine_name: tmpl.vaccine_name,
           dose_number: 1,
           status: isOverdue ? 'overdue' : 'due',
           due_at: pDateStr,
           confidence_level: 'estimated',
           created_at: pDateStr,
           updated_at: pDateStr,
           _isVirtual: true
        } as any);
      } 
      // 2. Missing subsequent series doses
      else if (tmplRecords.length > 0 && tmpl.dose_count > 1 && completedDoses < tmpl.dose_count) {
         const completedList = tmplRecords.filter(r => r.status === 'completed').sort((a,b) => (a.dose_number || 0) - (b.dose_number || 0));
         const lastCompleted = completedList[completedList.length - 1];
         
         if (lastCompleted && lastCompleted.dose_number && lastCompleted.dose_number < tmpl.dose_count) {
             const nextDoseNum = lastCompleted.dose_number + 1;
             const hasNext = tmplRecords.some(r => r.dose_number === nextDoseNum || r.status !== 'completed');
             if (!hasNext && lastCompleted.administered_at) {
                 const bd = new Date(lastCompleted.administered_at);
                 const interval = Array.isArray(tmpl.dose_interval_days) 
                   ? (tmpl.dose_interval_days[lastCompleted.dose_number - 1] || 21)
                   : (tmpl.dose_interval_days as any || 21);
                 bd.setDate(bd.getDate() + interval);
                 const pDateStr = bd.toISOString();
                 const isOverdue = bd < now && pDateStr.split('T')[0] !== todayStr;
                 
                 augmented.push({
                   id: `virtual_${tmpl.vaccine_code}_${nextDoseNum}`,
                   pet_id: pet.id,
                   vaccine_code: tmpl.vaccine_code,
                   vaccine_name: tmpl.vaccine_name,
                   dose_number: nextDoseNum,
                   status: isOverdue ? 'overdue' : 'due',
                   due_at: pDateStr,
                   confidence_level: 'estimated',
                   created_at: pDateStr,
                   updated_at: pDateStr,
                   _isVirtual: true
                 } as any)
             }
         }
      }
      // 3. Missing Annual Boosters / Recurrence
      else if ((tmpl.has_annual_booster || tmpl.recurrence_days) && completedDoses >= tmpl.dose_count) {
         const lastRecord = tmplRecords.filter(r => r.status === 'completed').sort((a,b) => new Date(a.administered_at || '').getTime() - new Date(b.administered_at || '').getTime()).pop();
         if (lastRecord && lastRecord.administered_at) {
             const bd = new Date(lastRecord.administered_at);
             if (tmpl.recurrence_days) {
                 bd.setDate(bd.getDate() + tmpl.recurrence_days);
             } else {
                 bd.setFullYear(bd.getFullYear() + 1);
             }
             const pDateStr = bd.toISOString();
             
             const hasFutureOrRecent = tmplRecords.some(r => r.status !== 'completed' || (r.status === 'completed' && new Date(r.administered_at!) > new Date(bd.getTime() - 60*24*60*60*1000)));
             
             if (!hasFutureOrRecent) {
                 const isOverdue = bd < now && pDateStr.split('T')[0] !== todayStr;
                 augmented.push({
                   id: `virtual_${tmpl.vaccine_code}_booster`,
                   pet_id: pet.id,
                   vaccine_code: tmpl.vaccine_code,
                   vaccine_name: tmpl.vaccine_name,
                   status: isOverdue ? 'overdue' : 'due',
                   due_at: pDateStr,
                   confidence_level: 'estimated',
                   created_at: pDateStr,
                   updated_at: pDateStr,
                   _isVirtual: true
                 } as any)
             }
         }
      }
    });

    // ── Deduplication Pass ─────────────────────────────────────────
    // If a code has ANY completed record for its primary dose series,
    // remove orphaned overdue/due/scheduled records for the same code.
    // This prevents Matrix ✅ vs List ❌ desync.
    const completedCodes = new Map<string, Date>(); // code → latest administered_at
    templates.forEach(tmpl => {
      const aliases = (COMMON_ALIASES[tmpl.vaccine_code] || []).map(a => a.toLowerCase());
      const checkMatch = (term: string, name: string) => {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(\\b|_)${escaped}(\\b|_)`, 'i').test(name);
      };
      
      const latest = augmented
        .filter(r => r.status === 'completed')
        .filter(r => {
          if (r.vaccine_code === tmpl.vaccine_code) return true;
          if (r.vaccine_code === 'MANUAL' || !r.vaccine_code) {
            const rName = r.vaccine_name.toLowerCase();
            return checkMatch(tmpl.vaccine_code, rName) || aliases.some(a => checkMatch(a, rName));
          }
          return false;
        })
        .map(r => new Date(r.administered_at || r.due_at || ''))
        .sort((a,b) => b.getTime() - a.getTime())[0];
        
      if (latest) completedCodes.set(tmpl.vaccine_code, latest);
    });

    const deduped = augmented.filter(r => {
      // Always keep completed, manual, virtual-less records
      if (r.status === 'completed') return true;
      if (!r.vaccine_code || r.vaccine_code === 'MANUAL') return true;

      const lastCompleted = completedCodes.get(r.vaccine_code);
      if (!lastCompleted) return true; // no completed for this code → keep

      const template = templates.find(t => t.vaccine_code === r.vaccine_code);
      if (!template) return true;

      // For single-dose vaccines: if completed, hide all pending
      if ((template.dose_count || 1) === 1 && !template.has_annual_booster && !template.recurrence_days) {
        return false; // completed single-dose → remove overdue/due
      }

      // For series vaccines: remove only if the overdue record is BEFORE (or same day as) the last completed
      const recordDate = new Date(r.due_at || r.administered_at || '');
      return recordDate > lastCompleted; // only keep future-dated pending records
    });

    // Filter out identical pending/overdue records (likely DB duplicates)
    const uniquePending = new Set();
    const finalDeduped = deduped.filter(r => {
      if (r.status === 'completed' || !r.vaccine_code || r.vaccine_code === 'MANUAL') return true;
      const key = `${r.vaccine_code}_${r.status}_${r.due_at ? r.due_at.split('T')[0] : 'nodate'}_${r.dose_number || '0'}`;
      if (uniquePending.has(key)) return false;
      uniquePending.add(key);
      return true;
    });

    return finalDeduped.sort((a, b) => new Date(a.due_at || '').getTime() - new Date(b.due_at || '').getTime());
  }, [baseRecords, templates, pet]);
  const [setupDone, setSetupDone] = useState(!!setupProfile)
  const [quickMarkRecord, setQuickMarkRecord] = useState<VRecord | null>(null)
  const [postponeRecord, setPostponeRecord] = useState<VRecord | null>(null)
  const [manualConfig, setManualConfig] = useState<{ show: boolean, mode: 'record' | 'plan', fixed: boolean, initialData?: { name: string, code: string, date: string, brand?: string, batch_no?: string, clinic?: string } | null }>({ show: false, mode: 'record', fixed: false })

  const [showOverdueList, setShowOverdueList] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [showBatchScan, setShowBatchScan] = useState(false)
  const [isHistoricalImporting, setIsHistoricalImporting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [dismissedRabiesPrompt, setDismissedRabiesPrompt] = useState(false)
  const [wizardDismissed, setWizardDismissed] = useState(true)

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean
    title: string
    message?: string
    onConfirm: () => void
  }>({ open: false, title: '', onConfirm: () => {} })

  function openConfirm(title: string, message: string | undefined, onConfirm: () => void) {
    setConfirmModal({ open: true, title, message, onConfirm })
  }
  function closeConfirm() {
    setConfirmModal(prev => ({ ...prev, open: false }))
  }

  // Computed stats
  const overdueCount = vaccineRecords.filter(r => r.status === 'overdue').length
  const completedCount = vaccineRecords.filter(r => r.status === 'completed').length
  const dueRecords = vaccineRecords.filter(r => r.status === 'due' || r.status === 'scheduled')
    .sort((a, b) => new Date(a.due_at || '').getTime() - new Date(b.due_at || '').getTime())
  const nextDue = dueRecords[0]

  useEffect(() => {
    const checkWizardStatus = async () => {
      const localDismissed = JSON.parse(localStorage.getItem('odi_hints_dismissed') || '[]');
      if (localDismissed.includes('vaccine_os_onboard_guide')) {
        setWizardDismissed(true);
        return;
      }
      try {
        const res = await fetch('/api/hints');
        if (res.ok) {
          const data = await res.json();
          if (data.dismissed?.includes('vaccine_os_onboard_guide')) {
            setWizardDismissed(true);
            if (!localDismissed.includes('vaccine_os_onboard_guide')) {
              localStorage.setItem('odi_hints_dismissed', JSON.stringify([...localDismissed, 'vaccine_os_onboard_guide']));
            }
          } else {
            setWizardDismissed(false);
          }
        } else {
          setWizardDismissed(false);
        }
      } catch (err) {
        setWizardDismissed(false);
      }
    };
    if (completedCount === 0) {
      checkWizardStatus();
    }
  }, [completedCount]);

  const handleDismissWizard = async () => {
    setWizardDismissed(true);
    const localDismissed = JSON.parse(localStorage.getItem('odi_hints_dismissed') || '[]');
    if (!localDismissed.includes('vaccine_os_onboard_guide')) {
      localStorage.setItem('odi_hints_dismissed', JSON.stringify([...localDismissed, 'vaccine_os_onboard_guide']));
    }
    try {
      await fetch('/api/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint_key: 'vaccine_os_onboard_guide' }),
      });
    } catch (err) {
      console.error(err);
    }
  };
  
  // Progressive Profiling: Check if Rabies is completed to show Phase 3 prompt
  const hasCompletedRabies = vaccineRecords.some(r => 
    r.status === 'completed' && 
    (r.vaccine_code?.toLowerCase() === 'rabies' || r.vaccine_name.toLowerCase().includes('kuduz'))
  )

  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterVaccine, setFilterVaccine] = useState<string>('all')

  const availableYears = useMemo(() => {
    const years = new Set<string>()
    vaccineRecords.forEach(r => {
      const d = r.administered_at || r.due_at
      if (d) years.add(new Date(d).getFullYear().toString())
    })
    return Array.from(years).sort().reverse()
  }, [vaccineRecords])

  const availableVaccines = useMemo(() => {
    const codes = new Set<string>()
    vaccineRecords.forEach(r => {
      if (r.vaccine_code && r.vaccine_code !== 'MANUAL') {
        codes.add(r.vaccine_code)
      }
    })
    return Array.from(codes).map(code => {
      const tmpl = templates.find(t => t.vaccine_code === code)
      return { code, name: tmpl ? tmpl.vaccine_name : code }
    }).sort((a, b) => a.name.localeCompare(b.name))
  }, [vaccineRecords, templates])

  const filteredRecords = useMemo(() => {
    return vaccineRecords.filter(r => {
      if (filterVaccine !== 'all' && r.vaccine_code !== filterVaccine) return false;
      if (filterYear !== 'all') {
        const d = r.administered_at || r.due_at;
        if (!d || new Date(d).getFullYear().toString() !== filterYear) return false;
      }
      return true;
    });
  }, [vaccineRecords, filterVaccine, filterYear]);

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
    setManualConfig({ ...manualConfig, show: false, initialData: null })
    setShowBatchScan(false)
  }

  // Extract unique historical values for suggestions
  const historicalSuggestions = useMemo(() => {
    const clinics = new Set<string>();
    const vets = new Set<string>();
    const brands = new Set<string>();

    allRecords.forEach(r => {
      if (!r.notes) return;
      const parts = r.notes.split(' | ');
      parts.forEach(p => {
        if (p.startsWith('Klinik: ')) clinics.add(toTitleCase(p.replace('Klinik: ', '').trim()));
        if (p.startsWith('Veteriner: ')) vets.add(toTitleCase(p.replace('Veteriner: ', '').trim()));
        if (p.startsWith('Marka: ')) brands.add(toTitleCase(p.replace('Marka: ', '').trim()));
      });
    });

    return {
      clinics: Array.from(clinics).filter(Boolean).sort(),
      vets: Array.from(vets).filter(Boolean).sort(),
      brands: Array.from(brands).filter(Boolean).sort()
    };
  }, [allRecords]);

  // ── Render: NOT SETUP ──
  if (!setupDone) {
    return (
      <div className={isTab ? "w-full" : "w-full mx-auto px-4 py-6"}>
        {!isTab && (
          <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary mb-6">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            {pet.name}
          </Link>
        )}
        <SetupFlow 
          pet={pet} 
          templates={templates} 
          onComplete={() => setSetupDone(true)} 
          onHistoricalImport={() => {
             setSetupDone(true)
             setIsHistoricalImporting(true)
             setShowBatchScan(true)
          }}
        />
      </div>
    )
  }

  // ── Render: MAIN UI ──
  return (
    <div className={isTab ? "w-full flex flex-col gap-5" : "w-full mx-auto px-4 py-6 pb-32 flex flex-col gap-5"}>
      {quickMarkRecord && (
        <VaccineActionModal 
          key={quickMarkRecord.id} 
          record={quickMarkRecord} 
          allRecords={vaccineRecords} 
          suggestions={historicalSuggestions}
          templates={templates}
          components={components}
          onClose={() => setQuickMarkRecord(null)} 
          onDone={refreshData} 
        />
      )}
      {postponeRecord && (
        <PostponeModal record={postponeRecord} onClose={() => setPostponeRecord(null)} onDone={() => { setPostponeRecord(null); refreshData() }} />
      )}
      {manualConfig.show && (
        <ManualVaccineModal 
          petId={pet.id} 
          templates={templates} 
          components={components}
          suggestions={historicalSuggestions}
          initialMode={manualConfig.mode}
          fixedMode={manualConfig.fixed}
          initialData={manualConfig.initialData}
          onClose={() => setManualConfig({ ...manualConfig, show: false, initialData: null })} 
          onDone={refreshData} 
        />
      )}


      {showBatchScan && (
        <BatchScanModal
          petId={pet.id}
          templates={templates}
          allRecords={vaccineRecords}
          isSetupPhase={isHistoricalImporting}
          onClose={async () => {
            setShowBatchScan(false)
            if (isHistoricalImporting) {
              await generateFutureScheduleFromPastRecords(pet.id)
              setIsHistoricalImporting(false)
              refreshData()
            }
          }}
          onDone={refreshData}
          defaultVetName={pet.vet_name || undefined}
        />
      )}

      {/* ── Progressive Profiling: Phase 3 (Resmi Kayıtlar) Smart Card ── */}
      {hasCompletedRabies && !dismissedRabiesPrompt && (
        <div className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20 rounded-[24px] flex flex-col gap-3 relative overflow-hidden group shadow-sm animate-fade-in mt-2">
          <button onClick={() => setDismissedRabiesPrompt(true)} className="absolute top-4 right-4 text-primary/40 hover:text-primary transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div className="flex items-start gap-4 relative z-10 pr-6">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[24px] shrink-0 border border-primary/10">🛂</div>
            <div>
              <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">Resmi Kayıtlar Eksik</p>
              <p className="text-[15px] font-extrabold text-text-primary leading-snug">{pet.name} için Kuduz aşısı kaydedildi!</p>
              <p className="text-[13px] font-medium text-text-secondary mt-1.5 leading-relaxed">
                Seyahatlerde veya veteriner değişikliklerinde pasaport taşıma derdine son. Çip ve pasaport numaranızı dijital kimliğe işleyelim mi?
              </p>
            </div>
          </div>
          <button disabled className="btn-primary py-3 text-[14px] mt-1 relative z-10 shadow-sm self-start px-6 opacity-70 cursor-not-allowed">
            Bu özellik çok yakında aktif olacak ✨
          </button>
        </div>
      )}
      {showOverdueList && overdueCount > 0 && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowOverdueList(false)}>
          <div className="bg-surface w-full max-w-sm rounded-[28px] shadow-2xl p-6 flex flex-col gap-4 max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-2 border-b border-border-main">
              <h3 className="text-[16px] font-extrabold text-text-primary">Gecikmiş İşlemler</h3>
              <button onClick={() => setShowOverdueList(false)} className="text-text-secondary hover:text-text-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto pr-1">
              {vaccineRecords.filter(r => r.status === 'overdue').map(r => (
                <button 
                  key={r.id}
                  onClick={() => {
                    setShowOverdueList(false);
                    setQuickMarkRecord({ ...r, _startInDetailed: true } as any);
                  }}
                  className="flex items-center justify-between p-3 border border-error/20 bg-error/5 hover:bg-error/10 rounded-xl transition-all text-left"
                >
                  <div>
                    <p className="font-bold text-[14px] text-error">{getDisplayName(r.vaccine_name, r.vaccine_code)}</p>
                    {r.due_at && <p className="text-[11px] text-error/80 mt-0.5">Planlanan: {new Date(r.due_at).toLocaleDateString('tr-TR')}</p>}
                  </div>
                  <span className="text-[18px]">👉</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
 
      {/* Back */}
      {!isTab && (
        <Link href={`/owner/pets/${pet.id}`} className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary -mb-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          {pet.name}
        </Link>
      )}

      {/* Header - Hidden in Tab mode */}
      {!isTab && (
        <div className="card-base overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-primary to-violet-500" />
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-[24px] shrink-0">💉</div>
              <div>
                <h1 className="text-[20px] font-extrabold text-text-primary">Aşı Takvimi</h1>
                <p className="text-[13px] text-text-secondary">{pet.name} • {setupProfile?.setup_mode === 'smart_start' ? 'Akıllı Başlangıç' : setupProfile?.setup_mode === 'fresh_start' ? 'Bugünden Başla' : 'Geçmiş İçe Aktarma'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
              <button onClick={() => setManualConfig({ show: true, mode: 'record', fixed: false })}
                className="text-[12px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors shrink-0">
                + Manuel İşlem
              </button>
              {overdueCount > 0 && (
                <button onClick={() => setShowOverdueList(true)}
                  className="bg-error/10 text-error text-[12px] font-black px-3 py-1.5 rounded-full border border-error/20 hover:bg-error/20 transition-all shrink-0">
                  ⚠ {overdueCount} Gecikmiş
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Premium VaccineOS Onboarding Wizard Card ── */}
      {!isTab && completedCount === 0 && !wizardDismissed && (
        <div className="card-base p-6 bg-gradient-to-br from-violet-50 via-white to-primary-soft/10 border-l-4 border-l-primary relative overflow-hidden animate-fade-in shadow-md">
          {/* Decorative subtle background circle */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex justify-between items-start gap-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-[26px]">💡</span>
              <div>
                <h3 className="text-[16px] font-extrabold text-text-primary">Odi.Pet Aşı Takvimi Sihirbazı</h3>
                <p className="text-[12px] text-text-secondary mt-0.5">{pet.name} için aşı kaydı oluşturmanın 3 pratik yolu:</p>
              </div>
            </div>
            <button 
              onClick={handleDismissWizard} 
              className="text-text-secondary hover:text-text-primary p-1.5 hover:bg-bg-main rounded-lg transition-all"
              aria-label="Kapat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-border-main/50 flex gap-3 shadow-sm hover:-translate-y-0.5 transition-transform">
              <span className="text-[20px] shrink-0">📸</span>
              <div>
                <h4 className="font-bold text-[13px] text-text-primary">1. Karneden Otomatik Tara</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">
                  Aşı karnesini veya etiketlerini fotoğraflayın, yapay zeka aşıları ve tarihleri otomatik tanısın.
                </p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-border-main/50 flex gap-3 shadow-sm hover:-translate-y-0.5 transition-transform">
              <span className="text-[20px] shrink-0">✅</span>
              <div>
                <h4 className="font-bold text-[13px] text-text-primary">2. Hızlı Yapıldı Ekle</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">
                  Sıradaki aşı kartından veya aşağıdaki matris hücrelerine tıklayarak geçmiş aşıları elle işleyin.
                </p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-border-main/50 flex gap-3 shadow-sm hover:-translate-y-0.5 transition-transform">
              <span className="text-[20px] shrink-0">📅</span>
              <div>
                <h4 className="font-bold text-[13px] text-text-primary">3. Yeni Aşı Planla</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">
                  Özel bir aşı veya periyodik uygulama tarihini planlayarak bildirimleri otomatik kurun.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleDismissWizard}
              className="btn-primary text-[12px] font-bold py-2 px-5 rounded-full shadow-sm hover:scale-102 transition-transform"
            >
              Anladım, Başlayalım 👍
            </button>
          </div>
        </div>
      )}

      {/* Stats - Hidden in Tab mode */}
      {!isTab && (
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
      )}

      {/* Next due banner - Hidden in Tab mode */}
      {!isTab && nextDue && (
        <div className="card-base p-4 flex items-center justify-between gap-3 border-l-4 border-l-primary relative">
          <CoachMark
            hintKey="vaccine_next_due_onboard"
            title="Aşı Kaydı Nasıl Yapılır?"
            message="Dostunun aşısı yapıldığında, buradaki 'Yapıldı ✓' butonuna tıklayarak veya aşağıdaki takvim matrisinden aşı hücresine tıklayarak aşıyı kolayca kaydedebilirsin."
            icon="💡"
            position="bottom"
            condition={completedCount === 0 && wizardDismissed}
          />
          <div className="flex items-center gap-3">
            <span className="text-[22px]">💉</span>
            <div>
              <p className="text-[13px] font-black text-text-secondary uppercase tracking-wider">Sonraki {categoryFilter === 'parasite' ? 'Uygulama' : 'Aşı'}</p>
              <p className="font-extrabold text-text-primary text-[15px]">{getDisplayName(nextDue.vaccine_name, nextDue.vaccine_code)}</p>
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



      {/* ── RECORDS (Matrix) ── */}
      <div className="flex flex-col gap-3">
          {(!categoryFilter || categoryFilter === 'vaccine') && (
            <div className="relative">
              <ProtocolTable 
                pet={pet} 
                templates={templates} 
                records={vaccineRecords} 
                wizardDismissed={wizardDismissed}
                onCellClick={(record) => {
                  setQuickMarkRecord(record)
                }} 
                onNewRecord={(name, code, date) => {
                  setManualConfig({ show: true, mode: 'record', fixed: true, initialData: { name, code, date } })
                }}
                onNewPlan={(name, code, date) => {
                  setManualConfig({ show: true, mode: 'plan', fixed: true, initialData: { name, code, date } })
                }}
                onBatchScan={() => setShowBatchScan(true)}
              />
            </div>
          )}
          {(!categoryFilter || categoryFilter === 'parasite') && (
            <div className="relative">
              <CoachMark
                hintKey="parasite_intro"
                title="Parazit Koruması"
                message="Aşıdan farklı olarak parazit korumaları düzenli tekrarlanır. Damla veya hap uyguladığında buradan ekleyip takip edebilirsin."
                icon="🦠"
                position="top"
                condition={categoryFilter === 'parasite'}
              />
              <ParasiteTable 
                pet={pet} 
                templates={templates} 
                records={vaccineRecords} 
                wizardDismissed={wizardDismissed}
                onCellClick={(record) => {
                  setQuickMarkRecord(record)
                }} 
                onNewRecord={(name, code, date) => {
                  setManualConfig({ show: true, mode: 'record', fixed: true, initialData: { name, code, date } })
                }}
                onNewPlan={(name, code, date) => {
                  setManualConfig({ show: true, mode: 'plan', fixed: true, initialData: { name, code, date } })
                }}
                onBatchScan={() => setShowBatchScan(true)}
              />
            </div>
          )}
      </div>

      {/* ── FILTER UI (Common for Schedule & Records lists) ── */}
      {vaccineRecords.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 animate-fadeIn">
          <select 
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-white border border-border-main text-text-primary text-[12px] font-bold rounded-xl px-3 py-2 outline-none focus:border-primary shrink-0"
          >
            <option value="all">Tüm Yıllar</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select 
            value={filterVaccine}
            onChange={(e) => setFilterVaccine(e.target.value)}
            className="bg-white border border-border-main text-text-primary text-[12px] font-bold rounded-xl px-3 py-2 outline-none focus:border-primary shrink-0 max-w-[200px]"
          >
            <option value="all">Tüm İşlemler</option>
            {availableVaccines.map(v => <option key={v.code} value={v.code}>{v.name}</option>)}
          </select>
        </div>
      )}

      {/* ── SCHEDULE (Yaklaşan Plan) ── */}
      <div className="card-base overflow-hidden mt-2">
        {/* Başlık – her zaman görünür */}
        <button
          onClick={() => setScheduleOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-extrabold text-text-primary">Yaklaşan Planlar</h3>
            {filteredRecords.filter(r => r.status !== 'completed').length > 0 && (
              <span className="text-[11px] font-bold bg-warning/10 text-warning px-2 py-0.5 rounded-full border border-warning/20">
                {filteredRecords.filter(r => r.status !== 'completed').length}
              </span>
            )}
            {overdueCount > 0 && (
              <span className="text-[11px] font-bold bg-error/10 text-error px-2 py-0.5 rounded-full border border-error/20">
                ⚠ {overdueCount} Gecikmiş
              </span>
            )}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`text-text-secondary shrink-0 transition-transform duration-300 ${scheduleOpen ? 'rotate-180' : 'rotate-0'}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* İçerik – toggle ile açılır */}
        {scheduleOpen && (
          <div className="flex flex-col gap-2 px-4 pb-4">
            {/* Gecikmiş uyarı bandı */}
            {overdueCount > 0 && (
              <div className="p-3 bg-error/5 border border-error/20 rounded-2xl flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[18px]">🔴</span>
                  <p className="font-bold text-error text-[13px]">{overdueCount} {categoryFilter === 'parasite' ? 'gecikmiş uygulama' : 'gecikmiş aşı'} tespit edildi</p>
                </div>
                <button onClick={() => setShowOverdueList(true)}
                  className="text-[11px] font-bold bg-error text-white px-2.5 py-1.5 rounded-lg hover:bg-error/90 transition-colors whitespace-nowrap shrink-0 shadow-sm">
                  İncele
                </button>
              </div>
            )}
            {filteredRecords.filter(r => r.status !== 'completed').length === 0 ? (
              <div className="p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center text-[24px] mb-3">📅</div>
                <p className="font-extrabold text-text-primary text-[14px]">Bekleyen İşlem Yok</p>
                <p className="text-[12px] text-text-secondary mt-1 mb-4 leading-relaxed">Filtrelere uygun planlanmış herhangi bir işlem bulunmuyor.</p>
                <button onClick={() => setManualConfig({ show: true, mode: 'plan', fixed: true })} className="btn-primary py-2 px-5 text-[12px]">
                  + {categoryFilter === 'parasite' ? 'Uygulama' : 'Aşı'} Planla
                </button>
              </div>
            ) : filteredRecords.filter(r => r.status !== 'completed').map((r, i, arr) => {
              const origIndex = vaccineRecords.findIndex(vr => vr.id === r.id);
              const isLocked = r.status === 'scheduled' && origIndex > 0 && vaccineRecords[origIndex - 1]?.status !== 'completed';
              return (
                <div key={r.id} className={`card-base p-2.5 flex items-center gap-3 ${isLocked ? 'opacity-50' : ''}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${r.status === 'overdue' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'}`}>
                    <span className="text-[16px]">{isLocked ? '🔒' : STATUS_ICON[r.status] ?? '📌'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[13px] truncate text-text-primary">{getDisplayName(r.vaccine_name, r.vaccine_code)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[11px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded border ${r.status === 'overdue' ? 'bg-error/10 text-error border-error/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      {r.due_at && <span className="text-[11px] text-text-secondary font-medium">{new Date(r.due_at).toLocaleDateString('tr-TR')}</span>}
                    </div>
                  </div>
                  {!isLocked && (
                    <div className="flex gap-1.5 shrink-0 items-center">
                      <button onClick={() => setQuickMarkRecord(r)}
                        className="w-10 h-10 flex items-center justify-center bg-success/10 text-success rounded-xl hover:bg-success/20 transition-colors" title="Yapıldı İşaretle">
                        <span className="text-[14px]">✓</span>
                      </button>
                      <button onClick={() => setPostponeRecord(r)}
                        className="w-10 h-10 flex items-center justify-center bg-warning/10 text-warning rounded-xl hover:bg-warning/20 transition-colors" title="Ertele">
                        <span className="text-[12px]">⏩</span>
                      </button>
                      <button onClick={() => {
                        openConfirm(
                          'Planı Sil',
                          'Bu planlanmış işlemi silmek istiyor musunuz?',
                          () => startTransition(async () => { await deleteVaccineRecord(r.id); refreshData() })
                        )
                      }} className="w-10 h-10 flex items-center justify-center bg-error/5 text-error/60 rounded-xl hover:bg-error/10 hover:text-error transition-colors" title="Sil">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── KAYIT GEÇMİŞİ (Completed Records) ── */}
      <div className="card-base overflow-hidden mt-2">
        {/* Başlık – her zaman görünür */}
        <button
          onClick={() => setHistoryOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3.5 text-left"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-extrabold text-text-primary">Kayıt Geçmişi</h3>
            {filteredRecords.filter(r => r.status === 'completed').length > 0 && (
              <span className="text-[11px] font-bold bg-success/10 text-success px-2 py-0.5 rounded-full border border-success/20">
                {filteredRecords.filter(r => r.status === 'completed').length}
              </span>
            )}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`text-text-secondary shrink-0 transition-transform duration-300 ${historyOpen ? 'rotate-180' : 'rotate-0'}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {/* İçerik – toggle ile açılır */}
        {historyOpen && (
          <div className="flex flex-col gap-2 px-4 pb-4">
            {filteredRecords.filter(r => r.status === 'completed').length === 0 ? (
              <div className="p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-[24px] mb-3">{categoryFilter === 'parasite' ? '🦠' : '💉'}</div>
                <p className="font-extrabold text-text-primary text-[14px]">Kayıt Bulunamadı</p>
                <p className="text-[12px] text-text-secondary mt-1 mb-4 leading-relaxed">Filtrelere uygun tamamlanan bir işlem yok.</p>
                <button onClick={() => setManualConfig({ show: true, mode: 'record', fixed: true })} className="btn-primary py-2 px-5 text-[12px]">
                  + Geçmiş Kayıt Ekle
                </button>
              </div>
            ) : filteredRecords.filter(r => r.status === 'completed')
              .sort((a, b) => new Date(b.administered_at || '').getTime() - new Date(a.administered_at || '').getTime())
              .map(r => (
              <div key={r.id} className="card-base p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-9 h-9 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0">
                    <span className="text-[16px]">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-primary text-[13px] truncate">{getDisplayName(r.vaccine_name, r.vaccine_code)}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {r.administered_at && <span className="text-[11px] font-medium text-success">{new Date(r.administered_at).toLocaleDateString('tr-TR')}</span>}
                      <span className="text-[10px] text-text-secondary opacity-40">•</span>
                      <span className="text-[10px] text-text-secondary">{r.confidence_level === 'verified' ? 'Onaylı' : 'Kullanıcı'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setQuickMarkRecord(r)}
                      className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-primary hover:bg-primary/5 rounded-xl transition-colors" title="Düzenle">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => {
                      openConfirm(
                        'Kaydı Sil',
                        'Bu kaydı silmek istiyor musunuz?',
                        () => startTransition(async () => { await deleteVaccineRecord(r.id); refreshData() })
                      )
                    }} className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-error hover:bg-error/5 rounded-xl transition-colors" title="Sil">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  </div>
                </div>
                {r.notes && (
                  <p className="text-[11px] text-text-secondary mt-2 p-2 bg-bg-main/50 rounded-lg italic border border-border-main/20 line-clamp-2">
                    {r.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Plan Yönetimi (Danger Zone) ── */}
      {!isTab && (
        <div className="mt-4 border border-error/20 rounded-[20px] overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 bg-error/5 border-b border-error/15">
            <span className="text-[16px]">⚠️</span>
            <p className="text-[12px] font-black text-error uppercase tracking-widest">Plan Yönetimi</p>
          </div>
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-text-primary text-[14px]">Planı Sıfırla</p>
              <p className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                Aşı planını baştan yapılandır. Tamamlanan kayıtlar silinmez.
              </p>
            </div>
            <button
              onClick={() =>
                openConfirm(
                  'Planı Sıfırla',
                  'Aşı ve parazit planını sıfırlamak istediğinizden emin misiniz? Tamamlanan kayıtlar korunur.',
                  () => startTransition(async () => {
                    await saveSetupMode(pet.id, 'smart_start')
                    setSetupDone(false)
                    router.refresh()
                  })
                )
              }
              disabled={isPending}
              className="shrink-0 px-5 py-2.5 rounded-xl border border-error/40 text-error text-[13px] font-bold hover:bg-error/8 hover:border-error/60 active:scale-95 transition-all disabled:opacity-40"
            >
              Planı Sıfırla
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel="Evet, Sil"
        cancelLabel="İptal"
        variant="danger"
        onConfirm={() => { closeConfirm(); confirmModal.onConfirm() }}
        onCancel={closeConfirm}
      />
    </div>
  )
}

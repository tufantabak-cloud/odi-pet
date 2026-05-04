'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { addCustomTemplate, deleteCustomTemplate } from './actions'
import { getDisplayName, COMMON_ALIASES } from '@/lib/vaccines/utils'

type VaccineProtocol = {
  id: string
  vaccine_code: string
  vaccine_name: string
  species: string
  category: string
  mandatory_level: string
  dose_count: number
  first_dose_week: number
  dose_interval_days: number[] | null
  has_annual_booster: boolean
  recurrence_days: number | null
  profile_id: string | null
  is_active: boolean
}

type FormState = {
  species: 'dog' | 'cat'
  vaccine_name: string
  category: string
  dose_count: number
  first_dose_week: number
  dose_interval_days: number[]
  has_annual_booster: boolean
  recurrence_days: number | null
  vaccine_code?: string
  is_active: boolean
}

export default function CustomVaccinesClient({ templates }: { templates: VaccineProtocol[] }) {
  const [activeSpecies, setActiveSpecies] = useState<'dog' | 'cat'>('dog')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const defaultForm: FormState = {
    species: 'dog',
    vaccine_name: '',
    category: 'vaccine',
    dose_count: 1,
    first_dose_week: 6,
    dose_interval_days: [21, 21],
    has_annual_booster: false,
    recurrence_days: null,
    vaccine_code: undefined,
    is_active: true
  }
  const [form, setForm] = useState<FormState>(defaultForm)

  // Filter by active species, then by category
  const filtered = templates.filter(t => t.species === activeSpecies)
  const vaccineList = filtered.filter(t => t.category === 'vaccine')
    .sort((a, b) => a.vaccine_name.localeCompare(b.vaccine_name))
  const parasiteList = filtered.filter(t => t.category === 'parasite')
    .sort((a, b) => a.vaccine_name.localeCompare(b.vaccine_name))
  const otherList = filtered.filter(t => t.category !== 'vaccine' && t.category !== 'parasite')
    .sort((a, b) => a.vaccine_name.localeCompare(b.vaccine_name))

  const suggestions = form.vaccine_name.length >= 1 ? Array.from(new Map(templates.filter(t => {
    const search = form.vaccine_name.toLowerCase()
    const matchName = t.vaccine_name.toLowerCase().includes(search)
    const matchCode = t.vaccine_code.toLowerCase().includes(search)
    const aliases = COMMON_ALIASES[t.vaccine_code] || []
    const matchAlias = aliases.some(a => a.toLowerCase().includes(search))
    // Note: 'protects_against' might not be in the VaccineProtocol type if it's coming from DB, 
    // but templates usually have it. Let's cast or check.
    const matchDisease = (t as any).protects_against?.some((d: string) => d.toLowerCase().includes(search))
    return (matchName || matchCode || matchAlias || matchDisease) && t.species === activeSpecies
  }).map(t => [t.vaccine_code, t])).values()).slice(0, 8) : []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.vaccine_name.trim()) { setError('Lütfen bir isim girin.'); return }
    setError('')
    startTransition(async () => {
      try {
        await addCustomTemplate(form)
        setEditingId(null)
        setForm(defaultForm)
      } catch (err: any) {
        setError(err.message || 'Bir hata oluştu.')
      }
    })
  }

  function handleCustomize(protocol: VaccineProtocol) {
    setForm({
      species: protocol.species as 'dog' | 'cat',
      vaccine_name: protocol.vaccine_name,
      category: protocol.category,
      dose_count: protocol.dose_count,
      first_dose_week: protocol.first_dose_week,
      dose_interval_days: protocol.dose_interval_days || [21, 21],
      has_annual_booster: protocol.has_annual_booster,
      recurrence_days: protocol.recurrence_days,
      vaccine_code: protocol.vaccine_code,
      is_active: protocol.is_active
    })
    setEditingId(protocol.id)
  }

  const renderForm = () => (
    <div className="card-base p-6 border-l-4 border-l-primary animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-[15px] font-extrabold text-text-primary">
          {form.vaccine_code ? `${form.vaccine_name} Protokolünü Özelleştir` : 'Yeni Protokol Ekle'}
        </h2>
        <button onClick={() => setEditingId(null)} className="text-text-secondary hover:text-text-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <p className="text-error text-[12px] font-bold bg-error/10 p-3 rounded-lg">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Tür</label>
            <select className="input-base" value={form.species} onChange={e => setForm({ ...form, species: e.target.value as any })}>
              <option value="dog">🐶 Köpek</option>
              <option value="cat">🐱 Kedi</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Kategori</label>
            <select className="input-base" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              <option value="vaccine">💉 Aşı</option>
              <option value="parasite">🦠 Parazit</option>
              <option value="other">📋 Diğer Bakım</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 relative">
          <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Protokol Adı</label>
          <input type="text" className="input-base" placeholder="Örn: Boğmaca (Bordetella) Bb/Pi2"
            value={form.vaccine_name} 
            onChange={e => { setForm({ ...form, vaccine_name: e.target.value }); setShowSuggestions(true) }}
            onFocus={() => setShowSuggestions(true)}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border-main rounded-xl shadow-xl z-[60] overflow-hidden">
              {suggestions.map(t => (
                <button 
                  key={t.id} 
                  type="button"
                  onClick={() => { 
                    setForm({
                      ...form,
                      vaccine_name: getDisplayName(t.vaccine_name, t.vaccine_code),
                      vaccine_code: t.vaccine_code,
                      category: t.category,
                      dose_count: t.dose_count,
                      first_dose_week: t.first_dose_week,
                      dose_interval_days: t.dose_interval_days || [21, 21],
                      has_annual_booster: t.has_annual_booster,
                      recurrence_days: t.recurrence_days
                    }); 
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left p-3 hover:bg-bg-main transition-colors border-b border-border-main last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-[13px] text-text-primary">{getDisplayName(t.vaccine_name, t.vaccine_code)}</p>
                    <span className="text-[10px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase">{t.vaccine_code}</span>
                  </div>
                  {(t as any).protects_against && (t as any).protects_against.length > 0 && (
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      <span className="font-bold">Hastalıklar:</span> {(t as any).protects_against.join(', ')}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`grid ${form.dose_count > 1 ? 'grid-cols-2' : 'grid-cols-2'} gap-3 transition-all duration-300`}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Doz Sayısı</label>
            <select className="input-base" value={form.dose_count} onChange={e => setForm({ ...form, dose_count: parseInt(e.target.value) })}>
              <option value={1}>1 (Tekli)</option>
              <option value={2}>2 (Seri)</option>
              <option value={3}>3 (Seri)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Başlangıç Haftası</label>
            <input type="number" className="input-base" min="0" value={form.first_dose_week}
              onChange={e => setForm({ ...form, first_dose_week: parseInt(e.target.value) || 0 })} />
          </div>
        </div>

        {form.dose_count > 1 && (
          <div className="flex flex-col gap-2 p-3 bg-bg-main border border-border-main rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Doz Aralıkları (Gün)</label>
            <div className="flex gap-3">
              {Array.from({ length: form.dose_count - 1 }).map((_, idx) => (
                <div key={idx} className="flex-1 flex flex-col gap-1">
                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-tight">{idx + 1}. ve {idx + 2}. Doz Arası</span>
                  <input type="number" className="input-base" min="1"
                    value={form.dose_interval_days[idx] || 21}
                    onChange={e => {
                      const newIntervals = [...form.dose_interval_days];
                      newIntervals[idx] = parseInt(e.target.value) || 21;
                      setForm({ ...form, dose_interval_days: newIntervals });
                    }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {form.category === 'parasite' ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black text-text-secondary uppercase tracking-wider">Tekrar Periyodu (Gün)</label>
            <input type="number" className="input-base" min="1" placeholder="Örn: 30 (aylık), 90 (3 aylık)"
              value={form.recurrence_days || ''} onChange={e => setForm({ ...form, recurrence_days: parseInt(e.target.value) || null })} />
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-bg-main rounded-xl border border-border-main">
            <input type="checkbox" id="annual_booster" className="w-4 h-4 rounded accent-primary"
              checked={form.has_annual_booster} onChange={e => setForm({ ...form, has_annual_booster: e.target.checked })} />
            <label htmlFor="annual_booster" className="text-[13px] font-bold text-text-primary cursor-pointer">
              Yıllık Hatırlatıcı (Yıllık tekrar gerektiriyor)
            </label>
          </div>
        )}

        {/* Active/Passive Toggle */}
        <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${form.is_active ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-200'}`}>
          <div>
            <p className="text-[13px] font-extrabold text-text-primary">{form.is_active ? 'Aşı Aktif' : 'Aşı Pasif'}</p>
            <p className="text-[11px] text-text-secondary mt-0.5">{form.is_active ? 'Bu aşı petlerin takviminde görünecektir.' : 'Bu aşı takvimlerden kaldırılacaktır.'}</p>
          </div>
          <button 
            type="button"
            onClick={() => setForm({ ...form, is_active: !form.is_active })}
            className={`w-12 h-6 rounded-full p-1 transition-colors relative ${form.is_active ? 'bg-primary' : 'bg-slate-300'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="flex justify-end gap-3 mt-1">
          <button type="button" onClick={() => setEditingId(null)}
            className="px-4 py-2 text-[13px] font-bold text-text-secondary border border-border-main rounded-xl hover:bg-bg-main">
            İptal
          </button>
          <button type="submit" disabled={isPending} className="btn-primary py-2 px-6 text-[13px]">
            {isPending ? 'Kaydediliyor...' : 'Protokolü Kaydet ✓'}
          </button>
        </div>
      </form>
    </div>
  )

  const ProtocolCard = ({ protocol }: { protocol: VaccineProtocol }) => {
    const isCustomized = protocol.profile_id !== null

    const summaryParts: string[] = []
    if (protocol.dose_count > 1) {
      summaryParts.push(`${protocol.dose_count} Doz Seri`)
      const intervals = Array.isArray(protocol.dose_interval_days) 
        ? protocol.dose_interval_days 
        : (protocol.dose_interval_days ? [protocol.dose_interval_days] : []);
      
      if (intervals.length > 0) {
        summaryParts.push(`${intervals.join('/')} gün aralıklı`)
      }
    } else {
      summaryParts.push('Tek Doz')
    }
    summaryParts.push(`${protocol.first_dose_week}. hafta`)
    if (protocol.has_annual_booster) summaryParts.push('Yıllık Tekrar')
    else if (protocol.recurrence_days) summaryParts.push(`Her ${protocol.recurrence_days} günde bir`)
    else summaryParts.push('Tekrar Yok')

    return (
      <>
        <div className={`card-base p-4 flex items-center justify-between hover:border-primary/30 transition-colors ${isCustomized ? 'bg-primary/5 border-primary/20' : ''} ${!protocol.is_active ? 'opacity-60 bg-slate-50' : ''}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[18px] bg-bg-main border border-border-main shrink-0 ${!protocol.is_active ? 'grayscale' : ''}`}>
            {protocol.category === 'vaccine' ? '💉' : protocol.category === 'parasite' ? '🦠' : '📋'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-[14px] font-bold ${!protocol.is_active ? 'text-text-secondary line-through opacity-70' : 'text-text-primary'}`}>
                {getDisplayName(protocol.vaccine_name, protocol.vaccine_code)}
              </h3>
              {!protocol.is_active && (
                <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase tracking-wider">Pasif</span>
              )}
              {protocol.mandatory_level === 'legal_required' && (
                <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Yasal Zorunlu</span>
              )}
              {isCustomized && (
                <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded">Özelleştirildi</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-secondary mt-0.5">
              {summaryParts.map((part, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="opacity-30">•</span>}
                  {i === summaryParts.length - 1 ? (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      protocol.has_annual_booster || protocol.recurrence_days 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>{part}</span>
                  ) : (
                    <span className="font-medium text-text-primary">{part}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleCustomize(protocol)}
            className="text-[12px] font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            {isCustomized ? 'Düzenle' : 'Özelleştir'}
          </button>
          {isCustomized && (
            <button
              onClick={() => {
                if (confirm('Bu özel şablonu sil ve sistem varsayılanına dön?')) {
                  startTransition(() => deleteCustomTemplate(protocol.id))
                }
              }}
              className="text-[12px] font-bold text-error/70 hover:text-error hover:bg-error/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              Sıfırla
            </button>
          )}
        </div>
      </div>
        {editingId === protocol.id && (
          <div className="mt-2">
            {renderForm()}
          </div>
        )}
      </>
    )
  }

  const Section = ({ list, title, icon }: { list: VaccineProtocol[], title: string, icon: string }) => {
    if (list.length === 0) return null
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 px-1">
          <span className="w-7 h-7 rounded-lg bg-bg-main border border-border-main flex items-center justify-center text-[14px] shrink-0">{icon}</span>
          <span className="text-[13px] font-black text-text-primary uppercase tracking-wider">{title}</span>
          <div className="h-px flex-1 bg-border-main opacity-40" />
        </div>
        <div className="flex flex-col gap-2">
          {list.map(p => <ProtocolCard key={p.id} protocol={p} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full mx-auto px-4 py-6 pb-20 flex flex-col gap-5">
      <Link href="/owner/profile" className="flex items-center gap-2 text-[14px] font-bold text-text-secondary hover:text-primary -mb-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Profil Ayarları
      </Link>

      {/* Header */}
      <div className="card-base overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-violet-500" />
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-[24px]">🧪</div>
            <div>
              <h1 className="text-[20px] font-extrabold text-text-primary">Aşı & Parazit Şablonları</h1>
              <p className="text-[13px] text-text-secondary">Protokolleri özelleştirin, tüm planlama buradan beslenir.</p>
            </div>
          </div>
          {editingId !== 'new' && (
            <button onClick={() => { setForm({ ...defaultForm, species: activeSpecies }); setEditingId('new') }}
              className="btn-primary py-2 px-4 text-[13px] shrink-0">
              + Yeni Şablon
            </button>
          )}
        </div>
      </div>

      {/* Species Tabs */}
      <div className="flex bg-bg-main p-1 rounded-xl gap-1">
        {(['dog', 'cat'] as const).map(sp => (
          <button key={sp} onClick={() => setActiveSpecies(sp)}
            className={`flex-1 py-2 text-[13px] font-bold rounded-lg transition-all ${activeSpecies === sp ? 'bg-white shadow-sm text-primary' : 'text-text-secondary hover:bg-white/50'}`}>
            {sp === 'dog' ? '🐶 Köpek Şablonları' : '🐱 Kedi Şablonları'}
          </button>
        ))}
      </div>

      {/* Add / Edit Form */}
      {editingId === 'new' && renderForm()}

      {/* Protocol Lists */}
      <div className="flex flex-col gap-6">
        <Section list={vaccineList} title="Aşı Protokolleri" icon="💉" />
        <Section list={parasiteList} title="Parazit Protokolleri" icon="🦠" />
        <Section list={otherList} title="Diğer Bakım" icon="📋" />
      </div>
    </div>
  )
}

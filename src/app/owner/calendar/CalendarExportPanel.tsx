'use client'

import { useState, useEffect } from 'react'

const FILTER_LABELS: Record<string, string> = {
  vaccines: '💉 Aşılar',
  medication: '💊 İlaçlar',
  grooming: '✂️ Tımar',
  appointments: '🏥 Randevular',
  critical: '🚨 Kritik Uyarılar',
}

const SCOPE_OPTIONS = [
  { value: 'assigned', label: 'Sadece bana atanan görevler' },
  { value: 'all',      label: 'Tüm pet görevleri' },
  { value: 'critical_only', label: '🚨 Yalnızca kritik (AI+)' },
]

export default function CalendarExportPanel() {
  const [feed, setFeed] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [filters, setFilters] = useState<Record<string, boolean>>({
    vaccines: true, medication: true, grooming: true, appointments: true, critical: true,
  })
  const [scope, setScope] = useState('assigned')
  const [daysAhead, setDaysAhead] = useState(30)

  useEffect(() => {
    fetch('/api/calendar/feed')
      .then(r => r.json())
      .then(d => {
        setFeed(d)
        setFilters(d.filters ?? filters)
        setScope(d.scope ?? 'assigned')
        setDaysAhead(d.days_ahead ?? 30)
        setLoading(false)
      })
  }, [])

  async function save() {
    setSaving(true)
    await fetch('/api/calendar/feed', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, filters, days_ahead: daysAhead }),
    })
    setSaving(false)
  }

  async function regenerate() {
    if (!confirm('Eski abonelikleri geçersiz kılacak yeni bir bağlantı oluşturulsun mu?')) return
    setRegenerating(true)
    const res = await fetch('/api/calendar/feed', { method: 'DELETE' })
    const data = await res.json()
    setFeed((prev: any) => ({ ...prev, ...data }))
    setRegenerating(false)
  }

  function copyUrl() {
    navigator.clipboard.writeText(feed?.feedUrl ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isAIPlus = feed?.plan === 'ai_plus'
  const isPro = feed?.plan === 'pro' || isAIPlus
  const effectiveDays = isPro ? daysAhead : 7

  if (loading) return (
    <div className="card-base p-5 animate-pulse">
      <div className="h-4 bg-bg-main rounded w-1/3 mb-3"/>
      <div className="h-10 bg-bg-main rounded w-full"/>
    </div>
  )

  return (
    <div className="card-base overflow-hidden">
      <div className="px-5 py-4 bg-bg-main border-b border-border-main flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-black text-text-secondary uppercase tracking-widest">Takvim Dışa Aktarma</h2>
          <p className="text-[11px] text-text-secondary mt-0.5">Google, Apple, Outlook ile senkronize et</p>
        </div>
        {feed?.last_fetched_at && (
          <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded-full">
            ✓ Senkron aktif
          </span>
        )}
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Feed URL */}
        <div>
          <label className="text-[11px] font-bold text-text-secondary uppercase tracking-widest block mb-2">Feed URL (Gizli)</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={feed?.feedUrl ?? ''}
              className="input-base text-[12px] font-mono flex-1 bg-bg-main"
            />
            <button onClick={copyUrl} className={`btn-secondary text-[12px] px-4 shrink-0 transition-all ${copied ? 'text-green-600 border-green-300 bg-green-50' : ''}`}>
              {copied ? '✓ Kopyalandı' : 'Kopyala'}
            </button>
          </div>
          {!isPro && (
            <p className="text-[11px] text-amber-600 mt-1.5">
              ⚡ Free plan: sadece 7 günlük görünüm — <a href="/owner/profile/subscription" className="underline font-bold">Pro'ya geçin</a>
            </p>
          )}
        </div>

        {/* Subscribe CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { label: '📅 Google Calendar', desc: 'Diğer takvimler → URL ile ekle', color: 'hover:bg-blue-50 hover:border-blue-200' },
            { label: '🍎 Apple Calendar', desc: 'Takvim → Dosya → İnternet takvimi abone ol', color: 'hover:bg-gray-50' },
            { label: '🔷 Outlook', desc: 'Takvim ekle → İnternetten', color: 'hover:bg-blue-50 hover:border-blue-200' },
          ].map(item => (
            <button
              key={item.label}
              onClick={copyUrl}
              className={`p-3 rounded-xl border border-border-main text-left transition-all ${item.color}`}
            >
              <p className="font-bold text-text-primary text-[13px]">{item.label}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">{item.desc}</p>
            </button>
          ))}
        </div>

        {/* Scope */}
        <div>
          <label className="text-[11px] font-bold text-text-secondary uppercase tracking-widest block mb-2">Kapsam</label>
          <div className="flex flex-col gap-2">
            {SCOPE_OPTIONS.map(opt => (
              <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${scope === opt.value ? 'border-primary bg-primary-soft' : 'border-border-main hover:border-primary/40'} ${opt.value === 'critical_only' && !isAIPlus ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <input
                  type="radio"
                  name="scope"
                  value={opt.value}
                  checked={scope === opt.value}
                  disabled={opt.value === 'critical_only' && !isAIPlus}
                  onChange={() => setScope(opt.value)}
                  className="text-primary"
                />
                <span className="text-[13px] font-semibold text-text-primary">{opt.label}</span>
                {opt.value === 'critical_only' && !isAIPlus && (
                  <span className="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-primary text-white">AI+</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div>
          <label className="text-[11px] font-bold text-text-secondary uppercase tracking-widest block mb-2">Filtreler</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(FILTER_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilters(prev => ({ ...prev, [key]: !prev[key] }))}
                className={`px-3 py-1.5 rounded-xl border text-[12px] font-bold transition-all ${filters[key] ? 'border-primary bg-primary-soft text-primary' : 'border-border-main text-text-secondary hover:border-primary/40'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Days ahead (Pro+) */}
        <div className={!isPro ? 'opacity-50 pointer-events-none' : ''}>
          <label className="text-[11px] font-bold text-text-secondary uppercase tracking-widest block mb-2">
            İleriye Bak: <span className="text-primary">{effectiveDays} gün</span>
            {!isPro && <span className="ml-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-primary text-white">PRO</span>}
          </label>
          <input
            type="range" min={7} max={90} step={7}
            value={daysAhead} disabled={!isPro}
            onChange={e => setDaysAhead(+e.target.value)}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-text-secondary mt-1">
            <span>7 gün</span><span>30 gün</span><span>60 gün</span><span>90 gün</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="btn-primary flex-1 py-2.5 text-[13px]">
            {saving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
          <button onClick={regenerate} disabled={regenerating} className="btn-secondary text-[12px] px-4 text-red-500 border-red-200 hover:bg-red-50">
            {regenerating ? '...' : '🔄 Yenile'}
          </button>
        </div>

        <p className="text-[10px] text-text-secondary text-center">
          Feed URL'yi kimseyle paylaşmayın — tüm görünür görevlerinizi içerir. Sızdırıldıysa "Yenile" ile iptal edin.
        </p>
      </div>
    </div>
  )
}

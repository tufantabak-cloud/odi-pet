'use client'

import { useEffect, useState } from 'react'

type Contact = {
  id: string; name: string; type: string; contact: string
  tier: number; stage: string; notes: string; source: string; contacted_at: string
}

const STAGES = ['sourced','contacted','replied','beta_signed','invited','activated','retained_d3','retained_d7']

const STAGE_COLOR: Record<string, string> = {
  sourced: 'bg-gray-100 text-gray-600',
  contacted: 'bg-blue-50 text-blue-700',
  replied: 'bg-indigo-50 text-indigo-700',
  beta_signed: 'bg-violet-50 text-violet-700',
  invited: 'bg-amber-50 text-amber-700',
  activated: 'bg-green-50 text-green-700',
  retained_d3: 'bg-emerald-50 text-emerald-800',
  retained_d7: 'bg-teal-50 text-teal-800',
  churned: 'bg-red-50 text-red-600',
}

const TIER_LABEL: Record<number, string> = { 1: '🥇 T1', 2: '🥈 T2', 3: '🥉 T3' }
const TYPE_ICON: Record<string, string> = { vet_clinic: '🏥', creator: '📸', pet_owner: '🐾', referral: '👥' }

export default function OutreachCRM() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'vet_clinic', contact: '', tier: 1, source: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [filterStage, setFilterStage] = useState<string>('all')

  const load = () => {
    setLoading(true)
    fetch('/api/admin/outreach')
      .then(r => r.json())
      .then(d => { setContacts(d.contacts); setSummary(d.summary); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const addContact = async () => {
    setSaving(true)
    await fetch('/api/admin/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setSaving(false)
    setShowAdd(false)
    setForm({ name: '', type: 'vet_clinic', contact: '', tier: 1, source: '', notes: '' })
    load()
  }

  const advanceStage = async (id: string, currentStage: string) => {
    const idx = STAGES.indexOf(currentStage)
    if (idx >= STAGES.length - 1) return
    await fetch('/api/admin/outreach', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, stage: STAGES[idx + 1] })
    })
    load()
  }

  const filtered = filterStage === 'all' ? contacts : contacts.filter(c => c.stage === filterStage)

  return (
    <div className="min-h-screen bg-bg-main p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-text-primary">Outreach Pipeline</h1>
            <p className="text-[13px] text-text-secondary mt-0.5">Beta kullanıcı acquisition CRM</p>
          </div>
          <div className="flex gap-3">
            <button onClick={load} className="btn-secondary text-[13px] px-4 py-2">↻ Refresh</button>
            <button onClick={() => setShowAdd(true)} className="btn-primary text-[13px] px-4 py-2">+ Ekle</button>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Toplam', value: summary.total },
              { label: 'Contacted', value: summary.contacted },
              { label: 'Activated', value: summary.activated },
              { label: 'Conv.', value: `${summary.conversionPct}%` },
            ].map(s => (
              <div key={s.label} className="card-base p-4 text-center">
                <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest">{s.label}</p>
                <p className="text-2xl font-black text-primary mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Stage filter */}
        <div className="flex gap-2 flex-wrap mb-4">
          {['all', ...STAGES].map(s => (
            <button key={s} onClick={() => setFilterStage(s)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all ${filterStage === s ? 'bg-primary text-white border-primary' : 'border-border-main text-text-secondary hover:border-primary/40'}`}>
              {s === 'all' ? 'Tümü' : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-text-secondary text-center py-12">Yükleniyor...</p>
        ) : filtered.length === 0 ? (
          <div className="card-base p-12 text-center">
            <p className="text-[36px] mb-3">📋</p>
            <p className="font-bold text-text-primary">Pipeline boş</p>
            <p className="text-text-secondary text-[13px] mt-1">İlk klinik veya creator'ı ekle</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 text-[13px] px-5 py-2">+ İlk Kişiyi Ekle</button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(c => (
              <div key={c.id} className="card-base p-4 flex items-center gap-4">
                <span className="text-[22px] shrink-0">{TYPE_ICON[c.type] ?? '❓'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-text-primary truncate">{c.name}</p>
                    <span className="text-[10px] font-black text-text-secondary bg-bg-main px-1.5 py-0.5 rounded">{TIER_LABEL[c.tier]}</span>
                  </div>
                  <p className="text-[12px] text-text-secondary truncate">{c.contact} {c.source ? `• ${c.source}` : ''}</p>
                  {c.notes && <p className="text-[11px] text-text-secondary mt-0.5 truncate italic">{c.notes}</p>}
                </div>
                <span className={`text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 ${STAGE_COLOR[c.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                  {c.stage.replace('_', ' ')}
                </span>
                {c.stage !== 'retained_d7' && c.stage !== 'churned' && (
                  <button
                    onClick={() => advanceStage(c.id, c.stage)}
                    className="text-[11px] font-bold text-primary hover:underline shrink-0"
                  >
                    →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add modal */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <h2 className="font-black text-text-primary text-[18px] mb-5">Kişi Ekle</h2>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest block mb-1.5">Tür</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[['vet_clinic','🏥','Klinik'],['creator','📸','Creator'],['pet_owner','🐾','Owner'],['referral','👥','Referral']].map(([v,e,l]) => (
                      <button key={v} onClick={() => setForm(f => ({...f, type: v}))}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-[11px] font-bold transition-all ${form.type === v ? 'border-primary bg-primary-soft text-primary' : 'border-gray-200 text-text-secondary'}`}>
                        <span className="text-[18px]">{e}</span>{l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest block mb-1.5">İsim / Klinik Adı</label>
                  <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="input-base w-full" placeholder="Örn: Hayat Veteriner Kliniği" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest block mb-1.5">İletişim</label>
                  <input value={form.contact} onChange={e => setForm(f => ({...f, contact: e.target.value}))} className="input-base w-full" placeholder="@instagram, email, telefon" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest block mb-1.5">Tier</label>
                    <select value={form.tier} onChange={e => setForm(f => ({...f, tier: Number(e.target.value)}))} className="input-base w-full">
                      <option value={1}>🥇 Tier 1 — Altın</option>
                      <option value={2}>🥈 Tier 2 — Orta</option>
                      <option value={3}>🥉 Tier 3 — Düşük</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest block mb-1.5">Kaynak</label>
                    <input value={form.source} onChange={e => setForm(f => ({...f, source: e.target.value}))} className="input-base w-full" placeholder="instagram, google, referral..." />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-black text-text-secondary uppercase tracking-widest block mb-1.5">Not</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="input-base w-full h-16 resize-none" placeholder="Neden Tier 1? Özel bilgi..." />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowAdd(false)} className="btn-secondary flex-1 py-2.5">İptal</button>
                <button onClick={addContact} disabled={!form.name || saving} className="btn-primary flex-1 py-2.5 disabled:opacity-50">
                  {saving ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

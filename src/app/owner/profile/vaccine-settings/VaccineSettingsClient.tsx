'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { normalizeSpecies } from '@/lib/species'

type Pet = { id: string; name: string; species: string | null; avatar_url: string | null }

type Protocol = {
  vaccine_code: string
  protocol_name: string
  category: string | null
  risk_group: string | null
  notes: string | null
}

type Preference = {
  id: string
  vaccine_code: string
  enabled: boolean
  vet_recommended: boolean
  risk_reason: string | null
}

const CATEGORY_LABEL: Record<string, string> = {
  risk_based: 'Risk Bazlı',
  optional: 'Opsiyonel',
}

const RISK_GROUP_LABEL: Record<string, string> = {
  outdoor: 'Dış Ortam',
  rural: 'Kırsal',
  kennel: 'Pansiyon/Kennel',
}

export default function VaccineSettingsClient({ pets }: { pets: Pet[] }) {
  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets.length === 1 ? pets[0].id : null)
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [activePlansByCode, setActivePlansByCode] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busyCode, setBusyCode] = useState<string | null>(null)
  const [confirmDisableCode, setConfirmDisableCode] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const loadData = async (petId: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/pets/${petId}/vaccine-preferences`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Yüklenemedi.')
      setProtocols(data.protocols || [])
      setPreferences(data.preferences || [])
      setActivePlansByCode(data.activePlansByCode || {})
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedPetId) loadData(selectedPetId)
  }, [selectedPetId])

  const prefFor = (code: string) => preferences.find(p => p.vaccine_code === code) || null

  const updatePreference = async (code: string, patch: { enabled?: boolean; vet_recommended?: boolean }) => {
    if (!selectedPetId) return
    const current = prefFor(code)
    setBusyCode(code)
    setError('')
    try {
      const res = await fetch(`/api/pets/${selectedPetId}/vaccine-preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaccine_code: code,
          enabled: patch.enabled ?? current?.enabled ?? false,
          vet_recommended: patch.vet_recommended ?? current?.vet_recommended ?? false,
          risk_reason: current?.risk_reason ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Güncellenemedi.')
      setPreferences(prev => {
        const others = prev.filter(p => p.vaccine_code !== code)
        return [...others, data.data]
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.')
    } finally {
      setBusyCode(null)
    }
  }

  const handleToggle = (code: string, nextEnabled: boolean) => {
    if (!nextEnabled && activePlansByCode[code]) {
      setConfirmDisableCode(code)
      return
    }
    updatePreference(code, { enabled: nextEnabled })
  }

  const cancelActivePlans = async (code: string) => {
    if (!selectedPetId) return
    const supabase = createBrowserSupabaseClient()
    await supabase
      .from('plans')
      .update({ status: 'cancelled' })
      .eq('pet_id', selectedPetId)
      .eq('category', 'asi')
      .in('status', ['active', 'overdue'])
      .contains('extra_data', { vaccine: { code } })
    setActivePlansByCode(prev => ({ ...prev, [code]: false }))
  }

  const handleCreatePlan = async (code: string) => {
    if (!selectedPetId) return
    setBusyCode(code)
    setError('')
    setToast(null)
    try {
      const res = await fetch(`/api/pets/${selectedPetId}/vaccine-preferences/${code}/create-plan`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Plan oluşturulamadı.')
      setActivePlansByCode(prev => ({ ...prev, [code]: true }))
      const doseCount = data?.data?.doseCount ?? 0
      setToast(`${doseCount} dozluk plan oluşturuldu`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu.')
    } finally {
      setBusyCode(null)
    }
  }

  return (
    <div className="min-h-screen bg-bg-main pb-24 pt-6 px-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] font-black text-text-primary">Opsiyonel Aşı Tercihleri</h1>
        <Link href="/owner/profile" className="text-[13px] font-bold text-text-secondary">Geri</Link>
      </div>

      {pets.length === 0 && (
        <p className="text-text-secondary text-[13px]">Henüz kayıtlı bir evcil hayvanınız yok.</p>
      )}

      {pets.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {pets.map(pet => (
            <button
              key={pet.id}
              onClick={() => setSelectedPetId(pet.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl border-2 shrink-0 transition-colors ${
                selectedPetId === pet.id ? 'border-primary bg-primary/10 text-primary' : 'border-border-main text-text-secondary'
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-slate-100 overflow-hidden relative shrink-0">
                {pet.avatar_url ? (
                  <Image src={pet.avatar_url} alt={pet.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm">
                    {normalizeSpecies(pet.species) === 'dog' ? '🐶' : '🐱'}
                  </div>
                )}
              </div>
              <span className="text-[13px] font-bold">{pet.name}</span>
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] text-text-secondary mb-4">
        Zorunlu ve temel aşılar bu ekranda gösterilmez — onlar için Aşı Takibi sayfasını kullanın. Burada yalnızca risk bazlı ve opsiyonel aşılar için tercihinizi ayarlarsınız.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-200 text-[13px] font-normal mb-4">{error}</div>
      )}

      {toast && (
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-200 text-[13px] font-bold mb-4">{toast}</div>
      )}

      {selectedPetId && loading && (
        <p className="text-text-secondary text-[13px]">Yükleniyor…</p>
      )}

      {selectedPetId && !loading && protocols.length === 0 && (
        <p className="text-text-secondary text-[13px]">Bu tür için opsiyonel/risk bazlı aşı protokolü bulunamadı.</p>
      )}

      <div className="flex flex-col gap-3">
        {selectedPetId && !loading && protocols.map(protocol => {
          const pref = prefFor(protocol.vaccine_code)
          const enabled = pref?.enabled ?? false
          const hasActivePlan = !!activePlansByCode[protocol.vaccine_code]
          const isBusy = busyCode === protocol.vaccine_code

          return (
            <div key={protocol.vaccine_code} className="bg-white p-4 rounded-2xl border border-border-main shadow-sm flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-text-primary text-[15px]">{protocol.protocol_name}</h3>
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-text-secondary">
                      {CATEGORY_LABEL[protocol.category ?? ''] || protocol.category}
                    </span>
                    {protocol.risk_group && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">
                        {RISK_GROUP_LABEL[protocol.risk_group] || protocol.risk_group}
                      </span>
                    )}
                  </div>
                  {protocol.notes && (
                    <p className="text-[12px] text-text-secondary mt-2 leading-relaxed">{protocol.notes}</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => handleToggle(protocol.vaccine_code, !enabled)}
                  className={`shrink-0 w-12 h-7 rounded-full transition-colors relative ${enabled ? 'bg-primary' : 'bg-slate-200'} disabled:opacity-50`}
                >
                  <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {enabled && (
                <label className="flex items-center gap-2 text-[12px] font-bold text-text-secondary">
                  <input
                    type="checkbox"
                    checked={pref?.vet_recommended ?? false}
                    disabled={isBusy}
                    onChange={(e) => updatePreference(protocol.vaccine_code, { vet_recommended: e.target.checked })}
                  />
                  Veterinerim önerdi
                </label>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border-main">
                <span className={`text-[12px] font-bold ${hasActivePlan ? 'text-emerald-600' : 'text-text-secondary'}`}>
                  {hasActivePlan ? '✓ Aktif plan var' : 'Plan oluşturulmadı'}
                </span>
                <button
                  type="button"
                  disabled={!enabled || hasActivePlan || isBusy}
                  onClick={() => handleCreatePlan(protocol.vaccine_code)}
                  className="text-[12px] font-bold text-primary disabled:text-text-secondary disabled:opacity-50 px-3 py-1.5 rounded-lg border border-primary disabled:border-border-main"
                >
                  Hemen Plan Oluştur
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {confirmDisableCode && (
        <div
          role="dialog"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmDisableCode(null)}
        >
          <div className="bg-white w-full max-w-sm rounded-[24px] p-6 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-text-primary text-[16px]">Bu aşı için aktif bir plan var</h3>
            <p className="text-[13px] text-text-secondary">Tercihi kapatmak istediğinize emin misiniz? Mevcut planı korumayı veya iptal etmeyi seçebilirsiniz.</p>
            <button
              type="button"
              className="btn-secondary py-3"
              onClick={async () => {
                const code = confirmDisableCode
                setConfirmDisableCode(null)
                await updatePreference(code, { enabled: false })
              }}
            >
              Tercihi kapat, planları koru
            </button>
            <button
              type="button"
              className="py-3 rounded-xl bg-red-50 text-red-600 font-bold"
              onClick={async () => {
                const code = confirmDisableCode
                setConfirmDisableCode(null)
                await cancelActivePlans(code)
                await updatePreference(code, { enabled: false })
              }}
            >
              Tercihi kapat ve planları iptal et
            </button>
            <button
              type="button"
              className="py-3 text-text-secondary font-bold"
              onClick={() => setConfirmDisableCode(null)}
            >
              Vazgeç
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

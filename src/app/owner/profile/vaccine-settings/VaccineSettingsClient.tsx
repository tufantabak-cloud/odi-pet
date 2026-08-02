'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { normalizeSpecies } from '@/lib/species'
import {
  ArrowLeft,
  Syringe,
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Calendar,
  Cat,
  Dog,
  X,
  Sparkles,
} from 'lucide-react'

type Pet = { id: string; name: string; species: string | null; avatar_url: string | null }

type VaccineProtocol = {
  vaccine_code: string
  protocol_name: string
  species: string
  category: string
  enabled: boolean
  locked: boolean
  is_default: boolean
  has_active_plan: boolean
}

type ParasiteProtocol = {
  id: string
  parasite_code: string
  protocol_name: string
  parasite_type: string
  species: string
  default_protection_duration_days: number
  allowed_application_methods: string[]
  default_application_method: string
  min_age_weeks: number
  enabled: boolean
  is_default: boolean
}

type Preference = {
  id: string
  vaccine_code: string
  enabled: boolean
  vet_recommended: boolean
  risk_reason: string | null
}

const CATEGORY_LABEL: Record<string, string> = {
  legal: 'Yasal',
  core: 'Temel',
  risk_based: 'Risk Bazlı',
  optional: 'Opsiyonel',
}

const PARASITE_TYPE_LABEL: Record<string, string> = {
  internal: 'İç Parazit',
  external: 'Dış Parazit',
  combined: 'Kombine',
  collar: 'Tasma',
}

const METHOD_LABEL: Record<string, string> = {
  spot_on: 'Damlama',
  oral: 'Oral/Ağızdan',
  collar: 'Tasma',
  injection: 'Enjeksiyon',
}

function translateError(errorMsg: string): string {
  if (errorMsg.includes('LOCKED_VACCINE_PREFERENCE')) {
    return 'Yasal ve temel aşılar kapatılamaz.'
  }
  if (errorMsg.includes('INACTIVE_PROTOCOL') || errorMsg.includes('INACTIVE_VACCINE_PROTOCOL')) {
    return 'Bu protokol yönetici tarafından pasife alınmış.'
  }
  if (errorMsg.includes('VACCINE_PREFERENCE_DISABLED')) {
    return 'Bu aşı için tercih devre dışı bırakılmış.'
  }
  if (errorMsg.includes('PROTOCOL_SPECIES_MISMATCH') || errorMsg.includes('VACCINE_SPECIES_MISMATCH')) {
    return 'Protokol evcil hayvan türü ile uyuşmuyor.'
  }
  return 'Bir hata oluştu. Lütfen tekrar deneyin.'
}

function SkeletonCard() {
  return (
    <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] animate-pulse flex flex-col gap-3">
      <div className="h-4 bg-slate-200 rounded w-2/3" />
      <div className="h-3 bg-slate-200 rounded w-1/3" />
      <div className="h-10 bg-slate-100 rounded-2xl w-full" />
    </div>
  )
}

export default function VaccineSettingsClient({ pets }: { pets: Pet[] }) {
  const router = useRouter()
  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets.length > 0 ? pets[0].id : null)
  const [activeTab, setActiveTab] = useState<'vaccines' | 'parasites'>('vaccines')
  const [protocols, setProtocols] = useState<VaccineProtocol[]>([])
  const [parasiteProtocols, setParasiteProtocols] = useState<ParasiteProtocol[]>([])
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
      const vacRes = await fetch(`/api/pets/${petId}/vaccine-preferences`)
      const vacData = await vacRes.json()
      if (!vacRes.ok) throw new Error(vacData.error || 'Aşı verileri yüklenemedi.')

      const parRes = await fetch(`/api/pets/${petId}/parasite-preferences`)
      const parData = await parRes.json()
      if (!parRes.ok) throw new Error(parData.error || 'Parazit verileri yüklenemedi.')

      setProtocols(vacData.protocols || [])
      setPreferences(vacData.preferences || [])
      setActivePlansByCode(vacData.activePlansByCode || {})
      setParasiteProtocols(parData || [])
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err)
      setError(translateError(errMessage))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedPetId) loadData(selectedPetId)
  }, [selectedPetId])

  const prefFor = (code: string) => preferences.find(p => p.vaccine_code === code) || null

  const updateVaccinePreference = async (code: string, nextEnabled: boolean) => {
    if (!selectedPetId) return
    setBusyCode(code)
    setError('')
    setToast(null)

    const previousProtocols = [...protocols]
    setProtocols(prev =>
      prev.map(p => (p.vaccine_code === code ? { ...p, enabled: nextEnabled } : p))
    )

    try {
      const current = prefFor(code)
      const res = await fetch(`/api/pets/${selectedPetId}/vaccine-preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaccine_code: code,
          enabled: nextEnabled,
          vet_recommended: current?.vet_recommended ?? false,
          risk_reason: current?.risk_reason ?? null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Aşı tercihi güncellenemedi.')
      setToast('Aşı tercihi başarıyla güncellendi.')
      await loadData(selectedPetId)
    } catch (err: unknown) {
      setProtocols(previousProtocols)
      const errMessage = err instanceof Error ? err.message : String(err)
      setError(translateError(errMessage))
    } finally {
      setBusyCode(null)
    }
  }

  const updateParasitePreference = async (protocolId: string, nextEnabled: boolean) => {
    if (!selectedPetId) return
    setBusyCode(protocolId)
    setError('')
    setToast(null)

    const previousParasites = [...parasiteProtocols]
    setParasiteProtocols(prev =>
      prev.map(p => (p.id === protocolId ? { ...p, enabled: nextEnabled } : p))
    )

    try {
      const res = await fetch(`/api/pets/${selectedPetId}/parasite-preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parasite_protocol_id: protocolId,
          enabled: nextEnabled,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Parazit tercihi güncellenemedi.')
      setToast('Parazit tercihi başarıyla güncellendi.')
      await loadData(selectedPetId)
    } catch (err: unknown) {
      setParasiteProtocols(previousParasites)
      const errMessage = err instanceof Error ? err.message : String(err)
      setError(translateError(errMessage))
    } finally {
      setBusyCode(null)
    }
  }

  const handleVaccineToggle = (code: string, currentEnabled: boolean) => {
    if (busyCode) return
    const nextEnabled = !currentEnabled
    if (!nextEnabled && activePlansByCode[code]) {
      setConfirmDisableCode(code)
      return
    }
    updateVaccinePreference(code, nextEnabled)
  }

  const handleParasiteToggle = (protocolId: string, currentEnabled: boolean) => {
    if (busyCode) return
    updateParasitePreference(protocolId, !currentEnabled)
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
    router.push(`/owner/plan-yap/asi?pet_id=${selectedPetId}&vaccine_code=${code}`)
  }

  const updateVetRecommended = async (code: string, checked: boolean) => {
    if (!selectedPetId) return
    const current = prefFor(code)
    try {
      const res = await fetch(`/api/pets/${selectedPetId}/vaccine-preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaccine_code: code,
          enabled: current?.enabled ?? true,
          vet_recommended: checked,
          risk_reason: current?.risk_reason ?? null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Güncellenemedi.')
      }
      await loadData(selectedPetId)
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err)
      setError(translateError(errMessage))
    }
  }

  return (
    <div className="min-h-screen bg-bg-main pb-24 pt-6 px-1 max-w-lg mx-auto font-sans">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-extrabold text-text-primary">Sağlık Planı Ayarları</h1>
        <Link
          href="/owner/profile"
          className="text-xs font-bold text-text-secondary hover:text-primary transition-all flex items-center gap-1 active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4" /> Geri
        </Link>
      </div>

      {pets.length === 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] text-center">
          <p className="text-text-secondary text-sm font-bold">Önce bir pet eklemelisiniz.</p>
        </div>
      )}

      {pets.length > 0 && (
        <>
          {/* Pet Seçimi */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
            {pets.map(pet => (
              <button
                key={pet.id}
                onClick={() => setSelectedPetId(pet.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border-2 shrink-0 transition-all active:scale-[0.98] ${
                  selectedPetId === pet.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 text-text-secondary bg-white'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-slate-100 overflow-hidden relative shrink-0">
                  {pet.avatar_url ? (
                    <Image src={pet.avatar_url} alt={pet.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm">
                      {normalizeSpecies(pet.species) === 'dog' ? (
                        <Dog className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Cat className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                  )}
                </div>
                <span className="text-xs font-bold">{pet.name}</span>
              </button>
            ))}
          </div>

          {/* Sekme Seçimi */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('vaccines')}
              className={`flex-1 py-3 text-center text-sm font-bold transition-all relative active:scale-[0.98] ${
                activeTab === 'vaccines' ? 'text-primary' : 'text-text-secondary'
              }`}
            >
              Aşılar
              {activeTab === 'vaccines' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('parasites')}
              className={`flex-1 py-3 text-center text-sm font-bold transition-all relative active:scale-[0.98] ${
                activeTab === 'parasites' ? 'text-primary' : 'text-text-secondary'
              }`}
            >
              Parazitler
              {activeTab === 'parasites' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="bg-rose-50 text-error p-3.5 rounded-2xl border border-rose-200 text-xs font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {toast && (
        <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-2xl border border-emerald-200 text-xs font-bold mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {toast}
        </div>
      )}

      {selectedPetId && loading && (
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {selectedPetId && !loading && (
        <>
          {/* AŞILAR SEKME İÇERİĞİ */}
          {activeTab === 'vaccines' && (
            <div className="flex flex-col gap-3">
              {protocols.length === 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] text-center">
                  <p className="text-text-secondary text-xs font-medium">
                    Bu evcil hayvan için aşı protokolü bulunamadı.
                  </p>
                </div>
              )}
              {protocols.map(protocol => {
                const enabled = protocol.enabled
                const locked = protocol.locked
                const hasActivePlan = protocol.has_active_plan
                const isBusy = busyCode === protocol.vaccine_code
                const pref = prefFor(protocol.vaccine_code)

                return (
                  <div
                    key={protocol.vaccine_code}
                    className={`bg-white p-4 rounded-3xl border shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-3 relative overflow-hidden transition-all ${
                      locked ? 'border-primary/30 ring-1 ring-primary/5' : 'border-slate-100'
                    }`}
                  >
                    {locked && (
                      <div className="absolute top-0 right-0 bg-primary text-white text-2xs font-bold px-2.5 py-1 rounded-bl-xl flex items-center gap-1 uppercase tracking-wider">
                        <Lock className="w-3 h-3" /> ZORUNLU
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-extrabold text-text-primary text-base">{protocol.protocol_name}</h3>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          <span
                            className={`text-2xs font-bold px-2 py-0.5 rounded-md uppercase ${
                              locked ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-text-secondary'
                            }`}
                          >
                            {CATEGORY_LABEL[protocol.category] || protocol.category}
                          </span>
                        </div>
                        {locked ? (
                          <p className="text-xs text-primary font-bold mt-2 flex items-center gap-1">
                            <Lock className="w-3.5 h-3.5" /> Zorunlu olarak aktif
                          </p>
                        ) : (
                          <p className="text-xs text-text-secondary mt-2 leading-relaxed font-medium">
                            Bu aşının yapılması için tercihinizi ayarlayabilirsiniz.
                          </p>
                        )}
                      </div>

                      <div className="flex items-center min-h-[44px]">
                        {locked ? (
                          <div className="w-12 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs">
                            <Lock className="w-4 h-4" />
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleVaccineToggle(protocol.vaccine_code, enabled)}
                            className={`shrink-0 w-12 h-7 rounded-full transition-colors relative active:scale-[0.95] ${
                              enabled ? 'bg-primary' : 'bg-slate-200'
                            } disabled:opacity-50`}
                          >
                            <span
                              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                                enabled ? 'translate-x-5' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {!locked && enabled && (
                      <label className="flex items-center gap-2 text-xs font-bold text-text-secondary cursor-pointer min-h-[36px]">
                        <input
                          type="checkbox"
                          checked={pref?.vet_recommended ?? false}
                          disabled={isBusy}
                          onChange={e => updateVetRecommended(protocol.vaccine_code, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        Veterinerim önerdi
                      </label>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span
                        className={`text-xs font-bold ${
                          hasActivePlan ? 'text-emerald-700' : 'text-text-secondary'
                        }`}
                      >
                        {hasActivePlan ? '✓ Aktif plan var' : 'Plan oluşturulmadı'}
                      </span>
                      <button
                        type="button"
                        disabled={!enabled || hasActivePlan || isBusy}
                        onClick={() => handleCreatePlan(protocol.vaccine_code)}
                        className="text-xs font-bold text-primary disabled:text-text-secondary disabled:opacity-50 px-3 py-1.5 rounded-xl border border-primary disabled:border-slate-200 active:scale-[0.98]"
                      >
                        Hemen Plan Oluştur
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* PARAZİTLER SEKME İÇERİĞİ */}
          {activeTab === 'parasites' && (
            <div className="flex flex-col gap-3">
              {parasiteProtocols.length === 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] text-center">
                  <p className="text-text-secondary text-xs font-medium">
                    Bu evcil hayvan için parazit protokolü bulunamadı.
                  </p>
                </div>
              )}
              {parasiteProtocols.map(protocol => {
                const enabled = protocol.enabled
                const isBusy = busyCode === protocol.id

                return (
                  <div
                    key={protocol.id}
                    className="bg-white p-4 rounded-3xl border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-extrabold text-text-primary text-base">{protocol.protocol_name}</h3>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-2xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-text-secondary uppercase">
                            {PARASITE_TYPE_LABEL[protocol.parasite_type] || protocol.parasite_type}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-text-secondary flex flex-col gap-0.5 font-medium">
                          <span>⏱ Koruma Süresi: {protocol.default_protection_duration_days} gün</span>
                          <span>👶 Min. Yaş: {protocol.min_age_weeks} haftalık</span>
                          <span>
                            ⚙️ Yöntemler:{' '}
                            {protocol.allowed_application_methods.map(m => METHOD_LABEL[m] || m).join(', ')}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center min-h-[44px]">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleParasiteToggle(protocol.id, enabled)}
                          className={`shrink-0 w-12 h-7 rounded-full transition-colors relative active:scale-[0.95] ${
                            enabled ? 'bg-primary' : 'bg-slate-200'
                          } disabled:opacity-50`}
                        >
                          <span
                            className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                              enabled ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {confirmDisableCode && (
        <div
          role="dialog"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setConfirmDisableCode(null)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-3xl p-6 flex flex-col gap-3 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-extrabold text-text-primary text-base">Bu aşı için aktif bir plan var</h3>
            <p className="text-xs text-text-secondary font-medium">
              Tercihi kapatmak istediğinize emin misiniz? Mevcut planı korumayı veya iptal etmeyi seçebilirsiniz.
            </p>
            <button
              type="button"
              className="w-full py-3 rounded-2xl border border-border-main text-text-primary font-bold text-sm active:scale-[0.98]"
              onClick={async () => {
                const code = confirmDisableCode
                setConfirmDisableCode(null)
                await updateVaccinePreference(code, false)
              }}
            >
              Tercihi kapat, planları koru
            </button>
            <button
              type="button"
              className="w-full py-3 rounded-2xl bg-rose-50 text-error font-bold text-sm active:scale-[0.98]"
              onClick={async () => {
                const code = confirmDisableCode
                setConfirmDisableCode(null)
                await cancelActivePlans(code)
                await updateVaccinePreference(code, false)
              }}
            >
              Tercihi kapat ve planları iptal et
            </button>
            <button
              type="button"
              className="w-full py-3 text-text-secondary font-bold text-sm active:scale-[0.98]"
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

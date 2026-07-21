'use client'

import { useEffect, useState, useCallback } from 'react'
import { StepperInput } from '@/components/ui/StepperInput'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import ProductCatalogPanel from './ProductCatalogPanel'

// ─── Tipler ──────────────────────────────────────────────────────────────────

interface ParasiteProtocol {
  id: string
  parasite_code: string
  protocol_name: string
  parasite_type: 'internal' | 'external' | 'combined' | 'collar'
  species: 'cat' | 'dog'
  default_protection_duration_days: number
  allowed_application_methods: string[]
  default_application_method: string
  min_age_weeks: number | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

type FilterSpecies = 'all' | 'dog' | 'cat'
type FilterType = 'all' | 'internal' | 'external' | 'combined' | 'collar'
type FilterActive = 'all' | 'true' | 'false'

const SPECIES_LABEL: Record<string, string> = { dog: '🐕 Köpek', cat: '🐈 Kedi' }
const TYPE_LABEL: Record<string, string> = {
  internal: '💊 İç Parazit',
  external: '🛡️ Dış Parazit',
  combined: '⚡ Kombine Parazit',
  collar: '🎗️ Parazit Tasması',
}
const TYPE_COLOR: Record<string, string> = {
  internal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  external: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  combined: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  collar: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
}
const METHOD_LABEL: Record<string, string> = {
  spot_on: 'Damla',
  oral: 'Ağızdan/Tablet',
  collar: 'Tasma',
  injection: 'Enjeksiyon',
  spray: 'Sprey',
  shampoo: 'Şampuan',
  other: 'Diğer',
}

interface FormState {
  parasite_code: string
  protocol_name: string
  parasite_type: 'internal' | 'external' | 'combined' | 'collar'
  species: 'cat' | 'dog'
  default_protection_duration_days: number
  allowed_application_methods: string[]
  default_application_method: string
  min_age_weeks: string
  is_active: boolean
  sort_order: number
}

// ─── Boş form ────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  parasite_code: '',
  protocol_name: '',
  parasite_type: 'internal',
  species: 'dog',
  default_protection_duration_days: 30,
  allowed_application_methods: [],
  default_application_method: '',
  min_age_weeks: '',
  is_active: true,
  sort_order: 100,
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminParasiteProductsClient() {
  const [protocols, setProtocols] = useState<ParasiteProtocol[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterSpecies, setFilterSpecies] = useState<FilterSpecies>('all')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterActive, setFilterActive] = useState<FilterActive>('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ParasiteProtocol | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
  const [durationVal, setDurationVal] = useState<number>(30)
  const [durationUnit, setDurationUnit] = useState<'hour' | 'day' | 'week' | 'month' | 'year'>('day')

  const [deleteTarget, setDeleteTarget] = useState<ParasiteProtocol | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Hata kodlarını Türkçe mesajlara çevirme
  const translateError = (errKey: string, detailMsg?: string): string => {
    switch (errKey) {
      case 'UNAUTHORIZED':
        return 'Oturum açmanız gerekiyor. Lütfen giriş yapın.'
      case 'FORBIDDEN':
        return 'Bu işlemi yapmak için yetkiniz yok.'
      case 'PROTOCOL_NOT_FOUND':
        return 'Protokol bulunamadı.'
      case 'DUPLICATE_PROTOCOL':
        return 'Bu parazit kodu bu hayvan türü için zaten kayıtlı.'
      case 'INVALID_PROTOCOL_DATA':
        return `Geçersiz veri: ${detailMsg || 'Lütfen girdilerinizi kontrol edin.'}`
      default:
        return detailMsg || 'Bir hata oluştu.'
    }
  }

  // ── Veri çekme ─────────────────────────────────────────────────────────────
  const fetchProtocols = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterSpecies !== 'all') params.set('species', filterSpecies)
      if (filterType !== 'all') params.set('parasite_type', filterType)
      if (filterActive !== 'all') params.set('is_active', filterActive)

      const res = await fetch(`/api/admin/parasite-protocols?${params}`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(translateError(json.error, json.message))
      }
      setProtocols(json ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filterSpecies, filterType, filterActive])

  useEffect(() => {
    fetchProtocols()
  }, [fetchProtocols])

  // ── Ürün önerisi kuyruğu (P2) ──────────────────────────────────────────────
  const [supabase] = useState(() => createBrowserSupabaseClient())
  const [view, setView] = useState<'protocols' | 'products' | 'suggestions'>('protocols')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [sugLoading, setSugLoading] = useState(false)
  const [sugError, setSugError] = useState<string | null>(null)
  const [sugProcessing, setSugProcessing] = useState<string | null>(null)
  const [mergeTarget, setMergeTarget] = useState<any | null>(null)
  const [mergeProducts, setMergeProducts] = useState<any[]>([])
  const [mergeProductId, setMergeProductId] = useState('')

  const fetchSuggestions = useCallback(async () => {
    setSugLoading(true)
    setSugError(null)
    try {
      const res = await fetch('/api/admin/parasite-suggestions?status=pending')
      const json = await res.json()
      if (!res.ok) throw new Error(translateError(json.error, json.message))
      setSuggestions(json.data ?? [])
    } catch (e: any) {
      setSugError(e.message)
    } finally {
      setSugLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchSuggestions()
  }, [fetchSuggestions])

  const reviewSuggestion = async (id: string, body: Record<string, unknown>) => {
    setSugProcessing(id)
    try {
      const res = await fetch(`/api/admin/parasite-suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'İşlem başarısız.')
      setMergeTarget(null)
      setMergeProductId('')
      await fetchSuggestions()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSugProcessing(null)
    }
  }

  const openMerge = async (sug: any) => {
    setMergeTarget(sug)
    setMergeProductId('')
    const { data } = await supabase
      .from('parasite_products')
      .select('id, name, brand, species')
      .eq('is_active', true)
      .in('species', [sug.species, 'both'])
      .order('name')
    setMergeProducts(data || [])
  }

  // ── Modal aç/kapat ─────────────────────────────────────────────────────────
  const openNew = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setDurationVal(30)
    setAddDurationUnitFromDays(30)
    setFormError(null)
    setModalOpen(true)
  }

  const setAddDurationUnitFromDays = (days: number) => {
    if (days == null || isNaN(days) || days <= 0) {
      setDurationVal(0)
      setDurationUnit('day')
    } else if (days % 365 === 0) {
      setDurationVal(days / 365)
      setDurationUnit('year')
    } else if (days % 30 === 0) {
      setDurationVal(days / 30)
      setDurationUnit('month')
    } else if (days % 7 === 0) {
      setDurationVal(days / 7)
      setDurationUnit('week')
    } else {
      const hours = days * 24
      if (hours < 24 && Number.isInteger(hours)) {
        setDurationVal(hours)
        setDurationUnit('hour')
      } else {
        setDurationVal(days)
        setDurationUnit('day')
      }
    }
  }

  const openEdit = (p: ParasiteProtocol) => {
    setEditTarget(p)
    setForm({
      parasite_code: p.parasite_code,
      protocol_name: p.protocol_name,
      parasite_type: p.parasite_type,
      species: p.species,
      default_protection_duration_days: p.default_protection_duration_days,
      allowed_application_methods: p.allowed_application_methods,
      default_application_method: p.default_application_method,
      min_age_weeks: p.min_age_weeks !== null ? String(p.min_age_weeks) : '',
      is_active: p.is_active,
      sort_order: p.sort_order,
    })
    setAddDurationUnitFromDays(p.default_protection_duration_days)
    setFormError(null)
    setModalOpen(true)
  }

  // Yöntem checkbox değişimi yönetimi
  const handleMethodCheckboxChange = (method: string, checked: boolean) => {
    setForm(prev => {
      let nextMethods = [...prev.allowed_application_methods]
      if (checked) {
        if (!nextMethods.includes(method)) {
          nextMethods.push(method)
        }
      } else {
        nextMethods = nextMethods.filter(m => m !== method)
      }

      // Default yöntemin geçerliliğini koru
      let nextDefault = prev.default_application_method
      if (!nextMethods.includes(nextDefault)) {
        nextDefault = nextMethods.length > 0 ? nextMethods[0] : ''
      } else if (!nextDefault && nextMethods.length > 0) {
        nextDefault = nextMethods[0]
      }

      return {
        ...prev,
        allowed_application_methods: nextMethods,
        default_application_method: nextDefault,
      }
    })
  }

  // ── Kaydet ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setFormError(null)

    // Form validasyonu
    if (!form.parasite_code.trim()) {
      setFormError('Parazit kodu zorunludur (Büyük harf, sayı ve alt tire).')
      setSaving(false)
      return
    }
    if (!form.protocol_name.trim()) {
      setFormError('Protokol adı zorunludur.')
      setSaving(false)
      return
    }
    if (form.allowed_application_methods.length === 0) {
      setFormError('En az bir uygulama yöntemi seçilmelidir.')
      setSaving(false)
      return
    }
    if (!form.default_application_method) {
      setFormError('Varsayılan uygulama yöntemi seçilmelidir.')
      setSaving(false)
      return
    }

    let finalDays = durationVal
    if (durationVal > 0) {
      switch (durationUnit) {
        case 'hour':
          finalDays = Number((durationVal / 24).toFixed(4))
          break;
        case 'week':
          finalDays = durationVal * 7
          break;
        case 'month':
          finalDays = durationVal * 30
          break;
        case 'year':
          finalDays = durationVal * 365
          break;
        case 'day':
        default:
          break;
      }
    }

    const payload = {
      parasite_code: form.parasite_code.toUpperCase().trim(),
      protocol_name: form.protocol_name.trim(),
      parasite_type: form.parasite_type,
      species: form.species,
      default_protection_duration_days: finalDays,
      allowed_application_methods: form.allowed_application_methods,
      default_application_method: form.default_application_method,
      min_age_weeks: form.min_age_weeks !== '' ? parseInt(form.min_age_weeks, 10) : null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 100,
    }

    try {
      const url = editTarget
        ? `/api/admin/parasite-protocols/${editTarget.id}`
        : '/api/admin/parasite-protocols'
      const method = editTarget ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(translateError(json.error, json.message))
      }
      setModalOpen(false)
      fetchProtocols()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Pasife al ──────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/parasite-protocols/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(translateError(json.error, json.message))
      }
      setDeleteTarget(null)
      fetchProtocols()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Başlık */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Parazit Yönetimi</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {view === 'protocols'
              ? `${protocols.length} protokol · parasite_protocols`
              : view === 'products'
                ? 'Ürün kataloğu · parasite_products'
                : `${suggestions.length} bekleyen öneri · parasite_product_suggestions`}
          </p>
        </div>
        {view === 'protocols' && (
          <button
            onClick={openNew}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm self-start sm:self-auto"
          >
            + Yeni Protokol
          </button>
        )}
      </div>

      {/* Görünüm: Protokoller | Bekleyen Öneriler */}
      <div className="flex rounded-xl bg-white p-1 border border-gray-200 mb-4 w-fit">
        <button
          onClick={() => setView('protocols')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            view === 'protocols' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Protokoller
        </button>
        <button
          onClick={() => setView('products')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            view === 'products' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Ürünler
        </button>
        <button
          onClick={() => setView('suggestions')}
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            view === 'suggestions' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Bekleyen Öneriler{suggestions.length > 0 ? ` (${suggestions.length})` : ''}
        </button>
      </div>

      {view === 'products' && <ProductCatalogPanel />}

      {view === 'suggestions' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-6">
          {sugError && (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{sugError}</div>
          )}
          {sugLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Yükleniyor…</div>
          ) : suggestions.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Bekleyen ürün önerisi yok. 🎉</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {suggestions.map(s => (
                <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">
                      {s.brand ? `${s.brand} — ` : ''}{s.name_suggested}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {SPECIES_LABEL[s.species] ?? s.species} · {TYPE_LABEL[s.parasite_type] ?? s.parasite_type} · {METHOD_LABEL[s.application_method] ?? s.application_method} · {s.protection_duration_days} gün
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Öneren: {s.profiles?.full_name || s.profiles?.email || '—'} · {s.created_at ? new Date(s.created_at).toLocaleDateString('tr-TR') : ''}
                    </div>
                    {s.reason && <div className="text-[11px] text-gray-500 italic mt-1">&ldquo;{s.reason}&rdquo;</div>}
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <button
                      disabled={sugProcessing === s.id}
                      onClick={() => reviewSuggestion(s.id, { action: 'approve' })}
                      className="px-3 py-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      Onayla
                    </button>
                    <button
                      disabled={sugProcessing === s.id}
                      onClick={() => openMerge(s)}
                      className="px-3 py-1.5 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      Birleştir
                    </button>
                    <button
                      disabled={sugProcessing === s.id}
                      onClick={() => {
                        const note = window.prompt('Reddetme notu (opsiyonel):') ?? undefined
                        reviewSuggestion(s.id, { action: 'reject', ...(note && note.trim() ? { admin_note: note.trim() } : {}) })
                      }}
                      className="px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'protocols' && (<>
      {/* Filtreler */}
      <div className="flex flex-col gap-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filtreler</span>
        <div className="flex flex-wrap gap-2">
          {/* Tür Filtresi */}
          <div className="flex rounded-xl bg-white p-1 border border-gray-200">
            {(['all', 'dog', 'cat'] as FilterSpecies[]).map(s => (
              <button
                key={s}
                onClick={() => { setFilterSpecies(s) }}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filterSpecies === s
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s === 'all' ? '🐾 Tümü' : SPECIES_LABEL[s]}
              </button>
            ))}
          </div>

          {/* Tip Filtresi */}
          <div className="flex rounded-xl bg-white p-1 border border-gray-200">
            {(['all', 'internal', 'external', 'combined', 'collar'] as FilterType[]).map(t => (
              <button
                key={t}
                onClick={() => { setFilterType(t) }}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filterType === t
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t === 'all' ? 'Tip: Tümü' : TYPE_LABEL[t]?.split(' ')[1] || t}
              </button>
            ))}
          </div>

          {/* Aktif/Pasif Filtresi */}
          <div className="flex rounded-xl bg-white p-1 border border-gray-200">
            {(['all', 'true', 'false'] as FilterActive[]).map(act => (
              <button
                key={act}
                onClick={() => { setFilterActive(act) }}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filterActive === act
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {act === 'all' ? 'Durum: Tümü' : act === 'true' ? '✓ Aktif' : '✕ Pasif'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hata Mesajı */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {/* Protokol Listesi (Mobil Kartlar & Desktop Tablo) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Yükleniyor…</div>
        ) : protocols.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Protokol bulunamadı.</div>
        ) : (
          <>
            {/* Desktop Görünüm */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500">Kod / Protokol Adı</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500">Tür</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500">Parazit Tipi</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500">Koruma Süresi</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500">Yöntemler (Varsayılan)</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500">Min. Yaş</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500">Durum</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {protocols.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{p.protocol_name}</div>
                        <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">{p.parasite_code}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {SPECIES_LABEL[p.species] ?? p.species}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_COLOR[p.parasite_type]}`}>
                          {TYPE_LABEL[p.parasite_type] ?? p.parasite_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.default_protection_duration_days} gün</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="text-xs">
                          {p.allowed_application_methods.map(m => METHOD_LABEL[m] || m).join(', ')}
                        </div>
                        <div className="text-[10px] text-purple-600 font-medium mt-0.5">
                          Varsayılan: {METHOD_LABEL[p.default_application_method] || p.default_application_method}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {p.min_age_weeks !== null ? `${p.min_age_weeks} hafta` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {p.is_active ? '✓ Aktif' : '— Pasif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openEdit(p)}
                            className="text-xs text-purple-600 hover:text-purple-800 font-semibold transition-colors"
                          >
                            Düzenle
                          </button>
                          {p.is_active && (
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
                            >
                              Pasife Al
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Görünüm (Cards) */}
            <div className="md:hidden divide-y divide-gray-100">
              {protocols.map(p => (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{p.protocol_name}</div>
                      <div className="text-[9px] font-mono text-gray-400 uppercase tracking-wider">{p.parasite_code}</div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {p.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Tür</span>
                      <span className="font-medium text-gray-700">{SPECIES_LABEL[p.species] ?? p.species}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Tip</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_COLOR[p.parasite_type]}`}>
                        {TYPE_LABEL[p.parasite_type] ?? p.parasite_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Süre</span>
                      <span className="font-medium text-gray-700">{p.default_protection_duration_days} gün</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Min. Yaş</span>
                      <span className="font-medium text-gray-700">{p.min_age_weeks !== null ? `${p.min_age_weeks} hafta` : '—'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-400 block text-[10px] uppercase">Yöntemler</span>
                      <span className="font-medium text-gray-700 text-xs">
                        {p.allowed_application_methods.map(m => METHOD_LABEL[m] || m).join(', ')}
                        <span className="text-[10px] text-purple-600 block mt-0.5">
                          Varsayılan: {METHOD_LABEL[p.default_application_method] || p.default_application_method}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2 border-t border-gray-50">
                    <button
                      onClick={() => openEdit(p)}
                      className="px-3 py-1.5 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg font-semibold transition-colors"
                    >
                      Düzenle
                    </button>
                    {p.is_active && (
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-semibold transition-colors"
                      >
                        Pasife Al
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      </>)}

      {/* Ekle/Düzenle Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {editTarget ? 'Protokolü Düzenle' : 'Yeni Protokol'}
              </h2>

              <div className="space-y-4">
                {/* Kod + İsim */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Parazit Kodu <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.parasite_code}
                      onChange={e => setForm(f => ({ ...f, parasite_code: e.target.value }))}
                      disabled={!!editTarget}
                      placeholder="Örn: HEARTWORM"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Protokol Adı <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.protocol_name}
                      onChange={e => setForm(f => ({ ...f, protocol_name: e.target.value }))}
                      placeholder="Örn: Kalp Kurdu Koruma Protokolü"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                  </div>
                </div>

                {/* Tür + Tip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Tür</label>
                    <select
                      value={form.species}
                      onChange={e => setForm(f => ({ ...f, species: e.target.value as 'cat' | 'dog' }))}
                      disabled={!!editTarget}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 disabled:opacity-50"
                    >
                      <option value="dog">🐕 Köpek</option>
                      <option value="cat">🐈 Kedi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Parazit Tipi</label>
                    <select
                      value={form.parasite_type}
                      onChange={e => setForm(f => ({ ...f, parasite_type: e.target.value as any }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    >
                      <option value="internal">💊 İç Parazit</option>
                      <option value="external">🛡️ Dış Parazit</option>
                      <option value="combined">⚡ Kombine Parazit</option>
                      <option value="collar">🎗️ Parazit Tasması</option>
                    </select>
                  </div>
                </div>

                {/* Koruma Süresi */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Varsayılan Koruma Süresi <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={durationVal || ''}
                      onChange={(e) => setDurationVal(parseInt(e.target.value, 10) || 0)}
                      placeholder="Değer"
                      className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                    
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200 grow justify-between">
                      {(['hour', 'day', 'week', 'month', 'year'] as const).map((u) => {
                        const labels: Record<string, string> = {
                          hour: 'Saat',
                          day: 'Gün',
                          week: 'Hft',
                          month: 'Ay',
                          year: 'Yıl'
                        }
                        const isActive = durationUnit === u
                        return (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setDurationUnit(u)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                              isActive
                                ? 'bg-purple-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {labels[u]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  {durationVal > 0 && (
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      Veritabanına {
                        durationUnit === 'hour' ? `${(durationVal / 24).toFixed(4)} gün` :
                        durationUnit === 'week' ? `${durationVal * 7} gün` :
                        durationUnit === 'month' ? `${durationVal * 30} gün` :
                        durationUnit === 'year' ? `${durationVal * 365} gün` :
                        `${durationVal} gün`
                      } olarak kaydedilecektir.
                    </span>
                  )}
                </div>

                {/* İzin Verilen Yöntemler (Çoklu Seçim) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    İzin Verilen Yöntemler <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {Object.entries(METHOD_LABEL).map(([val, label]) => {
                      const checked = form.allowed_application_methods.includes(val)
                      return (
                        <label key={val} className="flex items-center gap-2 cursor-pointer text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={e => handleMethodCheckboxChange(val, e.target.checked)}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span>{label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Varsayılan Yöntem (İçinden Seçim) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">
                    Varsayılan Uygulama Yöntemi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.default_application_method}
                    onChange={e => setForm(f => ({ ...f, default_application_method: e.target.value }))}
                    disabled={form.allowed_application_methods.length === 0}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 disabled:opacity-50"
                  >
                    <option value="">{form.allowed_application_methods.length === 0 ? 'Önce yöntem seçin' : 'Seçiniz'}</option>
                    {form.allowed_application_methods.map((method) => (
                      <option key={method} value={method}>
                        {METHOD_LABEL[method] || method}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sıralama ve Minimum Yaş */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Sıralama Önceliği</label>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value, 10) || 100 }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Min. Yaş (Hafta)</label>
                    <StepperInput
                      min={0}
                      step={1}
                      value={form.min_age_weeks}
                      onChange={e => setForm(f => ({ ...f, min_age_weeks: e.target.value }))}
                      className="w-full"
                      placeholder="Opsiyonel"
                    />
                  </div>
                </div>

                {/* Toggle Aktif */}
                <div className="flex items-center gap-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Aktif Protokol (listede önerilir)</span>
                  </label>
                </div>
              </div>

              {/* Form Hata Mesajı */}
              {formError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm">
                  {formError}
                </div>
              )}

              {/* Butonlar */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  {saving ? 'Kaydediliyor…' : editTarget ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pasife Al Onay Modalı */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-2">Pasife Al</h2>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{deleteTarget.protocol_name}</strong> protokolü pasife alınacak.
              Mevcut kayıtlar etkilenmez, yeni önerilerde/listelerde görünmez.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center"
              >
                {deleting ? 'İşleniyor…' : 'Pasife Al'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Öneriyi Mevcut Ürünle Birleştir Modalı */}
      {mergeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-2">Mevcut Ürünle Birleştir</h2>
            <p className="text-sm text-gray-600 mb-3">
              <strong>{mergeTarget.name_suggested}</strong> önerisi seçilen katalog ürünüyle eşleştirilecek; yeni ürün oluşturulmaz.
            </p>
            <select
              value={mergeProductId}
              onChange={e => setMergeProductId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            >
              <option value="">-- Ürün Seçin --</option>
              {mergeProducts.map(p => (
                <option key={p.id} value={p.id}>{p.brand} {p.name}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                onClick={() => { setMergeTarget(null); setMergeProductId('') }}
                disabled={sugProcessing === mergeTarget.id}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                onClick={() => reviewSuggestion(mergeTarget.id, { action: 'merge', merged_into_product_id: mergeProductId })}
                disabled={!mergeProductId || sugProcessing === mergeTarget.id}
                className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
              >
                {sugProcessing === mergeTarget.id ? 'İşleniyor…' : 'Birleştir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

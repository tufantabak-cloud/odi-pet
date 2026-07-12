'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Tipler ──────────────────────────────────────────────────────────────────

interface ParasiteProduct {
  id:                        string
  species:                   string
  name:                      string
  brand:                     string
  type:                      string
  application_method:        string
  active_ingredient:         string | null
  protection_duration_days:  number
  notes:                     string | null
  is_active:                 boolean
  status:                    string
  suggested_by:              string | null
  admin_note:                string | null
  description:                string | null
  image_url:                  string | null
  covers_ear_mites:           boolean
  min_age_weeks:              number | null
}

type FilterSpecies = 'all' | 'dog' | 'cat' | 'both'
type FilterType     = 'all' | 'internal' | 'external' | 'combined'
type FilterStatus   = 'all' | 'pending' | 'approved' | 'rejected'

const SPECIES_LABEL: Record<string, string> = { dog: '🐕 Köpek', cat: '🐈 Kedi', both: '🐾 Her İkisi' }
const TYPE_LABEL: Record<string, string> = {
  internal: '💊 İç Parazit', external: '🛡️ Dış Parazit', combined: '⚡ Kombine'
}
const TYPE_COLOR: Record<string, string> = {
  internal: 'bg-blue-100 text-blue-700',
  external: 'bg-orange-100 text-orange-700',
  combined: 'bg-purple-100 text-purple-700',
}
const STATUS_LABEL: Record<string, string> = {
  pending: '⏳ Bekliyor', approved: '✓ Onaylı', rejected: '✕ Reddedildi'
}
const STATUS_COLOR: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-500',
}
const METHOD_LABEL: Record<string, string> = {
  oral: 'Oral', 'spot-on': 'Spot-on', collar: 'Tasma', spray: 'Sprey', injection: 'Enjeksiyon'
}

// ─── Boş form ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  species:                   'dog',
  name:                      '',
  brand:                     '',
  type:                      'external',
  application_method:        'spot-on',
  active_ingredient:         '',
  protection_duration_days:  30,
  notes:                     '',
  description:               '',
  min_age_weeks:             '',
  covers_ear_mites:          false,
  is_active:                 true,
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminParasiteProductsClient() {
  const [products,     setProducts]     = useState<ParasiteProduct[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)

  const [filterSpecies, setFilterSpecies] = useState<FilterSpecies>('all')
  const [filterType,    setFilterType]    = useState<FilterType>('all')
  const [filterStatus,  setFilterStatus]  = useState<FilterStatus>('all')

  const [modalOpen,   setModalOpen]   = useState(false)
  const [editTarget,  setEditTarget]  = useState<ParasiteProduct | null>(null)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [saving,      setSaving]      = useState(false)
  const [formError,   setFormError]   = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<ParasiteProduct | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  const [reviewLoadingId, setReviewLoadingId] = useState<string | null>(null)

  // ── Veri çekme ─────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (filterSpecies !== 'all') params.set('species', filterSpecies)
      if (filterType    !== 'all') params.set('type',    filterType)
      if (filterStatus  !== 'all') params.set('status',  filterStatus)

      const res  = await fetch(`/api/admin/parasite-products?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Hata')
      setProducts(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, filterSpecies, filterType, filterStatus])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  // ── Modal aç/kapat ─────────────────────────────────────────────────────────
  const openNew = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (p: ParasiteProduct) => {
    setEditTarget(p)
    setForm({
      species:                   p.species,
      name:                      p.name,
      brand:                     p.brand,
      type:                      p.type,
      application_method:        p.application_method,
      active_ingredient:         p.active_ingredient ?? '',
      protection_duration_days:  p.protection_duration_days,
      notes:                     p.notes ?? '',
      description:               p.description ?? '',
      min_age_weeks:             p.min_age_weeks !== null ? String(p.min_age_weeks) : '',
      covers_ear_mites:          p.covers_ear_mites,
      is_active:                 p.is_active,
    })
    setFormError(null)
    setModalOpen(true)
  }

  // ── Kaydet ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setFormError(null)

    if (!form.name.trim() || !form.brand.trim()) {
      setFormError('Ürün adı ve marka zorunlu.')
      setSaving(false)
      return
    }

    const payload = {
      ...form,
      active_ingredient: form.active_ingredient || null,
      notes:             form.notes             || null,
      description:       form.description       || null,
      min_age_weeks:      form.min_age_weeks ? parseInt(form.min_age_weeks, 10) : null,
    }

    try {
      const url    = editTarget
        ? `/api/admin/parasite-products/${editTarget.id}`
        : '/api/admin/parasite-products'
      const method = editTarget ? 'PATCH' : 'POST'

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Kayıt hatası')
      setModalOpen(false)
      fetchProducts()
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
      const res = await fetch(`/api/admin/parasite-products/${deleteTarget.id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Silme hatası')
      setDeleteTarget(null)
      fetchProducts()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleting(false)
    }
  }

  // ── Onayla / Reddet (yalnızca status='pending' satırlar için) ──────────────
  const handleReview = async (p: ParasiteProduct, decision: 'approved' | 'rejected') => {
    setReviewLoadingId(p.id)
    try {
      const res = await fetch(`/api/admin/parasite-products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status:    decision,
          is_active: decision === 'approved',
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error ?? 'İşlem hatası')
      }
      fetchProducts()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setReviewLoadingId(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🦟 Parazit Ürünleri</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} ürün · parasite_products tablosu
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
        >
          + Yeni Ürün
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all','dog','cat','both'] as FilterSpecies[]).map(s => (
          <button
            key={s}
            onClick={() => { setFilterSpecies(s); setPage(1) }}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filterSpecies === s
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ].join(' ')}
          >
            {s === 'all' ? '🐾 Tümü' : SPECIES_LABEL[s]}
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-1" />
        {(['all','internal','external','combined'] as FilterType[]).map(t => (
          <button
            key={t}
            onClick={() => { setFilterType(t); setPage(1) }}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filterType === t
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ].join(' ')}
          >
            {t === 'all' ? 'Tüm Tipler' : TYPE_LABEL[t]}
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-1" />
        {(['all','pending','approved','rejected'] as FilterStatus[]).map(st => (
          <button
            key={st}
            onClick={() => { setFilterStatus(st); setPage(1) }}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filterStatus === st
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ].join(' ')}
          >
            {st === 'all' ? 'Tüm Durumlar' : STATUS_LABEL[st]}
          </button>
        ))}
      </div>

      {/* Hata */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tablo */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Yükleniyor…</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Ürün bulunamadı.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ürün Adı</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Marka</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tür</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tip</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Uygulama</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Koruma</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Min. Yaş</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Durum</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Aktif</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.brand}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {SPECIES_LABEL[p.species] ?? p.species}
                  </td>
                  <td className="px-4 py-3">
                    <span className={[
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      TYPE_COLOR[p.type] ?? 'bg-gray-100 text-gray-600'
                    ].join(' ')}>
                      {TYPE_LABEL[p.type] ?? p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {METHOD_LABEL[p.application_method] ?? p.application_method}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.protection_duration_days} gün</td>
                  <td className="px-4 py-3 text-gray-600">
                    {p.min_age_weeks !== null ? `${p.min_age_weeks} hafta` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={[
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      STATUS_COLOR[p.status] ?? 'bg-gray-100 text-gray-600'
                    ].join(' ')}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={[
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      p.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                    ].join(' ')}>
                      {p.is_active ? '✓ Aktif' : '— Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {p.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReview(p, 'approved')}
                            disabled={reviewLoadingId === p.id}
                            className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                          >
                            Onayla
                          </button>
                          <button
                            onClick={() => handleReview(p, 'rejected')}
                            disabled={reviewLoadingId === p.id}
                            className="text-xs text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            Reddet
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                      >
                        Düzenle
                      </button>
                      {p.is_active && (
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="text-xs text-red-400 hover:text-red-600 font-medium"
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
        )}
      </div>

      {/* Sayfalama */}
      {total > 20 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} / {total}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              ← Önceki
            </button>
            <button
              disabled={page * 20 >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}

      {/* Ekle/Düzenle Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                {editTarget ? 'Ürünü Düzenle' : 'Yeni Ürün'}
              </h2>

              <div className="space-y-3">
                {/* Ad + Marka */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Ürün Adı <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Simparica"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Marka <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.brand}
                      onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                      placeholder="Zoetis"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Tür + Tip */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tür</label>
                    <select
                      value={form.species}
                      onChange={e => setForm(f => ({ ...f, species: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="dog">🐕 Köpek</option>
                      <option value="cat">🐈 Kedi</option>
                      <option value="both">🐾 Her İkisi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tip</label>
                    <select
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="internal">💊 İç Parazit</option>
                      <option value="external">🛡️ Dış Parazit</option>
                      <option value="combined">⚡ Kombine</option>
                    </select>
                  </div>
                </div>

                {/* Uygulama yöntemi + Koruma süresi */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Uygulama Yöntemi</label>
                    <select
                      value={form.application_method}
                      onChange={e => setForm(f => ({ ...f, application_method: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="oral">Oral</option>
                      <option value="spot-on">Spot-on</option>
                      <option value="collar">Tasma</option>
                      <option value="spray">Sprey</option>
                      <option value="injection">Enjeksiyon</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Koruma (Gün) <span className="text-red-500">*</span>
                    </label>
                    <StepperInput
                      min={0} step={1}
                      value={form.protection_duration_days}
                      onChange={e => setForm(f => ({ ...f, protection_duration_days: parseInt(e.target.value) || 0 }))}
                      className="w-full"
                      placeholder="30"
                    />
                  </div>
                </div>

                {/* Etken madde + Min yaş */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Etken Madde</label>
                    <input
                      value={form.active_ingredient}
                      onChange={e => setForm(f => ({ ...f, active_ingredient: e.target.value }))}
                      placeholder="Sarolaner"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Min. Yaş (Hafta)</label>
                    <StepperInput
                      min={0} step={1}
                      value={form.min_age_weeks}
                      onChange={e => setForm(f => ({ ...f, min_age_weeks: e.target.value }))}
                      className="w-full"
                      placeholder="Opsiyonel"
                    />
                  </div>
                </div>

                {/* Açıklama */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Açıklama</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
                  />
                </div>

                {/* Not */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Not</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none"
                  />
                </div>

                {/* Toggle'lar */}
                <div className="flex items-center gap-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.covers_ear_mites}
                      onChange={e => setForm(f => ({ ...f, covers_ear_mites: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Kulak uyuzu kapsıyor</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">Aktif (listede görünür)</span>
                  </label>
                </div>
              </div>

              {/* Form hata */}
              {formError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              {/* Butonlar */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
                >
                  {saving ? 'Kaydediliyor…' : editTarget ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pasife Al Onay Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-2">Pasife Al</h2>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{deleteTarget.name}</strong> ürünü pasife alınacak.
              Mevcut kayıtlar etkilenmez, yeni önerilerde/listelerde görünmez.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600"
              >
                Vazgeç
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {deleting ? 'İşleniyor…' : 'Pasife Al'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

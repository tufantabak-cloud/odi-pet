'use client'

import { useEffect, useState, useCallback } from 'react'

// P3: Ürün kataloğu yönetimi — protokollerden ayrı sekme.
// Katalog enum alfabesi: species 'both' var, method 'spot-on', type'ta collar yok.

interface CatalogProduct {
  id: string
  species: 'dog' | 'cat' | 'both'
  name: string
  brand: string
  type: 'internal' | 'external' | 'combined'
  application_method: 'oral' | 'spot-on' | 'collar' | 'spray' | 'injection'
  protection_duration_days: number
  active_ingredient: string | null
  description: string | null
  image_url: string | null
  min_age_weeks: number | null
  covers_ear_mites: boolean
  notes: string | null
  is_active: boolean
}

const SPECIES_LABEL: Record<string, string> = { dog: '🐕 Köpek', cat: '🐈 Kedi', both: '🐾 Her İkisi' }
const TYPE_LABEL: Record<string, string> = { internal: '💊 İç', external: '🛡️ Dış', combined: '⚡ Kombine' }
const METHOD_LABEL: Record<string, string> = {
  oral: 'Ağızdan/Tablet',
  'spot-on': 'Damla (Spot-on)',
  collar: 'Tasma',
  spray: 'Sprey',
  injection: 'Enjeksiyon',
}

interface ProductForm {
  species: 'dog' | 'cat' | 'both'
  name: string
  brand: string
  type: 'internal' | 'external' | 'combined'
  application_method: 'oral' | 'spot-on' | 'collar' | 'spray' | 'injection'
  protection_duration_days: number
  active_ingredient: string
  description: string
  image_url: string
  min_age_weeks: string
  covers_ear_mites: boolean
  is_active: boolean
}

const EMPTY_FORM: ProductForm = {
  species: 'dog',
  name: '',
  brand: '',
  type: 'external',
  application_method: 'spot-on',
  protection_duration_days: 30,
  active_ingredient: '',
  description: '',
  image_url: '',
  min_age_weeks: '',
  covers_ear_mites: false,
  is_active: true,
}

export default function ProductCatalogPanel() {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterSpecies, setFilterSpecies] = useState<'all' | 'dog' | 'cat' | 'both'>('all')
  const [filterActive, setFilterActive] = useState<'all' | 'true' | 'false'>('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<CatalogProduct | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<CatalogProduct | null>(null)
  const [processing, setProcessing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleImageUpload = async (file: File) => {
    setFormError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/parasite-products/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'Görsel yüklenemedi.')
      setForm(f => ({ ...f, image_url: json.url }))
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setUploading(false)
    }
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterSpecies !== 'all') params.set('species', filterSpecies)
      if (filterActive !== 'all') params.set('is_active', filterActive)
      const res = await fetch(`/api/admin/parasite-products?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'Ürünler yüklenemedi.')
      setProducts(json ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filterSpecies, filterActive])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const openNew = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (p: CatalogProduct) => {
    setEditTarget(p)
    setForm({
      species: p.species,
      name: p.name,
      brand: p.brand,
      type: p.type,
      application_method: p.application_method,
      protection_duration_days: p.protection_duration_days,
      active_ingredient: p.active_ingredient || '',
      description: p.description || '',
      image_url: p.image_url || '',
      min_age_weeks: p.min_age_weeks !== null ? String(p.min_age_weeks) : '',
      covers_ear_mites: p.covers_ear_mites,
      is_active: p.is_active,
    })
    setFormError(null)
    setModalOpen(true)
  }

  const handleSave = async () => {
    setFormError(null)
    if (form.name.trim().length < 2) {
      setFormError('Ürün adı en az 2 karakter olmalıdır.')
      return
    }
    if (!form.brand.trim()) {
      setFormError('Marka zorunludur.')
      return
    }
    if (!Number.isInteger(form.protection_duration_days) || form.protection_duration_days < 0) {
      setFormError('Koruma süresi 0 (tedavi ürünü) veya pozitif bir tam sayı olmalıdır.')
      return
    }

    setSaving(true)
    const payload = {
      species: form.species,
      name: form.name.trim(),
      brand: form.brand.trim(),
      type: form.type,
      application_method: form.application_method,
      protection_duration_days: form.protection_duration_days,
      active_ingredient: form.active_ingredient.trim() || null,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      min_age_weeks: form.min_age_weeks !== '' ? parseInt(form.min_age_weeks, 10) : null,
      covers_ear_mites: form.covers_ear_mites,
      is_active: form.is_active,
    }

    try {
      const url = editTarget ? `/api/admin/parasite-products/${editTarget.id}` : '/api/admin/parasite-products'
      const res = await fetch(url, {
        method: editTarget ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'Kaydetme başarısız.')
      setModalOpen(false)
      await fetchProducts()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateTarget) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/parasite-products/${deactivateTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'İşlem başarısız.')
      setDeactivateTarget(null)
      await fetchProducts()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleReactivate = async (p: CatalogProduct) => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/parasite-products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || json.error || 'İşlem başarısız.')
      await fetchProducts()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div>
      {/* Üst çubuk: filtreler + yeni ürün */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="flex rounded-xl bg-white p-1 border border-gray-200">
            {(['all', 'dog', 'cat', 'both'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterSpecies(s)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filterSpecies === s ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s === 'all' ? '🐾 Tümü' : SPECIES_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="flex rounded-xl bg-white p-1 border border-gray-200">
            {(['all', 'true', 'false'] as const).map(a => (
              <button
                key={a}
                onClick={() => setFilterActive(a)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  filterActive === a ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {a === 'all' ? 'Durum: Tümü' : a === 'true' ? '✓ Aktif' : '✕ Pasif'}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={openNew}
          className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors shadow-sm self-start"
        >
          + Yeni Ürün
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">{error}</div>
      )}

      {/* Ürün listesi */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Yükleniyor…</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Ürün bulunamadı.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {products.map(p => (
              <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 text-lg shrink-0">💊</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">{p.brand} {p.name}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {p.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {SPECIES_LABEL[p.species] ?? p.species} · {TYPE_LABEL[p.type] ?? p.type} · {METHOD_LABEL[p.application_method] ?? p.application_method} · <strong>{p.protection_duration_days > 0 ? `${p.protection_duration_days} gün` : 'tedavi (0 gün)'}</strong>
                    {p.min_age_weeks !== null ? ` · min ${p.min_age_weeks} hafta` : ''}
                    {p.covers_ear_mites ? ' · kulak akarı ✓' : ''}
                  </div>
                  {p.active_ingredient && (
                    <div className="text-[11px] text-gray-400 mt-0.5">{p.active_ingredient}</div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    className="px-3 py-1.5 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg font-semibold transition-colors"
                  >
                    Düzenle
                  </button>
                  {p.is_active ? (
                    <button
                      onClick={() => setDeactivateTarget(p)}
                      disabled={processing}
                      className="px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      Pasife Al
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(p)}
                      disabled={processing}
                      className="px-3 py-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded-lg font-semibold transition-colors disabled:opacity-50"
                    >
                      Aktifleştir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ekle/Düzenle Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{editTarget ? 'Ürünü Düzenle' : 'Yeni Ürün'}</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Marka <span className="text-red-500">*</span></label>
                    <input
                      value={form.brand}
                      onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                      placeholder="Örn: MSD Animal Health"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Ürün Adı <span className="text-red-500">*</span></label>
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Örn: Bravecto Tablet"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Tür</label>
                    <select
                      value={form.species}
                      onChange={e => setForm(f => ({ ...f, species: e.target.value as ProductForm['species'] }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    >
                      <option value="dog">🐕 Köpek</option>
                      <option value="cat">🐈 Kedi</option>
                      <option value="both">🐾 Her İkisi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Parazit Tipi</label>
                    <select
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value as ProductForm['type'] }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    >
                      <option value="internal">💊 İç</option>
                      <option value="external">🛡️ Dış</option>
                      <option value="combined">⚡ Kombine</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Yöntem</label>
                    <select
                      value={form.application_method}
                      onChange={e => setForm(f => ({ ...f, application_method: e.target.value as ProductForm['application_method'] }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    >
                      {Object.entries(METHOD_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Koruma Süresi (gün) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      min={0}
                      max={1095}
                      value={form.protection_duration_days}
                      onChange={e => setForm(f => ({ ...f, protection_duration_days: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                    <span className="text-[10px] text-gray-400 mt-0.5 block">0 = tedavi ürünü (kalıcı koruma yok; kayıtta protokol süresi kullanılır)</span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Min. Yaş (Hafta)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.min_age_weeks}
                      onChange={e => setForm(f => ({ ...f, min_age_weeks: e.target.value }))}
                      placeholder="Opsiyonel"
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Etken Madde</label>
                  <input
                    value={form.active_ingredient}
                    onChange={e => setForm(f => ({ ...f, active_ingredient: e.target.value }))}
                    placeholder="Örn: Fluralaner"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Açıklama</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    placeholder="Kullanıcıya gösterilecek kısa açıklama"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Ürün Görseli</label>
                  <div className="flex items-center gap-3">
                    {form.image_url ? (
                      <img src={form.image_url} alt="Ürün görseli" className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-xs shrink-0">Yok</div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${uploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>
                        {uploading ? 'Yükleniyor…' : (form.image_url ? 'Görseli Değiştir' : 'Görsel Yükle')}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={uploading}
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = '' }}
                        />
                      </label>
                      {form.image_url && (
                        <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="text-[11px] text-red-500 hover:text-red-600 text-left font-medium">
                          Görseli kaldır
                        </button>
                      )}
                      <span className="text-[10px] text-gray-400">JPEG/PNG/WebP · maks. 3MB</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.covers_ear_mites}
                      onChange={e => setForm(f => ({ ...f, covers_ear_mites: e.target.checked }))}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Kulak akarını kapsar</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Aktif (kullanıcı listesinde görünür)</span>
                  </label>
                </div>
              </div>

              {formError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-sm">{formError}</div>
              )}

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
                  className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors disabled:opacity-60"
                >
                  {saving ? 'Kaydediliyor…' : editTarget ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pasife Al Onay Modalı */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-2">Ürünü Pasife Al</h2>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{deactivateTarget.brand} {deactivateTarget.name}</strong> kullanıcı listelerinden kaldırılacak.
              Geçmiş uygulama kayıtları ve koruma süreleri <strong>etkilenmez</strong>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeactivateTarget(null)}
                disabled={processing}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                onClick={handleDeactivate}
                disabled={processing}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {processing ? 'İşleniyor…' : 'Pasife Al'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

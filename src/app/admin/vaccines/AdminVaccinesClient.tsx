'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { VACCINE_CORE_TYPE_LABELS, VaccineCoreType } from '@/lib/pets/vaccines'
import { StepperInput } from '@/components/ui/StepperInput'

// ─── Tipler ──────────────────────────────────────────────────────────────────

interface VaccineProtocol {
  id:                   string
  vaccine_code:         string
  protocol_name:        string
  species:              string
  category:             string
  risk_group:           string | null
  is_active:            boolean
  is_core:              boolean
  doses:                object[]
  repeat_frequency:     string | null
  repeat_interval_days: number | null
  notes:                string | null
  sort_order:           number | null
}

type FilterSpecies  = 'all' | 'dog' | 'cat'
type FilterCategory = 'all' | 'core' | 'risk_based' | 'legal' | 'optional'

const SPECIES_LABEL:  Record<string, string> = { dog: '🐕 Köpek', cat: '🐈 Kedi', both: '🐾 Her İkisi' }
const CATEGORY_LABEL: Record<string, string> = {
  core: '⭐ Temel', risk_based: '⚠️ Risk Bazlı',
  legal: '⚖️ Yasal', optional: '💊 Opsiyonel'
}
const CATEGORY_COLOR: Record<string, string> = {
  core:       'bg-blue-100 text-blue-700',
  risk_based: 'bg-orange-100 text-orange-700',
  legal:      'bg-red-100 text-red-700',
  optional:   'bg-gray-100 text-gray-600',
}

// ─── Boş form ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  vaccine_code:         '',
  protocol_name:        '',
  species:              'dog',
  category:             'core',
  risk_group:           '',
  is_active:            true,
  notes:                '',
  sort_order:           100,
  repeat_frequency:     'yearly',
  repeat_interval_days: 365,
  doses:                '[]',  // JSON string olarak tutulur, kaydetmeden önce parse edilir
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminVaccinesClient() {
  const [protocols,    setProtocols]    = useState<VaccineProtocol[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)

  const [filterSpecies,  setFilterSpecies]  = useState<FilterSpecies>('all')
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('all')

  const [modalOpen,    setModalOpen]    = useState(false)
  const [editTarget,   setEditTarget]   = useState<VaccineProtocol | null>(null)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [saving,       setSaving]       = useState(false)
  const [formError,    setFormError]    = useState<string | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<VaccineProtocol | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  // ── Veri çekme ─────────────────────────────────────────────────────────────
  const fetchProtocols = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (filterSpecies  !== 'all') params.set('species',  filterSpecies)
      if (filterCategory !== 'all') params.set('category', filterCategory)

      const res  = await fetch(`/api/admin/vaccines?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Hata')
      setProtocols(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, filterSpecies, filterCategory])

  useEffect(() => { fetchProtocols() }, [fetchProtocols])

  // ── Modal aç/kapat ─────────────────────────────────────────────────────────
  const openNew = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setModalOpen(true)
  }

  const openEdit = (p: VaccineProtocol) => {
    setEditTarget(p)
    setForm({
      vaccine_code:         p.vaccine_code,
      protocol_name:        p.protocol_name,
      species:              p.species,
      category:             p.category,
      risk_group:           p.risk_group ?? '',
      is_active:            p.is_active,
      notes:                p.notes ?? '',
      sort_order:           p.sort_order ?? 100,
      repeat_frequency:     p.repeat_frequency     ?? 'yearly',
      repeat_interval_days: p.repeat_interval_days ?? 365,
      doses:                JSON.stringify(p.doses ?? [], null, 2),
    })
    setFormError(null)
    setModalOpen(true)
  }

  // ── Kaydet ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    setFormError(null)

    // doses JSON parse kontrolü
    let parsedDoses: object[]
    try {
      parsedDoses = JSON.parse(form.doses)
      if (!Array.isArray(parsedDoses)) throw new Error()
    } catch {
      setFormError('Doz kuralları geçerli bir JSON dizisi olmalı.')
      setSaving(false)
      return
    }

    const payload = {
      ...form,
      doses:     parsedDoses,
      risk_group: form.risk_group || null,
      notes:      form.notes      || null,
    }

    try {
      const url    = editTarget
        ? `/api/admin/vaccines/${editTarget.id}`
        : '/api/admin/vaccines'
      const method = editTarget ? 'PATCH' : 'POST'

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Kayıt hatası')
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
      const res = await fetch(`/api/admin/vaccines/${deleteTarget.id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Silme hatası')
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
    <div className="p-6 max-w-7xl mx-auto">

      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💉 Aşı Protokolleri</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} protokol · vaccine_protocols tablosu
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors"
        >
          + Yeni Protokol
        </button>
      </div>

      {/* Filtreler */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all','dog','cat'] as FilterSpecies[]).map(s => (
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
        {(['all','core','risk_based','legal','optional'] as FilterCategory[]).map(c => (
          <button
            key={c}
            onClick={() => { setFilterCategory(c); setPage(1) }}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filterCategory === c
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ].join(' ')}
          >
            {c === 'all' ? 'Tüm Kategoriler' : CATEGORY_LABEL[c]}
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
        ) : protocols.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Protokol bulunamadı.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Kod</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Protokol Adı</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tür</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Kategori</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Doz</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Durum</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {protocols.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.vaccine_code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.protocol_name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {SPECIES_LABEL[p.species] ?? p.species}
                  </td>
                  <td className="px-4 py-3">
                    <span className={[
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      CATEGORY_COLOR[p.category] ?? 'bg-gray-100 text-gray-600'
                    ].join(' ')}>
                      {CATEGORY_LABEL[p.category] ?? p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {Array.isArray(p.doses) ? p.doses.length : '?'} doz
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
                    <div className="flex items-center justify-end gap-2">
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
                {editTarget ? 'Protokolü Düzenle' : 'Yeni Protokol'}
              </h2>

              <div className="space-y-3">
                {/* Kod */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Kod <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.vaccine_code}
                    onChange={e => setForm(f => ({ ...f, vaccine_code: e.target.value.toUpperCase() }))}
                    placeholder="DOG_DHPPI"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono"
                    disabled={!!editTarget}
                  />
                </div>

                {/* Ad */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Protokol Adı <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.protocol_name}
                    onChange={e => setForm(f => ({ ...f, protocol_name: e.target.value }))}
                    placeholder="Gençlik Hastalığı (DHPPi) Protokolü"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>

                {/* Tür + Kategori */}
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
                    <label className="block text-xs font-medium text-gray-500 mb-1">Kategori</label>
                    <select
                      value={form.category}
                      onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="core">⭐ Temel</option>
                      <option value="risk_based">⚠️ Risk Bazlı</option>
                      <option value="legal">⚖️ Yasal</option>
                      <option value="optional">💊 Opsiyonel</option>
                    </select>
                  </div>
                </div>

                {/* Risk grubu */}
                {form.category === 'risk_based' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Risk Grubu</label>
                    <select
                      value={form.risk_group}
                      onChange={e => setForm(f => ({ ...f, risk_group: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="">Seçin</option>
                      <option value="outdoor">Dışarı çıkan</option>
                      <option value="rural">Kırsal yaşam</option>
                      <option value="kennel">Barınak / yoğun temas</option>
                    </select>
                  </div>
                )}

                {/* Tekrar */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tekrar Sıklığı</label>
                    <select
                      value={form.repeat_frequency ?? ''}
                      onChange={e => setForm(f => ({ ...f, repeat_frequency: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="">Yok</option>
                      <option value="yearly">Yıllık</option>
                      <option value="every_3_years">3 Yılda bir</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tekrar Günü</label>
                    <StepperInput
                      min={0} step={1} unit="Gün"
                      value={form.repeat_interval_days ?? ''}
                      onChange={e => setForm(f => ({ ...f, repeat_interval_days: parseInt(e.target.value)||0 }))}
                      className="w-full"
                      placeholder="365"
                    />
                  </div>
                </div>

                {/* Sıra */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sıra (sort_order)</label>
                  <StepperInput
                    min={0} step={1}
                    value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value)||100 }))}
                    className="w-full"
                  />
                </div>

                {/* Doz kuralları */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Doz Kuralları (JSON) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.doses}
                    onChange={e => setForm(f => ({ ...f, doses: e.target.value }))}
                    rows={6}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono resize-none"
                    placeholder={`[
  {"label":"1. Doz","trigger":"birth","days_offset":49,"dose_number":1},
  {"label":"2. Doz","trigger":"prev_dose","days_offset":21,"dose_number":2}
]`}
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

                {/* Aktif toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Aktif (yeni planlara dahil edilir)</span>
                </label>
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
              <strong>{deleteTarget.protocol_name}</strong> protokolü pasife alınacak.
              Mevcut planlar etkilenmez, yeni planlara dahil edilmez.
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

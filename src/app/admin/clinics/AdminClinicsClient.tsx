'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClinicMember {
  profile_id: string
  profiles: {
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
}

interface Clinic {
  id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  is_public: boolean
  created_at: string
  clinic_memberships: ClinicMember[]
}

interface ClinicsResponse {
  clinics: Clinic[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  statusCounts: {
    pending: number
    active: number
    all: number
  }
}

// ── Status Tab Config ──────────────────────────────────────────────────────────
const STATUS_TABS = [
  { id: 'pending', label: 'Onay Bekliyor', emoji: '⏳', color: 'amber' },
  { id: 'active',  label: 'Aktif',         emoji: '✅', color: 'emerald' },
  { id: 'all',     label: 'Tümü',          emoji: '🏥', color: 'sky' },
] as const

type StatusId = typeof STATUS_TABS[number]['id']

const COLOR_MAP: Record<string, { active: string; inactive: string }> = {
  amber:   { active: 'bg-amber-500 text-white border-amber-500',     inactive: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  emerald: { active: 'bg-emerald-500 text-white border-emerald-500', inactive: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  sky:     { active: 'bg-sky-500 text-white border-sky-500',         inactive: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' },
}

// ── Status Badge ───────────────────────────────────────────────────────────────
function StatusBadge({ isPublic }: { isPublic: boolean }) {
  return isPublic ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold bg-emerald-100 text-emerald-700 border-emerald-200">
      ✅ Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold bg-amber-100 text-amber-700 border-amber-200">
      ⏳ Onay Bekliyor
    </span>
  )
}

// ── Action Button ──────────────────────────────────────────────────────────────
function ActionButton({
  id,
  label,
  emoji,
  style,
  loading,
  onClick,
}: {
  id: string
  label: string
  emoji: string
  style: string
  loading: boolean
  onClick: () => void
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${style}`}
    >
      {loading ? (
        <span className="animate-spin">⟳</span>
      ) : (
        <span>{emoji}</span>
      )}
      {label}
    </button>
  )
}

// ── Confirm Dialog (inline modal) ──────────────────────────────────────────────
interface ConfirmState {
  clinicId: string
  clinicName: string
  action: 'approve' | 'reject' | 'suspend'
}

function ConfirmDialog({
  state,
  onConfirm,
  onCancel,
  loading,
}: {
  state: ConfirmState
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const cfg = {
    approve: {
      title: 'Kliniği Onayla',
      desc: `"${state.clinicName}" kliniğini onaylamak istediğinize emin misiniz? Klinik herkese açık hale gelecek.`,
      confirmLabel: 'Evet, Onayla',
      confirmStyle: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500',
    },
    reject: {
      title: 'Kliniği Reddet',
      desc: `"${state.clinicName}" kliniğini reddetmek istediğinize emin misiniz? Klinik kaydı ve üyelikleri kalıcı olarak silinecek.`,
      confirmLabel: 'Evet, Reddet ve Sil',
      confirmStyle: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500',
    },
    suspend: {
      title: 'Kliniği Askıya Al',
      desc: `"${state.clinicName}" kliniğini askıya almak istediğinize emin misiniz? Klinik gizlenecek ancak veriler korunacak.`,
      confirmLabel: 'Evet, Askıya Al',
      confirmStyle: 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500',
    },
  }[state.action]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-surface rounded-2xl border border-border-main shadow-2xl p-6 space-y-4">
        <h3 className="text-[16px] font-black text-text-primary">{cfg.title}</h3>
        <p className="text-[13px] text-text-secondary leading-relaxed">{cfg.desc}</p>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border-main bg-bg-main text-[13px] font-bold text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40"
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl border text-[13px] font-bold transition-all disabled:opacity-40 ${cfg.confirmStyle}`}
          >
            {loading ? 'İşleniyor…' : cfg.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Clinic Row ─────────────────────────────────────────────────────────────────
function ClinicRow({
  clinic,
  onAction,
}: {
  clinic: Clinic
  onAction: (clinicId: string, clinicName: string, action: 'approve' | 'reject' | 'suspend') => void
}) {
  const founder = clinic.clinic_memberships?.[0]?.profiles

  const registeredAt = new Date(clinic.created_at).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="p-5 rounded-xl border border-border-main bg-surface hover:bg-bg-main/40 transition-colors space-y-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-[15px] text-text-primary truncate">{clinic.name}</h3>
            <StatusBadge isPublic={clinic.is_public} />
          </div>
          <p className="text-[11px] text-text-secondary mt-0.5 font-mono">{clinic.id}</p>
        </div>
        <span className="text-[11px] text-text-secondary shrink-0">📅 {registeredAt}</span>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
        <div className="flex items-center gap-2 text-text-secondary">
          <span>📧</span>
          <span className="truncate">{clinic.contact_email ?? '—'}</span>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <span>📞</span>
          <span>{clinic.contact_phone ?? '—'}</span>
        </div>
        {founder && (
          <div className="flex items-center gap-2 text-text-secondary sm:col-span-2">
            <span>🩺</span>
            <span>
              {[founder.first_name, founder.last_name].filter(Boolean).join(' ') || '—'}
              {' · '}
              <span className="font-mono">{founder.email ?? '—'}</span>
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border-main">
        {!clinic.is_public && (
          <ActionButton
            id={`clinic-approve-${clinic.id}`}
            label="Onayla"
            emoji="✅"
            style="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            loading={false}
            onClick={() => onAction(clinic.id, clinic.name, 'approve')}
          />
        )}
        {clinic.is_public && (
          <ActionButton
            id={`clinic-suspend-${clinic.id}`}
            label="Askıya Al"
            emoji="⏸"
            style="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
            loading={false}
            onClick={() => onAction(clinic.id, clinic.name, 'suspend')}
          />
        )}
        <ActionButton
          id={`clinic-reject-${clinic.id}`}
          label="Reddet & Sil"
          emoji="🗑"
          style="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
          loading={false}
          onClick={() => onAction(clinic.id, clinic.name, 'reject')}
        />
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminClinicsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [data, setData] = useState<ClinicsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  const status = (searchParams.get('status') ?? 'pending') as StatusId
  const page   = parseInt(searchParams.get('page') ?? '1', 10)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const setParam = useCallback(
    (updates: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v) p.set(k, v)
        else p.delete(k)
      })
      router.push(`/admin/clinics?${p.toString()}`)
    },
    [router, searchParams]
  )

  const fetchData = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams()
    p.set('status', status)
    p.set('page', String(page))
    if (debouncedSearch) p.set('search', debouncedSearch)

    fetch(`/api/admin/clinics?${p.toString()}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [status, page, debouncedSearch])

  useEffect(() => { fetchData() }, [fetchData])

  // Sync search → URL
  useEffect(() => {
    setParam({ search: debouncedSearch, page: '1' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAction = (clinicId: string, clinicName: string, action: 'approve' | 'reject' | 'suspend') => {
    setConfirm({ clinicId, clinicName, action })
  }

  const executeAction = async () => {
    if (!confirm) return
    setActionLoading(true)

    try {
      const res = await fetch(`/api/admin/clinics/${confirm.clinicId}/${confirm.action}`, {
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Bir hata oluştu')

      const msgMap = {
        approve: `✅ "${confirm.clinicName}" onaylandı.`,
        reject:  `🗑 "${confirm.clinicName}" reddedildi ve silindi.`,
        suspend: `⏸ "${confirm.clinicName}" askıya alındı.`,
      }
      showToast(msgMap[confirm.action], 'success')
      setConfirm(null)
      fetchData()
    } catch (err) {
      showToast((err as Error).message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const counts = data?.statusCounts ?? { pending: 0, active: 0, all: 0 }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-[13px] font-bold border transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirm && (
        <ConfirmDialog
          state={confirm}
          onConfirm={executeAction}
          onCancel={() => setConfirm(null)}
          loading={actionLoading}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-text-primary">Klinik Yönetimi</h1>
            <p className="text-[13px] text-text-secondary mt-1">
              Klinik başvurularını inceleyin, onaylayın veya reddedin.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {counts.pending > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 text-[12px] font-bold">
                ⏳ {counts.pending} bekliyor
              </span>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const isActive = status === tab.id
            const colors = COLOR_MAP[tab.color]
            const count = counts[tab.id as keyof typeof counts]
            return (
              <button
                key={tab.id}
                id={`clinic-tab-${tab.id}`}
                onClick={() => setParam({ status: tab.id, page: '1' })}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-bold transition-all ${
                  isActive ? colors.active : colors.inactive
                }`}
              >
                <span>{tab.emoji}</span>
                {tab.label}
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-black ${
                    isActive ? 'bg-white/25' : 'bg-current/10'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-[14px]">🔍</span>
          <input
            id="clinic-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Klinik adı veya email ara…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border-main bg-surface text-[13px] text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Clinic Cards */}
        <div className="space-y-3">
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-5 rounded-xl border border-border-main bg-surface animate-pulse space-y-3">
                  <div className="h-5 bg-bg-main rounded w-48" />
                  <div className="h-3 bg-bg-main rounded w-72" />
                  <div className="h-3 bg-bg-main rounded w-56" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-8 bg-bg-main rounded-lg w-24" />
                    <div className="h-8 bg-bg-main rounded-lg w-24" />
                  </div>
                </div>
              ))
            : data?.clinics.map((clinic) => (
                <ClinicRow
                  key={clinic.id}
                  clinic={clinic}
                  onAction={handleAction}
                />
              ))}

          {!loading && data?.clinics.length === 0 && (
            <div className="py-16 text-center rounded-xl border border-border-main bg-surface">
              <div className="text-5xl mb-4">🏥</div>
              <p className="font-bold text-text-primary text-[15px]">Klinik bulunamadı</p>
              <p className="text-text-secondary text-[13px] mt-1">
                {status === 'pending'
                  ? 'Onay bekleyen klinik başvurusu yok.'
                  : 'Bu kritere uygun klinik bulunamadı.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-text-secondary">
              Toplam <span className="font-bold text-text-primary">{data.total}</span> klinik —{' '}
              Sayfa <span className="font-bold text-text-primary">{data.page}</span> / {data.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                id="clinic-page-prev"
                disabled={page <= 1}
                onClick={() => setParam({ page: String(page - 1) })}
                className="px-4 py-2 rounded-xl border border-border-main bg-surface text-[13px] font-semibold text-text-secondary hover:text-primary hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← Önceki
              </button>
              <button
                id="clinic-page-next"
                disabled={page >= data.totalPages}
                onClick={() => setParam({ page: String(page + 1) })}
                className="px-4 py-2 rounded-xl border border-border-main bg-surface text-[13px] font-semibold text-text-secondary hover:text-primary hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

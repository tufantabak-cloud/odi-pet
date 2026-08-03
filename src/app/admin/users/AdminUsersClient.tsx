'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import BulkActionBar from '@/components/admin/BulkActionBar'
import {
  Users,
  PawPrint,
  Stethoscope,
  Key,
  Crown,
  User as UserIcon,
  Search,
  X,
  Gift,
  CheckCircle2,
  RotateCw,
  Sparkles,
  Zap,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface User {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  phone: string | null
  created_at: string
  premium_until?: string | null
  premium_tier?: string | null
}

interface UsersResponse {
  users: User[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  roleCounts: Record<string, number>
}

function SubscriptionBadge({ premiumUntil }: { premiumUntil?: string | null }) {
  if (!premiumUntil) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
        Standart (Free)
      </span>
    )
  }

  const untilDate = new Date(premiumUntil)
  const now = new Date()
  const diffMs = untilDate.getTime() - now.getTime()
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (daysLeft > 0) {
    const isInfinite = daysLeft >= 3650
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-black bg-amber-50 text-amber-700 border border-amber-300 shadow-xs">
        <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
        Odi Pro ({isInfinite ? 'Sonsuz ♾️' : `${daysLeft} Gün`})
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-2xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
      Süresi Doldu
    </span>
  )
}

// ── Role Config ───────────────────────────────────────────────────────────────
const ROLE_TABS = [
  { id: 'all', label: 'Tümü', icon: Users, color: 'sky' },
  { id: 'owner', label: 'Owner', icon: PawPrint, color: 'violet' },
  { id: 'vet', label: 'Vet', icon: Stethoscope, color: 'emerald' },
  { id: 'admin', label: 'Admin', icon: Key, color: 'amber' },
  { id: 'founder', label: 'Founder', icon: Crown, color: 'rose' },
] as const

type RoleId = (typeof ROLE_TABS)[number]['id']
const COLOR_MAP: Record<string, { active: string; inactive: string }> = {
  sky: { active: 'bg-sky-500 text-white border-sky-500 shadow-sm', inactive: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' },
  violet: { active: 'bg-violet-500 text-white border-violet-500 shadow-sm', inactive: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100' },
  emerald: { active: 'bg-emerald-500 text-white border-emerald-500 shadow-sm', inactive: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  amber: { active: 'bg-amber-500 text-white border-amber-500 shadow-sm', inactive: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  rose: { active: 'bg-rose-500 text-white border-rose-500 shadow-sm', inactive: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
}

function RoleBadge({ role }: { role: string | null }) {
  const r = role ?? 'owner'
  const styleMap: Record<string, string> = {
    founder: 'bg-rose-100 text-rose-700 border-rose-200',
    admin: 'bg-amber-100 text-amber-700 border-amber-200',
    vet: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    owner: 'bg-violet-100 text-violet-700 border-violet-200',
  }
  const style = styleMap[r] ?? 'bg-bg-main text-text-secondary border-border-main'
  const IconComp = r === 'founder' ? Crown : r === 'admin' ? Key : r === 'vet' ? Stethoscope : r === 'owner' ? PawPrint : UserIcon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold ${style}`}>
      <IconComp className="w-3.5 h-3.5 shrink-0" />
      <span>{r}</span>
    </span>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminUsersClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [data, setData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(search)

  const role = (searchParams.get('role') ?? 'all') as RoleId
  const page = parseInt(searchParams.get('page') ?? '1', 10)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Pro Modal State
  const [grantModalOpen, setGrantModalOpen] = useState(false)
  const [grantModalMode, setGrantModalMode] = useState<'single' | 'bulk'>('single')
  const [targetSingleUser, setTargetSingleUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const [modalDays, setModalDays] = useState(30)
  const [modalReason, setModalReason] = useState('campaign')
  const [modalNote, setModalNote] = useState('')
  const [onlyFreeUsers, setOnlyFreeUsers] = useState(false)
  const [isSubmittingGrant, setIsSubmittingGrant] = useState(false)

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (!data?.users || data.users.length === 0) return
    if (selectedIds.length === data.users.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(data.users.map(u => u.id))
    }
  }

  // Single Pro Grant Trigger
  const openSingleGrantModal = (user: User) => {
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'İsimsiz Kullanıcı'
    setTargetSingleUser({ id: user.id, name, email: user.email || user.id })
    setGrantModalMode('single')
    setModalDays(30)
    setGrantModalOpen(true)
  }

  // Bulk Pro Grant Trigger
  const openBulkGrantModal = () => {
    if (selectedIds.length === 0) return
    setGrantModalMode('bulk')
    setModalDays(30)
    setGrantModalOpen(true)
  }

  const handleConfirmModalGrant = async () => {
    let targetUserIds: string[] = []

    if (grantModalMode === 'single' && targetSingleUser) {
      targetUserIds = [targetSingleUser.id]
    } else if (grantModalMode === 'bulk') {
      targetUserIds = [...selectedIds]
      if (onlyFreeUsers && data?.users) {
        const now = Date.now()
        targetUserIds = targetUserIds.filter(id => {
          const u = data.users.find(x => x.id === id)
          if (!u?.premium_until) return true
          return new Date(u.premium_until).getTime() <= now
        })
      }
    }

    if (targetUserIds.length === 0) {
      alert('Kredilendirilecek kullanıcı bulunamadı.')
      return
    }

    setIsSubmittingGrant(true)
    try {
      const res = await fetch('/api/admin/memberships/credit-grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: targetUserIds,
          days: modalDays,
          reason: modalReason,
          note: modalNote || 'Admin Kullanıcı Yönetimi ekranından Pro tanımlandı.',
        }),
      })

      const resData = await res.json()
      if (!res.ok) throw new Error(resData.error || 'İşlem başarısız')

      const daysLabel = modalDays >= 36500 ? 'Sonsuz (Ömür Boyu) ♾️' : `+${resData.totalDays} Gün`
      setToastMessage(`✓ ${resData.count} kullanıcıya ${daysLabel} Pro kredi yüklendi!`)
      setTimeout(() => setToastMessage(null), 4000)

      setGrantModalOpen(false)
      setSelectedIds([])

      // Refresh list
      const p = new URLSearchParams()
      if (role !== 'all') p.set('role', role)
      p.set('page', String(page))
      if (debouncedSearch) p.set('search', debouncedSearch)

      const refreshed = await fetch(`/api/admin/users?${p.toString()}`).then(r => r.json())
      if (refreshed?.users) setData(refreshed)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSubmittingGrant(false)
    }
  }

  const handleBulkClear = () => setSelectedIds([])
  const handleBulkExport = () => {
    if (!data?.users || selectedIds.length === 0) return
    const selectedUsers = data.users.filter(u => selectedIds.includes(u.id))
    const headers = ['ID', 'Ad', 'Soyad', 'E-posta', 'Rol', 'Telefon', 'Kayıt Tarihi']
    const rows = selectedUsers.map(u => [
      u.id,
      u.first_name || '',
      u.last_name || '',
      u.email || '',
      u.role || '',
      u.phone || '',
      new Date(u.created_at).toLocaleDateString('tr-TR'),
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `kullanicilar-toplu-aktarim-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
  }

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.length} kullanıcıyı (ve bağlı verilerini) kalıcı olarak silmek istediğinize emin misiniz?`)) return

    try {
      const res = await fetch('/api/users/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: selectedIds }),
      })

      const resData = await res.json()
      if (!res.ok) throw new Error(resData.error || 'Silme işlemi başarısız.')

      alert(resData.message || 'Başarıyla silindi')
      setSelectedIds([])
      setParam({ page: '1' })
    } catch (err: any) {
      alert(err.message)
    }
  }

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
      router.push(`/admin/users?${p.toString()}`)
    },
    [router, searchParams]
  )

  // Fetch whenever role / page / search change
  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams()
    if (role !== 'all') p.set('role', role)
    p.set('page', String(page))
    if (debouncedSearch) p.set('search', debouncedSearch)

    fetch(`/api/admin/users?${p.toString()}`)
      .then(r => r.json())
      .then(d => {
        setData(d)
        setSelectedIds([]) // reset selection on data change
      })
      .finally(() => setLoading(false))
  }, [role, page, debouncedSearch])

  // Sync search → URL
  useEffect(() => {
    const currentSearchParam = searchParams.get('search') ?? ''
    if (debouncedSearch !== currentSearchParam) {
      setParam({ search: debouncedSearch, page: '1' })
    }
  }, [debouncedSearch, searchParams, setParam])

  const counts = data?.roleCounts ?? {}

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-xl animate-fadeIn">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Kullanıcı Yönetimi</h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Kayıtlı kullanıcıları görüntüleyin, rolleri yönetin ve abonelikleri Pro yapın.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/memberships"
            className="btn-secondary text-[13px] px-3.5 py-2 flex items-center gap-1.5 font-bold text-amber-900 bg-amber-50 border-amber-200 hover:bg-amber-100"
          >
            <Gift className="w-4 h-4 text-amber-500" />
            <span>Promosyon Yönetimi</span>
          </Link>
          <Link href="/admin" className="btn-secondary text-[13px] px-4 py-2">
            ← Panel
          </Link>
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {ROLE_TABS.map(tab => {
          const isActive = role === tab.id
          const colors = COLOR_MAP[tab.color]
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              id={`user-tab-${tab.id}`}
              onClick={() => setParam({ role: tab.id, page: '1' })}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] ${
                isActive ? colors.active : colors.inactive
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              {counts[tab.id] !== undefined && (
                <span
                  className={`text-2xs px-1.5 py-0.5 rounded-full font-black ${
                    isActive ? 'bg-white/25' : 'bg-current/10'
                  }`}
                >
                  {counts[tab.id]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          id="user-search"
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Email, ad veya soyad ara…"
          className="input-base w-full pl-9 text-xs rounded-2xl"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-bg-main border-b border-border-main text-text-secondary font-black tracking-widest uppercase text-[11px]">
              <tr>
                <th className="p-4 w-12">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-border-main text-primary focus:ring-primary cursor-pointer accent-primary"
                    checked={Boolean(data?.users && data.users.length > 0 && selectedIds.length === data.users.length)}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-4">Kullanıcı</th>
                <th className="p-4">Rol</th>
                <th className="p-4 hidden sm:table-cell">Abonelik / Pro</th>
                <th className="p-4 hidden sm:table-cell">Telefon</th>
                <th className="p-4 hidden md:table-cell">Kayıt Tarihi</th>
                <th className="p-4 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4"><div className="w-4 h-4 rounded bg-bg-main" /></td>
                      <td className="p-4"><div className="h-4 bg-bg-main rounded w-40" /></td>
                      <td className="p-4"><div className="h-5 bg-bg-main rounded w-16" /></td>
                      <td className="p-4 hidden sm:table-cell"><div className="h-5 bg-bg-main rounded w-24" /></td>
                      <td className="p-4 hidden sm:table-cell"><div className="h-4 bg-bg-main rounded w-24" /></td>
                      <td className="p-4 hidden md:table-cell"><div className="h-4 bg-bg-main rounded w-20" /></td>
                      <td className="p-4"><div className="h-4 bg-bg-main rounded w-12 ml-auto" /></td>
                    </tr>
                  ))
                : data?.users?.map(user => (
                    <tr
                      key={user.id}
                      className="hover:bg-bg-main/50 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <td className="p-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border-main text-primary focus:ring-primary cursor-pointer accent-primary"
                          checked={selectedIds.includes(user.id)}
                          onChange={() => toggleSelection(user.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-text-primary group-hover:text-primary transition-colors">
                          {[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}
                        </div>
                        <div className="text-[11px] text-text-secondary mt-0.5 font-mono">
                          {user.email ?? 'email yok'}
                        </div>
                      </td>
                      <td className="p-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="p-4 hidden sm:table-cell" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <SubscriptionBadge premiumUntil={user.premium_until} />
                          <button
                            type="button"
                            onClick={() => openSingleGrantModal(user)}
                            className="px-2.5 py-1 rounded-lg text-2xs font-black bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 transition-all active:scale-[0.98] shadow-2xs flex items-center gap-1 shrink-0"
                            title="Kullanıcıya Hediye Pro Gün Yükle"
                          >
                            <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                            <span>👑 Pro Yap</span>
                          </button>
                        </div>
                      </td>
                      <td className="p-4 hidden sm:table-cell text-text-secondary text-[12px]">
                        {user.phone ?? '—'}
                      </td>
                      <td className="p-4 hidden md:table-cell text-text-secondary text-[12px]">
                        {new Date(user.created_at).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-primary font-bold text-[12px] group-hover:underline">
                          Detay →
                        </span>
                      </td>
                    </tr>
                  ))}

              {!loading && (!data?.users || data.users.length === 0) && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="text-4xl mb-3">👥</div>
                    <p className="text-text-secondary font-bold text-[14px]">
                      Bu kritere uygun kullanıcı bulunamadı.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-text-secondary">
            Toplam <span className="font-bold text-text-primary">{data.total}</span> kullanıcı — Sayfa{' '}
            <span className="font-bold text-text-primary">{data.page}</span> / {data.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              id="user-page-prev"
              disabled={page <= 1}
              onClick={() => setParam({ page: String(page - 1) })}
              className="px-4 py-2 rounded-xl border border-border-main bg-surface text-[13px] font-bold text-text-secondary hover:text-primary hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              ← Önceki
            </button>
            <button
              id="user-page-next"
              disabled={page >= data.totalPages}
              onClick={() => setParam({ page: String(page + 1) })}
              className="px-4 py-2 rounded-xl border border-border-main bg-surface text-[13px] font-bold text-text-secondary hover:text-primary hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onClear={handleBulkClear}
        onGrantCredit={openBulkGrantModal}
        onExport={handleBulkExport}
        onDelete={handleBulkDelete}
      />

      {/* Grant Pro Modal */}
      {grantModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  👑
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {grantModalMode === 'single' ? 'Tekil Pro Abonelik Tanımla' : 'Toplu Pro Abonelik Tanımla'}
                  </h3>
                  <p className="text-2xs text-slate-500 font-medium">
                    {grantModalMode === 'single'
                      ? `${targetSingleUser?.name} (${targetSingleUser?.email})`
                      : `${selectedIds.length} Seçili Kullanıcıya Gönderim`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGrantModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Days preset */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Eklenecek Pro Gün Sayısı</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[15, 30, 60, 90, 180, 365, 36500].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setModalDays(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all ${
                      modalDays === d
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {d === 36500 ? '♾️ Sonsuz (Ömür Boyu)' : `+${d} Gün ${d === 30 ? '(1 Ay)' : d === 90 ? '(3 Ay)' : d === 365 ? '(1 Yıl)' : ''}`}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-bold text-slate-500">Özel Gün:</span>
                <input
                  type="number"
                  min="1"
                  max="36500"
                  value={modalDays}
                  onChange={e => setModalDays(Number(e.target.value))}
                  className="input-base w-24 py-1 px-3 text-xs font-extrabold rounded-xl"
                />
              </div>
            </div>

            {/* Bulk Filter Checkbox */}
            {grantModalMode === 'bulk' && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="onlyFree"
                  checked={onlyFreeUsers}
                  onChange={e => setOnlyFreeUsers(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                />
                <label htmlFor="onlyFree" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Sadece Standart (Free) Kullanıcılara Yükle (Aktif Pro'ları Atlama)
                </label>
              </div>
            )}

            {/* Reason & Note */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-2xs font-bold text-slate-500 uppercase block">Gerekçe</label>
                <select
                  value={modalReason}
                  onChange={e => setModalReason(e.target.value)}
                  className="input-base w-full py-2 px-3 text-xs font-bold rounded-xl"
                >
                  <option value="campaign">🎁 Promosyon Kampanyası</option>
                  <option value="admin_grant">👑 Özel Admin Hediyesi</option>
                  <option value="welcome_gift">🚀 Hoş Geldin Jesti</option>
                  <option value="milestone">🏆 Sadakat / Kilometre Taşı Ödülü</option>
                  <option value="support_apology">🛠️ Destek / Sistem Telafisi</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold text-slate-500 uppercase block">Not (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="Örn: Kullanıcı Yönetimi Özel Tanımlama"
                  value={modalNote}
                  onChange={e => setModalNote(e.target.value)}
                  className="input-base w-full py-2 px-3 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setGrantModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleConfirmModalGrant}
                disabled={isSubmittingGrant}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 shadow-md"
              >
                {isSubmittingGrant ? <RotateCw className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                <span>Pro Krediyi Tanımla ({modalDays >= 36500 ? 'Sonsuz ♾️' : `+${modalDays} Gün`})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

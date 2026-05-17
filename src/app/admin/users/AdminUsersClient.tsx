'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────
interface User {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  role: string | null
  phone: string | null
  created_at: string
}

interface UsersResponse {
  users: User[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  roleCounts: Record<string, number>
}

// ── Role Config ───────────────────────────────────────────────────────────────
const ROLE_TABS = [
  { id: 'all',     label: 'Tümü',     emoji: '👥', color: 'sky' },
  { id: 'owner',   label: 'Owner',    emoji: '🐾', color: 'violet' },
  { id: 'vet',     label: 'Vet',      emoji: '🩺', color: 'emerald' },
  { id: 'admin',   label: 'Admin',    emoji: '🔑', color: 'amber' },
  { id: 'founder', label: 'Founder',  emoji: '👑', color: 'rose' },
] as const

type RoleId = typeof ROLE_TABS[number]['id']
const COLOR_MAP: Record<string, { active: string; inactive: string }> = {
  sky:     { active: 'bg-sky-500 text-white border-sky-500',         inactive: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' },
  violet:  { active: 'bg-violet-500 text-white border-violet-500',   inactive: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100' },
  emerald: { active: 'bg-emerald-500 text-white border-emerald-500', inactive: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  amber:   { active: 'bg-amber-500 text-white border-amber-500',     inactive: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  rose:    { active: 'bg-rose-500 text-white border-rose-500',       inactive: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
}

function RoleBadge({ role }: { role: string | null }) {
  const r = role ?? 'owner'
  const styleMap: Record<string, string> = {
    founder: 'bg-rose-100 text-rose-700 border-rose-200',
    admin:   'bg-amber-100 text-amber-700 border-amber-200',
    vet:     'bg-emerald-100 text-emerald-700 border-emerald-200',
    owner:   'bg-violet-100 text-violet-700 border-violet-200',
  }
  const style = styleMap[r] ?? 'bg-bg-main text-text-secondary border-border-main'
  const emojiMap: Record<string, string> = { founder: '👑', admin: '🔑', vet: '🩺', owner: '🐾' }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${style}`}>
      {emojiMap[r] ?? '👤'} {r}
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
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [role, page, debouncedSearch])

  // Sync search → URL (reset page)
  useEffect(() => {
    setParam({ search: debouncedSearch, page: '1' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const counts = data?.roleCounts ?? {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-text-primary">Kullanıcı Yönetimi</h1>
          <p className="text-[13px] text-text-secondary mt-1">
            Kayıtlı kullanıcıları görüntüleyin, rolleri yönetin ve detaylarını inceleyin.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary text-[13px] px-4 py-2">
          ← Dashboard
        </Link>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {ROLE_TABS.map((tab) => {
          const isActive = role === tab.id
          const colors = COLOR_MAP[tab.color]
          return (
            <button
              key={tab.id}
              id={`user-tab-${tab.id}`}
              onClick={() => setParam({ role: tab.id, page: '1' })}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-bold transition-all ${
                isActive ? colors.active : colors.inactive
              }`}
            >
              <span>{tab.emoji}</span>
              {tab.label}
              {counts[tab.id] !== undefined && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded-full font-black ${
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

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-[14px]">🔍</span>
        <input
          id="user-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Email, ad veya soyad ara…"
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

      {/* Table */}
      <div className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-bg-main border-b border-border-main text-text-secondary font-black tracking-widest uppercase text-[11px]">
              <tr>
                <th className="p-4">Kullanıcı</th>
                <th className="p-4">Rol</th>
                <th className="p-4 hidden sm:table-cell">Telefon</th>
                <th className="p-4 hidden md:table-cell">Kayıt Tarihi</th>
                <th className="p-4 text-right">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4"><div className="h-4 bg-bg-main rounded w-40" /></td>
                      <td className="p-4"><div className="h-5 bg-bg-main rounded w-16" /></td>
                      <td className="p-4 hidden sm:table-cell"><div className="h-4 bg-bg-main rounded w-24" /></td>
                      <td className="p-4 hidden md:table-cell"><div className="h-4 bg-bg-main rounded w-20" /></td>
                      <td className="p-4"><div className="h-4 bg-bg-main rounded w-12 ml-auto" /></td>
                    </tr>
                  ))
                : data?.users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-bg-main/50 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/admin/users/${user.id}`)}
                    >
                      <td className="p-4">
                        <div className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                          {[user.first_name, user.last_name].filter(Boolean).join(' ') || '—'}
                        </div>
                        <div className="text-[11px] text-text-secondary mt-0.5 font-mono">
                          {user.email ?? 'email yok'}
                        </div>
                      </td>
                      <td className="p-4">
                        <RoleBadge role={user.role} />
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

              {!loading && data?.users.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="text-4xl mb-3">👥</div>
                    <p className="text-text-secondary font-semibold text-[14px]">
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
            Toplam <span className="font-bold text-text-primary">{data.total}</span> kullanıcı —{' '}
            Sayfa <span className="font-bold text-text-primary">{data.page}</span> / {data.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              id="user-page-prev"
              disabled={page <= 1}
              onClick={() => setParam({ page: String(page - 1) })}
              className="px-4 py-2 rounded-xl border border-border-main bg-surface text-[13px] font-semibold text-text-secondary hover:text-primary hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              ← Önceki
            </button>
            <button
              id="user-page-next"
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
  )
}

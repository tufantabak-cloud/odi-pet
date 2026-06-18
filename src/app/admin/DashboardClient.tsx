'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type Period = 'today' | 'week' | 'month'

interface DashboardData {
  signups: { today: number; week: number; month: number }
  pets: { today: number; week: number; month: number }
  subscriptions: { proTotal: number; proMonth: number; proRatePct: number }
  overdueVaccines: number
  recentUsers: Array<{
    id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    role: string | null
    created_at: string
  }>
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (value === 0) { setDisplayed(0); return }
    let start = 0
    const step = Math.ceil(value / 20)
    const timer = setInterval(() => {
      start += step
      if (start >= value) { setDisplayed(value); clearInterval(timer) }
      else setDisplayed(start)
    }, 30)
    return () => clearInterval(timer)
  }, [value])

  return <>{displayed.toLocaleString('tr-TR')}</>
}

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const opts: { key: Period; label: string }[] = [
    { key: 'today', label: 'Bugün' },
    { key: 'week', label: 'Bu Hafta' },
    { key: 'month', label: 'Bu Ay' },
  ]
  return (
    <div className="flex items-center gap-1 bg-bg-main border border-border-main rounded-xl p-1">
      {opts.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`h-11 px-4 rounded-lg text-[12px] font-bold transition-all active:scale-[0.97] flex items-center justify-center ${
            value === o.key
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  href,
}: {
  icon: string
  label: string
  value: number | string
  sub?: string
  accent?: 'green' | 'amber' | 'red' | 'violet' | 'sky'
  href?: string
}) {
  const accentMap = {
    green: 'from-emerald-500/10 to-emerald-500/0 border-emerald-500/30',
    amber: 'from-amber-500/10 to-amber-500/0 border-amber-500/30',
    red: 'from-red-500/10 to-red-500/0 border-red-500/30',
    violet: 'from-violet-500/10 to-violet-500/0 border-violet-500/30',
    sky: 'from-sky-500/10 to-sky-500/0 border-sky-500/30',
  }
  const textMap = {
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    violet: 'text-violet-600',
    sky: 'text-sky-600',
  }

  const inner = (
    <div
      className={`rounded-2xl border bg-gradient-to-b p-5 flex flex-col gap-1 transition-all hover:scale-[1.02] ${
        accent ? accentMap[accent] : 'border-border-main bg-surface'
      } ${href ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[22px]">{icon}</span>
        {accent && (
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${
              accent === 'green' ? 'bg-emerald-500' :
              accent === 'amber' ? 'bg-amber-500' :
              accent === 'red' ? 'bg-red-500' :
              accent === 'violet' ? 'bg-violet-500' : 'bg-sky-500'
            }`}
          />
        )}
      </div>
      <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest">{label}</p>
      <p className={`text-3xl font-black ${accent ? textMap[accent] : 'text-text-primary'}`}>
        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
      </p>
      {sub && <p className="text-[11px] text-text-secondary mt-0.5">{sub}</p>}
    </div>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'şimdi'
  if (mins < 60) return `${mins}dk önce`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}sa önce`
  return `${Math.floor(hrs / 24)}g önce`
}

function roleChip(role: string | null) {
  const map: Record<string, string> = {
    founder: 'bg-purple-100 text-purple-700',
    admin: 'bg-amber-100 text-amber-700',
    vet: 'bg-sky-100 text-sky-700',
    user: 'bg-zinc-100 text-zinc-600',
  }
  const cls = map[role ?? 'user'] ?? map['user']
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {role ?? 'user'}
    </span>
  )
}

export default function DashboardClient({ initialData }: { initialData: DashboardData | null }) {
  const [data, setData] = useState<DashboardData | null>(initialData)
  const [period, setPeriod] = useState<Period>('today')
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setLastRefresh(new Date())
  }, [])

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setLastRefresh(new Date())
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  // Live polling every 30 seconds
  useEffect(() => {
    const id = setInterval(() => refresh(true), 30_000)
    return () => clearInterval(id)
  }, [refresh])

  const sig = data?.signups[period] ?? 0
  const pet = data?.pets[period] ?? 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
            🏠 Panel
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-600">CANLI</span>
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[12px] text-text-secondary">
            <span>Son güncelleme: {mounted && lastRefresh ? lastRefresh.toLocaleTimeString('tr-TR') : '—'}</span>
            <span className="hidden sm:inline">·</span>
            <button
              onClick={() => refresh(false)}
              className="inline-flex items-center justify-center min-h-[38px] sm:min-h-[44px] px-3 text-primary font-bold bg-primary/10 hover:bg-primary/20 rounded-lg transition-all active:scale-[0.97] disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Yükleniyor…
                </span>
              ) : (
                '🔄 Yenile'
              )}
            </button>
          </div>
        </div>
        <PeriodToggle value={period} onChange={setPeriod} />
      </div>

      {/* Main KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon="🧑‍💻"
          label="Yeni Kayıt"
          value={sig}
          sub={`Bu ${period === 'today' ? 'gün' : period === 'week' ? 'hafta' : 'ay'} ${sig} yeni kullanıcı`}
          accent="sky"
          href="/admin/users"
        />
        <StatCard
          icon="🐾"
          label="Yeni Pet"
          value={pet}
          sub={`Bu ${period === 'today' ? 'gün' : period === 'week' ? 'hafta' : 'ay'} ${pet} yeni evcil hayvan`}
          accent="green"
          href="/admin/pets"
        />
        <StatCard
          icon="⭐"
          label="Pro Abonelik Oranı"
          value={`%${data?.subscriptions.proRatePct ?? 0}`}
          sub={`Bu ay +${data?.subscriptions.proMonth ?? 0} · Toplam ${data?.subscriptions.proTotal ?? 0}`}
          accent="violet"
        />
        <StatCard
          icon="⚠️"
          label="Gecikmiş Aşı"
          value={data?.overdueVaccines ?? 0}
          sub="Tüm hayvanlarda gecikmiş aşı durumu"
          accent={(data?.overdueVaccines ?? 0) > 0 ? 'red' : 'green'}
          href="/admin/pets"
        />
        <StatCard
          icon="👥"
          label="Toplam Pro Üye"
          value={data?.subscriptions.proTotal ?? 0}
          sub="Aktif pro & ai_plus aboneler"
          accent="violet"
        />
      </div>

      {/* Recent signups */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-black text-text-primary">Son 5 Kayıt</h2>
          <Link
            href="/admin/users"
            className="text-[12px] font-semibold text-primary hover:underline"
          >
            Tüm kullanıcılar →
          </Link>
        </div>

        <div className="rounded-2xl border border-border-main bg-surface overflow-hidden">
          {!data?.recentUsers?.length ? (
            <div className="p-8 text-center text-text-secondary text-[13px]">
              Henüz kullanıcı yok.
            </div>
          ) : (
            <div className="divide-y divide-border-main">
              {data.recentUsers.map((u, i) => {
                const name =
                  [u.first_name, u.last_name].filter(Boolean).join(' ') ||
                  u.email?.split('@')[0] ||
                  'Anonim'
                const initials = name.slice(0, 2).toUpperCase()
                // Subtle gradient per index for visual rhythm
                const avatarColors = [
                  'from-sky-400 to-blue-600',
                  'from-violet-400 to-purple-600',
                  'from-emerald-400 to-green-600',
                  'from-amber-400 to-orange-600',
                  'from-rose-400 to-pink-600',
                ]
                return (
                  <Link
                    key={u.id}
                    href={`/admin/users/${u.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-bg-main transition-all group"
                  >
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors[i]} flex items-center justify-center text-white text-[12px] font-black shrink-0`}
                    >
                      {initials}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-text-primary truncate group-hover:text-primary transition-colors">
                        {name}
                      </p>
                      <p className="text-[11px] text-text-secondary truncate">{u.email}</p>
                    </div>
                    {/* Role + time */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {roleChip(u.role)}
                      <span className="text-[10px] text-text-secondary">
                        {mounted ? timeAgo(u.created_at) : '—'}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-[15px] font-black text-text-primary mb-4">Hızlı Eylemler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/admin/users" className="card-base p-5 hover:border-primary transition-all group">
            <div className="text-[24px] mb-3">👥</div>
            <h3 className="font-bold text-[14px] text-text-primary group-hover:text-primary">Kullanıcıları Yönet</h3>
            <p className="text-[12px] text-text-secondary mt-1">Kayıtlı kullanıcıları görüntüle, düzenle veya engelle.</p>
          </Link>
          <Link href="/admin/pets" className="card-base p-5 hover:border-primary transition-all group">
            <div className="text-[24px] mb-3">🐾</div>
            <h3 className="font-bold text-[14px] text-text-primary group-hover:text-primary">Evcil Hayvanlar</h3>
            <p className="text-[12px] text-text-secondary mt-1">Sistemdeki tüm kayıtlı evcil hayvanları görüntüle.</p>
          </Link>
          <Link href="/admin/social" className="card-base p-5 hover:border-primary transition-all group">
            <div className="text-[24px] mb-3">📱</div>
            <h3 className="font-bold text-[14px] text-text-primary group-hover:text-primary">Sosyal Moderasyon</h3>
            <p className="text-[12px] text-text-secondary mt-1">Kullanıcı gönderilerini ve sosyal etkileşimleri incele.</p>
          </Link>
          <Link href="/admin/ai-vet" className="card-base p-5 hover:border-primary transition-all group">
            <div className="text-[24px] mb-3">🤖</div>
            <h3 className="font-bold text-[14px] text-text-primary group-hover:text-primary">AI-Vet Yönetimi</h3>
            <p className="text-[12px] text-text-secondary mt-1">AI analizlerini ve sistem kullanım istatistiklerini gör.</p>
          </Link>
          <Link href="/admin/vets" className="card-base p-5 hover:border-primary transition-all group">
            <div className="text-[24px] mb-3">🩺</div>
            <h3 className="font-bold text-[14px] text-text-primary group-hover:text-primary">Veteriner Onayları</h3>
            <p className="text-[12px] text-text-secondary mt-1">Veteriner başvuru ve belge incelemelerini yönet.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

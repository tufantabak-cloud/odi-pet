'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import CalendarExportPanel from './CalendarExportPanel'

// ─── Config ───────────────────────────────────────────────
const DAYS_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const MONTHS_TR = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const TYPE_ICONS: Record<string, string> = { vaccine: '💉', medication: '💊', appointment: '🏥', checkup: '🩺', task: '📋', grooming: '✂️' }

const ESCALATION_CONFIG = {
  none:      { label: '',          border: 'border-border-main',  bg: '' },
  warning_1: { label: '⚠ Gecikti', border: 'border-amber-400',   bg: 'bg-amber-50' },
  warning_2: { label: '⚠ 48h',     border: 'border-orange-500',  bg: 'bg-orange-50' },
  critical:  { label: '🚨 KRİTİK', border: 'border-red-500',     bg: 'bg-red-50' },
}

const STATUS_COLOR: Record<string, string> = {
  done:      'bg-green-100 text-green-700',
  upcoming:  'bg-blue-100 text-blue-700',
  overdue:   'bg-red-100 text-red-700',
  assigned:  'bg-primary/10 text-primary',
  accepted:  'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
}

function startOfWeek(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  return new Date(d.getFullYear(), d.getMonth(), diff)
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

// ─── Component ─────────────────────────────────────────────
export default function CalendarClient() {
  const [view, setView] = useState<'week' | 'agenda'>('week')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [events, setEvents] = useState<any[]>([])
  const [workload, setWorkload] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterPet, setFilterPet] = useState<string>('all')
  const [filterMember, setFilterMember] = useState<string>('all')
  const [escalating, setEscalating] = useState(false)
  const [escalationResult, setEscalationResult] = useState<number | null>(null)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const from = isoDate(weekDays[0])
  const to   = isoDate(weekDays[6])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ from, to })
      if (filterPet !== 'all') params.set('pet_id', filterPet)
      if (filterMember !== 'all') params.set('member_id', filterMember)
      const res = await fetch(`/api/calendar?${params}`)
      const data = await res.json()
      setEvents(data.events ?? [])
      setWorkload(data.workload ?? [])
    } finally { setLoading(false) }
  }, [from, to, filterPet, filterMember])

  useEffect(() => { load() }, [load])

  async function runEscalation() {
    setEscalating(true)
    const res = await fetch('/api/calendar', { method: 'POST' })
    const data = await res.json()
    setEscalationResult(data.escalated ?? 0)
    setEscalating(false)
    load()
  }

  // Unique pets and members from events
  const allPets = Array.from(new Map(events.map(e => [e.pet_id, e.pet_name])).entries())
  const allMembers = Array.from(new Map(events.filter(e => e.assigned_to).map(e => [e.assigned_to, e.assignee_name])).entries())

  const eventsOnDay = (day: Date) => events.filter(e => e.date === isoDate(day))
  const overdueCount = events.filter(e => e.status !== 'done' && e.escalation_level !== 'none').length
  const criticalCount = events.filter(e => e.escalation_level === 'critical').length

  // ── Event Card ──
  function EventCard({ event }: { event: any }) {
    const esc = ESCALATION_CONFIG[event.escalation_level as keyof typeof ESCALATION_CONFIG] ?? ESCALATION_CONFIG.none
    const icon = TYPE_ICONS[event.plan_type] ?? TYPE_ICONS.task
    const isPast = new Date(event.date) < new Date() && event.status !== 'done'

    return (
      <div className={`rounded-xl p-2.5 border-l-4 text-left w-full transition-all hover:shadow-sm ${esc.border} ${esc.bg || (isPast ? 'bg-red-50/40' : 'bg-surface')}`}>
        <div className="flex items-start gap-1.5">
          <span className="text-[13px] shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-text-primary truncate leading-tight">{event.title}</p>
            <p className="text-[10px] text-text-secondary truncate">{event.pet_name}</p>
            {event.assignee_name && (
              <p className="text-[10px] text-primary font-semibold truncate mt-0.5">→ {event.assignee_name}</p>
            )}
          </div>
        </div>
        {esc.label && (
          <span className="mt-1 inline-block text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-700">{esc.label}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-20 w-full mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">Household Takvimi</h1>
          <p className="text-text-secondary text-[14px] mt-1">{events.length} etkinlik • {weekDays[0].toLocaleDateString('tr-TR')} – {weekDays[6].toLocaleDateString('tr-TR')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {criticalCount > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-[12px] font-black animate-pulse">🚨 {criticalCount} Kritik</span>
          )}
          {overdueCount > 0 && (
            <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-[12px] font-bold">⚠ {overdueCount} Gecikmiş</span>
          )}
          <button onClick={runEscalation} disabled={escalating}
            className="btn-secondary text-[12px] py-2 px-3">
            {escalating ? 'Kontrol ediliyor...' : '⚡ Escalation Çalıştır'}
          </button>
        </div>
      </div>

      {escalationResult !== null && (
        <div className={`p-3 rounded-xl text-[13px] font-semibold ${escalationResult > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
          {escalationResult > 0 ? `⚠ ${escalationResult} görev tırmanma seviyesine geçirildi` : '✅ Tüm görevler zamanında — escalation yok'}
        </div>
      )}

      {/* Workload Summary */}
      {workload.length > 0 && (
        <div className="card-base p-4">
          <h2 className="text-[11px] font-black text-text-secondary uppercase tracking-widest mb-3">Üye Yükü</h2>
          <div className="flex flex-wrap gap-3">
            {workload.map(m => (
              <button key={m.id} onClick={() => setFilterMember(prev => prev === m.id ? 'all' : m.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[13px] font-semibold transition-all ${filterMember === m.id ? 'border-primary bg-primary-soft text-primary' : 'border-border-main hover:border-primary/40'}`}>
                <div className="w-7 h-7 rounded-full bg-primary-soft text-primary flex items-center justify-center font-black text-[11px]">
                  {m.name.charAt(0)}
                </div>
                <span className="text-text-primary">{m.name}</span>
                <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full ${m.overdue > 0 ? 'bg-red-100 text-red-700' : 'bg-bg-main text-text-secondary'}`}>
                  {m.count} görev{m.overdue > 0 ? ` / ${m.overdue} gecikmiş` : ''}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters + View toggle */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 bg-bg-main p-1 rounded-xl border border-border-main">
          <button onClick={() => setView('week')} className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${view === 'week' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}>Hafta</button>
          <button onClick={() => setView('agenda')} className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${view === 'agenda' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'}`}>Ajanda</button>
        </div>

        {allPets.length > 1 && (
          <select value={filterPet} onChange={e => setFilterPet(e.target.value)} className="input-base text-[12px] py-2 pr-8 max-w-[160px]">
            <option value="all">Tüm Petler</option>
            {allPets.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}

        <div className="flex gap-2 ml-auto">
          <button onClick={() => setWeekStart(w => addDays(w, -7))} className="btn-secondary text-[12px] py-2 px-3">← Önceki</button>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="btn-secondary text-[12px] py-2 px-3">Bugün</button>
          <button onClick={() => setWeekStart(w => addDays(w, 7))} className="btn-secondary text-[12px] py-2 px-3">Sonraki →</button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10 gap-3 text-text-secondary">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"/>
          <span className="text-[14px]">Yükleniyor...</span>
        </div>
      )}

      {/* ── Week View ── */}
      {!loading && view === 'week' && (
        <div className="card-base overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border-main">
            {weekDays.map(day => {
              const isToday = isoDate(day) === isoDate(new Date())
              return (
                <div key={day.toISOString()} className={`p-2 text-center border-r border-border-main last:border-r-0 ${isToday ? 'bg-primary-soft' : ''}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-text-secondary'}`}>{DAYS_TR[day.getDay()]}</p>
                  <p className={`text-[18px] font-black mt-0.5 ${isToday ? 'text-primary' : 'text-text-primary'}`}>{day.getDate()}</p>
                </div>
              )
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[320px]">
            {weekDays.map(day => {
              const dayEvents = eventsOnDay(day)
              const isToday = isoDate(day) === isoDate(new Date())
              return (
                <div key={day.toISOString()} className={`p-2 flex flex-col gap-1.5 border-r border-border-main last:border-r-0 min-h-[200px] ${isToday ? 'bg-primary/5' : ''}`}>
                  {dayEvents.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[10px] text-text-secondary opacity-40">—</span>
                    </div>
                  ) : (
                    dayEvents.slice(0, 4).map(e => <EventCard key={e.id} event={e} />)
                  )}
                  {dayEvents.length > 4 && (
                    <span className="text-[10px] text-primary font-bold text-center">+{dayEvents.length - 4} daha</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Agenda View ── */}
      {!loading && view === 'agenda' && (
        <div className="flex flex-col gap-3">
          {weekDays.map(day => {
            const dayEvents = eventsOnDay(day)
            if (dayEvents.length === 0) return null
            const isToday = isoDate(day) === isoDate(new Date())
            return (
              <div key={day.toISOString()} className="card-base overflow-hidden">
                <div className={`px-5 py-3 flex items-center gap-3 border-b border-border-main ${isToday ? 'bg-primary-soft' : 'bg-bg-main'}`}>
                  <span className={`text-[22px] font-black ${isToday ? 'text-primary' : 'text-text-primary'}`}>{day.getDate()}</span>
                  <div>
                    <p className={`text-[13px] font-black uppercase tracking-wide ${isToday ? 'text-primary' : 'text-text-secondary'}`}>
                      {DAYS_TR[day.getDay()]} {isToday && '— Bugün'}
                    </p>
                    <p className="text-[11px] text-text-secondary">{MONTHS_TR[day.getMonth()]} {day.getFullYear()}</p>
                  </div>
                  <span className="ml-auto text-[11px] font-bold text-text-secondary bg-bg-main px-2 py-1 rounded-full">{dayEvents.length} etkinlik</span>
                </div>
                <div className="divide-y divide-border-main">
                  {dayEvents.map(e => {
                    const esc = ESCALATION_CONFIG[e.escalation_level as keyof typeof ESCALATION_CONFIG] ?? ESCALATION_CONFIG.none
                    const icon = TYPE_ICONS[e.plan_type] ?? TYPE_ICONS.task
                    const statusInfo = STATUS_COLOR[e.assignment_status || e.status] ?? STATUS_COLOR.upcoming
                    return (
                      <div key={e.id} className={`flex items-center gap-4 p-4 hover:bg-bg-main/50 transition-colors ${esc.bg}`}>
                        <span className="text-[22px] shrink-0">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-text-primary text-[14px]">{e.title}</p>
                            {esc.label && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-100 text-red-700">{esc.label}</span>}
                          </div>
                          <p className="text-[12px] text-text-secondary mt-0.5">
                            {e.pet_name}{e.assignee_name ? ` • → ${e.assignee_name}` : ''}
                          </p>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${statusInfo}`}>
                          {e.assignment_status || e.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {events.length === 0 && (
            <div className="card-base p-10 text-center">
              <p className="text-[32px] mb-3">📅</p>
              <p className="font-bold text-text-primary">Bu haftada etkinlik yok</p>
              <Link href="/owner/health" className="text-primary text-[13px] font-bold mt-2 block hover:underline">Görev Ekle →</Link>
            </div>
          )}
        </div>
      )}

      {/* Escalation Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] font-bold">
        {Object.entries(ESCALATION_CONFIG).filter(([k]) => k !== 'none').map(([k, v]) => (
          <span key={k} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-l-4 ${v.border} ${v.bg || 'bg-bg-main'} text-text-secondary`}>
            {v.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-main text-text-secondary border border-border-main">📋 Atanmış</span>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-100">✅ Tamamlandı</span>
      </div>

      {/* Calendar Export */}
      <CalendarExportPanel />
    </div>
  )
}

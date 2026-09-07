'use client'

import { useState } from 'react'
import { Syringe, Bug, Scale, Utensils, Stethoscope, Activity, Sparkles, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import type { PetAgendaEvent } from '@/lib/agenda/types'

export interface HealthTimelineProps {
  events?: PetAgendaEvent[]
  schedules?: any[]
  loading?: boolean
}

function getCategoryIcon(category: string, title: string = '') {
  const c = (category || '').toLowerCase()
  const t = (title || '').toLowerCase()
  if (c.includes('aşı') || c.includes('asi') || t.includes('aşı') || t.includes('asi')) return <Syringe className="w-4 h-4" />
  if (c.includes('parazit') || t.includes('parazit')) return <Bug className="w-4 h-4" />
  if (c.includes('beslenme') || t.includes('beslenme') || c.includes('mama') || t.includes('mama')) return <Utensils className="w-4 h-4" />
  if (c.includes('kilo') || c.includes('ölçüm') || t.includes('kilo') || c.includes('growth')) return <Scale className="w-4 h-4" />
  if (c.includes('veteriner') || c.includes('medikal') || t.includes('muayene') || t.includes('klinik') || t.includes('randevu')) return <Stethoscope className="w-4 h-4" />
  if (c.includes('aktivite') || t.includes('aktivite') || c.includes('egzersiz')) return <Activity className="w-4 h-4" />
  return <Sparkles className="w-4 h-4" />
}

interface TimelineDisplayItem {
  id: string
  title: string
  date: Date
  timeStr?: string
  category: string
  isDone: boolean
  isOverdue: boolean
  isToday: boolean
  color: string
  dotColor: string
  badgeInfo: {
    text: string
    icon: typeof Clock
    style: string
  }
}

export default function HealthTimeline({ events, schedules, loading = false }: HealthTimelineProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  if (loading) {
    return (
      <div className="card-base p-4 border border-border-main bg-surface rounded-3xl flex flex-col gap-4 mt-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] animate-pulse">
        <div className="flex items-center justify-between border-b border-border-main/50 pb-3">
          <div className="h-6 w-44 bg-slate-200 rounded-lg" />
          <div className="h-8 w-36 bg-slate-100 rounded-xl" />
        </div>
        <div className="flex flex-col gap-3 py-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 w-40 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-20 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Canonical PetAgendaEvent dataset'i öncelikli olarak tüketilir
  let items: TimelineDisplayItem[] = []

  if (events && events.length > 0) {
    items = events
      .filter(e => e.displayStatus !== 'cancelled')
      .map(e => {
        const isDone = e.displayStatus === 'completed'
        const rawDate = e.scheduledAt || e.actualAt || (e.dateKey ? `${e.dateKey}T12:00:00` : '')
        const d = rawDate ? new Date(rawDate) : new Date(0)
        const isOverdue = e.displayStatus === 'overdue' || (!isDone && d.getTime() < Date.now() && d.toDateString() !== new Date().toDateString())
        const isToday = e.displayStatus === 'today' || (!isDone && !isOverdue && d.toDateString() === new Date().toDateString())

        let color = 'text-amber-500 bg-amber-100 border-amber-200'
        let dotColor = 'border-amber-500 bg-amber-500'
        let badgeInfo = { text: 'Yaklaşıyor', icon: Clock, style: 'bg-amber-100 text-amber-700' }

        if (isDone) {
          color = 'text-emerald-500 bg-emerald-100 border-emerald-200'
          dotColor = 'border-emerald-500 bg-emerald-500'
          badgeInfo = { text: 'Tamamlandı', icon: CheckCircle2, style: 'bg-emerald-100 text-emerald-700' }
        } else if (isOverdue) {
          color = 'text-red-500 bg-red-100 border-red-200'
          dotColor = 'border-red-500 bg-red-500'
          badgeInfo = { text: 'Gecikti', icon: AlertCircle, style: 'bg-red-100 text-red-700' }
        } else if (isToday) {
          color = 'text-blue-500 bg-blue-100 border-blue-200'
          dotColor = 'border-blue-500 bg-blue-500'
          badgeInfo = { text: 'Bugün', icon: Clock, style: 'bg-blue-100 text-blue-700' }
        }

        const title = e.displayMetadata?.title || e.subCategory || 'Sağlık Görevi'
        const category = e.category || 'saglik'
        const rawTime = (e.scheduledAt || e.actualAt)?.includes('T')
          ? (e.scheduledAt || e.actualAt)!.split('T')[1]?.substring(0, 5)
          : undefined
        const timeStr = rawTime && rawTime !== '00:00' && rawTime !== '12:00' ? rawTime : undefined

        return {
          id: e.eventId,
          title,
          date: d,
          timeStr,
          category,
          isDone,
          isOverdue,
          isToday,
          color,
          dotColor,
          badgeInfo,
        }
      })
  } else if (schedules && schedules.length > 0) {
    // Fallback: localSchedules üzerinden beslenme
    const healthSchedules = schedules.filter(s => {
      const c = (s.category || '').toLowerCase()
      return (
        c.includes('saglik') ||
        c.includes('sağlık') ||
        c.includes('medikal') ||
        c.includes('veteriner') ||
        c.includes('asi') ||
        c.includes('aşı') ||
        c.includes('parazit') ||
        c.includes('beslenme') ||
        c.includes('bakim') ||
        c.includes('bakım') ||
        c.includes('hijyen') ||
        c.includes('aktivite')
      )
    })

    items = healthSchedules.map((item, idx) => {
      const isDone = item.status === 'done' || item.status === 'completed'
      const d = new Date(item.completed_at || item.scheduled_at || item.due_date || 0)
      const isOverdue = !isDone && d.getTime() < Date.now() && d.toDateString() !== new Date().toDateString()
      const isToday = !isDone && !isOverdue && d.toDateString() === new Date().toDateString()

      let color = 'text-amber-500 bg-amber-100 border-amber-200'
      let dotColor = 'border-amber-500 bg-amber-500'
      let badgeInfo = { text: 'Yaklaşıyor', icon: Clock, style: 'bg-amber-100 text-amber-700' }

      if (isDone) {
        color = 'text-emerald-500 bg-emerald-100 border-emerald-200'
        dotColor = 'border-emerald-500 bg-emerald-500'
        badgeInfo = { text: 'Tamamlandı', icon: CheckCircle2, style: 'bg-emerald-100 text-emerald-700' }
      } else if (isOverdue) {
        color = 'text-red-500 bg-red-100 border-red-200'
        dotColor = 'border-red-500 bg-red-500'
        badgeInfo = { text: 'Gecikti', icon: AlertCircle, style: 'bg-red-100 text-red-700' }
      } else if (isToday) {
        color = 'text-blue-500 bg-blue-100 border-blue-200'
        dotColor = 'border-blue-500 bg-blue-500'
        badgeInfo = { text: 'Bugün', icon: Clock, style: 'bg-blue-100 text-blue-700' }
      }

      return {
        id: item.id || `sched_${idx}`,
        title: item.title || 'Görev',
        date: d,
        timeStr: item.due_time && item.due_time !== '12:00:00' && item.due_time !== '12:00' ? item.due_time.substring(0, 5) : undefined,
        category: item.category || 'saglik',
        isDone,
        isOverdue,
        isToday,
        color,
        dotColor,
        badgeInfo,
      }
    })
  }

  const upcomingList = items
    .filter(item => !item.isDone)
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const pastList = items
    .filter(item => item.isDone)
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  const displayList = activeTab === 'upcoming' ? upcomingList : pastList

  return (
    <div className="card-base p-4 border border-border-main bg-surface rounded-3xl flex flex-col gap-4 mt-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between border-b border-border-main/50 pb-3">
        <div>
          <h3 className="text-lg font-bold text-text-primary tracking-tight">Sağlık Zaman Çizelgesi</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {activeTab === 'upcoming' ? `${upcomingList.length} bekleyen görev` : `${pastList.length} tamamlanmış kayıt`}
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'upcoming' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Bekleyen ({upcomingList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('past')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'past' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Geçmiş ({pastList.length})
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-0 relative pl-4">
        <div className="absolute left-[27px] top-4 bottom-4 w-px bg-slate-200" />

        {displayList.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center text-text-secondary relative z-10 bg-surface">
            <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
            <span className="text-sm font-medium">
              {activeTab === 'upcoming' ? 'Bekleyen sağlık görevi bulunmuyor.' : 'Geçmiş sağlık görevi bulunmuyor.'}
            </span>
          </div>
        ) : (
          displayList.map((item) => (
            <div
              key={item.id}
              className="relative pl-12 py-4 bg-surface z-10 group hover:bg-slate-50 transition-colors duration-200 rounded-2xl -ml-4 pr-4"
            >
              {/* Timeline Dot */}
              <div
                className={`absolute left-[24px] top-[26px] w-2.5 h-2.5 rounded-full border-2 ${item.dotColor} z-10 flex items-center justify-center shadow-sm`}
              />

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Category Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.color}`}>
                    {getCategoryIcon(item.category, item.title)}
                  </div>

                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                    <span className="text-sm text-text-secondary mt-0.5">
                      {item.date && !isNaN(item.date.getTime()) && item.date.getTime() > 0
                        ? item.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Tarih Belirtilmedi'}
                      {item.timeStr ? ` • ${item.timeStr}` : ''}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${item.badgeInfo.style}`}>
                  <item.badgeInfo.icon className="w-3.5 h-3.5" />
                  <span>{item.badgeInfo.text}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

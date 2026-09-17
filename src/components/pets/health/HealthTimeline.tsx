'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Syringe, Bug, Scale, Utensils, Stethoscope, Activity, Sparkles, AlertCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { CanonicalPlanActionModal } from '@/components/pets/common/CanonicalPlanActionModal'
import type { CanonicalPlanContext } from '@/lib/plans/canonicalActionResolver'
import type { PetAgendaEvent } from '@/lib/agenda/types'

export interface HealthTimelineProps {
  events?: PetAgendaEvent[]
  schedules?: any[]
}

function getCategoryIcon(category?: string | null, title: string = '') {
  const c = (category || '').toLowerCase()
  const t = (title || '').toLowerCase()
  if (c === 'asi' || c.includes('aşı') || c.includes('asi') || t.includes('aşı')) return <Syringe className="w-4 h-4" />
  if (c === 'parazit' || c.includes('parazit') || t.includes('parazit')) return <Bug className="w-4 h-4" />
  if (c === 'beslenme' || c.includes('beslenme') || t.includes('beslenme') || t.includes('mama')) return <Utensils className="w-4 h-4" />
  if (c === 'kilo' || c.includes('kilo') || c.includes('ölçüm') || t.includes('kilo')) return <Scale className="w-4 h-4" />
  if (c === 'saglik' || c === 'kontrol' || c.includes('veteriner') || c.includes('medikal') || t.includes('muayene') || t.includes('randevu')) return <Stethoscope className="w-4 h-4" />
  if (c === 'aktivite' || c.includes('aktivite') || t.includes('aktivite')) return <Activity className="w-4 h-4" />
  return <Sparkles className="w-4 h-4" />
}

function formatDisplayDate(dateKey?: string | null, scheduledAt?: string | null): string {
  const raw = dateKey || (scheduledAt ? scheduledAt.split('T')[0] : '')
  if (!raw) return ''
  const parts = raw.split('-')
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return raw
}

export default function HealthTimeline({ events, schedules }: HealthTimelineProps) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<CanonicalPlanContext | null>(null)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  // Kanonik PetAgendaEvent listesi veya schedules fallback
  const normalizedEvents = useMemo(() => {
    if (events && events.length > 0) {
      return events.filter(e => {
        const cat = (e.category || '').toLowerCase()
        return cat === 'asi' || cat === 'parazit' || cat === 'saglik' || cat === 'ilac' || cat === 'kontrol' || cat === 'kilo'
      })
    }

    return (schedules || []).filter(s => {
      const c = (s.category || s._plan_category || '').toLowerCase()
      const t = (s.title || '').toLowerCase()
      return c.includes('asi') || c.includes('aşı') || c.includes('parazit') || c.includes('saglik') || c.includes('sağlık') || c.includes('veteriner') || c.includes('medikal') || t.includes('aşı') || t.includes('parazit')
    }).map(s => {
      const isDone = s.status === 'done' || s.status === 'completed'
      const rawDate = s.due_date || (s.scheduled_at ? s.scheduled_at.split('T')[0] : '')
      return {
        eventId: s.id || `schedule_${s._plan_id}`,
        source: s._source || 'health_schedules',
        sourceRecordId: s._plan_id || s.id,
        petId: s.pet_id,
        category: (s._plan_category || s.category || '').toLowerCase(),
        subCategory: s.sub_category || s.title || 'Görev',
        dateKey: rawDate,
        scheduledAt: s.scheduled_at || s.due_date,
        sourceStatus: s.status || 'unknown',
        lifecycleType: 'plan' as const,
        displayStatus: isDone ? 'completed' : 'upcoming' as const,
        status: isDone ? 'completed' : 'upcoming' as const,
        stableIdentity: s.id,
        occurrenceIdentity: null,
        fallbackIdentity: null,
        mainPlanId: null,
        parentPlanId: null,
        actualAt: s.completed_at || null,
        nextDueAt: null,
        repeatRule: s.repeat_rule || null,
        occurrenceScheduledAt: null,
        isVirtual: false,
        isActionable: !isDone,
        displayMetadata: {
          title: s.title || s.sub_category || 'Sağlık Görevi',
          note: s.notes || s.note
        },
        actionDescriptors: []
      } as PetAgendaEvent
    })
  }, [events, schedules])

  const overdueList = useMemo(() => {
    return normalizedEvents
      .filter(e => e.displayStatus === 'overdue')
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  }, [normalizedEvents])

  const upcomingList = useMemo(() => {
    return normalizedEvents
      .filter(e => e.displayStatus === 'today' || e.displayStatus === 'upcoming')
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  }, [normalizedEvents])

  const pastList = useMemo(() => {
    return normalizedEvents
      .filter(e => e.displayStatus === 'completed')
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
  }, [normalizedEvents])

  const totalPending = overdueList.length + upcomingList.length

  const renderEventItem = (item: PetAgendaEvent) => {
    const isDone = item.displayStatus === 'completed'
    const isOverdue = item.displayStatus === 'overdue'
    const isToday = item.displayStatus === 'today'
    const title = item.displayMetadata?.title || item.subCategory || 'Sağlık Görevi'

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

    return (
      <div 
        key={item.eventId} 
        onClick={() => {
          setSelectedPlan({
            planId: item.sourceRecordId || item.eventId,
            petId: item.petId || undefined,
            title,
            category: item.category || 'saglik',
            status: item.displayStatus,
            scheduledAt: item.scheduledAt || item.dateKey,
            plan: item
          })
        }}
        className="relative pl-12 py-3.5 bg-surface z-10 group hover:bg-slate-50 active:scale-[0.99] transition-all duration-200 rounded-2xl -ml-4 pr-4 cursor-pointer"
      >
        {/* Timeline Dot */}
        <div className={`absolute left-[24px] top-[24px] w-2 h-2 rounded-full border-2 ${dotColor} z-10 flex items-center justify-center shadow-sm`} />
        
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Category Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${color}`}>
              {getCategoryIcon(item.category, title)}
            </div>
            
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-semibold text-text-primary group-hover:text-primary transition-colors truncate">
                {title}
              </span>
              <span className="text-xs sm:text-sm text-text-secondary mt-0.5">
                {formatDisplayDate(item.dateKey, item.scheduledAt)}
              </span>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${badgeInfo.style}`}>
            <badgeInfo.icon className="w-3.5 h-3.5" />
            <span>{badgeInfo.text}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card-base p-4 border border-border-main bg-surface rounded-3xl flex flex-col gap-4 mt-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between border-b border-border-main/50 pb-3">
        <h3 className="text-lg font-bold text-text-primary tracking-tight">Sağlık Zaman Çizelgesi</h3>
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'upcoming' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span>Bekleyen</span>
            {totalPending > 0 && (
              <span className="px-1.5 py-0.2 bg-primary/10 text-primary text-xs rounded-full font-bold">
                {totalPending}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'past' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Geçmiş
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-0 relative pl-4">
        <div className="absolute left-[27px] top-4 bottom-4 w-px bg-slate-200" />
        
        {activeTab === 'upcoming' ? (
          totalPending === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center text-text-secondary relative z-10 bg-surface">
              <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
              <span className="text-sm font-medium">Bekleyen sağlık görevi bulunmuyor.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* GECİKEN GÖREVLER (ALT SINIRSIZ - TÜM GECİKMİŞLER) */}
              {overdueList.length > 0 && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1 z-10 -ml-4 pl-4 bg-surface py-1">
                    <span className="flex items-center gap-1 text-xs font-black text-error uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4 text-error" />
                      Geciken Görevler
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-error/10 text-error">
                      {overdueList.length}
                    </span>
                  </div>
                  {overdueList.map(renderEventItem)}
                </div>
              )}

              {/* YAKLAŞAN GÖREVLER */}
              {upcomingList.length > 0 && (
                <div className="flex flex-col">
                  {overdueList.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 mb-1 z-10 -ml-4 pl-4 bg-surface py-1 border-t border-slate-100 pt-3">
                      <span className="text-xs font-black text-text-tertiary uppercase tracking-wider">
                        Yaklaşan Görevler
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-2xs font-extrabold bg-slate-100 text-text-secondary">
                        {upcomingList.length}
                      </span>
                    </div>
                  )}
                  {upcomingList.map(renderEventItem)}
                </div>
              )}
            </div>
          )
        ) : (
          pastList.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center text-text-secondary relative z-10 bg-surface">
              <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
              <span className="text-sm font-medium">Geçmiş sağlık görevi bulunmuyor.</span>
            </div>
          ) : (
            pastList.map(renderEventItem)
          )
        )}
      </div>

      <CanonicalPlanActionModal
        context={selectedPlan}
        isOpen={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        onSuccess={() => {
          setSelectedPlan(null)
          router.refresh()
        }}
      />
    </div>
  )
}

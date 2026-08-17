'use client'

import { useState } from 'react'
import { Syringe, Bug, Scale, Utensils, Stethoscope, Activity, Sparkles, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

export interface HealthTimelineProps {
  schedules: any[]
}

function getCategoryIcon(category: string, title: string = '') {
  const c = (category || '').toLowerCase()
  const t = (title || '').toLowerCase()
  if (c.includes('aşı') || c.includes('asi') || t.includes('aşı')) return <Syringe className="w-4 h-4" />
  if (c.includes('parazit') || t.includes('parazit')) return <Bug className="w-4 h-4" />
  if (c.includes('beslenme') || t.includes('beslenme')) return <Utensils className="w-4 h-4" />
  if (c.includes('kilo') || c.includes('ölçüm') || t.includes('kilo')) return <Scale className="w-4 h-4" />
  if (c.includes('veteriner') || c.includes('medikal') || t.includes('muayene')) return <Stethoscope className="w-4 h-4" />
  if (c.includes('aktivite') || t.includes('aktivite')) return <Activity className="w-4 h-4" />
  return <Sparkles className="w-4 h-4" />
}

export default function HealthTimeline({ schedules }: HealthTimelineProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  const healthSchedules = schedules.filter(s => 
    s.category === 'Saglik' || s.category === 'Medikal' || s.category === 'Veteriner' || s.category === 'Sağlık' || s.category === 'Aşı' || s.category === 'Parazit'
  )

  const upcomingSchedules = healthSchedules.filter(s => s.status !== 'done' && s.status !== 'completed').sort((a, b) => {
    const dA = new Date(a.scheduled_at || a.due_date || 0).getTime()
    const dB = new Date(b.scheduled_at || b.due_date || 0).getTime()
    return dA - dB
  })

  const pastSchedules = healthSchedules.filter(s => s.status === 'done' || s.status === 'completed').sort((a, b) => {
    const dA = new Date(a.completed_at || a.scheduled_at || a.due_date || 0).getTime()
    const dB = new Date(b.completed_at || b.scheduled_at || b.due_date || 0).getTime()
    return dB - dA
  })

  const displayList = activeTab === 'upcoming' ? upcomingSchedules : pastSchedules

  return (
    <div className="card-base p-4 border border-border-main bg-surface rounded-3xl flex flex-col gap-4 mt-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between border-b border-border-main/50 pb-3">
        <h3 className="text-lg font-bold text-text-primary tracking-tight">Sağlık Zaman Çizelgesi</h3>
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'upcoming' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Bekleyen
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'past' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Geçmiş
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-0 relative pl-4">
        <div className="absolute left-[27px] top-4 bottom-4 w-px bg-slate-200" />
        
        {displayList.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center text-text-secondary relative z-10 bg-surface">
            <Sparkles className="w-8 h-8 text-slate-300 mb-2" />
            <span className="text-sm font-medium">{activeTab === 'upcoming' ? 'Bekleyen sağlık görevi bulunmuyor.' : 'Geçmiş sağlık görevi bulunmuyor.'}</span>
          </div>
        ) : (
          displayList.map((item, idx) => {
            const isDone = item.status === 'done' || item.status === 'completed'
            const d = new Date(item.scheduled_at || item.due_date || 0)
            const isOverdue = !isDone && d.getTime() < Date.now()
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

            return (
              <div key={item.id || idx} className="relative pl-12 py-4 bg-surface z-10 group hover:bg-slate-50 transition-colors duration-200 rounded-2xl -ml-4 pr-4 cursor-pointer">
                {/* Timeline Dot */}
                <div className={`absolute left-[24px] top-[26px] w-2 h-2 rounded-full border-2 ${dotColor} z-10 flex items-center justify-center shadow-sm`} />
                
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Category Icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${color}`}>
                      {getCategoryIcon(item.category, item.title)}
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors">{item.title}</span>
                      <span className="text-sm text-text-secondary mt-0.5">
                        {d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })} 
                        {item.due_time ? ` • ${item.due_time.substring(0,5)}` : ''}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${badgeInfo.style}`}>
                    <badgeInfo.icon className="w-3.5 h-3.5" />
                    <span>{badgeInfo.text}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'

export interface HealthTimelineProps {
  schedules: any[]
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
    <div className="card-base p-4 border border-border-main bg-surface rounded-2xl flex flex-col gap-4 mt-4">
      <div className="flex items-center justify-between border-b border-border-main/50 pb-3">
        <h3 className="text-base font-bold text-text-primary">Sağlık Zaman Çizelgesi</h3>
        <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
          <button 
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'upcoming' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Bekleyenler
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'past' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
          >
            Geçmiş
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-0 relative pl-2">
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border-main" />
        
        {displayList.length === 0 ? (
          <div className="py-6 text-center text-sm text-text-secondary relative z-10 bg-surface">
            {activeTab === 'upcoming' ? 'Bekleyen sağlık görevi bulunmuyor.' : 'Geçmiş sağlık görevi bulunmuyor.'}
          </div>
        ) : (
          displayList.map((item, idx) => {
            const isDone = item.status === 'done' || item.status === 'completed'
            const d = new Date(item.scheduled_at || item.due_date || 0)
            const isOverdue = !isDone && d.getTime() < Date.now()
            const isToday = !isDone && !isOverdue && d.toDateString() === new Date().toDateString()
            
            let color = 'bg-amber-500' // upcoming
            let dotColor = 'border-amber-500 bg-amber-100'
            if (isDone) {
              color = 'bg-emerald-500'
              dotColor = 'border-emerald-500 bg-emerald-100'
            } else if (isOverdue) {
              color = 'bg-red-500'
              dotColor = 'border-red-500 bg-red-100'
            } else if (isToday) {
              color = 'bg-blue-500'
              dotColor = 'border-blue-500 bg-blue-100'
            }

            return (
              <div key={item.id || idx} className="relative pl-8 py-3 bg-surface z-10">
                <div className={`absolute left-0 top-4 w-3.5 h-3.5 rounded-full border-2 ${dotColor} z-10 flex items-center justify-center -ml-[3px]`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-text-primary">{item.title}</span>
                  <span className="text-xs text-text-secondary mt-0.5">
                    {d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })} 
                    {item.due_time ? ` - ${item.due_time.substring(0,5)}` : ''}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

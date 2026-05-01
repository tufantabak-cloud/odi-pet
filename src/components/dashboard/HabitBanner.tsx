'use client'

import { useEffect, useState } from 'react'
import { evaluateHabitTriggers } from '@/features/health/actions'

interface HabitBannerProps {
  overdueCount: number
  wellnessScore: number
  hasActivity: boolean
}

export function HabitBanner({ overdueCount, wellnessScore, hasActivity }: HabitBannerProps) {
  const [notification, setNotification] = useState<{ id: string, type: string, message: string } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Run habit engine rules on mount
    evaluateHabitTriggers({ overdueCount, wellnessScore, hasActivity }).then((notif) => {
      if (notif) {
        setNotification(notif)
        setIsVisible(true)
      }
    })
  }, [overdueCount, wellnessScore, hasActivity])

  if (!isVisible || !notification) return null

  // Style based on priority
  let bgColors = 'bg-primary/10 border-primary/20 text-primary'
  let icon = '💡'
  
  if (notification.type === 'overdue') {
    bgColors = 'bg-error/10 border-error/20 text-error'
    icon = '🚨'
  } else if (notification.type === 'low_score') {
    bgColors = 'bg-warning/10 border-warning/20 text-warning'
    icon = '⚠️'
  } else if (notification.type === 'high_score') {
    bgColors = 'bg-success/10 border-success/20 text-success'
    icon = '🌟'
  } else if (notification.type === 'morning') {
    bgColors = 'bg-info/10 border-info/20 text-info'
    icon = '🌅'
  }

  return (
    <div className={`flex items-center justify-between p-4 mb-6 rounded-[16px] border-2 shadow-sm animate-fadeInDown ${bgColors}`}>
      <div className="flex items-center gap-3">
        <div className="text-[24px]">{icon}</div>
        <div className="flex flex-col">
          <span className="text-[12px] font-black uppercase tracking-wider opacity-80">ODI Asistan</span>
          <span className="text-[14px] font-bold mt-0.5">{notification.message}</span>
        </div>
      </div>
      <button 
        onClick={() => setIsVisible(false)}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  )
}

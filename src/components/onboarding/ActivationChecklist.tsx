'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics/track'

const STEPS = [
  { key: 'has_added_pet',        label: 'İlk petini ekle',            icon: '🐾', href: '/owner/pets',    points: 20 },
  { key: 'has_added_vaccine',    label: 'Aşı kaydı ekle',             icon: '💉', href: '/owner/health',  points: 20 },
  { key: 'has_added_feeding_log',label: 'Günlük mama girişi yap',     icon: '🍖', href: '/owner/nutrition', points: 20 },
  { key: 'has_invited_member',   label: 'Aile üyesi davet et',        icon: '👨‍👩‍👧', href: null,             points: 20 },
  { key: 'has_generated_report', label: 'İlk sağlık raporunu oluştur',icon: '📄', href: null,             points: 20 },
]

export default function ActivationChecklist() {
  const [progress, setProgress] = useState<any>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetch('/api/onboarding')
      .then(r => r.json())
      .then(d => {
        setProgress(d)
        // Auto-collapse if all done
        const done = STEPS.every(s => d[s.key])
        if (done) setCollapsed(true)
      })
  }, [])

  if (!progress) return null

  const completedCount = STEPS.filter(s => progress[s.key]).length
  const allDone = completedCount === STEPS.length
  const percent = Math.round((completedCount / STEPS.length) * 100)

  // Hide if wizard not completed and no pet yet — wizard handles it
  if (!progress.wizard_completed && !progress.has_added_pet) return null

  // Hide completely if all done AND points awarded
  if (allDone && progress.activation_points_awarded) return null

  return (
    <div className="card-base overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-main/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" strokeWidth="3"/>
              <circle cx="18" cy="18" r="15" fill="none" stroke="#6366f1" strokeWidth="3"
                strokeDasharray={`${(percent / 100) * 94.2} 94.2`} strokeLinecap="round"/>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-primary">{percent}%</span>
          </div>
          <div className="text-left">
            <p className="font-black text-text-primary text-[14px]">Kurulum İlerlemesi</p>
            <p className="text-[12px] text-text-secondary">
              {completedCount}/{STEPS.length} adım tamamlandı
              {!allDone && <span className="text-primary font-bold"> • +{(STEPS.length - completedCount) * 20} puan bekliyor</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {allDone && <span className="text-[11px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full">🏆 Tamamlandı</span>}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            className={`text-text-secondary transition-transform ${collapsed ? '' : 'rotate-180'}`}>
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </div>
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 flex flex-col gap-2">
          {/* Progress bar */}
          <div className="h-1.5 bg-bg-main rounded-full overflow-hidden mb-1">
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${percent}%` }}/>
          </div>

          {STEPS.map(step => {
            const done = !!progress[step.key]
            return (
              <div key={step.key}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${done ? 'bg-green-50 border-green-100' : 'border-border-main hover:border-primary/30 bg-surface'}`}>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${done ? 'border-green-500 bg-green-500' : 'border-border-main'}`}>
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>
                <span className="text-[18px]">{step.icon}</span>
                <p className={`flex-1 text-[13px] font-semibold ${done ? 'text-green-700 line-through opacity-70' : 'text-text-primary'}`}>
                  {step.label}
                </p>
                <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${done ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'}`}>
                  +{step.points}p
                </span>
                {!done && step.href && (
                  <Link
                    href={step.href}
                    onClick={() => trackEvent('checklist_step_completed', { step: step.key })}
                    className="text-[11px] font-bold text-primary hover:underline shrink-0"
                  >
                    Yap →
                  </Link>
                )}
              </div>
            )
          })}

          {allDone && !progress.activation_points_awarded && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <p className="font-black text-amber-800 text-[14px]">🎉 +100 Care Points kazandın!</p>
              <p className="text-[12px] text-amber-700 mt-0.5">Ödülün hesabına eklendi.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { WeightAssessment } from '@/lib/vetStandards/weightStandards'

interface WeightGoalBandProps {
  assessment: WeightAssessment
  currentWeight: number
  compact?: boolean
  isNeutered?: boolean
}

export default function WeightGoalBand({ assessment, currentWeight, compact = false, isNeutered = false }: WeightGoalBandProps) {
  const { status, idealMin, idealMax, diffKg, isFallback } = assessment

  const getCfg = () => {
    switch (status) {
      case 'ideal': return {
        bg: 'var(--color-background-success, #ecfdf5)',
        border: 'var(--color-border-success, #a7f3d0)',
        color: 'var(--color-text-success, #059669)',
        icon: 'ti-circle-check',
        label: 'İdeal kiloda',
        message: () => `(${idealMin.toFixed(1)}–${idealMax.toFixed(1)} kg${isNeutered && compact ? ' · Kısır profili' : ''})`
      }
      case 'overweight': return {
        bg: 'var(--color-background-warning, #fffbeb)',
        border: 'var(--color-border-warning, #fde68a)',
        color: 'var(--color-text-warning, #d97706)',
        icon: 'ti-alert-triangle',
        label: 'Fazla kilolu',
        message: (diff: number) => `— Hedef kiloya ulaşmak için ${diff.toFixed(1)} kg vermesi gerekiyor.`
      }
      case 'underweight': return {
        bg: 'var(--color-background-danger, #fef2f2)',
        border: 'var(--color-border-danger, #fecaca)',
        color: 'var(--color-text-danger, #dc2626)',
        icon: 'ti-alert-circle',
        label: 'Düşük kilolu',
        message: (diff: number) => `— Hedef kiloya ulaşmak için ${Math.abs(diff).toFixed(1)} kg alması gerekiyor.`
      }
      default: return {
        bg: 'var(--color-background-main, #f9fafb)',
        border: 'var(--color-border-main, #e5e7eb)',
        color: 'var(--color-text-secondary, #6b7280)',
        icon: 'ti-help-circle',
        label: 'Değerlendirilemedi',
        message: () => ''
      }
    }
  }

  const cfg = getCfg()

  if (compact) {
    return (
      <div 
        className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 px-4 py-2.5"
        style={{
          background: cfg.bg,
          borderTop: `0.5px solid ${cfg.border}`,
          borderBottomLeftRadius: 'var(--radius-lg, 0.5rem)',
          borderBottomRightRadius: 'var(--radius-lg, 0.5rem)',
        }}
      >
        <div className="flex items-start sm:items-center gap-2">
          <i className={`ti ${cfg.icon} mt-[3px] sm:mt-0 shrink-0`} style={{ color: cfg.color, fontSize: '14px' }} />
          <div className="leading-snug" style={{ color: cfg.color, fontSize: '12px' }}>
            <span style={{ fontWeight: 600 }}>{cfg.label} </span>
            <span style={{ opacity: 0.85 }}>{cfg.message(diffKg)}</span>
          </div>
        </div>
        {isFallback && (
          <span className="sm:ml-auto text-[10px] text-text-tertiary sm:whitespace-nowrap mt-0.5 sm:mt-0">
            Genel profil kullanıldı — Irk girerek doğruluğu artır
          </span>
        )}
      </div>
    )
  }

  // Future non-compact view (standalone card)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3 flex-wrap" style={{ color: cfg.color }}>
        <i className={`ti ${cfg.icon} text-lg`} />
        <span className="font-semibold text-sm">{cfg.label} {cfg.message(diffKg)}</span>
        {isNeutered && <span className="text-xs opacity-70 font-normal">(Kısır profili)</span>}
        {isFallback && (
          <span className="ml-auto text-[10px] text-text-tertiary bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
            Genel profil kullanıldı — Irk girerek doğruluğu artır
          </span>
        )}
      </div>
      
      <div className="relative h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full mt-6 mb-2">
        {/* Ideal range green bar */}
        {(status !== 'unknown') && (
          <div 
            className="absolute h-full bg-emerald-500/20 dark:bg-emerald-400/20 border-x border-emerald-500/50 dark:border-emerald-400/50"
            style={{
              left: `Math.max(0, ((idealMin - Math.min(idealMin - 2, currentWeight - 2)) / (Math.max(idealMax + 2, currentWeight + 2) - Math.min(idealMin - 2, currentWeight - 2))) * 100)%`,
              width: `((idealMax - idealMin) / (Math.max(idealMax + 2, currentWeight + 2) - Math.min(idealMin - 2, currentWeight - 2))) * 100%`
            }}
          />
        )}
        {/* Current weight point */}
        <div 
          className={`absolute w-3 h-3 rounded-full -top-0.5 -ml-1.5 shadow-sm border-2 border-white dark:border-gray-800
            ${status === 'ideal' ? 'bg-emerald-500' : status === 'overweight' ? 'bg-amber-500' : status === 'underweight' ? 'bg-red-500' : 'bg-gray-400'}`}
          style={{
             left: `((currentWeight - Math.min(idealMin - 2, currentWeight - 2)) / (Math.max(idealMax + 2, currentWeight + 2) - Math.min(idealMin - 2, currentWeight - 2))) * 100%`
          }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 font-medium px-1 mt-1">
        <span>{idealMin.toFixed(1)} kg</span>
        <span>{idealMax.toFixed(1)} kg</span>
      </div>
      {isNeutered && (
        <div className="text-[10px] text-text-tertiary mt-2 px-1">
          ℹ️ Kısırlaştırılmış profil: standart değerden %10 düşük
        </div>
      )}
    </div>
  )
}

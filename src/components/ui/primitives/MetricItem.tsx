import React from 'react'

type TrendType = 'success' | 'warning' | 'neutral'

interface MetricItemProps {
  value: string
  unit?: string
  label: string
  sublabel?: string
  sublabelType?: TrendType
  className?: string
}

const sublabelColors: Record<TrendType, string> = {
  success: 'text-[var(--color-success)]',
  warning: 'text-[var(--color-warning)]',
  neutral: 'text-[var(--color-text-muted)]',
}

export default function MetricItem({
  value, unit, label, sublabel, sublabelType = 'neutral', className = ''
}: MetricItemProps) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className="flex items-baseline gap-0.5">
        <span className="text-[18px] font-800 text-[var(--color-text-primary)] leading-none tabular-nums">
          {value}
        </span>
        {unit && (
          <span className="text-[11px] font-600 text-[var(--color-text-muted)]">{unit}</span>
        )}
      </div>
      <span className="text-[10px] font-500 text-[var(--color-text-muted)] mt-1">{label}</span>
      {sublabel && (
        <span className={`text-[9px] font-600 mt-0.5 ${sublabelColors[sublabelType]}`}>
          {sublabel}
        </span>
      )}
    </div>
  )
}
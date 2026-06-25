import React from 'react'
import { CheckCircle, AlertTriangle, Info } from 'lucide-react'

type BannerStatus = 'ideal' | 'overweight' | 'underweight' | 'unknown'

interface StatusBannerProps {
  status: BannerStatus
  message: string
  source?: string
  className?: string
}

const styles: Record<BannerStatus, { bg: string; color: string; Icon: React.ElementType }> = {
  ideal:       { bg: 'bg-[var(--color-success-soft)]', color: 'text-[var(--color-success)]',  Icon: CheckCircle },
  overweight:  { bg: 'bg-[var(--color-warning-soft)]', color: 'text-[var(--color-warning)]',  Icon: AlertTriangle },
  underweight: { bg: 'bg-[var(--color-danger-soft)]',  color: 'text-[var(--color-danger)]',   Icon: Info },
  unknown:     { bg: 'bg-[var(--color-surface-secondary)]', color: 'text-[var(--color-text-muted)]', Icon: Info },
}

export default function StatusBanner({ status, message, source, className = '' }: StatusBannerProps) {
  const { bg, color, Icon } = styles[status]
  return (
    <div className={`flex items-center gap-2 px-[var(--space-4)] py-[var(--space-2)] ${bg} ${className}`}>
      <Icon size={15} className={`${color} shrink-0`} />
      <span className={`flex-1 text-[12px] font-600 ${color}`}>{message}</span>
      {source && (
        <span className="text-[10px] font-600 text-[var(--color-text-muted)] shrink-0">{source}</span>
      )}
    </div>
  )
}
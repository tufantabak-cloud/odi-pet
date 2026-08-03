import React from 'react'

export type ChipStatus = 'done' | 'missed' | 'today' | 'upcoming' | 'planned' | 'next'

interface TimelineChipProps {
  date: string
  label: string
  status: ChipStatus
  className?: string
}

const chipStyles: Record<ChipStatus, string> = {
  done:     'bg-[var(--color-success)] text-white',
  missed:   'bg-[var(--color-danger)] text-white',
  today:    'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[1.5px] border-[var(--color-primary)]',
  upcoming: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)] border-[1.5px] border-[#FDE68A]',
  next:     'bg-[var(--color-primary-soft)] text-[var(--color-primary)] border-[1.5px] border-dashed border-[var(--color-primary)]',
  planned:  'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]',
}

export default function TimelineChip({ date, label, status, className = '' }: TimelineChipProps) {
  return (
    <div className={`shrink-0 rounded-lg px-2.5 py-1.5 min-w-[64px] text-center ${chipStyles[status]} ${className}`}>
      <p className="text-[10px] font-700 leading-none mb-1 tabular-nums">{date}</p>
      <p className="text-[9px] font-600 leading-none">{label}</p>
    </div>
  )
}
import React from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  dot?: boolean
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[var(--color-success-soft)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-soft)] text-[var(--color-warning)]',
  danger:  'bg-[var(--color-danger-soft)] text-[var(--color-danger)]',
  info:    'bg-[var(--color-info-soft)] text-[var(--color-info)]',
  neutral: 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]',
  primary: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
}

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
  danger:  'bg-[var(--color-danger)]',
  info:    'bg-[var(--color-info)]',
  neutral: 'bg-[var(--color-text-muted)]',
  primary: 'bg-[var(--color-primary)]',
}

export default function Badge({ variant = 'neutral', children, dot = false, className = '' }: BadgeProps) {
  return (
    <span className={[
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-xs)] text-[11px] font-700 leading-none',
      variantStyles[variant],
      className,
    ].join(' ')}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyles[variant]}`} />}
      {children}
    </span>
  )
}
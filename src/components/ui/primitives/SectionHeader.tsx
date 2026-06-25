import React from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export default function SectionHeader({ title, subtitle, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between px-[var(--space-4)] ${className}`}>
      <div>
        <h2 className="text-[11px] font-700 text-[var(--color-text-muted)] uppercase tracking-[0.8px]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
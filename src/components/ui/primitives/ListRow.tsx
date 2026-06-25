import React from 'react'
import { ChevronRight } from 'lucide-react'

interface ListRowProps {
  icon?: React.ReactNode
  iconBg?: string
  iconColor?: string
  title: string
  subtitle?: string
  subtitleType?: 'default' | 'warning' | 'success' | 'danger'
  trailing?: 'arrow' | React.ReactNode
  onClick?: () => void
  className?: string
}

const subtitleColors = {
  default: 'text-[var(--color-text-muted)]',
  warning: 'text-[var(--color-warning)]',
  success: 'text-[var(--color-success)]',
  danger:  'text-[var(--color-danger)]',
}

export default function ListRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  subtitleType = 'default',
  trailing = 'arrow',
  onClick,
  className = '',
}: ListRowProps) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      className={[
        'flex items-center gap-3 px-[var(--space-4)] min-h-[64px] w-full text-left',
        onClick ? 'hover:bg-[var(--color-surface-secondary)] active:bg-[var(--color-border)] transition-colors cursor-pointer' : '',
        className,
      ].join(' ')}
    >
      {icon && (
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0 py-3">
        <p className="text-[13px] font-600 text-[var(--color-text-primary)] leading-tight truncate">
          {title}
        </p>
        {subtitle && (
          <p className={`text-[11px] font-500 mt-0.5 truncate ${subtitleColors[subtitleType]}`}>
            {subtitle}
          </p>
        )}
      </div>
      {trailing === 'arrow' && (
        <ChevronRight size={16} className="text-[var(--color-text-muted)] shrink-0" />
      )}
      {trailing !== 'arrow' && trailing}
    </Tag>
  )
}
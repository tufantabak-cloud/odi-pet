'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  showBack?: boolean
  backHref?: string
  onBack?: () => void
  trailing?: React.ReactNode
  className?: string
}

export default function PageHeader({
  title, showBack = true, backHref, onBack, trailing, className = ''
}: PageHeaderProps) {
  const router = useRouter()
  const handleBack = onBack ?? (() => backHref ? router.push(backHref) : router.back())

  return (
    <div className={`flex items-center gap-3 px-[var(--space-4)] py-3 ${className}`}>
      {showBack && (
        <button
          onClick={handleBack}
          aria-label="Geri"
          className="w-9 h-9 rounded-[var(--radius-xs)] bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center shrink-0 hover:bg-[var(--color-border)] transition-colors"
        >
          <ArrowLeft size={16} className="text-[var(--color-text-secondary)]" />
        </button>
      )}
      <h1 className="flex-1 text-[18px] font-800 text-[var(--color-text-primary)] leading-tight truncate">
        {title}
      </h1>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  )
}
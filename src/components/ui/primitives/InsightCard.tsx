import React from 'react'
import { Info } from 'lucide-react'
import Link from 'next/link'

interface InsightCardProps {
  text: string
  dataDate?: string
  cta?: { label: string; href: string }
  className?: string
}

export default function InsightCard({ text, dataDate, cta, className = '' }: InsightCardProps) {
  if (!text) return null
  return (
    <div className={[
      'flex items-start gap-3 p-[var(--space-4)] rounded-[var(--radius-lg)]',
      'bg-[var(--color-primary-soft)] border border-[#C4B5FD]',
      className,
    ].join(' ')}>
      <div className="w-9 h-9 rounded-[10px] bg-[var(--color-primary)] flex items-center justify-center shrink-0 mt-0.5">
        <Info size={16} color="white" />
      </div>
      <div className="flex-1 min-w-0">
        {dataDate && (
          <p className="text-[10px] font-600 text-[var(--color-primary)] opacity-70 mb-0.5 uppercase tracking-wide">
            {dataDate}
          </p>
        )}
        <p className="text-[12px] font-500 text-[#4E24C8] leading-relaxed">{text}</p>
        {cta && (
          <Link href={cta.href} className="text-[11px] font-700 text-[var(--color-primary)] mt-1.5 inline-block hover:underline">
            {cta.label} →
          </Link>
        )}
      </div>
    </div>
  )
}
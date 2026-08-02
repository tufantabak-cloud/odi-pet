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
      // docs/opos-design-system/12_cards.md → "AI Insight Card (InsightCard)"
      'flex items-start gap-4 p-4 rounded-2xl backdrop-blur-md',
      'bg-primary-soft/60 border border-primary/20',
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
        <p className="text-[12px] font-500 text-primary leading-relaxed">{text}</p>
        {cta && (
          <Link href={cta.href} className="text-[11px] font-700 text-[var(--color-primary)] mt-1.5 inline-block hover:underline">
            {cta.label} →
          </Link>
        )}
      </div>
    </div>
  )
}
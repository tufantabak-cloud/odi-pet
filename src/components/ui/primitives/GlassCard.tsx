import React from 'react'

// OPOS v1.0 — bkz. docs/opos-design-system/12_cards.md (OPGlassCard)
// Yeni dosya — daha önce hiçbir yerde generic bir "GlassCard" primitive'i yoktu, sıfır regresyon riski.
// Not: Props interface iki farklı kanonik dokümanda tutarsız verilmiş —
// 12_cards.md: padding?: 'compact' | 'normal' | 'relaxed'
// 22_component-library.md (master catalog): padding?: 'sm' | 'md' | 'lg'
// Master catalog daha kapsamlı/konsolide kaynak olduğu için 'sm'|'md'|'lg' esas alındı,
// tutarsızlık burada not düşülüyor (bkz. Faz 2 raporu).

type CardVariant = 'default' | 'hero' | 'insight' | 'interactive'
type CardPadding = 'sm' | 'md' | 'lg'
type CardCategory = 'health' | 'vaccine' | 'parasite' | 'nutrition' | 'care'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: CardPadding
  category?: CardCategory
  children: React.ReactNode
}

const paddingStyles: Record<CardPadding, string> = {
  sm: 'p-4',  // 16px
  md: 'p-5',  // 20px
  lg: 'p-6',  // 24px
}

// 12_cards.md → "Master Card Specs & Variant Matrix"
const variantStyles: Record<CardVariant, string> = {
  default: 'bg-surface/90 backdrop-blur-xl rounded-card border border-white shadow-soft hover:shadow-medium hover:border-primary/10',
  hero: 'bg-gradient-to-br from-primary-soft/80 via-white/90 to-white/95 backdrop-blur-2xl rounded-[20px] border border-white/60 shadow-medium overflow-hidden',
  insight: 'bg-primary-soft/60 backdrop-blur-md rounded-2xl border border-primary/20',
  interactive: 'bg-surface/90 backdrop-blur-xl rounded-card border border-white shadow-soft hover:shadow-medium hover:border-primary/10 hover:-translate-y-0.5 cursor-pointer',
}

export default function GlassCard({
  variant = 'default',
  padding = 'md',
  category,
  children,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <div
      data-category={category}
      className={[
        'transition-all duration-500',
        variantStyles[variant],
        paddingStyles[padding],
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

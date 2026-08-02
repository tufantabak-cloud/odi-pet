import React from 'react'

// OPOS v1.0 — bkz. docs/opos-design-system/22_component-library.md (OPBadge, #7)
// Bu dosya hiçbir ekranda kullanılmıyor (unwired primitive) — sıfır regresyon riskiyle
// kanonik prop interface'ine (variant: success|warning|error|primary|health) göre yeniden yazıldı.
// Not: 'health' varyantı için ayrı bir renk spesifikasyonu yok; 04_color-tokens.md'deki
// "Health/Urgent" domain triple'ından türetildi (danger metin + health-soft zemin) — icat değil,
// mevcut dokümante edilmiş token'ların birleşimi.

type BadgeVariant = 'success' | 'warning' | 'error' | 'primary' | 'health'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  dot?: boolean
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  error:   'bg-danger-soft text-danger',
  primary: 'bg-primary-soft text-primary',
  health:  'bg-[var(--color-health-soft)] text-danger', // 04_color-tokens.md → Health/Urgent domain triple
}

const dotStyles: Record<BadgeVariant, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error:   'bg-danger',
  primary: 'bg-primary',
  health:  'bg-danger',
}

export default function Badge({ variant = 'primary', children, dot = false, className = '' }: BadgeProps) {
  return (
    <span className={[
      // 22_component-library.md matrix: "rounded-full text-[13px] font-bold"
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[13px] font-bold leading-none',
      variantStyles[variant],
      className,
    ].join(' ')}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyles[variant]}`} />}
      {children}
    </span>
  )
}

'use client'
import React from 'react'
import { Loader2 } from 'lucide-react'

// OPOS v1.0 — bkz. docs/opos-design-system/10_buttons.md (OPButton)
// Bu dosya hiçbir ekranda kullanılmıyor (unwired primitive), bu yüzden
// kanonik spesifikasyona göre birebir yeniden yazıldı.

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  children: React.ReactNode
}

// 10_buttons.md → "Button Variants & Styling Specs" (Ghost: doküman scope/interface'te adı geçiyor
// ama ayrı bir visual spec paragrafı yok — MISSING OPOS SPECIFICATION. Ghost için mevcut minimal
// transparan/primary-text deseni korunmuştur, kanonik bir değer icat edilmemiştir.)
const variantStyles: Record<ButtonVariant, string> = {
  primary:   'bg-primary text-white hover:bg-primary-dark hover:shadow-[0_8px_16px_rgba(109,61,245,0.25)]',
  secondary: 'border border-border text-text-primary bg-primary-soft hover:bg-primary/10 hover:text-primary shadow-sm',
  outline:   'border border-border text-text-primary bg-surface hover:border-primary/40 hover:bg-primary-soft/50 hover:text-primary',
  danger:    'bg-danger text-white hover:bg-danger/90 hover:shadow-[0_8px_16px_rgba(228,71,79,0.25)]',
  ghost:     'bg-transparent text-primary hover:bg-primary-soft', // MISSING OPOS SPECIFICATION — bkz. not yukarıda
}

// 10_buttons.md → "Button Size Scale Matrix"
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-12 px-6 text-[15px]',
  lg: 'h-14 px-8 text-[16px]',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading
  return (
    <button
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={isLoading || undefined}
      tabIndex={isDisabled ? -1 : undefined}
      className={[
        // rounded-btn (18px, --radius-btn) tüm varyant/boyutlarda sabit — 10_buttons.md
        'inline-flex items-center justify-center gap-2 rounded-btn font-semibold cursor-pointer select-none',
        'transition-all duration-300 active:scale-[0.98]',
        'focus:outline-none focus:ring-4 focus:ring-primary/20',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={15} className="animate-spin shrink-0" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  )
}

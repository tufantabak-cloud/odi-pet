'use client'
import React from 'react'

// OPOS v1.0 — bkz. docs/opos-design-system/11_inputs.md (OPInput)
// Yeni dosya — daha önce hiçbir yerde bu adla bir primitive yoktu, sıfır regresyon riski.

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  id,
  className = '',
  ...props
}, ref) {
  const inputId = id || props.name
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-[13px] font-semibold text-text-primary mb-2 tracking-[0.01em]">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary/60 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={[
            // 11_inputs.md → "Master Input Styling Specs" (Container Spec), 16px iOS lock zorunlu
            'w-full bg-surface/80 backdrop-blur-sm border border-border h-12 px-4 rounded-input',
            'shadow-[0_2px_10px_rgba(0,0,0,0.02)] outline-none',
            'text-[16px] text-text-primary placeholder:text-text-secondary/60',
            'focus:border-primary/50 focus:ring-4 focus:ring-primary/10',
            'hover:border-[#CBD5E1] transition-all duration-300',
            leftIcon ? 'pl-11' : '',
            rightIcon ? 'pr-11' : '',
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : '',
            className,
          ].join(' ')}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary/60">
            {rightIcon}
          </span>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-[12px] text-danger font-medium mt-1.5 flex items-center gap-1">
          {error}
        </p>
      ) : helperText ? (
        <p className="text-[12px] text-text-secondary mt-1.5">{helperText}</p>
      ) : null}
    </div>
  )
})

export default Input

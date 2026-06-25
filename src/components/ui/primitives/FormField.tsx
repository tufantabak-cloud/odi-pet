'use client'
import React from 'react'

interface FormFieldProps {
  label: string
  unit?: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export default function FormField({
  label, unit, hint, error, required = false, children, className = ''
}: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-600 text-[var(--color-text-secondary)]">
          {label}
          {required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
        </label>
        {unit && (
          <span className="text-[11px] font-600 text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] px-2 py-0.5 rounded-[var(--radius-xs)]">
            {unit}
          </span>
        )}
      </div>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-[var(--color-text-muted)]">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] font-600 text-[var(--color-danger)]">{error}</p>
      )}
    </div>
  )
}
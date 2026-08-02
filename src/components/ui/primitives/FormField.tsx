'use client'
import React from 'react'

// OPOS v1.0 — bkz. docs/opos-design-system/14_forms.md (OPFormField)
// Bu dosya hiçbir ekranda kullanılmıyor (unwired primitive) — sıfır regresyon riskiyle
// kanonik spesifikasyona göre düzeltildi. `unit` prop'u OPOS'ta tanımlı değil (MISSING
// OPOS SPECIFICATION) — davranışı icat edilmeden, mevcut haliyle korunarak bırakıldı.

interface FormFieldProps {
  label: string
  unit?: string
  helperText?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export default function FormField({
  label, unit, helperText, error, required = false, children, className = ''
}: FormFieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        {/* 14_forms.md → Label Spec: text-label (13px/600/tracking 0.01em) text-primary */}
        <label className="text-[13px] font-semibold text-text-primary tracking-[0.01em]">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
        {/* unit: MISSING OPOS SPECIFICATION — mevcut implementasyon değiştirilmeden korundu */}
        {unit && (
          <span className="text-[11px] font-600 text-[var(--color-text-muted)] bg-[var(--color-surface-secondary)] px-2 py-0.5 rounded-[var(--radius-xs)]">
            {unit}
          </span>
        )}
      </div>
      {children}
      {/* 14_forms.md → Helper Text Spec: text-caption (12px) text-secondary mt-1.5 */}
      {helperText && !error && (
        <p className="text-[12px] text-text-secondary mt-1.5">{helperText}</p>
      )}
      {/* 14_forms.md → Error Text Spec: text-caption text-danger font-medium mt-1.5 */}
      {error && (
        <p role="alert" className="text-[12px] text-danger font-medium mt-1.5 flex items-center gap-1 animate-fadeInUp">
          {error}
        </p>
      )}
    </div>
  )
}
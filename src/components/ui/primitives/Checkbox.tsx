'use client'
import React from 'react'

// OPOS v1.0 — bkz. docs/opos-design-system/11_inputs.md (OPCheckbox)
// Yeni dosya — daha önce hiçbir yerde bu adla bir primitive yoktu, sıfır regresyon riski.
// Not: OPCheckbox için ayrı bir TypeScript prop interface spesifikasyonu dokümanlarda verilmemiş
// (yalnızca visual spec + boyut var). Native <input type="checkbox"> + label sarmalayıcı,
// spec'te tanımlanmayan davranış icat edilmeden minimum arayüzle kuruldu.

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, id, className = '', ...props }, ref) {
  const checkboxId = id || props.name
  return (
    <label
      htmlFor={checkboxId}
      className="inline-flex items-center gap-2 cursor-pointer select-none py-3 -my-3" // 44x44 dokunma alanı için dikey padding
    >
      <input
        ref={ref}
        id={checkboxId}
        type="checkbox"
        className={[
          // 11_inputs.md → "Checkbox Control (OPCheckbox)"
          'w-5 h-5 rounded-md border-2 border-border text-primary',
          'focus:ring-primary/20 transition-all',
          'checked:bg-primary checked:border-primary',
          'cursor-pointer',
          className,
        ].join(' ')}
        {...props}
      />
      {label && <span className="text-[14px] text-text-primary">{label}</span>}
    </label>
  )
})

export default Checkbox

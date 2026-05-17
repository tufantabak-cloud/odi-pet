'use client'

import { useEffect } from 'react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' renders the confirm button in red, 'warning' in amber, 'default' in primary */
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Onayla',
  cancelLabel = 'İptal',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onCancel])

  if (!open) return null

  const confirmClass =
    variant === 'danger'
      ? 'bg-error text-white hover:bg-error/90'
      : variant === 'warning'
      ? 'bg-amber-500 text-white hover:bg-amber-600'
      : 'btn-primary'

  const iconBg =
    variant === 'danger'
      ? 'bg-error/10'
      : variant === 'warning'
      ? 'bg-amber-50'
      : 'bg-primary/10'

  const icon =
    variant === 'danger' ? '🗑️' : variant === 'warning' ? '⚠️' : '❓'

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain"
      onClick={onCancel}
    >
      <div
        className="bg-surface w-full max-w-sm rounded-[28px] shadow-2xl overflow-y-auto max-h-[90dvh] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + Header */}
        <div className="px-6 pt-7 pb-4 flex flex-col items-center text-center gap-3">
          <div className={`w-14 h-14 rounded-full ${iconBg} flex items-center justify-center text-[28px]`}>
            {icon}
          </div>
          <h3 className="text-[17px] font-extrabold text-text-primary leading-snug">{title}</h3>
          {message && (
            <p className="text-[13px] text-text-secondary leading-relaxed">{message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-7 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl border-2 border-border-main text-text-secondary font-bold text-[14px] hover:bg-bg-main transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3.5 rounded-xl font-bold text-[14px] transition-all shadow-sm ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

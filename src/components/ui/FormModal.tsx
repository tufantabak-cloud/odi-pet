'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface FormModalProps {
  open: boolean
  title: string
  description?: string
  icon?: string
  iconBg?: string
  onClose: () => void
  children: React.ReactNode
}

export default function FormModal({
  open,
  title,
  description,
  icon = '📝',
  iconBg = 'bg-primary/10',
  onClose,
  children,
}: FormModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain"
      onClick={onClose}
    >
      <div
        className="relative bg-surface w-full max-w-sm sm:max-w-md rounded-[28px] shadow-2xl overflow-y-auto max-h-[90dvh] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-7 pb-4 flex flex-col items-center text-center gap-3 border-b border-border-main">
          <div className={`w-14 h-14 rounded-full ${iconBg} flex items-center justify-center text-[28px]`}>
            {icon}
          </div>
          <h3 className="text-[20px] font-extrabold text-text-primary leading-snug">{title}</h3>
          {description && (
            <p className="text-[13px] text-text-secondary leading-relaxed">{description}</p>
          )}
        </div>

        {/* Content (Form) */}
        <div className="p-6">
          {children}
        </div>
        
        {/* Close button at top right */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-bg-main text-text-secondary hover:text-primary transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>,
    document.body
  )
}

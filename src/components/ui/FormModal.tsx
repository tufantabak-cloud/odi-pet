'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface FormModalProps {
  open: boolean;
  title: string;
  description?: string;
  icon?: string;
  iconBg?: string;
  displayType?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function FormModal({
  open,
  title,
  description,
  icon = '📝',
  iconBg = 'bg-primary/10',
  displayType = 'modal',
  onClose,
  children,
}: FormModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const isBottomSheet = displayType === 'bottom_sheet';

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] bg-[rgba(15,23,42,0.60)] backdrop-blur-md flex p-4 overscroll-contain transition-all ${
        isBottomSheet ? 'items-end justify-center sm:items-center' : 'items-center justify-center'
      }`}
      onClick={onClose}
    >
      <div
        className={`relative bg-white/95 backdrop-blur-2xl border border-white/60 w-[calc(100%-32px)] max-w-[480px] sm:max-w-[480px] shadow-floating overflow-y-auto max-h-[90dvh] transition-all ${
          isBottomSheet
            ? 'rounded-t-[28px] sm:rounded-modal animate-in slide-in-from-bottom duration-300'
            : 'rounded-modal animate-in fade-in zoom-in-95 duration-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-2.5 border-b border-border-main/60">
          <div className={`w-13 h-13 rounded-2xl ${iconBg} flex items-center justify-center text-[26px] shadow-sm`}>
            {icon}
          </div>
          <h3 className="text-[20px] font-extrabold text-text-primary tracking-tight leading-snug">{title}</h3>
          {Boolean(description) && (
            <p className="text-[13px] text-text-secondary leading-relaxed max-w-xs">{description}</p>
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
          aria-label="Kapat"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>,
    document.body
  );
}

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface DeletePlanConfirmationModalProps {
  open: boolean;
  title?: string;
  categoryName?: string;
  description?: string;
  assuranceMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeletePlanConfirmationModal({
  open,
  title,
  categoryName,
  description = 'Bu işlem yalnızca gelecekteki planı ve hatırlatıcıyı kaldırır.',
  assuranceMessage = 'Daha önce kaydedilmiş aşı/sağlık kayıtlarınız silinmez.',
  confirmLabel = 'Planı Sil',
  cancelLabel = 'Vazgeç',
  isDeleting = false,
  onConfirm,
  onCancel,
}: DeletePlanConfirmationModalProps) {
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
    if (!open || isDeleting) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, isDeleting, onCancel]);

  if (!open || !mounted) return null;

  const displayTitle = title || (categoryName ? `${categoryName} planını silmek istiyor musunuz?` : 'Planı silmek istiyor musunuz?');

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-[rgba(15,23,42,0.60)] backdrop-blur-sm flex items-center justify-center p-4 overscroll-contain animate-in fade-in duration-200"
      onClick={() => {
        if (!isDeleting) onCancel();
      }}
    >
      <div
        className="bg-surface w-[calc(100%-32px)] max-w-[380px] rounded-[24px] border border-border-main shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        {/* Header & Body */}
        <div className="p-6 flex flex-col gap-4 text-left">
          <div className="flex flex-col gap-1.5">
            <h3 id="delete-modal-title" className="text-[17px] font-extrabold text-text-primary leading-snug">
              {displayTitle}
            </h3>
            <p className="text-[13px] text-text-secondary leading-relaxed font-normal">
              {description}
            </p>
          </div>

          {/* Callout Box: Medical Records Protection Assurance */}
          <div className="card-base p-3.5 bg-gradient-to-r from-teal-50/90 to-emerald-50/60 border border-teal-200/80 rounded-2xl flex items-start gap-3 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
              <ShieldCheck className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <p className="text-[12px] font-semibold text-teal-900 leading-snug flex-1">
              {assuranceMessage}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 flex items-center gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-[13px] hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white font-bold text-[13px] transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer shadow-2xs"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" aria-hidden="true" />
                <span>Siliniyor...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

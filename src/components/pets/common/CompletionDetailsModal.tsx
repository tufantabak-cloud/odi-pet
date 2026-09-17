'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, X } from 'lucide-react';
import { OptionalApplicationDetails } from '@/components/health-records/OptionalApplicationDetails';
import type { ApplicationDetails } from '@/lib/health-records/application-details';
import { SmartScanner } from '@/components/ui/SmartScanner';

interface CompletionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  category?: 'asi' | 'parazit' | 'beslenme' | 'bakim' | 'aktivite' | 'kilo' | 'ilac' | 'saglik' | 'kontrol' | 'hijyen';
  onComplete: (details: ApplicationDetails | null) => void;
}

export function CompletionDetailsModal({ isOpen, onClose, taskTitle, category = 'saglik', onComplete }: CompletionDetailsModalProps) {
  const [applicationDetails, setApplicationDetails] = useState<ApplicationDetails | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isVaccine = 
    category === 'asi' || 
    Boolean(typeof taskTitle === 'string' && /aşı|asi|vaccine|kuduz|karma|lösemi|leukemia|bronchine|nobivac|versican|felocell|rabies/i.test(taskTitle));
  const effectiveCategory = isVaccine ? 'asi' : category;

  const handleSubmit = () => {
    onComplete(applicationDetails);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Single Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-border-main/50 bg-white/95 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100/50 flex items-center justify-center border border-emerald-200/50 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[16px] font-extrabold text-text-primary tracking-tight">İşlem Tamamlandı</h2>
              <p className="text-[12px] text-text-secondary font-medium truncate max-w-[220px] sm:max-w-xs">{taskTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-main text-text-secondary hover:text-text-primary hover:bg-slate-200 transition-colors active:scale-95 shrink-0 ml-2"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Single Scrollable Content */}
        <div className="px-4 sm:px-6 py-4 overflow-y-auto custom-scrollbar flex flex-col gap-4 flex-1">
          <div className="p-3.5 sm:p-4 bg-blue-50/80 border border-blue-100 rounded-2xl flex items-start gap-3 shrink-0">
            <span className="text-blue-500 text-base sm:text-lg shrink-0 mt-0.5">ⓘ</span>
            <p className="text-[12.5px] font-medium text-blue-900 leading-snug">
              Uygulama detaylarını dilerseniz şimdi girebilir veya daha sonra güncelleyebilirsiniz.
            </p>
          </div>

          <OptionalApplicationDetails
            category={effectiveCategory}
            value={applicationDetails}
            onChange={(nextValue) => setApplicationDetails(nextValue)}
            onScan={() => setShowScanner(true)}
            variant="embedded"
          />

          {showScanner && (
            <SmartScanner
              category={effectiveCategory}
              cropMode={isVaccine ? 'vaccine_row' : 'standard'}
              onResult={(res) => {
                const nextDetails = { ...applicationDetails } as ApplicationDetails;
                if (res.title || res.vaccine_name) {
                  nextDetails.product_name = String(res.title || res.vaccine_name || nextDetails.product_name || '');
                }
                if (res.productName || res.product_name || res.brand || res.vaccine_brand) {
                  nextDetails.brand = String(res.brand || res.vaccine_brand || nextDetails.brand || '');
                  if (!nextDetails.product_name) {
                    nextDetails.product_name = String(res.productName || res.product_name || res.brand || '');
                  }
                }
                if (res.batchNumber || res.lotNumber || res.lot_number) {
                  nextDetails.lot_number = String(res.batchNumber || res.lotNumber || res.lot_number);
                }
                if (res.product_expiry_at || res.expiration_date || res.expiry_date) {
                  nextDetails.product_expiry_at = String(res.product_expiry_at || res.expiration_date || res.expiry_date || '') || null;
                }
                if (res.vet_name) {
                  nextDetails.provider_name = String(res.vet_name);
                }
                if (res.vet_company) {
                  nextDetails.institution_name = String(res.vet_company);
                }
                setApplicationDetails(nextDetails);
                setShowScanner(false);
              }}
              onClose={() => setShowScanner(false)}
            />
          )}
        </div>

        {/* Single Footer */}
        <div className="sticky bottom-0 z-10 p-4 sm:p-5 border-t border-border-main/50 bg-white/95 backdrop-blur-md flex items-center gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 px-4 rounded-[16px] text-[15px] font-extrabold text-text-secondary bg-white border border-border-main hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3.5 px-4 rounded-[16px] text-[15px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-[0_4px_20px_-2px_rgba(5,150,105,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Tamamla ve Kaydet <CheckCircle2 className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

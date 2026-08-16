'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
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

  const handleSubmit = () => {
    onComplete(applicationDetails);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col max-h-[85vh] sm:max-h-[800px] w-full max-w-md mx-auto bg-white sm:rounded-[24px] overflow-hidden flex-shrink-0 flex-grow-0 relative shadow-2xl">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border-main/50 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100/50 flex items-center justify-center border border-emerald-200/50">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-[16px] font-extrabold text-text-primary tracking-tight">İşlem Tamamlandı</h2>
              <p className="text-[12px] text-text-secondary font-medium truncate max-w-[200px]">{taskTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-main text-text-secondary hover:text-text-primary hover:bg-slate-200 transition-colors active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-5">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
            <span className="text-blue-500 text-lg">ⓘ</span>
            <p className="text-[12.5px] font-medium text-blue-900 leading-snug">
              Uygulama detaylarını dilerseniz şimdi girebilir veya daha sonra güncelleyebilirsiniz.
            </p>
          </div>

          <OptionalApplicationDetails
            category={category}
            value={applicationDetails}
            onChange={(nextValue) => setApplicationDetails(nextValue)}
            onScan={() => setShowScanner(true)}
          />

          {showScanner && (
            <SmartScanner
              onResult={(res) => {
                const nextDetails = { ...applicationDetails } as ApplicationDetails;
                if (res.productName || res.brand) {
                  nextDetails.product_name = String(res.productName || res.brand);
                }
                if (res.batchNumber || res.lotNumber) {
                  nextDetails.lot_number = String(res.batchNumber || res.lotNumber);
                }
                setApplicationDetails(nextDetails);
                setShowScanner(false);
              }}
              onClose={() => setShowScanner(false)}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border-main/50 bg-bg-main/30 flex items-center gap-3">
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
    </Modal>
  );
}

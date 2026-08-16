'use client';

import React, { useState } from 'react';
import { Archive, ShieldAlert, Trash2, X } from 'lucide-react';

export interface ArchiveConfirmModalProps {
  isOpen: boolean;
  itemTitle: string;
  isHealthRecord?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function ArchiveConfirmModal({
  isOpen,
  itemTitle,
  isHealthRecord = true,
  onClose,
  onConfirm,
}: ArchiveConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'İşlem gerçekleştirilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white/95 backdrop-blur-xl rounded-[28px] border border-slate-100 p-6 shadow-2xl text-center space-y-4 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-[17px] font-extrabold text-text-primary">
            {isHealthRecord ? 'Kaydı Arşivle' : 'Kaydı Sil'}
          </h3>
          <p className="text-[13px] font-semibold text-text-secondary mt-1 line-clamp-2">"{itemTitle}"</p>
        </div>

        <p className="text-[12px] text-text-secondary/80 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
          {isHealthRecord
            ? 'Sağlık geçmişinizin eksiksiz kalması için bu kayıt veritabanından tamamen silinmek yerine arşivlenecektir. Geçmiş tıbbi geçmişten her zaman erişebilirsiniz.'
            : 'Bu işlem kaydı listeden kaldıracaktır. Devam etmek istiyor musunuz?'}
        </p>

        {error && <p className="text-[12px] font-bold text-red-500 px-1">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 rounded-btn bg-slate-100 hover:bg-slate-200 text-text-secondary font-bold text-[13px] transition-all active:scale-[0.98]"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3.5 rounded-btn bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[13px] shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isHealthRecord ? <Archive className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            <span>{loading ? 'İşleniyor...' : isHealthRecord ? 'Arşivle' : 'Sil'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

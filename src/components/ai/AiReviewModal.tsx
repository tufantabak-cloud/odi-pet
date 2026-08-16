import React from 'react';
import { Sparkles, Check, AlertTriangle, X } from 'lucide-react';

interface AiReviewModalProps {
  result: any;
  onConfirm: (data: any) => void;
  onCancel: () => void;
}

export default function AiReviewModal({ result, onConfirm, onCancel }: AiReviewModalProps) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-surface w-full max-w-sm rounded-modal p-6 shadow-[0_12px_32px_-4px_rgba(15,23,42,0.08)] overflow-hidden animate-fade-in flex flex-col gap-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-text-primary text-base">AI Belge Analizi</h3>
              <p className="text-xs text-text-secondary font-medium">Lütfen verileri doğrulayın</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-text-secondary hover:text-text-primary transition-colors p-1 bg-bg-main rounded-full">
            <X size={18} />
          </button>
        </div>

        <div className="bg-purple-50/50 border border-purple-100 p-4 rounded-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wide">Bulunan Veriler</span>
            <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1">
              <Check size={12} /> {result.confidence}% Güven Skoru
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-purple-100 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-center border-b border-border-main/50 pb-2">
              <span className="text-xs text-text-secondary font-medium">Aşı/İlaç Adı</span>
              <span className="text-sm font-bold text-text-primary">{result.data?.brand || '-'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-secondary font-medium">Tarih</span>
              <span className="text-sm font-bold text-text-primary">
                {result.data?.date ? new Date(result.data.date).toLocaleDateString('tr-TR') : '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200/50 p-3 rounded-xl flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            Bu bir klinik teşhis değildir. Acil durumlarda mutlaka lisanslı bir veteriner hekime danışınız.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3.5 rounded-btn border-2 border-border-main text-text-secondary font-bold text-sm hover:bg-bg-main transition-colors">
            İptal
          </button>
          <button 
            onClick={() => onConfirm(result.data)} 
            className="flex-[2] btn-primary py-3.5 shadow-sm text-sm flex items-center justify-center gap-1.5"
          >
            Onayla ve Kaydet <Check size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

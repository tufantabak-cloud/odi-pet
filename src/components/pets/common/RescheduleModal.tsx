'use client';

import React, { useState } from 'react';
import { Calendar, Sparkles, X } from 'lucide-react';

export interface RescheduleModalProps {
  isOpen: boolean;
  itemTitle: string;
  currentDate?: string;
  onClose: () => void;
  onSave: (newDate: string, reason?: string) => Promise<void>;
}

export function RescheduleModal({
  isOpen,
  itemTitle,
  currentDate,
  onClose,
  onSave,
}: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    currentDate ? new Date(currentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Quick Preset Helper
  const applyPreset = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      setError('Lütfen geçerli bir tarih seçin.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave(selectedDate, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Tarih güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[28px] border border-slate-100 p-6 shadow-2xl space-y-5 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-[16px] font-extrabold text-text-primary">Tarihi Ertele / Güncelle</h3>
            <p className="text-[12px] text-text-secondary line-clamp-1">{itemTitle}</p>
          </div>
        </div>

        {/* Quick Presets (1-Click UX) */}
        <div>
          <label className="text-[11px] font-black uppercase tracking-wider text-text-secondary mb-2 block flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Hızlı Erteleme Seçenekleri
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '+3 Gün', days: 3 },
              { label: '+1 Hafta', days: 7 },
              { label: '+2 Hafta', days: 14 },
              { label: '+1 Ay', days: 30 },
            ].map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => applyPreset(p.days)}
                className="py-2.5 rounded-xl bg-slate-100 hover:bg-primary/10 hover:text-primary text-[12px] font-bold text-text-primary transition-all active:scale-[0.98]"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[12px] font-bold text-text-secondary block mb-1">Yeni Plan Tarihi</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-[14px] font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div>
            <label className="text-[12px] font-bold text-text-secondary block mb-1">Erteleme Notu (Opsiyonel)</label>
            <input
              type="text"
              placeholder="Örn: Randevu sonraki haftaya alındı"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error && <p className="text-[12px] font-bold text-red-500 px-1">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-btn bg-slate-100 hover:bg-slate-200 text-text-secondary font-bold text-[13px] transition-all active:scale-[0.98]"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 rounded-btn bg-primary hover:bg-primary-hover text-white font-extrabold text-[13px] shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Güncelleniyor...' : 'Tarihi Güncelle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

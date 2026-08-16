'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { CalendarDays, X } from 'lucide-react';

interface PostponeModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  currentDate: string;
  onPostpone: (newDate: string, note?: string) => void;
}

export function PostponeModal({ isOpen, onClose, taskTitle, currentDate, onPostpone }: PostponeModalProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to tomorrow or current date if none provided
    if (!currentDate) return new Date().toISOString().split('T')[0];
    return currentDate;
  });
  const [note, setNote] = useState('');

  const handleQuickPostpone = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleMonthsPostpone = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleSubmit = () => {
    onPostpone(selectedDate, note);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col max-h-[85vh] sm:max-h-[800px] w-full max-w-md mx-auto bg-white sm:rounded-[24px] overflow-hidden flex-shrink-0 flex-grow-0 relative shadow-2xl">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-border-main/50 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-100/50 flex items-center justify-center border border-orange-200/50">
              <CalendarDays className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-[16px] font-extrabold text-text-primary tracking-tight">Tarihi Ertele / Güncelle</h2>
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
        <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          {/* Quick Options */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-orange-500 text-lg">✨</span>
              <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">
                HIZLI ERTELEME SEÇENEKLERİ
              </label>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleQuickPostpone(3)}
                className="py-2.5 px-2 bg-orange-50 hover:bg-orange-100 border border-orange-200/60 rounded-[12px] text-orange-700 text-[12px] font-extrabold transition-all active:scale-[0.98]"
              >
                +3 Gün
              </button>
              <button
                type="button"
                onClick={() => handleQuickPostpone(7)}
                className="py-2.5 px-2 bg-orange-50 hover:bg-orange-100 border border-orange-200/60 rounded-[12px] text-orange-700 text-[12px] font-extrabold transition-all active:scale-[0.98]"
              >
                +1 Hafta
              </button>
              <button
                type="button"
                onClick={() => handleQuickPostpone(14)}
                className="py-2.5 px-2 bg-orange-50 hover:bg-orange-100 border border-orange-200/60 rounded-[12px] text-orange-700 text-[12px] font-extrabold transition-all active:scale-[0.98]"
              >
                +2 Hafta
              </button>
              <button
                type="button"
                onClick={() => handleMonthsPostpone(1)}
                className="py-2.5 px-2 bg-orange-50 hover:bg-orange-100 border border-orange-200/60 rounded-[12px] text-orange-700 text-[12px] font-extrabold transition-all active:scale-[0.98]"
              >
                +1 Ay
              </button>
            </div>
          </div>

          <div className="h-px bg-border-main/50 w-full" />

          {/* Date Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">
              Yeni Plan Tarihi
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-base py-3 w-full"
              />
            </div>
          </div>

          {/* Note Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider">
              Erteleme Notu (Opsiyonel)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Örn: Randevu sonraki haftaya alındı"
              className="input-base py-3 w-full text-[14px]"
            />
          </div>

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
            className="flex-1 py-3.5 px-4 rounded-[16px] text-[15px] font-extrabold text-white bg-orange-600 hover:bg-orange-700 shadow-[0_4px_20px_-2px_rgba(234,88,12,0.3)] transition-all active:scale-[0.98]"
          >
            Tarihi Güncelle
          </button>
        </div>

      </div>
    </Modal>
  );
}

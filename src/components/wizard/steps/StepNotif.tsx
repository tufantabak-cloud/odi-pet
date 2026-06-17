'use client';

import React from 'react';
import { CategoryKey, categoryThemes } from '@/lib/categoryThemes';
import { Bell, BellOff } from 'lucide-react';

interface StepNotifProps {
  category: CategoryKey;
  value: { notify: boolean; note: string };
  onChange: (val: { notify: boolean; note: string }) => void;
}

export function StepNotif({ category, value, onChange }: StepNotifProps) {
  const theme = categoryThemes[category];

  return (
    <div className="space-y-6">
      {/* Notification Toggle */}
      <button
        onClick={() => onChange({ ...value, notify: !value.notify })}
        className={`
          w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300
          ${value.notify 
            ? 'border-transparent shadow-md' 
            : 'border-slate-200 bg-white hover:bg-slate-50'
          }
        `}
      >
        {value.notify && (
          <div 
            className={`absolute inset-0 rounded-2xl border-2 pointer-events-none border-current`}
            style={{ borderColor: theme.progressColor }}
          />
        )}
        {value.notify && (
          <div 
            className={`absolute inset-0 rounded-2xl opacity-10 pointer-events-none bg-gradient-to-br ${theme.gradient}`} 
          />
        )}
        
        <div className="flex items-center gap-4 z-10 relative">
          <div 
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-inner`}
            style={{ 
              backgroundColor: value.notify ? theme.progressColor : '#F1F5F9',
              color: value.notify ? 'white' : '#64748B'
            }}
          >
            {value.notify ? <Bell className="w-6 h-6" /> : <BellOff className="w-6 h-6" />}
          </div>
          <div className="text-left">
            <div className={`font-bold text-[16px] ${value.notify ? 'text-slate-900' : 'text-slate-700'}`}>
              Hatırlatıcı Bildirimi
            </div>
            <div className={`text-[13px] mt-0.5 ${value.notify ? 'text-slate-600' : 'text-slate-500'}`}>
              Zamanı geldiğinde anımsat
            </div>
          </div>
        </div>

        {/* Toggle switch visual */}
        <div className="z-10 relative">
          <div className={`w-12 h-7 rounded-full p-1 transition-colors ${value.notify ? '' : 'bg-slate-200'}`}
               style={{ backgroundColor: value.notify ? theme.progressColor : undefined }}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${value.notify ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </div>
      </button>

      {/* Note Input */}
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-semibold text-slate-700 ml-1">Özel Notunuz (İsteğe Bağlı)</label>
        <textarea
          value={value.note}
          onChange={(e) => onChange({ ...value, note: e.target.value })}
          placeholder="Örn: Aç karnına verilecek..."
          rows={3}
          className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-[16px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 transition-colors shadow-sm resize-none"
          style={{ 
            borderColor: value.note.length > 0 ? theme.progressColor : undefined 
          }}
        />
      </div>
    </div>
  );
}

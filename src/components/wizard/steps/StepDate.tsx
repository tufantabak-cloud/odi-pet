'use client';

import React from 'react';
import { CategoryKey, categoryThemes } from '@/lib/categoryThemes';

interface StepDateProps {
  category: CategoryKey;
  value: { date: string; time?: string };
  onChange: (val: { date: string; time?: string }) => void;
  showTime?: boolean;
}

export function StepDate({ category, value, onChange, showTime = false }: StepDateProps) {
  const theme = categoryThemes[category];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <label className="text-[14px] font-semibold text-slate-700 ml-1">Tarih</label>
        <input
          type="date"
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
          className="w-full px-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl text-[16px] text-slate-800 focus:outline-none focus:ring-0 transition-colors shadow-sm"
          style={{ borderColor: value.date ? theme.progressColor : undefined }}
        />
      </div>

      {showTime && (
        <div className="flex flex-col gap-2">
          <label className="text-[14px] font-semibold text-slate-700 ml-1">Saat</label>
          <input
            type="time"
            value={value.time || ''}
            onChange={(e) => onChange({ ...value, time: e.target.value })}
            className="w-full px-4 py-3.5 bg-white border-2 border-slate-200 rounded-2xl text-[16px] text-slate-800 focus:outline-none focus:ring-0 transition-colors shadow-sm"
            style={{ borderColor: value.time ? theme.progressColor : undefined }}
          />
        </div>
      )}
    </div>
  );
}

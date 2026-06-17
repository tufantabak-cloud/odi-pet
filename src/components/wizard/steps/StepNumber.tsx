'use client';

import React from 'react';
import { CategoryKey, categoryThemes } from '@/lib/categoryThemes';
import { Minus, Plus } from 'lucide-react';

interface StepNumberProps {
  category: CategoryKey;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

export function StepNumber({ category, value, onChange, min = 1, max = 99, unit = '' }: StepNumberProps) {
  const theme = categoryThemes[category];

  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <div className="flex items-center justify-center gap-6 py-6">
      <button
        onClick={handleDecrement}
        disabled={value <= min}
        className="w-14 h-14 rounded-full flex items-center justify-center bg-white border-2 border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
      >
        <Minus className="w-6 h-6" />
      </button>

      <div className="flex flex-col items-center justify-center min-w-[100px]">
        <div 
          className="text-5xl font-bold tracking-tight"
          style={{ color: theme.progressColor }}
        >
          {value}
        </div>
        {unit && (
          <div className="text-slate-500 font-medium mt-1">
            {unit}
          </div>
        )}
      </div>

      <button
        onClick={handleIncrement}
        disabled={value >= max}
        className="w-14 h-14 rounded-full flex items-center justify-center bg-white border-2 border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

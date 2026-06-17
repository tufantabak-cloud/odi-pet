'use client';

import React from 'react';
import { CategoryKey, categoryThemes } from '@/lib/categoryThemes';

interface StepTextProps {
  category: CategoryKey;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
}

export function StepText({ category, value, onChange, placeholder, multiline = false }: StepTextProps) {
  const theme = categoryThemes[category];

  return (
    <div className="w-full">
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-[16px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 transition-colors shadow-sm resize-none"
          style={{ 
            borderColor: value.length > 0 ? theme.progressColor : undefined 
          }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-[16px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 transition-colors shadow-sm"
          style={{ 
            borderColor: value.length > 0 ? theme.progressColor : undefined 
          }}
        />
      )}
    </div>
  );
}

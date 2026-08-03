'use client';

import React from 'react';
import { CategoryKey, categoryThemes } from '@/lib/categoryThemes';

export interface ChipItem {
  id: string;
  label: string;
}

interface StepChipProps {
  category: CategoryKey;
  chips: ChipItem[];
  value: string;
  onChange: (val: string) => void;
  allowMultiple?: boolean;
}

export function StepChip({ category, chips, value, onChange }: StepChipProps) {
  const theme = categoryThemes[category];

  return (
    <div className="flex flex-wrap gap-3">
      {chips.map((chip) => {
        const isSelected = value === chip.id;
        return (
          <button
            key={chip.id}
            onClick={() => onChange(chip.id)}
            className={`
              px-5 py-3 rounded-full font-semibold text-base transition-all duration-200 border-2
              ${isSelected 
                ? 'text-white border-transparent shadow-md transform scale-105' 
                : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
              }
            `}
            style={{
              backgroundColor: isSelected ? theme.progressColor : undefined,
            }}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}

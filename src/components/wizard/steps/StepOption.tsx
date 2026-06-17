'use client';

import React from 'react';
import { CategoryKey, categoryThemes } from '@/lib/categoryThemes';
import { PetIcons } from '@/components/icons/PetIcons';

export interface OptionItem {
  id: string;
  label: string;
  description?: string;
  subIconKey?: string;
}

interface StepOptionProps {
  category: CategoryKey;
  options: OptionItem[];
  value: string;
  onChange: (val: string) => void;
}

export function StepOption({ category, options, value, onChange }: StepOptionProps) {
  const theme = categoryThemes[category];
  const CategoryIcon = PetIcons[category].icon;
  const subIcons = PetIcons[category].subIcons;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {options.map((opt) => {
        const isSelected = value === opt.id;
        
        // Render subIcon if it exists and is defined in PetIcons[category].subIcons, 
        // otherwise fallback to the main CategoryIcon
        const SubIconComp = (opt.subIconKey && subIcons[opt.subIconKey]) 
          ? subIcons[opt.subIconKey] 
          : CategoryIcon;

        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`
              relative flex items-center p-4 rounded-2xl border-2 text-left transition-all duration-200
              ${isSelected 
                ? 'border-transparent shadow-md' 
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 shadow-sm'
              }
            `}
          >
            {/* Selected Border Gradient */}
            {isSelected && (
              <div 
                className={`absolute inset-0 rounded-2xl opacity-10 bg-gradient-to-br ${theme.gradient}`} 
              />
            )}
            {isSelected && (
              <div 
                className={`absolute inset-0 rounded-2xl border-2 pointer-events-none border-current`}
                style={{ borderColor: theme.progressColor }}
              />
            )}

            {/* Icon */}
            <div 
              className="w-14 h-14 shrink-0 flex items-center justify-center rounded-full mr-4 transition-transform duration-300 shadow-inner z-10"
              style={{ backgroundColor: theme.bgLight, transform: isSelected ? 'scale(1.1)' : 'scale(1)' }}
            >
              <SubIconComp size={28} />
            </div>

            {/* Text */}
            <div className="flex-1 z-10">
              <div className={`font-semibold text-[16px] ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                {opt.label}
              </div>
              {opt.description && (
                <div className={`text-[13px] mt-0.5 ${isSelected ? 'text-slate-600' : 'text-slate-500'}`}>
                  {opt.description}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

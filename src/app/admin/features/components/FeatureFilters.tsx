'use client';

import React from 'react';
import { Filter } from 'lucide-react';

export function FeatureFilters() {
  const filters = [
    { label: 'Has Limits', active: false },
    { label: 'No Limits', active: false },
    { label: 'Beta', active: true },
    { label: 'Deprecated', active: false },
    { label: 'Recently Synced', active: false },
    { label: 'Recently Updated', active: false },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar p-1">
      {filters.map(f => (
        <button
          key={f.label}
          className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            f.active 
              ? 'bg-purple-100 text-purple-700 border border-purple-200 shadow-sm' 
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getVaccineCatalog, VaccineCatalogItem } from '@/lib/tasks/vaccineCatalog';

export type VaccineOption = VaccineCatalogItem;

interface VaccineSelectorSheetProps {
  /** 'dog' | 'cat' | null — null means unknown/show all */
  species: string | null;
  selectedVaccineCode: string | null;
  onSelect: (vaccine: VaccineOption) => void;
  onBack: () => void;
}

const GROUP_LABEL: Record<string, string> = {
  core: 'Temel Aşılar',
  optional: 'Ek Aşılar (Risk Durumuna Göre)',
};

const GROUP_COLOR: Record<string, string> = {
  core: 'bg-blue-100 text-blue-600',
  optional: 'bg-slate-100 text-slate-500',
};

export default function VaccineSelectorSheet({
  species,
  selectedVaccineCode,
  onSelect,
  onBack,
}: VaccineSelectorSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Get vaccines from static catalog — no DB call
  const vaccines = useMemo(() => getVaccineCatalog(species), [species]);

  // Auto-focus search after mount
  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const filtered = vaccines.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.nameTr.toLowerCase().includes(q) ||
      v.code.toLowerCase().includes(q)
    );
  });

  // Group by core/optional
  const groups: { level: string; items: VaccineCatalogItem[] }[] = [
    { level: 'core', items: filtered.filter((v) => v.group === 'core') },
    { level: 'optional', items: filtered.filter((v) => v.group === 'optional') },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="animate-fadeInUp mt-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-main text-text-secondary hover:text-primary transition-colors shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <p className="text-[12px] font-black text-text-secondary uppercase tracking-wider">
            Aşı Seçin
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">
            {(species?.toLowerCase() === 'dog' || species?.toLowerCase() === 'köpek') ? '🐶 Köpek aşıları' : (species?.toLowerCase() === 'cat' || species?.toLowerCase() === 'kedi') ? '🐱 Kedi aşıları' : 'Tüm aşılar'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50"
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={searchRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Aşı adıyla ara..."
          className="input-base py-2.5 pl-9 text-[13px] w-full"
        />
      </div>

      {/* List */}
      <div className="max-h-[42vh] overflow-y-auto -mx-1 px-1 scrollbar-none flex flex-col gap-4">
        {filtered.length === 0 ? (
          <p className="text-center text-[13px] text-text-secondary py-8">
            &quot;{searchQuery}&quot; ile eşleşen aşı yok.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.level} className="flex flex-col gap-1.5">
              {/* Group label */}
              <p className="text-[10px] font-black text-text-secondary/60 uppercase tracking-widest px-1">
                {GROUP_LABEL[group.level] || group.level}
              </p>
              {group.items.map((vaccine) => {
                const isSelected = selectedVaccineCode === vaccine.code;
                return (
                  <button
                    key={vaccine.code}
                    type="button"
                    onClick={() => onSelect(vaccine)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border-main bg-white hover:border-primary/40 hover:bg-bg-main'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Check indicator */}
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected ? 'border-primary bg-primary' : 'border-border-main'
                        }`}
                      >
                        {isSelected && (
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                            <polyline points="2,5 4,7 8,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className={`text-[13px] font-bold block truncate ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                          {vaccine.name}
                        </span>
                        <span className="text-[11px] text-text-secondary block truncate">
                          {vaccine.nameTr}
                        </span>
                      </div>
                    </div>
                    {vaccine.group === 'core' && (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ml-2 ${GROUP_COLOR[vaccine.group]}`}>
                        Temel
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

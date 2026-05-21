import React from 'react';
import { TaskCategory, getFilteredSubCategories } from '@/lib/tasks/taskDefaults';

interface SubCategoryChipsProps {
  category: TaskCategory;
  petSpecies: string | null;
  selectedSubCategory: string | null;
  onSelect: (subCategoryId: string) => void;
  customText?: string;
  onCustomTextChange?: (text: string) => void;
}

export default function SubCategoryChips({
  category,
  petSpecies,
  selectedSubCategory,
  onSelect,
  customText,
  onCustomTextChange,
}: SubCategoryChipsProps) {
  const subs = getFilteredSubCategories(category, petSpecies);

  if (category === 'Diger') {
    return (
      <div className="animate-fadeInUp mt-4">
        <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider mb-2 block">
          Görev Adı
        </label>
        <input
          type="text"
          value={customText || ''}
          onChange={(e) => {
            if (onCustomTextChange) onCustomTextChange(e.target.value);
            onSelect('Diğer'); // Keep 'Diğer' as the selected sub-category id conceptually
          }}
          placeholder="Örn: Kuaför ziyareti..."
          className="input-base py-3 text-[14px] w-full"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="animate-fadeInUp mt-4">
      <label className="text-[12px] font-black text-text-secondary uppercase tracking-wider mb-2 block">
        Alt Kategori Seçin
      </label>
      <div className="flex flex-wrap gap-2">
        {subs.map((sub) => (
          <button
            key={sub.id}
            type="button"
            onClick={() => onSelect(sub.id)}
            className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all border cursor-pointer ${
              selectedSubCategory === sub.id
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-primary-soft text-primary border-primary/20 hover:border-primary/40 hover:bg-primary-soft/80'
            }`}
          >
            {sub.label}
          </button>
        ))}
      </div>
    </div>
  );
}

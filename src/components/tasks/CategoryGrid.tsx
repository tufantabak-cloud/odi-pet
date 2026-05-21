import React from 'react';
import { TASK_CATEGORIES, TaskCategory } from '@/lib/tasks/taskDefaults';
import {
  ShampooIcon,
  ScoopIcon,
  BoneIcon,
  VaccineIcon,
  CarrierIcon,
  BowlIcon,
  HouseIcon,
  FirstAidIcon
} from '@/components/icons/PetIcons';

interface CategoryGridProps {
  selectedCategory: TaskCategory | null;
  onSelect: (category: TaskCategory) => void;
}

function getPetThemedIcon(categoryId: TaskCategory, isSelected: boolean) {
  switch (categoryId) {
    case 'Bakım':
      return <ShampooIcon isSelected={isSelected} />;
    case 'Hijyen':
      return <ScoopIcon isSelected={isSelected} />;
    case 'Aktiviteler':
      return <BoneIcon isSelected={isSelected} />;
    case 'Medikal':
      return <VaccineIcon isSelected={isSelected} />;
    case 'Veteriner':
      return <CarrierIcon isSelected={isSelected} />;
    case 'Beslenme':
      return <BowlIcon isSelected={isSelected} />;
    case 'Saglik':
      return <FirstAidIcon isSelected={isSelected} />;
    case 'Diger':
    default:
      return <HouseIcon isSelected={isSelected} />;
  }
}

export default function CategoryGrid({ selectedCategory, onSelect }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 animate-fadeInUp">
      {TASK_CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer group ${
              isSelected
                ? 'border-primary bg-primary-soft/20 scale-[1.02] shadow-sm'
                : 'border-border-main bg-white hover:border-primary/45 hover:bg-bg-main'
            }`}
          >
            <div className="mb-2 h-[36px] flex items-center justify-center">
              {getPetThemedIcon(cat.id, isSelected)}
            </div>
            <span className={`text-[11px] font-bold text-center leading-tight transition-colors duration-200 ${isSelected ? 'text-primary' : 'text-text-secondary group-hover:text-primary'}`}>
              {cat.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

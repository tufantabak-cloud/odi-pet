'use client';
import React, { useRef, useState } from 'react';
import { FlowEvent } from './types';
import { ActionSheet } from './ActionSheet';
import { PetIcons } from '@/components/icons/PetIcons';
import { CategoryKey } from '@/lib/categoryThemes';

interface CategoryCardProps {
  event: FlowEvent;
  categoryKey: CategoryKey;
  onMarkDone: (id: string) => void;
  onPostpone: (id: string) => void;
  onEdit: (event: FlowEvent) => void;
  onDelete: (id: string) => void;
}

/** UI kategori etiketini (DB_CATEGORY_TO_UI çıktısı) CategoryKey'e çevirir */
export function toCategoryKey(uiCategory: string): CategoryKey {
  const map: Record<string, CategoryKey> = {
    Saglik: 'saglik',
    Kontrol: 'kontrol',
    Asi: 'asi',
    Parazit: 'parazit',
    'Bakım': 'bakim',
    Beslenme: 'beslenme',
    Hijyen: 'hijyen',
    Aktivite: 'aktivite',
  };
  return map[uiCategory] ?? 'saglik';
}

/** Sabit boyutlu akış kartı — mockup kurallarına göre: ikon + isim + tarih, sağ üstte tik rozeti */
export function CategoryCard({ event, categoryKey, onMarkDone, onPostpone, onEdit, onDelete }: CategoryCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { computedStatus } = event;

  const targetDate = new Date(event.scheduled_at);
  const month = targetDate.toLocaleDateString('tr-TR', { month: 'short' });
  const day = targetDate.getDate();
  const formattedMonth = month.charAt(0).toUpperCase() + month.slice(1);

  const isYearly = (event.pet_care_tasks?.frequency_days || 0) >= 365;

  const TIME_RELEVANT_CATEGORIES = ['Veteriner', 'Saglik'];
  const TIME_RELEVANT_SUB_CATEGORIES = ['İlaç Kullanımı', 'Tedavi & Pansuman'];
  const category = event.pet_care_tasks?.category ?? '';
  const subCategory = event.sub_category ?? '';
  const isTimeRelevant =
    TIME_RELEVANT_CATEGORIES.includes(category) ||
    TIME_RELEVANT_SUB_CATEGORIES.includes(subCategory);

  const hasSpecificTime =
    isTimeRelevant &&
    event.scheduled_at.includes('T') &&
    !event.scheduled_at.includes('T12:00:00') &&
    !event.scheduled_at.includes('T00:00:00');

  let dateText = `${day} ${formattedMonth}`;
  if (isYearly) {
    dateText = `${day} ${formattedMonth} ${targetDate.getFullYear()}`;
  } else if (hasSpecificTime) {
    const timeStr = event.scheduled_at.split('T')[1].slice(0, 5);
    dateText = `${day} ${formattedMonth}, ${timeStr}`;
  }

  let cardClasses = '';
  let iconBadgeClasses = 'bg-white/20';
  let dateClasses = 'opacity-80';
  switch (computedStatus) {
    case 'done':
      cardClasses = 'bg-gradient-to-br from-[#3ecf95] to-[#20a06f] text-white';
      break;
    case 'missed':
      cardClasses = 'bg-gradient-to-br from-[#f3897d] to-[#dd5f54] text-white';
      break;
    case 'today':
      cardClasses = 'bg-gradient-to-br from-[#5b86ff] to-[#3f68e8] text-white shadow-md shadow-blue-500/20';
      break;
    case 'upcoming':
      cardClasses = 'bg-gradient-to-br from-[#a9c3ff] to-[#7fa0f2] text-white';
      break;
    case 'future':
    default:
      cardClasses = 'bg-[#eef1f6] text-[#556174] border border-[#dfe4ec]';
      iconBadgeClasses = 'bg-[#556174]/10';
      dateClasses = 'text-[#8891a1]';
      break;
  }

  const icon = PetIcons[categoryKey]?.icon;

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        data-status={computedStatus}
        className={`
          flex flex-col items-start text-left overflow-hidden
          rounded-2xl transition-all duration-200
          w-[100px] h-[100px] p-2.5
          ${cardClasses}
          hover:scale-[1.05] active:scale-95
        `}
      >
        <div className={`w-5 h-5 shrink-0 rounded-md flex items-center justify-center overflow-hidden mb-1.5 ${iconBadgeClasses}`}>
          {icon ? icon({ size: 14 }) : null}
        </div>

        <span className="w-full text-[11px] font-extrabold leading-[13px] h-[26px] line-clamp-2 overflow-hidden">
          {event.pet_care_tasks?.title || event.title || 'Görev'}
        </span>

        <span className={`text-[9px] font-semibold mt-auto ${dateClasses}`}>
          {dateText}
        </span>

        {computedStatus === 'done' && (
          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white/25 flex items-center justify-center">
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        )}
      </button>

      {showMenu && (
        <ActionSheet
          event={event}
          anchorRef={containerRef}
          onClose={() => setShowMenu(false)}
          onMarkDone={onMarkDone}
          onPostpone={onPostpone}
          onEdit={(e) => onEdit(e as FlowEvent)}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

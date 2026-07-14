'use client';
import React, { useState, useRef } from 'react';
import { ComputedEvent } from './types';
import { ActionSheet } from './ActionSheet';

interface ChipItemProps {
  event: ComputedEvent;
  onMarkDone: (id: string) => void;
  onPostpone: (id: string) => void;
  onEdit: (event: ComputedEvent) => void;
  onDelete: (id: string) => void;
}

/** Türkçe durum etiketi */
function statusLabel(s: string): string {
  switch (s) {
    case 'done': return 'yapıldı';
    case 'missed': return 'kaçırıldı';
    case 'upcoming': return 'yaklaşıyor';
    case 'today': return 'bugün';
    case 'future': return 'planlandı';
    default: return s;
  }
}

export function ChipItem({ event, onMarkDone, onPostpone, onEdit, onDelete }: ChipItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { computedStatus } = event;

  const targetDate = new Date(event.scheduled_at);

  // Tarih formatı
  const month = targetDate.toLocaleDateString('tr-TR', { month: 'short' });
  const day = targetDate.getDate();
  const formattedMonth = month.charAt(0).toUpperCase() + month.slice(1);
  const dateStr = `${formattedMonth} ${day}`;

  const isYearly = (event.pet_care_tasks?.frequency_days || 0) >= 365;

  // Saat yalnızca anlamlı olduğu kategorilerde gösterilir
  const TIME_RELEVANT_CATEGORIES = ['Veteriner', 'Saglik']; // Veteriner randevusu, İlaç
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

  let topText = dateStr;
  let bottomText: string | null = null; // Bütünlüğü korumak için durum/alt etiketleri gösterilmeyecek

  if (isYearly) {
    topText = `${day} ${formattedMonth} ${targetDate.getFullYear()}`;
  } else if (hasSpecificTime) {
    const timeStr = event.scheduled_at.split('T')[1].slice(0, 5);
    topText = `${day} ${formattedMonth} ${timeStr}`;
  } else {
    topText = `${day} ${formattedMonth}`;
  }

  if (computedStatus === 'done') {
    topText += ' ✓';
  }

  // Durum bazlı stiller — referans mockup'a birebir uyumlu
  let chipClasses = '';
  let labelClasses = '';

  switch (computedStatus) {
    case 'done':
      chipClasses = 'bg-[#2ca67a] text-white border-transparent';
      labelClasses = 'text-white/90 font-medium';
      break;
    case 'missed':
      chipClasses = 'bg-[#e25353] text-white border-transparent';
      labelClasses = 'text-white/90 font-medium';
      break;
    case 'today':
      chipClasses = 'bg-[#fdf8ed] text-[#b47120] border border-[#d49944] shadow-sm';
      labelClasses = 'text-[#b47120] font-medium';
      break;
    case 'upcoming':
      chipClasses = 'bg-[#eff6ff] text-[#3b82f6] border border-[#93c5fd] shadow-sm';
      labelClasses = 'text-[#60a5fa] font-medium';
      break;
    case 'future':
    default:
      chipClasses = 'bg-[#fcfcfc] text-[#6b7280] border border-[#e5e7eb]';
      labelClasses = 'text-[#9ca3af] font-medium';
      break;
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        data-status={computedStatus}
        className={`
          flex flex-col items-center justify-center
          rounded-xl transition-all duration-200
          px-3 py-2 min-w-[76px] h-[52px]
          ${chipClasses}
          hover:scale-105 active:scale-95
        `}
      >
        <span className="absolute top-1 right-1.5 opacity-40 text-[10px] tracking-tighter">···</span>
        
        {/* Üst satır: Tarih */}
        <span className="text-[13px] font-bold leading-tight text-center relative z-10">
          {topText}
        </span>
        {/* Alt satır: Durum etiketi */}
        {bottomText && (
          <span className={`text-[11px] mt-0.5 leading-tight text-center whitespace-pre-line relative z-10 ${labelClasses}`}>
            {bottomText}
            {(computedStatus === 'today' || computedStatus === 'missed') && (
              <span className="block text-[9.5px] opacity-80 mt-0.5">Tamamla →</span>
            )}
          </span>
        )}
      </button>

      {showMenu && (
        <ActionSheet
          event={event}
          anchorRef={containerRef}
          onClose={() => setShowMenu(false)}
          onMarkDone={onMarkDone}
          onPostpone={onPostpone}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

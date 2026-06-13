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
  const dateStr = targetDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

  // Durum bazlı stiller — referans mockup'a birebir uyumlu
  let chipClasses = '';
  let labelClasses = '';

  switch (computedStatus) {
    case 'done':
      chipClasses = 'bg-emerald-500 text-white border-transparent';
      labelClasses = 'text-white/90';
      break;
    case 'missed':
      chipClasses = 'bg-red-400 text-white border-transparent';
      labelClasses = 'text-white/90';
      break;
    case 'today':
      chipClasses = 'bg-white text-blue-600 border-2 border-blue-500 shadow-sm';
      labelClasses = 'text-blue-500';
      break;
    case 'upcoming':
      chipClasses = 'bg-white text-teal-600 border border-teal-400';
      labelClasses = 'text-teal-500';
      break;
    case 'future':
    default:
      chipClasses = 'bg-gray-100 text-gray-500 border border-gray-200';
      labelClasses = 'text-gray-400';
      break;
  }

  const isToday = computedStatus === 'today';

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`
          flex flex-col items-center justify-center
          rounded-2xl transition-all duration-200
          ${isToday ? 'px-5 py-3 min-w-[90px]' : 'px-4 py-2.5 min-w-[76px]'}
          ${chipClasses}
          hover:scale-105 active:scale-95
        `}
      >
        {/* Üst satır: Tarih (+ done ise ✓) */}
        <span className={`text-[13px] font-bold leading-tight ${isToday ? 'text-[14px]' : ''}`}>
          {computedStatus === 'done' && '✓ '}{dateStr}
        </span>
        {/* Alt satır: Durum etiketi */}
        <span className={`text-[10px] font-semibold mt-0.5 ${labelClasses}`}>
          {statusLabel(computedStatus)}
        </span>
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

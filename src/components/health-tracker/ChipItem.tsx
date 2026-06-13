import React, { useState, useRef, useEffect } from 'react';
import { ComputedEvent } from './types';
import { ActionSheet } from './ActionSheet';

interface ChipItemProps {
  event: ComputedEvent;
  onMarkDone: (id: string) => void;
  onPostpone: (id: string) => void;
  onEdit: (event: ComputedEvent) => void;
  onDelete: (id: string) => void;
}

export function ChipItem({ event, onMarkDone, onPostpone, onEdit, onDelete }: ChipItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { computedStatus } = event;
  
  let statusColor = 'bg-bg-main text-text-secondary border-border-main'; // future
  if (computedStatus === 'done') {
    statusColor = 'bg-success text-white border-transparent';
  } else if (computedStatus === 'missed') {
    statusColor = 'bg-error text-white border-transparent';
  } else if (computedStatus === 'warning') {
    statusColor = 'bg-warning text-text-primary border-transparent';
  } else if (computedStatus === 'upcoming') {
    statusColor = 'bg-primary-soft text-primary border-primary/20';
  }

  const targetDate = new Date(event.scheduled_at);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[13px] font-bold transition-colors ${statusColor} hover:opacity-90`}
      >
        <span className="truncate max-w-[140px]">
          {event.pet_care_tasks?.title || event.notes || 'Bilinmeyen Görev'}
        </span>
        <span className="text-[11px] font-semibold opacity-80 shrink-0">
          {targetDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
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

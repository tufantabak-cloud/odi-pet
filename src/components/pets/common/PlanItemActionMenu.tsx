'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Calendar, Edit3, Archive, Trash2 } from 'lucide-react';

export interface PlanItemActionMenuProps {
  itemId: string;
  itemTitle: string;
  itemType?: 'vaccine' | 'parasite' | 'medication' | 'allergy' | 'appointment' | 'expense' | 'routine' | 'health';
  currentDate?: string;
  isHealthRecord?: boolean; // If true, displays Archive instead of Hard Delete
  onMarkDone?: () => void;
  onPostpone?: () => void;
  onEdit?: () => void;
  onArchiveOrDelete?: () => void;
  disabled?: boolean;
  className?: string;
}

export function PlanItemActionMenu({
  isHealthRecord = true,
  onMarkDone,
  onPostpone,
  onEdit,
  onArchiveOrDelete,
  disabled = false,
  className = '',
}: PlanItemActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (disabled) return null;

  return (
    <div ref={menuRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className="w-8 h-8 rounded-xl bg-slate-100/70 hover:bg-slate-200/80 active:scale-[0.98] transition-all flex items-center justify-center text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[32px] min-w-[32px]"
        aria-label="İşlem Menüsü"
        title="İşlemler"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-[20px] bg-white/95 backdrop-blur-xl border border-slate-100 shadow-xl z-30 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
          {onMarkDone && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onMarkDone();
              }}
              className="w-full min-h-[40px] px-3 py-2 rounded-xl text-[13px] font-semibold text-text-primary hover:bg-slate-100 transition-colors flex items-center gap-2.5 active:scale-[0.98] text-left"
            >
              <span className="w-4 h-4 text-emerald-600 flex items-center justify-center font-bold">✓</span>
              <span>Tamamlandı</span>
            </button>
          )}

          {onPostpone && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onPostpone();
              }}
              className="w-full min-h-[40px] px-3 py-2 rounded-xl text-[13px] font-semibold text-text-primary hover:bg-slate-100 transition-colors flex items-center gap-2.5 active:scale-[0.98] text-left"
            >
              <span className="w-4 h-4 text-text-primary flex items-center justify-center">📅</span>
              <span>Ertele</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onEdit();
              }}
              className="w-full min-h-[40px] px-3 py-2 rounded-xl text-[13px] font-semibold text-text-primary hover:bg-slate-100 transition-colors flex items-center gap-2.5 active:scale-[0.98] text-left"
            >
              <Edit3 className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Düzenle</span>
            </button>
          )}

          {onArchiveOrDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onArchiveOrDelete();
              }}
              className="w-full min-h-[40px] px-3 py-2 rounded-xl text-[13px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2.5 active:scale-[0.98] text-left"
            >
              {isHealthRecord ? (
                <>
                  <Archive className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Arşivle</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Sil</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

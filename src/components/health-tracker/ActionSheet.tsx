import React, { useEffect, useRef } from 'react';
import { ComputedEvent } from './types';

interface ActionSheetProps {
  event: ComputedEvent;
  onClose: () => void;
  onMarkDone: (id: string) => void;
  onPostpone: (id: string) => void;
  onEdit: (event: ComputedEvent) => void;
  onDelete: (id: string) => void;
}

export function ActionSheet({ event, onClose, onMarkDone, onPostpone, onEdit, onDelete }: ActionSheetProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-border-main/50 rounded-xl shadow-lg z-50 overflow-hidden text-sm" ref={menuRef}>
      <button 
        onClick={(e) => { e.stopPropagation(); onMarkDone(event.id); onClose(); }}
        className="w-full text-left px-4 py-3 hover:bg-bg-main text-text-primary transition-colors font-medium border-b border-border-main/30"
      >
        ✓ Tamamlandı
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onPostpone(event.id); onClose(); }}
        className="w-full text-left px-4 py-3 hover:bg-bg-main text-text-primary transition-colors font-medium border-b border-border-main/30"
      >
        📅 1 Gün Ertele
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onEdit(event); onClose(); }}
        className="w-full text-left px-4 py-3 hover:bg-bg-main text-primary transition-colors font-medium border-b border-border-main/30"
      >
        ✏️ Düzenle
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(event.id); onClose(); }}
        className="w-full text-left px-4 py-3 hover:bg-error/5 text-error transition-colors font-medium"
      >
        ❌ Sil
      </button>
    </div>
  );
}

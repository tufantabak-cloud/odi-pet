import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ComputedEvent } from './types';

interface ActionSheetProps {
  event: ComputedEvent;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onMarkDone: (id: string) => void;
  /** Tamamlanmış event'i geri alır (status → active) */
  onMarkUndone?: (id: string) => void;
  onPostpone: (id: string) => void;
  onEdit: (event: ComputedEvent) => void;
  onDelete: (id: string) => void;
}

export function ActionSheet({ event, anchorRef, onClose, onMarkDone, onMarkUndone, onPostpone, onEdit, onDelete }: ActionSheetProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    function updatePosition() {
      if (anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        // Position below the chip, aligned to the right edge of the chip if possible
        setCoords({
          top: rect.bottom + window.scrollY + 4, // 4px gap
          left: rect.right + window.scrollX - 192, // 192 is w-48
        });
      }
    }
    updatePosition();
    
    // We listen to resize or scroll just in case, but typically clicking outside closes it anyway
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [anchorRef]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        // Also check if click is inside the anchor, we don't want to immediately toggle back and forth
        if (anchorRef.current && anchorRef.current.contains(e.target as Node)) return;
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, anchorRef]);

  // Don't render until we have valid coordinates to prevent a flash at 0,0
  if (coords.top === 0) return null;

  // Sanal tekrar event'i: DB'de kaydı yok — tamamla/ertele/sil gösterilmez,
  // yalnızca ait olduğu tekrar planı düzenlenebilir.
  if (event._is_virtual) {
    return createPortal(
      <div
        ref={menuRef}
        className="absolute bg-white border border-border-main/50 rounded-xl shadow-xl z-[9999] overflow-hidden text-sm"
        style={{ top: coords.top, left: Math.max(8, coords.left), width: '192px' }}
      >
        <div className="px-4 py-2.5 text-[11px] font-semibold text-text-secondary bg-bg-main/60 border-b border-border-main/30">
          🔁 Tekrarlayan plan
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(event); onClose(); }}
          className="w-full text-left px-4 py-3 hover:bg-bg-main text-primary transition-colors font-medium border-b border-border-main/30"
        >
          ✏️ Tekrar Planını Düzenle
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-full text-left px-4 py-3 hover:bg-bg-main text-text-secondary transition-colors font-medium"
        >
          Kapat
        </button>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      ref={menuRef}
      className="absolute bg-white border border-border-main/50 rounded-xl shadow-xl z-[9999] overflow-hidden text-sm"
      style={{ top: coords.top, left: Math.max(8, coords.left), width: '192px' }}
    >
      {event.computedStatus === 'done' ? (
        onMarkUndone && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkUndone(event.id); onClose(); }}
            className="w-full text-left px-4 py-3 hover:bg-bg-main text-text-primary transition-colors font-medium border-b border-border-main/30"
          >
            ↩ Tamamlanmadı Yap
          </button>
        )
      ) : (
        <>
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
        </>
      )}
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
    </div>,
    document.body
  );
}

import React from 'react';

// OPOS v1.0 — bkz. docs/opos-design-system/09_glass-system.md (.glass-modal),
// 07_radius.md (OPModal Desktop → --radius-modal 28px), 08_elevation.md (--shadow-floating).
// 22_component-library.md matrix: "OPModal | Modal.tsx | rounded-[28px] bg-white/95 backdrop-blur-2xl"

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title?: string, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(15,23,42,0.60)] backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl border border-white/60 rounded-[28px] shadow-floating overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border-main flex justify-between items-center">
          {title && <h3 className="text-[16px] font-black text-text-primary">{title}</h3>}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-main text-text-secondary hover:text-text-primary transition-colors ml-auto"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

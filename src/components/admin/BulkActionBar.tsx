'use client'

import React from 'react'

interface BulkActionBarProps {
  selectedCount: number
  onClear: () => void
  onExport?: () => void
  onLabel?: () => void
  onDelete?: () => void
}

export default function BulkActionBar({
  selectedCount,
  onClear,
  onExport,
  onLabel,
  onDelete,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
      <div className="bg-white border border-border-main shadow-xl rounded-2xl p-2 pl-4 pr-2 flex items-center gap-4">
        
        {/* Count and Clear */}
        <div className="flex items-center gap-2 border-r border-border-main pr-4">
          <span className="flex items-center justify-center w-6 h-6 bg-primary text-white text-[12px] font-black rounded-full">
            {selectedCount}
          </span>
          <span className="text-[13px] font-bold text-text-primary mr-1">Öğe Seçildi</span>
          <button
            onClick={onClear}
            className="text-[12px] font-semibold text-text-secondary hover:text-primary transition-colors underline decoration-dotted underline-offset-2"
          >
            Temizle
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onExport && (
            <button
              onClick={onExport}
              className="px-3 py-2 bg-bg-main hover:bg-slate-100 border border-border-main rounded-xl text-[12px] font-bold text-text-primary transition-colors flex items-center gap-1.5"
            >
              ⬇️ Dışa Aktar
            </button>
          )}
          {onLabel && (
            <button
              onClick={onLabel}
              className="px-3 py-2 bg-bg-main hover:bg-slate-100 border border-border-main rounded-xl text-[12px] font-bold text-text-primary transition-colors flex items-center gap-1.5"
            >
              🏷️ Etiketle
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-2 bg-error/10 hover:bg-error/20 border border-error/20 rounded-xl text-[12px] font-bold text-error transition-colors flex items-center gap-1.5"
            >
              🗑️ Sil
            </button>
          )}
        </div>
        
      </div>
    </div>
  )
}

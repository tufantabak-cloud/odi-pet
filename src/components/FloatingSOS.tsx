'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function FloatingSOS() {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const modalContent = (
    <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:items-end"
      onClick={() => setOpen(false)}>
      <div className="w-full max-w-sm bg-surface rounded-[28px] p-7 shadow-2xl mb-0 sm:mb-20"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center text-error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h2 className="text-[18px] font-extrabold text-text-primary">Acil Yardım</h2>
            <p className="text-[13px] text-text-secondary">Hızlıca bağlantı kurun</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <a href="tel:+905325000000" className="flex items-center gap-4 p-4 bg-error/5 border border-error/20 rounded-[16px] hover:bg-error/10 transition-colors">
            <div className="w-10 h-10 bg-error rounded-full flex items-center justify-center text-white shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.62 5.05 2 2 0 0 1 3.6 2.87h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6 6l.88-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 18z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-text-primary text-[15px]">Acil Veteriner</p>
              <p className="text-[12px] text-text-secondary">7/24 Nöbet Hattı</p>
            </div>
          </a>

          <a href="tel:174" className="flex items-center gap-4 p-4 bg-warning/5 border border-warning/20 rounded-[16px] hover:bg-warning/10 transition-colors">
            <div className="w-10 h-10 bg-warning rounded-full flex items-center justify-center text-white shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.62 5.05 2 2 0 0 1 3.6 2.87h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6 6l.88-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 18z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-text-primary text-[15px]">Tarım & Orman Bakanlığı</p>
              <p className="text-[12px] text-text-secondary">Veteriner ALO 174</p>
            </div>
          </a>

          <button onClick={() => setOpen(false)} className="btn-secondary w-full mt-2">Kapat</button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* SOS Modal Rendered via Portal to avoid header stacking context issues */}
      {open && mounted && createPortal(modalContent, document.body)}

      {/* SOS Compact Button */}
      <button
        onClick={() => setOpen(true)}
        className="relative w-9 h-9 rounded-full bg-error flex items-center justify-center shadow-md focus:outline-none hover:bg-error/90 transition-colors"
        aria-label="Acil SOS"
      >
        {/* Pulse ring */}
        <span className="absolute inline-flex w-full h-full rounded-full bg-error opacity-50 animate-ping" />
        <span className="relative text-white text-[10px] font-black tracking-tight pt-[1px]">SOS</span>
      </button>
    </>
  )
}

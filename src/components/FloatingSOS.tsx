'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'next/navigation'

export default function FloatingSOS({
  petId,
  vetPhone,
  vetName,
  sosContacts,
}: {
  petId?: string | null
  vetPhone?: string | null
  vetName?: string | null
  sosContacts?: any[] | null
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [lostReport, setLostReport] = useState<any>(null)

  const params = useParams()
  const activePetId = (params?.id as string) || petId

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (open && activePetId) {
      fetch(`/api/pets/${activePetId}/lost`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data.report) setLostReport(data.report)
          else setLostReport(null)
        })
        .catch(console.error)
    }
  }, [open, activePetId])

  // Find active emergency phone number
  let activePhone = vetPhone || null
  let activeName = vetName ? `${vetName} (Veteriner)` : 'Acil Veteriner'
  let isConfigured = !!vetPhone

  if (!activePhone && sosContacts && Array.isArray(sosContacts)) {
    const primaryContact = sosContacts.find(c => c && c.phone && c.phone.trim() !== '')
    if (primaryContact) {
      activePhone = primaryContact.phone
      activeName = `${primaryContact.name || 'Acil Yakını'} (SOS Ağınız)`
      isConfigured = true
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:items-end"
      onClick={() => setOpen(false)}>
      <div className="w-full max-w-sm bg-surface rounded-[28px] p-7 shadow-2xl mb-0 sm:mb-20 animate-fade-in"
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

        {lostReport && (
          <div className="mb-5 p-4 bg-error/10 border border-error/20 rounded-2xl animate-fade-in">
            <h3 className="font-extrabold text-error flex items-center gap-2 mb-1">
              <span className="animate-pulse">🚨</span> KAYIP İLANI AKTİF
            </h3>
            <p className="text-[13px] text-error font-medium mb-1">
              <strong>Son Görülme:</strong> {lostReport.last_seen_location}
            </p>
            {lostReport.contact_phone && (
              <p className="text-[13px] text-error font-medium">
                <strong>İletişim:</strong> {lostReport.contact_phone}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {isConfigured ? (
            <a href={`tel:${activePhone}`} className="flex items-center gap-4 p-4 bg-error/5 border border-error/20 rounded-[16px] hover:bg-error/10 hover:border-error/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
              <div className="w-10 h-10 bg-error rounded-full flex items-center justify-center text-white shrink-0 shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.62 5.05 2 2 0 0 1 3.6 2.87h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6 6l.88-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 18z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-text-primary text-[15px] truncate">{activeName}</p>
                <p className="text-[12px] text-text-secondary">Hemen Ara • {activePhone}</p>
              </div>
            </a>
          ) : (
            <a 
              href={activePetId ? `/owner/pets/${activePetId}/edit` : '/owner/pets/add'} 
              onClick={() => setOpen(false)}
              className="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-[16px] hover:bg-primary/10 hover:border-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
            >
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-primary text-[15px]">Veterinerinizi Ekleyin</p>
                <p className="text-[12px] text-text-secondary leading-normal">Acil arama için numara tanımlayın ➜</p>
              </div>
            </a>
          )}

          <a href="tel:174" className="flex items-center gap-4 p-4 bg-warning/5 border border-warning/20 rounded-[16px] hover:bg-warning/10 hover:border-warning/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
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

          <button onClick={() => setOpen(false)} className="btn-secondary w-full mt-2 py-3 text-[14px]">Kapat</button>
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
        className="relative w-12 h-12 rounded-full bg-error flex items-center justify-center shadow-md focus:outline-none hover:bg-error/90 transition-all duration-300 hover:scale-105 active:scale-95"
        aria-label="Acil SOS"
      >
        {/* Pulse ring */}
        <span className="absolute inline-flex w-full h-full rounded-full bg-error opacity-50 animate-ping" />
        <span className="relative text-white text-[10px] font-black tracking-tight pt-[1px]">SOS</span>
      </button>
    </>
  )
}

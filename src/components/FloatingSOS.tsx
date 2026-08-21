'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useGeolocation } from '@/contexts/GeolocationContext'

const DynamicExperienceEngine = dynamic(
  () => import('@/components/orchestrator/DynamicExperienceEngine'),
  { ssr: false }
)

export default function FloatingSOS({
  petId,
  petName,
  vetPhone,
  vetName,
  sosContacts,
  fullWidth = false,
  onLostReport,
  onMarkFound,
}: {
  petId?: string | null
  petName?: string | null
  vetPhone?: string | null
  vetName?: string | null
  sosContacts?: any[] | null
  fullWidth?: boolean
  onLostReport?: () => void
  onMarkFound?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [lostReport, setLostReport] = useState<any>(null)
  const [locating, setLocating] = useState(false)
  const { requestLocation } = useGeolocation()

  // Orchestrator state
  const [orchestratorActive, setOrchestratorActive] = useState(false)
  const [orchestratorDone, setOrchestratorDone] = useState(false)

  const params = useParams()
  const activePetId = (params?.id as string) || petId

  useEffect(() => { setMounted(true) }, [])

  // When orchestrator finishes (submitted or dismissed), open SOS modal
  const handleOrchestratorDone = useCallback(() => {
    setOrchestratorActive(false)
    setOrchestratorDone(true)
    setOpen(true)
  }, [])

  // Main handler for the SOS button
  const handleSOSClick = useCallback(() => {
    // Always activate the orchestrator first.
    // If no campaign matches click_emergency_button, it renders nothing
    // and we immediately fall through to the SOS modal.
    setOrchestratorDone(false)
    setOrchestratorActive(true)
  }, [])

  useEffect(() => {
    if (open && activePetId) {
      fetch(`/api/pets/${activePetId}/lost`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => setLostReport(data.report || null))
        .catch(console.error)
    }
  }, [open, activePetId])

  // Phone → international format (TR)
  const toIntlPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('90')) return digits
    if (digits.startsWith('0')) return '90' + digits.slice(1)
    return '90' + digits
  }

  // WhatsApp mesaj metni
  const waMessage = (contactName: string) =>
    encodeURIComponent(
      `🆘 ACİL DURUM\n${petName ? `${petName} adlı evcil hayvanım için` : 'Evcil hayvanım için'} acil yardıma ihtiyacım var!\nLütfen en kısa sürede iletişime geçin.`
    )

  // Konum bazlı veteriner arama
  const handleFindVet = async () => {
    setLocating(true)
    const coords = await requestLocation()
    if (!coords) {
      window.open('https://maps.google.com/?q=veteriner', '_blank')
      setLocating(false)
      return
    }

    const { latitude, longitude } = coords
    window.open(
      `https://www.google.com/maps/search/veteriner/@${latitude},${longitude},15z`,
      '_blank'
    )
    setLocating(false)
  }

  const validContacts = (sosContacts ?? []).filter(c => c?.phone?.trim())

  const modalContent = (
    <div
      className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:items-end"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-sm bg-surface rounded-modal p-6 shadow-2xl mb-0 sm:mb-20 animate-fade-in flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Başlık */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-error/10 rounded-full flex items-center justify-center text-error shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h2 className="text-[17px] font-extrabold text-text-primary">Acil Yardım</h2>
            <p className="text-[12px] text-text-secondary">
              {petName ? `${petName} için acil destek` : 'Hızlıca bağlantı kurun'}
            </p>
          </div>
        </div>

        {/* Kayıp ilanı varsa göster */}
        {lostReport && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-md">
            <p className="font-extrabold text-error text-[13px] flex items-center gap-1.5 mb-1">
              <span className="animate-pulse">🚨</span> KAYIP İLANI AKTİF
            </p>
            <p className="text-[12px] text-error">{lostReport.last_seen_location}</p>
          </div>
        )}

        {/* SOS Kişileri — WhatsApp */}
        {validContacts.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest px-1">SOS Ağı — WhatsApp</p>
            {validContacts.map((c, i) => (
              <a
                key={i}
                href={`https://wa.me/${toIntlPhone(c.phone)}?text=${waMessage(c.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3.5 bg-[#25D366]/10 border border-[#25D366]/30 rounded-md hover:bg-[#25D366]/20 transition-all active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.852L.057 23.882l6.186-1.448A11.934 11.934 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.693-.5-5.24-1.375l-.374-.22-3.882.909.951-3.768-.242-.387A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text-primary text-[14px] truncate">{c.name || 'SOS Kişisi'}</p>
                  <p className="text-[11px] text-text-secondary">{c.relation ? `${c.relation} · ` : ''}{c.phone}</p>
                </div>
                <span className="text-[11px] font-bold text-[#25D366] shrink-0">WhatsApp →</span>
              </a>
            ))}
          </div>
        )}

        {/* Veteriner Bul */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest px-1">Veteriner</p>
          <button
            onClick={handleFindVet}
            disabled={locating}
            className="flex items-center gap-3 p-3.5 bg-primary/5 border border-primary/20 rounded-btn hover:bg-primary/10 transition-all active:scale-[0.98] disabled:opacity-60 w-full text-left"
          >
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
              {locating ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              )}
            </div>
            <div>
              <p className="font-bold text-text-primary text-[14px]">
                {locating ? 'Konum alınıyor...' : 'En Yakın Veterineri Bul'}
              </p>
              <p className="text-[11px] text-text-secondary">Anlık konumla Google Maps'te ara</p>
            </div>
          </button>

          {vetPhone && (
            <a
              href={`tel:${vetPhone}`}
              className="flex items-center gap-3 p-3.5 bg-error/5 border border-error/20 rounded-btn hover:bg-error/10 transition-all active:scale-[0.98]"
            >
              <div className="w-9 h-9 rounded-full bg-error flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.62 5.05 2 2 0 0 1 3.6 2.87h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6 6l.88-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 18z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text-primary text-[14px] truncate">{vetName || 'Kayıtlı Veteriner'}</p>
                <p className="text-[11px] text-text-secondary">Hemen Ara · {vetPhone}</p>
              </div>
            </a>
          )}

          <a
            href="tel:174"
            className="flex items-center gap-3 p-3.5 bg-warning/5 border border-warning/20 rounded-btn hover:bg-warning/10 transition-all active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-full bg-warning flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.62 5.05 2 2 0 0 1 3.6 2.87h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.4a16 16 0 0 0 6 6l.88-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 18z"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-text-primary text-[14px]">Tarım Bakanlığı Veteriner</p>
              <p className="text-[11px] text-text-secondary">ALO 174 · 7/24</p>
            </div>
          </a>
        </div>

        {validContacts.length === 0 && (
          <a
            href={activePetId ? `/owner/pets/${activePetId}/edit#sos-section` : '/owner/dashboard'}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 p-3.5 bg-primary/5 border border-primary/20 rounded-btn hover:bg-primary/10 transition-all"
          >
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 animate-pulse">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <div>
              <p className="font-bold text-primary text-[14px]">SOS Kişisi Ekle</p>
              <p className="text-[11px] text-text-secondary">Acil durumda WhatsApp ile haber ver</p>
            </div>
          </a>
        )}

        {/* Kayıp & Güvenlik */}
        {(onLostReport || onMarkFound) && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest px-1">Kayıp &amp; Güvenlik</p>

            {!lostReport && onLostReport && (
              <button
                onClick={() => { setOpen(false); onLostReport(); }}
                className="flex items-center gap-3 p-3.5 bg-error/5 border border-error/20 rounded-btn hover:bg-error/10 transition-all active:scale-[0.98] w-full text-left"
              >
                <div className="w-9 h-9 rounded-full bg-error flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-text-primary text-[14px]">Kayıp İlanı Ver</p>
                  <p className="text-[11px] text-text-secondary">Kayıp ilanı oluştur ve ilan yayınla</p>
                </div>
              </button>
            )}

            {lostReport && onMarkFound && (
              <button
                onClick={() => { setOpen(false); onMarkFound(); }}
                className="flex items-center gap-3 p-3.5 bg-success/5 border border-success/20 rounded-btn hover:bg-success/10 transition-all active:scale-[0.98] w-full text-left"
              >
                <div className="w-9 h-9 rounded-full bg-success flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-text-primary text-[14px]">Bulundu İşaretle</p>
                  <p className="text-[11px] text-text-secondary">Aktif kayıp ilanını kapat</p>
                </div>
              </button>
            )}
          </div>
        )}

        <button onClick={() => setOpen(false)} className="btn-secondary w-full py-3 text-[14px] mt-1">
          Kapat
        </button>
      </div>
    </div>
  )

  if (fullWidth) {
    return (
      <>
        {/* Orchestrator Engine — click_emergency_button trigger */}
        {orchestratorActive && mounted && (
          <DynamicExperienceEngine
            contextTags={['emergency', 'sos']}
            triggerEvent="click_emergency_button"
            petId={activePetId ?? undefined}
            onDone={handleOrchestratorDone}
          />
        )}
        {/* If orchestrator had nothing to show, open SOS modal immediately */}
        {open && mounted && createPortal(modalContent, document.body)}
        <button
          onClick={handleSOSClick}
          className="relative w-full h-11 rounded-btn bg-[#fff0f0] border border-[#ffcccc] flex items-center justify-center gap-2 hover:bg-[#ffe5e5] active:scale-[0.98] transition-all duration-200 focus:outline-none overflow-hidden"
          aria-label="Acil SOS"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e04b4b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 text-[#e04b4b]">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.82a16 16 0 0 0 6.09 6.09l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          <span className="relative z-10 text-[#e04b4b] text-[14px] font-bold">Acil Durum</span>
        </button>
      </>
    )
  }

  return (
    <>
      {/* Orchestrator Engine — click_emergency_button trigger */}
      {orchestratorActive && mounted && (
        <DynamicExperienceEngine
          contextTags={['emergency', 'sos']}
          triggerEvent="click_emergency_button"
          petId={activePetId ?? undefined}
          onDone={handleOrchestratorDone}
        />
      )}
      {open && mounted && createPortal(modalContent, document.body)}
      <button
        onClick={handleSOSClick}
        className="relative w-12 h-12 rounded-full bg-error flex items-center justify-center shadow-md hover:bg-error/90 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none"
        aria-label="Acil SOS"
      >
        <span className="absolute inline-flex w-full h-full rounded-full bg-error opacity-50 animate-ping" />
        <span className="relative text-white text-[10px] font-black tracking-tight pt-[1px]">SOS</span>
      </button>
    </>
  )
}

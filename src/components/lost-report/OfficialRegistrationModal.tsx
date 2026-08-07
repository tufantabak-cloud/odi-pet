'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Info, CheckCircle2, Camera, X, Loader2 } from 'lucide-react'
import { SmartScanner, ParsedScannerData } from '@/components/ui/SmartScanner'

interface OfficialRegistrationModalProps {
  pet: any
  onClose?: () => void
  onSuccess: () => Promise<void> | void
}

/* ─────────────────────────────────────────────
   OPOS Input — rounded-2xl, h-12, token colors
   (07.03 Inputs standard)
───────────────────────────────────────────── */
const oposInput =
  'w-full h-12 px-4 text-base font-medium text-text-primary bg-surface ' +
  'border border-border-main rounded-2xl ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary ' +
  'transition-all duration-200 ease-out ' +
  'placeholder:text-text-secondary'

const oposSelect =
  'w-full h-12 px-4 text-base font-medium text-text-primary bg-surface ' +
  'border border-border-main rounded-2xl ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary ' +
  'transition-all duration-200 ease-out ' +
  'disabled:bg-bg-main disabled:text-text-secondary disabled:cursor-not-allowed'

export function OfficialRegistrationModal({
  pet,
  onClose,
  onSuccess,
}: OfficialRegistrationModalProps) {
  /* ── state ── */
  const [microchipNo, setMicrochipNo] = useState(pet?.microchip_no || '')
  const [passportNo, setPassportNo] = useState(pet?.passport_no || '')
  const [registrationCity, setRegistrationCity] = useState(pet?.registration_city || '')
  const [registrationDistrict, setRegistrationDistrict] = useState(pet?.registration_district || '')
  const [agricultureDirectorate, setAgricultureDirectorate] = useState(
    pet?.agriculture_directorate || ''
  )

  const [provinces, setProvinces] = useState<any[]>([])
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /* ── Body scroll lock: page behind must never scroll while dialog is open ── */
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    fetch('/api/provinces')
      .then((r) => r.json())
      .then((r) => {
        if (r.status === 'OK' && r.data)
          setProvinces(r.data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr')))
      })
      .catch(console.error)
  }, [])

  /* ── Detect ONLY missing fields ── */
  const missingFields = useMemo(() => {
    const fields: string[] = []
    if (!pet?.microchip_no) fields.push('microchip')
    if (!pet?.passport_no) fields.push('passport')
    /* Show province/district section if any location field is missing */
    if (!pet?.registration_city || !pet?.registration_district || !pet?.agriculture_directorate)
      fields.push('location')
    return fields
  }, [pet])

  const hasMissing = (key: string) => missingFields.includes(key)

  /* ── Handlers ── */
  const handleCityChange = (city: string) => {
    setRegistrationCity(city)
    setRegistrationDistrict('')
    setAgricultureDirectorate('')
  }

  const handleDistrictChange = (district: string) => {
    setRegistrationDistrict(district)
    setAgricultureDirectorate(district ? `${district} İlçe Tarım ve Orman Müdürlüğü` : '')
  }

  const handleScanResult = (data: ParsedScannerData) => {
    const parsed: any = (data as any)?.parsed || data
    if (parsed?.microchip_no) setMicrochipNo(String(parsed.microchip_no))
    if (parsed?.passport_no) setPassportNo(String(parsed.passport_no))
    if (parsed?.registration_city) setRegistrationCity(String(parsed.registration_city))
    if (parsed?.registration_district) {
      const d = String(parsed.registration_district)
      setRegistrationDistrict(d)
      setAgricultureDirectorate(
        parsed?.agriculture_directorate
          ? String(parsed.agriculture_directorate)
          : `${d} İlçe Tarım ve Orman Müdürlüğü`
      )
    }
    setShowScanner(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (pet?.id) {
        const fd = new FormData()
        fd.set('microchip_no', microchipNo.trim())
        fd.set('passport_no', passportNo.trim())
        fd.set('registration_city', registrationCity)
        fd.set('registration_district', registrationDistrict)
        fd.set('agriculture_directorate', agricultureDirectorate.trim())
        const res = await fetch(`/api/pets/${pet.id}`, { method: 'PATCH', body: fd })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Bilgiler kaydedilemedi.')
        }
      }
      await onSuccess()
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu, lütfen tekrar deneyin.')
      setLoading(false)
    }
  }

  const districts =
    provinces
      .find((p) => p.name === registrationCity)
      ?.districts?.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr')) ?? []

  return createPortal(
    /*
      ── OPOS Overlay ──
      bg-black/50  backdrop-blur-sm
      Prevents background interaction (pointer-events on modal container)
    */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)' }}
      /* Prevent clicks from passing through */
      onClick={(e) => e.stopPropagation()}
    >
      {/*
        ── OPOS Modal Container ──
        max-w-[480px] desktop | w-[calc(100%-32px)] mobile
        rounded-[24px] — Design Bible Card radius standard
        shadow: 0_12px_32px_-4px diffused (no harsh shadow)
        max-h-[75vh] overflow-auto hidden scrollbar
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        className="
          relative w-full max-w-[480px] bg-surface
          rounded-[24px]
          border border-border-main
          flex flex-col
          max-h-[75vh]
          overflow-hidden
        "
        style={{
          boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 16px -2px rgba(15, 23, 42, 0.06)',
        }}
      >
        {/* ───────────────────────────────────────────
            HEADER  (sticky — never scrolls away)
        ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 shrink-0">
          <div className="flex items-start gap-3">
            {/* OPOS: one icon, 24px, primary color, no decoration */}
            <Info
              className="w-6 h-6 text-primary shrink-0 mt-0.5"
              strokeWidth={2}
            />
            <div className="flex flex-col gap-1">
              {/* OPOS H3 — 18px / weight 600 */}
              <h2
                id="modal-title"
                className="text-lg font-semibold text-text-primary leading-snug"
              >
                Eksik Bilgiler
              </h2>
              {/* Description — max 2 lines, 14px / weight 400 */}
              <p className="text-sm text-text-secondary leading-relaxed">
                Kayıp ilanını yayınlayabilmek için aşağıdaki bilgileri tamamlayın.
              </p>
            </div>
          </div>

          {/* Close — 44×44 touch target */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="
                w-11 h-11 -mr-1 -mt-1 rounded-full flex items-center justify-center shrink-0
                text-text-secondary hover:text-text-primary hover:bg-bg-main
                transition-all duration-200 ease-out active:scale-[0.96]
              "
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border-main mx-6 shrink-0" />

        {/* ───────────────────────────────────────────
            SCROLLABLE CONTENT
            hidden scrollbar (OPOS: no gray native bars)
        ─────────────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* Error state — OPOS 07.17 Toast inline */}
          {error && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm font-medium text-red-700">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-red-500" strokeWidth={2} />
              {error}
            </div>
          )}

          {/* ── Belge Tarama — compact link, not a card ── */}
          {(hasMissing('microchip') || hasMissing('passport')) && !showScanner && (
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="
                w-full h-12 flex items-center justify-center gap-2
                border border-primary/30 rounded-2xl
                text-sm font-semibold text-primary
                bg-primary/6 hover:bg-primary/10
                transition-all duration-200 ease-out active:scale-[0.98]
              "
            >
              <Camera className="w-5 h-5" strokeWidth={2} />
              Pasaport veya Belgeyi Tara
            </button>
          )}

          {/* Scanner embed */}
          {showScanner && (
            <div className="rounded-2xl overflow-hidden border border-border-main">
              <SmartScanner
                petId={pet?.id}
                onClose={() => setShowScanner(false)}
                onResult={handleScanResult}
              />
            </div>
          )}

          {/* ─────────────────────────────────────────
              FORM — only missing fields rendered
              Hierarchy: Header → Description → Fields → CTA
              No nested cards
          ───────────────────────────────────────── */}
          <form
            id="official-reg-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            {/* Mikroçip No — only if missing */}
            {hasMissing('microchip') && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="microchip-input"
                    className="text-sm font-semibold text-text-primary"
                  >
                    Mikroçip No
                  </label>
                  {microchipNo.replace(/\s/g, '').length === 15 && (
                    /* OPOS 07.09 Badge — Tamamlandı */
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold border border-green-200">
                      <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
                      Doğrulandı
                    </span>
                  )}
                </div>
                <input
                  id="microchip-input"
                  type="text"
                  value={microchipNo}
                  onChange={(e) => setMicrochipNo(e.target.value)}
                  placeholder="15 haneli mikroçip numarası"
                  className={
                    oposInput +
                    (microchipNo.replace(/\s/g, '').length === 15
                      ? ' border-green-400 focus:ring-green-400/30 focus:border-green-500'
                      : '')
                  }
                />
              </div>
            )}

            {/* Pasaport No — only if missing */}
            {hasMissing('passport') && (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="passport-input"
                  className="text-sm font-semibold text-text-primary"
                >
                  Pasaport No
                </label>
                <input
                  id="passport-input"
                  type="text"
                  value={passportNo}
                  onChange={(e) => setPassportNo(e.target.value)}
                  placeholder="Pasaport seri / numarası"
                  className={oposInput}
                />
              </div>
            )}

            {/* Location section — only if any location field is missing */}
            {hasMissing('location') && (
              <>
                {/* Section separator */}
                {(hasMissing('microchip') || hasMissing('passport')) && (
                  <div className="h-px bg-border-main" />
                )}

                {/* Section label */}
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Kayıtlı Olduğu İlçe Tarım ve Orman Müdürlüğü
                </p>

                {/* Kayıtlı İl */}
                {!pet?.registration_city && (
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="city-select"
                      className="text-sm font-semibold text-text-primary"
                    >
                      Kayıtlı İl
                    </label>
                    <select
                      id="city-select"
                      value={registrationCity}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className={oposSelect}
                    >
                      <option value="">İl seçin (opsiyonel)</option>
                      {provinces.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Kayıtlı İlçe */}
                {!pet?.registration_district && (
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="district-select"
                      className="text-sm font-semibold text-text-primary"
                    >
                      Kayıtlı İlçe
                    </label>
                    <select
                      id="district-select"
                      value={registrationDistrict}
                      onChange={(e) => handleDistrictChange(e.target.value)}
                      disabled={!registrationCity && !pet?.registration_city}
                      className={oposSelect}
                    >
                      <option value="">İlçe seçin (opsiyonel)</option>
                      {districts.map((d: any) => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Müdürlük Adı */}
                {!pet?.agriculture_directorate && (
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="directorate-input"
                      className="text-sm font-semibold text-text-primary"
                    >
                      İlçe Tarım ve Orman Müdürlüğü
                    </label>
                    <input
                      id="directorate-input"
                      type="text"
                      value={agricultureDirectorate}
                      onChange={(e) => setAgricultureDirectorate(e.target.value)}
                      placeholder="Örn: Kadıköy İlçe Tarım ve Orman Müdürlüğü"
                      className={oposInput}
                    />
                  </div>
                )}
              </>
            )}
          </form>
        </div>

        {/* ───────────────────────────────────────────
            FOOTER (sticky — always visible)
        ─────────────────────────────────────────── */}
        <div className="shrink-0 px-6 pb-6 pt-4 border-t border-border-main bg-surface flex flex-col gap-3">
          {/*
            OPOS 07.01 Primary Button — Large
            h-12 (48px), rounded-2xl, active:scale-[0.98]
          */}
          <button
            type="submit"
            form="official-reg-form"
            disabled={loading}
            className="
              w-full h-12 bg-primary hover:bg-primary/90
              text-white text-base font-semibold rounded-2xl
              flex items-center justify-center gap-2
              transition-all duration-200 ease-out active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            style={{
              boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.10)',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
                Kaydediliyor…
              </>
            ) : (
              'Bilgileri Tamamla'
            )}
          </button>

          {/* OPOS Ghost — "Şimdi Değil" */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="
                w-full h-11 text-sm font-semibold text-text-secondary
                hover:text-text-primary
                transition-all duration-200 ease-out active:scale-[0.98]
                disabled:opacity-50
              "
            >
              Şimdi Değil
            </button>
          )}
        </div>
      </div>
    </div>
  , document.body)
}

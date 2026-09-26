'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { getAge, translateSpecies } from '@/lib/utils/petLabels'
import {
  AlertTriangle, Clock, MapPin, Share2, Phone,
  CheckCircle2, X, Loader2, Camera
} from 'lucide-react'

export interface LostFeedCardProps {
  report: {
    id: string
    last_seen_location: string
    last_seen_at: string | null
    contact_phone: string | null
    created_at: string | null
    pet_id?: string | null
    status?: string | null
    distinctive_features?: string | null
    collar_info?: string | null
    color?: string | null
    additional_photos?: string[] | null
    pet: {
      id: string
      name: string
      species: string
      avatar_url: string | null
      city: string | null
      breed?: string | null
      birth_date?: string | null
    } | null
  }
}

/* ── Buldum Bildir Modal ─────────────────────────────────── */
function FoundModal({
  report,
  onClose,
}: {
  report: LostFeedCardProps['report']
  onClose: () => void
}) {
  const pet = report.pet!
  const [finderName, setFinderName] = useState('')
  const [finderPhone, setFinderPhone] = useState('')
  const [foundLocation, setFoundLocation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!finderName.trim()) {
      setError('Lütfen adınızı giriniz.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reports/lost/${report.id}/found-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finder_name:    finderName.trim(),
          finder_phone:   finderPhone.trim(),
          found_location: foundLocation.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Bir hata oluştu.')
      setDone(true)
    } catch (err: any) {
      setError(err.message || 'Bildirim gönderilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel */}
      <div
        className="w-full max-w-sm bg-white rounded-t-[28px] sm:rounded-3xl shadow-[0_12px_32px_-4px_rgba(15,23,42,0.18)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {/* Pet mini avatar */}
            <div className="w-9 h-9 rounded-xl bg-emerald-50 overflow-hidden relative shrink-0 border border-emerald-100">
              {pet.avatar_url ? (
                <Image src={pet.avatar_url} alt={pet.name} fill sizes="36px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-400 text-xs">🐾</div>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-tight">
                {pet.name}'i Buldum
              </p>
              <p className="text-xs text-slate-500 font-normal leading-tight">
                Sahibe bildirim gönderilecek
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 pt-4">
          {done ? (
            /* Başarı durumu */
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 stroke-[2]" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900">Bildiriminiz İletildi!</p>
                <p className="text-sm text-slate-500 font-normal mt-1">
                  {pet.name}'in sahibi en kısa sürede sizinle iletişime geçecek.
                </p>
              </div>
              {report.contact_phone && (
                <a
                  href={`tel:${report.contact_phone}`}
                  className="w-full text-center py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20"
                >
                  <Phone className="w-4 h-4 stroke-[2]" /> Sahibini Ara
                </a>
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium underline underline-offset-2"
              >
                Kapat
              </button>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                Lütfen aşağıdaki bilgileri doldurun. Pet sahibi sizinle iletişime geçebilecek.
              </p>

              {error && (
                <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}

              {/* Ad Soyad — zorunlu */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">
                  Adınız <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={finderName}
                  onChange={(e) => setFinderName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  maxLength={100}
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Telefon — opsiyonel */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">
                  Telefon Numaranız <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
                </label>
                <input
                  type="tel"
                  value={finderPhone}
                  onChange={(e) => setFinderPhone(e.target.value)}
                  placeholder="05XX XXX XX XX"
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Konum — opsiyonel */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">
                  Gördüğünüz Yer <span className="text-slate-400 font-normal">(isteğe bağlı)</span>
                </label>
                <input
                  type="text"
                  value={foundLocation}
                  onChange={(e) => setFoundLocation(e.target.value)}
                  placeholder="Örn: Kadıköy, Moda Sahili"
                  maxLength={200}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>

              {/* Gönder */}
              <button
                type="submit"
                disabled={submitting || !finderName.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold text-sm rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 mt-1"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 stroke-[2] animate-spin" /> Gönderiliyor...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 stroke-[2]" /> Bildirimi Gönder</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── LostFeedCard ────────────────────────────────────────── */
export function LostFeedCard({ report }: { report: any }) {
  const [showFoundModal, setShowFoundModal] = useState(false)
  const pet = report.pet
  if (!pet) return null

  const ageText = pet.birth_date ? getAge(pet.birth_date) : ''
  const speciesLabel = translateSpecies(pet.species)
  const breedText = pet.breed
  const hasPhone = !!report.contact_phone?.trim()

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `🚨 Kayıp Pet İlanı - ${pet.name}`,
          text: `🚨 Kayıp Pet İlanı\n\n${pet.name} kayboldu!\nTür: ${speciesLabel}\nSon Görüldüğü Yer: ${report.last_seen_location}\nİletişim: ${report.contact_phone || 'Belirtilmemiş'}\n\nOdi.Pet üzerinden görüntüle →\nhttps://app.odi.pet/owner/social?tab=lost`,
        })
      } catch (error) {
        console.error('Error sharing', error)
      }
    } else {
      alert('Tarayıcınız paylaşım özelliğini desteklemiyor.')
    }
  }

  const getUrgencyBadge = () => {
    if (!report.last_seen_at) return null
    const diffMs = Date.now() - new Date(report.last_seen_at).getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 text-2xs font-bold animate-pulse">
          Bugün
        </span>
      )
    } else if (diffDays <= 3) {
      return (
        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 text-2xs font-semibold">
          {diffDays} Gün Önce
        </span>
      )
    }
    return null
  }

  return (
    <>
      <div className="rounded-3xl bg-white border border-slate-100 p-3 flex gap-3.5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden transition-all hover:shadow-md group items-start">

        {/* Left: Square Image */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-rose-50 shrink-0 overflow-hidden">
          {pet.avatar_url ? (
            <Image
              src={pet.avatar_url}
              alt={pet.name || 'Pet'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="112px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-rose-300">
              <AlertTriangle className="w-8 h-8 stroke-[1.5]" />
            </div>
          )}

          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-lg bg-rose-600/90 text-white text-2xs font-extrabold shadow-sm">
              Kayıp
            </span>
          </div>

          {report.additional_photos && report.additional_photos.length > 0 && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-sm text-white text-2xs font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
              <Camera className="w-3 h-3 stroke-[2]" />
              <span>+{report.additional_photos.length}</span>
            </div>
          )}
        </div>

        {/* Right: Details & Actions */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
          <div>
            {/* Top row: Name & Share */}
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="font-extrabold text-base text-slate-900 truncate">{pet.name}</h3>
                {getUrgencyBadge()}
              </div>
              <button
                type="button"
                onClick={handleShare}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 shrink-0"
              >
                <Share2 className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            {/* Subtitle */}
            <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
              {[speciesLabel, breedText, ageText].filter(Boolean).join(' • ')}
            </p>

            {/* Color & Collar */}
            {(report.color || report.collar_info) && (
              <div className="flex flex-wrap items-center gap-1 mt-1">
                {report.color && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-2xs font-medium">
                    {report.color}
                  </span>
                )}
                {report.collar_info && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80 text-2xs font-medium">
                    {report.collar_info}
                  </span>
                )}
              </div>
            )}

            {/* Distinctive Features */}
            {report.distinctive_features && (
              <p className="text-2xs text-slate-500 font-normal line-clamp-1 mt-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-700">Özellik:</span> {report.distinctive_features}
              </p>
            )}

            {/* Location */}
            <p className="text-2xs text-slate-600 font-medium flex items-center gap-1 mt-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-rose-500 stroke-[2] shrink-0" />
              <span className="truncate">{report.last_seen_location}</span>
            </p>
          </div>

          {/* Bottom row: Zaman + Aksiyon butonları */}
          <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-slate-50">
            {report.last_seen_at && (
              <span className="text-2xs text-slate-400 font-normal flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3 stroke-[2]" />
                {new Date(report.last_seen_at).toLocaleDateString('tr-TR')}
              </span>
            )}

            <div className="flex items-center gap-1.5 ml-auto">
              {/* Buldum Bildir — karta özel */}
              <button
                type="button"
                onClick={() => setShowFoundModal(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-xl active:scale-[0.98] transition-all border border-emerald-200 shrink-0 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[2]" /> Buldum
              </button>

              {/* Ara */}
              {hasPhone ? (
                <a
                  href={`tel:${report.contact_phone}`}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl active:scale-[0.98] transition-all shadow-sm shadow-rose-600/20 shrink-0 flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5 stroke-[2]" /> Ara
                </a>
              ) : (
                <span className="text-2xs font-medium text-slate-400 px-2 py-1 bg-slate-50 rounded-lg">
                  İletişim Yok
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Buldum Bildir Modal */}
      {showFoundModal && (
        <FoundModal report={report} onClose={() => setShowFoundModal(false)} />
      )}
    </>
  )
}

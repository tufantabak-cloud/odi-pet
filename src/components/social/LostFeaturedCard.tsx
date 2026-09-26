'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import {
  AlertTriangle, Clock, MapPin, Share2, Phone,
  CheckCircle2, X, Loader2
} from 'lucide-react'
import { translateSpecies, getAge } from '@/lib/utils/petLabels'

/* ── Buldum Bildir Modal (aynı mantık, overlay versiyonu) ── */
function FoundModal({
  report,
  onClose,
}: {
  report: any
  onClose: () => void
}) {
  const pet = report.pet || {}
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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-t-[28px] sm:rounded-3xl shadow-[0_12px_32px_-4px_rgba(15,23,42,0.18)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 overflow-hidden relative shrink-0 border border-emerald-100">
              {pet.avatar_url ? (
                <Image src={pet.avatar_url} alt={pet.name || 'Pet'} fill sizes="36px" className="object-cover" />
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
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                Lütfen aşağıdaki bilgileri doldurun. Pet sahibi sizinle iletişime geçebilecek.
              </p>

              {error && (
                <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-100 text-xs font-semibold text-rose-700">
                  {error}
                </div>
              )}

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

/* ── LostFeaturedCard ────────────────────────────────────── */
export function LostFeaturedCard({ report }: { report: any }) {
  const [showFoundModal, setShowFoundModal] = useState(false)
  const pet = report.pet
  if (!pet) return null

  const ageText = pet.birth_date ? getAge(pet.birth_date) : ''
  const speciesLabel = translateSpecies(pet.species)
  const hasPhone = !!report.contact_phone?.trim()

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (navigator.share) {
      try {
        await navigator.share({
          title: `🚨 Acil Kayıp İlanı - ${pet.name}`,
          text: `🚨 Acil Kayıp İlanı\n\n${pet.name} kayboldu!\nTür: ${speciesLabel}\nSon Görüldüğü Yer: ${report.last_seen_location}\nİletişim: ${report.contact_phone || 'Belirtilmemiş'}\n\nOdi.Pet üzerinden detayları gör →\nhttps://app.odi.pet/owner/social?tab=lost`,
        })
      } catch (error) {
        console.error('Error sharing', error)
      }
    } else {
      alert('Tarayıcınız paylaşım özelliğini desteklemiyor.')
    }
  }

  return (
    <>
      <div className="relative w-[220px] sm:w-[260px] aspect-[3/4] rounded-3xl overflow-hidden shrink-0 group border border-slate-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.08)] transition-all hover:scale-[1.02] active:scale-[0.98]">
        {/* Background Image */}
        {pet.avatar_url ? (
          <Image
            src={pet.avatar_url}
            alt={pet.name || 'Pet'}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="260px"
          />
        ) : (
          <div className="w-full h-full bg-rose-50 flex items-center justify-center text-rose-300">
            <AlertTriangle className="w-12 h-12 stroke-[1.5]" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

        {/* Top Header: Badge & Share */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
          <span className="bg-rose-600/90 backdrop-blur-md text-white text-2xs font-extrabold px-2.5 py-1 rounded-xl shadow-sm flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3 stroke-[2.5]" /> Acil Kayıp
          </span>
          <button
            type="button"
            onClick={handleShare}
            className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <Share2 className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Bottom Content Info */}
        <div className="absolute bottom-3 left-3 right-3 text-white z-10 flex flex-col gap-1.5">
          <div>
            <h3 className="font-extrabold text-xl leading-tight drop-shadow-sm">{pet.name}</h3>
            <p className="text-xs text-white/90 font-medium truncate drop-shadow-sm">
              {[speciesLabel, pet.breed, ageText].filter(Boolean).join(' • ')}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-2 border border-white/15 flex flex-col gap-0.5 text-2xs text-white/90">
            <p className="font-medium flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-rose-400 stroke-[2] shrink-0" />
              <span className="truncate">{report.last_seen_location}</span>
            </p>
            {report.last_seen_at && (
              <p className="text-white/70 font-normal flex items-center gap-1">
                <Clock className="w-3 h-3 text-white/60 stroke-[2] shrink-0" />
                <span>{new Date(report.last_seen_at).toLocaleDateString('tr-TR')}</span>
              </p>
            )}
          </div>

          {/* Aksiyon butonları: Ara + Buldum Bildir */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowFoundModal(true) }}
              className="flex-1 text-center py-2 bg-emerald-500/90 hover:bg-emerald-500 backdrop-blur-md text-white font-bold text-xs rounded-xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" /> Buldum
            </button>

            {hasPhone ? (
              <a
                href={`tel:${report.contact_phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-center py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 stroke-[2.5]" /> Ara
              </a>
            ) : (
              <span className="flex-1 text-center py-2 bg-white/20 backdrop-blur-md text-white/80 font-semibold text-2xs rounded-xl block flex items-center justify-center">
                İletişim Yok
              </span>
            )}
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

import React, { useState } from 'react'
import Image from 'next/image'
import { HeartHandshake, ShieldCheck, X, Check, Calendar, MapPin } from 'lucide-react'

export function AdoptionFeedCard({ 
  adoption, 
  currentUserId,
  onApply 
}: { 
  adoption: any;
  currentUserId?: string;
  onApply?: (listingId: string) => void;
}) {
  const { pet, story, requirements, created_at, user_id, id } = adoption

  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState('')
  const [kvkkConsent, setKvkkConsent] = useState(false)
  const [loading, setLoading] = useState(false)

  const isOwner = currentUserId === user_id

  const getAge = (birthDate: string) => {
    const ageInMs = Date.now() - new Date(birthDate).getTime()
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25)
    if (ageInYears < 1) {
      const months = Math.floor(ageInYears * 12)
      return `${months} aylık`
    }
    return `${Math.floor(ageInYears)} yaşında`
  }

  const ageText = pet?.birth_date ? getAge(pet.birth_date) : ''

  const handleApply = async () => {
    if (!kvkkConsent) {
      alert('Lütfen kişisel verilerin işlenmesini onaylayın.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/adoption-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: id,
          message: message.trim() || undefined,
          kvkk_consent: kvkkConsent
        })
      })
      const data = await res.json()
      if (res.ok) {
        alert('Başvurunuz başarıyla iletildi! 🐾')
        setShowModal(false)
        if (onApply) onApply(id)
      } else {
        alert(data.error || 'Başvuru sırasında bir hata oluştu.')
      }
    } catch (err) {
      alert('Bağlantı hatası oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="rounded-3xl bg-white border border-slate-100 p-5 flex flex-col gap-4 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden transition-all hover:shadow-md group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-100/60 to-transparent rounded-bl-full opacity-60 -z-10 transition-transform group-hover:scale-110" />

        <div className="flex gap-4 items-center">
          {pet?.avatar_url ? (
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-sm shrink-0">
              <Image
                src={pet.avatar_url}
                alt={pet.name || 'Pet Avatar'}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shadow-sm shrink-0">
              <HeartHandshake className="w-7 h-7 stroke-[1.75]" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-lg truncate">{pet?.name}</h3>
            <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1.5 mt-0.5">
              <span>{pet?.breed || pet?.species}</span>
              {ageText && <span>• {ageText}</span>}
              {pet?.city && (
                <span className="inline-flex items-center gap-0.5">
                  • <MapPin className="w-3 h-3 stroke-[2]" /> {pet.city}
                </span>
              )}
            </p>
          </div>
        </div>

        {story && (
          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100">
            <p className="text-xs text-slate-700 leading-relaxed italic">
              "{story}"
            </p>
          </div>
        )}

        {requirements && requirements.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-0.5">
            {requirements.map((req: string, i: number) => (
              <span key={i} className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-lg border border-violet-100/50 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                {req}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-1 pt-3.5 border-t border-slate-100">
          <span className="text-xs text-slate-400 font-normal flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 stroke-[2]" />
            {new Date(created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} eklendi
          </span>
          {!isOwner && (
            <button 
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs py-2 px-4 rounded-2xl active:scale-[0.98] transition-all shadow-sm shadow-violet-600/20"
            >
              <HeartHandshake className="w-4 h-4 stroke-[2]" />
              Sahiplenmek İstiyorum
            </button>
          )}
        </div>
      </div>

      {/* Başvuru Modalı */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-violet-600 stroke-[2]" />
                Sahiplenme Başvurusu
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Kendinizi ve imkanlarınızı anlatın (Opsiyonel)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Eviniz, tecrübeleriniz ve neden sahiplenmek istediğiniz hakkında..."
                  className="w-full min-h-[100px] resize-none text-sm p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-sans"
                  maxLength={1000}
                />
              </div>

              <label className="flex items-start gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80 cursor-pointer hover:bg-slate-100/60 transition-colors">
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={kvkkConsent}
                    onChange={(e) => setKvkkConsent(e.target.checked)}
                    className="w-4 h-4 rounded-md border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                </div>
                <span className="text-xs text-slate-600 leading-relaxed font-normal">
                  Kişisel verilerimin iletişim amacıyla karşı tarafla paylaşılmasını onaylıyorum. <span className="text-rose-500">*</span>
                </span>
              </label>

              <button
                onClick={handleApply}
                disabled={loading || !kvkkConsent}
                className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm py-3.5 px-6 rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm shadow-violet-600/20 w-full"
              >
                <ShieldCheck className="w-4 h-4 stroke-[2]" />
                {loading ? 'Gönderiliyor...' : 'Başvurumu İlet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


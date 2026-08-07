import React, { useState } from 'react'
import Image from 'next/image'
import { HeartHandshake, ShieldCheck, X, Heart, MapPin } from 'lucide-react'

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
  const [isLiked, setIsLiked] = useState(false)

  const isOwner = currentUserId === user_id

  const getAge = (birthDate: string) => {
    const ageInMs = Date.now() - new Date(birthDate).getTime()
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25)
    if (ageInYears < 1) {
      const months = Math.floor(ageInYears * 12)
      return `${months} Yaş`
    }
    return `${Math.floor(ageInYears)} Yaş`
  }

  const ageText = pet?.birth_date ? getAge(pet.birth_date) : ''
  const genderText = pet?.gender === 'male' ? 'Erkek' : pet?.gender === 'female' ? 'Dişi' : ''

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
      <div className="rounded-3xl bg-white border border-slate-100/80 p-3 flex gap-3.5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden transition-all hover:shadow-md group items-center">
        
        {/* Left: Square Image */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 shrink-0 overflow-hidden">
          {pet?.avatar_url ? (
            <Image
              src={pet.avatar_url}
              alt={pet.name || 'Pet Avatar'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="112px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <HeartHandshake className="w-8 h-8 stroke-[1.5]" />
            </div>
          )}
        </div>

        {/* Right: Info & Actions */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
          <div>
            {/* Top row: Name & Favorite */}
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-extrabold text-base text-slate-900 truncate">{pet?.name}</h3>
              <button 
                type="button"
                onClick={() => setIsLiked(!isLiked)}
                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            </div>

            {/* Subtitle */}
            <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
              {[pet?.breed || pet?.species, ageText, genderText].filter(Boolean).join(' • ')}
            </p>

            {/* Location */}
            {pet?.city && (
              <p className="text-2xs text-slate-400 font-normal flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 stroke-[2] shrink-0 text-slate-400" />
                <span className="truncate">{pet.city}</span>
              </p>
            )}
          </div>

          {/* Bottom row: Badge & CTA Button */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
              Aşıları Tam
            </span>

            {!isOwner ? (
              <button 
                onClick={() => setShowModal(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl active:scale-[0.98] transition-all shadow-sm shadow-violet-600/20 shrink-0"
              >
                Başvuru Yap
              </button>
            ) : (
              <span className="text-2xs font-medium text-slate-400 px-2 py-1 bg-slate-50 rounded-lg">
                Sizin İlanınız
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Başvuru Modalı */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-violet-600 stroke-[2]" />
                Sahiplenme Başvurusu ({pet?.name})
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

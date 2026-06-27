import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

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
        alert('Başvurunuz iletildi! 🐾')
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
      <div className="card-base bg-white border border-border-main p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden transition-all hover:shadow-md group rounded-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-100 to-transparent rounded-bl-full opacity-50 -z-10 transition-transform group-hover:scale-110" />

        <div className="flex gap-4 items-center">
          {pet?.avatar_url ? (
            <div className="relative w-[60px] h-[60px] rounded-2xl overflow-hidden shadow-sm shrink-0">
              <Image
                src={pet.avatar_url}
                alt={pet.name || 'Pet Avatar'}
                fill
                className="object-cover"
                sizes="60px"
              />
            </div>
          ) : (
            <div className="w-[60px] h-[60px] rounded-2xl bg-gradient-to-tr from-violet-100 to-indigo-50 flex items-center justify-center shadow-sm shrink-0">
              <span className="text-2xl">{pet?.species === 'Kedi' ? '🐱' : '🐶'}</span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-text-primary text-[17px] truncate">{pet?.name}</h3>
            <p className="text-[13px] text-text-secondary font-medium truncate flex items-center gap-1.5 mt-0.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-slate-100 text-[10px]">
                {pet?.species === 'Kedi' ? '🐈' : '🐕'}
              </span>
              {pet?.breed || pet?.species} {ageText ? ` • ${ageText}` : ''} {pet?.city ? ` • 📍 ${pet.city}` : ''}
            </p>
          </div>
        </div>

        {story && (
          <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100/50">
            <p className="text-[13px] text-text-primary leading-relaxed italic">
              "{story}"
            </p>
          </div>
        )}

        {requirements && requirements.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {requirements.map((req: string, i: number) => (
              <span key={i} className="px-2.5 py-1 bg-violet-50 text-violet-700 text-[11px] font-bold rounded-lg border border-violet-100/50 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-violet-400" />
                {req}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-1 pt-4 border-t border-border-main/50">
          <span className="text-[11px] text-text-secondary font-medium">
            {new Date(created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} eklendi
          </span>
          {!isOwner && (
            <button 
              onClick={() => setShowModal(true)}
              className="btn-primary py-2 px-4 text-[13px] font-bold bg-violet-600 hover:bg-violet-700 rounded-xl shadow-sm shadow-violet-600/20 active:scale-95 transition-all"
            >
              Sahiplenmek İstiyorum
            </button>
          )}
        </div>
      </div>

      {/* Başvuru Modalı */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="p-5 border-b border-border-main flex justify-between items-center bg-surface">
              <h3 className="font-black text-[16px] text-text-primary">Sahiplenme Başvurusu</h3>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-text-secondary hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-5">
              <div>
                <label className="block text-[13px] font-bold text-text-secondary mb-2">Kendinizi ve imkanlarınızı anlatın (Opsiyonel)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Eviniz, tecrübeleriniz ve neden sahiplenmek istediğiniz hakkında..."
                  className="input-base w-full min-h-[100px] resize-none text-[14px]"
                  maxLength={1000}
                />
              </div>

              <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-border-main cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="pt-0.5">
                  <input
                    type="checkbox"
                    checked={kvkkConsent}
                    onChange={(e) => setKvkkConsent(e.target.checked)}
                    className="w-4 h-4 rounded border-border-main text-violet-600 focus:ring-violet-500"
                  />
                </div>
                <span className="text-[12px] text-text-secondary leading-relaxed">
                  Kişisel verilerimin iletişim amacıyla karşı tarafla paylaşılmasını onaylıyorum. <span className="text-red-500">*</span>
                </span>
              </label>

              <button
                onClick={handleApply}
                disabled={loading || !kvkkConsent}
                className="btn-primary py-3.5 w-full text-[14px] font-black bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-all rounded-xl shadow-md shadow-violet-600/20"
              >
                {loading ? 'Gönderiliyor...' : 'Başvurumu İlet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

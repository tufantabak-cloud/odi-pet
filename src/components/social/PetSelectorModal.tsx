'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { X, Check, Phone, ShieldCheck, AlertCircle } from 'lucide-react'

interface PetSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  listingId: string
  listingSpecies: string
  listingGender: string
}

export function PetSelectorModal({ isOpen, onClose, listingId, listingSpecies, listingGender }: PetSelectorModalProps) {
  const [pets, setPets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [kvkkConsent, setKvkkConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasPhone, setHasPhone] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    const supabase = createBrowserSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: profile } = await supabase.from('profiles').select('phone').eq('id', session.user.id).single()
    if (!profile?.phone) {
      setHasPhone(false)
    }

    const { data: myPets } = await supabase.from('pets').select('id, name, species, gender, breed, avatar_url, is_neutered').order('created_at', { ascending: false })
    
    const targetGender = listingGender === 'male' ? 'female' : 'male'
    const compatible = myPets?.filter((p: any) => 
      p.species === listingSpecies && 
      p.gender === targetGender && 
      p.is_neutered !== true
    ) || []
    
    setPets(compatible)
    setLoading(false)
  }

  const handleSubmit = async () => {
    if (!selectedPetId) {
      setError('Lütfen bir pet seçin.')
      return
    }
    if (!kvkkConsent) {
      setError('KVKK onayını işaretlemeniz gerekmektedir.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/breeding-listings/${listingId}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicant_pet_id: selectedPetId,
          message,
          kvkk_consent: kvkkConsent
        })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Başvuru sırasında bir hata oluştu.')
        setSubmitting(false)
        return
      }

      onClose()
    } catch (err) {
      setError('Sistemsel bir hata oluştu.')
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-900">Eşleşme Başvurusu</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {!hasPhone ? (
            <div className="bg-rose-50/80 border border-rose-100 rounded-3xl p-5 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <Phone className="w-6 h-6 stroke-[1.75]" />
              </div>
              <p className="text-xs text-rose-900 font-normal leading-relaxed">
                Başvuru yapabilmek için profilinize bir telefon numarası eklemeniz gerekmektedir. İlan sahibi başvurunuzu kabul ettiğinde sizinle bu numara üzerinden iletişime geçecektir.
              </p>
              <Link href="/owner/profile" className="inline-flex items-center justify-center bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs py-2.5 px-6 rounded-2xl active:scale-[0.98] transition-all mt-1">Profili Güncelle</Link>
            </div>
          ) : loading ? (
            <div className="flex justify-center p-10">
              <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pets.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-3 block">🐾</span>
              <h3 className="text-base font-bold text-slate-900 mb-1">Uygun Pet Bulunamadı</h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">Bu ilan için uygun türde, zıt cinsiyette ve kısırlaştırılmamış bir petiniz bulunmuyor.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <label className="text-xs font-semibold text-slate-700">Hangi petiniz için başvuruyorsunuz?</label>
              <div className="grid gap-3">
                {pets.map(pet => (
                  <button
                    key={pet.id}
                    onClick={() => setSelectedPetId(pet.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                      selectedPetId === pet.id ? 'border-pink-500 bg-pink-50/40 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    {pet.avatar_url ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0">
                        <Image src={pet.avatar_url} alt={pet.name} fill sizes="48px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">🐾</div>
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-sm text-slate-900">{pet.name}</div>
                      <div className="text-xs text-slate-500 font-normal">{pet.breed || pet.species}</div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedPetId === pet.id ? 'border-pink-500 bg-pink-500 text-white' : 'border-slate-300'
                    }`}>
                      {selectedPetId === pet.id && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-1">
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">İlan sahibine notunuz (Opsiyonel)</label>
                <textarea 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Merhaba, petim sizin ilanınız için çok uygun..."
                  className="w-full min-h-[80px] resize-none text-sm p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-sans"
                />
              </div>

              <div className="bg-slate-50/80 border border-slate-200/80 p-4 rounded-2xl flex gap-3 items-start cursor-pointer hover:bg-slate-100/60 transition-colors" onClick={() => setKvkkConsent(!kvkkConsent)}>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border mt-0.5 transition-colors ${kvkkConsent ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white border-slate-300'}`}>
                  {kvkkConsent && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-normal select-none">
                  İletişim bilgilerimin (telefon numaramın) yalnızca eşleşme amacıyla ve sadece başvurum kabul edildiğinde ilan sahibiyle paylaşılacağını okudum ve onaylıyorum.
                </p>
              </div>

              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-2xl font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 stroke-[2] shrink-0 text-rose-500" />
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white">
          <button
            onClick={handleSubmit}
            disabled={!hasPhone || pets.length === 0 || !selectedPetId || !kvkkConsent || submitting}
            className="inline-flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold text-sm py-3.5 px-6 rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-all shadow-sm shadow-pink-500/20 w-full"
          >
            <ShieldCheck className="w-4 h-4 stroke-[2]" />
            {submitting ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
          </button>
        </div>
      </div>
    </div>
  )
}


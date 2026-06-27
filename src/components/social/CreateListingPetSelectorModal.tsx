'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

interface CreateListingPetSelectorModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateListingPetSelectorModal({ isOpen, onClose }: CreateListingPetSelectorModalProps) {
  const router = useRouter()
  const [pets, setPets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasNeuteredPets, setHasNeuteredPets] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    setLoading(true)
    const supabase = createBrowserSupabaseClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: myPets } = await supabase
      .from('pets')
      .select('id, name, species, gender, breed, avatar_url, is_neutered')
      .order('created_at', { ascending: false })
    
    if (myPets) {
      const eligible = myPets.filter((p: any) => p.is_neutered === false || p.is_neutered === null)
      const neutered = myPets.filter((p: any) => p.is_neutered === true)
      
      setPets(eligible)
      setHasNeuteredPets(neutered.length > 0)
    }
    setLoading(false)
  }

  const handleSelect = (petId: string) => {
    onClose()
    router.push(`/owner/pets/${petId}/match`)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-border-main flex items-center justify-between bg-slate-50/50">
          <h2 className="text-[18px] font-black text-text-primary">İlan İçin Pet Seçin</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-10">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pets.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-3 block">🐾</span>
              <h3 className="text-[16px] font-bold text-text-primary mb-1">Uygun Pet Bulunamadı</h3>
              <p className="text-[13px] text-text-secondary">
                Üreme ilanı açmaya uygun (kısırlaştırılmamış) petiniz bulunmuyor. Profil ayarlarından güncelleyebilirsiniz.
              </p>
              <Link href="/owner/profile" className="btn-primary py-2.5 px-6 text-[13px] mt-4 inline-block">Profili Yönet</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-text-secondary">Hangi petiniz için üreme ilanı oluşturmak istiyorsunuz?</p>
              <div className="grid gap-3">
                {pets.map(pet => (
                  <button
                    key={pet.id}
                    onClick={() => handleSelect(pet.id)}
                    className="flex items-center gap-3 p-3 rounded-2xl border-2 border-slate-100 bg-white hover:border-primary/50 hover:bg-primary-soft/10 text-left transition-all"
                  >
                    {pet.avatar_url ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0">
                        <Image src={pet.avatar_url} alt={pet.name} fill sizes="48px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">🐾</div>
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-[15px] text-text-primary flex items-center gap-2">
                        {pet.name}
                        {pet.gender === 'male' && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Erkek</span>}
                        {pet.gender === 'female' && <span className="text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded">Dişi</span>}
                      </div>
                      <div className="text-[12px] text-text-secondary">{pet.breed || pet.species}</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                  </button>
                ))}
              </div>
              
              {hasNeuteredPets && (
                <p className="text-[11px] text-center text-slate-400 mt-2 italic">
                  * Kısırlaştırılmış dostlarınız listede gösterilmemektedir.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

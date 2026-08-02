'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { X, ChevronRight } from 'lucide-react'

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0 bg-slate-900/40 backdrop-blur-md animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-base font-bold text-slate-900">İlan İçin Pet Seçin</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-10">
              <div className="w-8 h-8 border-3 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pets.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl mb-3 block">🐾</span>
              <h3 className="text-base font-bold text-slate-900 mb-1">Uygun Pet Bulunamadı</h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                Üreme ilanı açmaya uygun (kısırlaştırılmamış) petiniz bulunmuyor. Profil ayarlarından güncelleyebilirsiniz.
              </p>
              <Link href="/owner/profile" className="inline-flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs py-2.5 px-6 rounded-2xl active:scale-[0.98] transition-all mt-4">Profili Yönet</Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-500 font-normal">Hangi petiniz için üreme ilanı oluşturmak istiyorsunuz?</p>
              <div className="grid gap-3">
                {pets.map(pet => (
                  <button
                    key={pet.id}
                    onClick={() => handleSelect(pet.id)}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white hover:border-violet-300 hover:bg-violet-50/40 text-left transition-all active:scale-[0.98] group"
                  >
                    {pet.avatar_url ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden relative shrink-0">
                        <Image src={pet.avatar_url} alt={pet.name} fill sizes="48px" className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">🐾</div>
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        {pet.name}
                        {pet.gender === 'male' && <span className="text-2xs font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-lg border border-blue-100">Erkek</span>}
                        {pet.gender === 'female' && <span className="text-2xs font-semibold bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded-lg border border-pink-100">Dişi</span>}
                      </div>
                      <div className="text-xs text-slate-500 font-normal">{pet.breed || pet.species}</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </button>
                ))}
              </div>
              
              {hasNeuteredPets && (
                <p className="text-2xs text-center text-slate-400 mt-2 italic font-normal">
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


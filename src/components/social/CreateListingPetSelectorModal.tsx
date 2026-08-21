'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { X, ChevronRight, AlertTriangle, PawPrint } from 'lucide-react'

interface CreateListingPetSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'match' | 'adoption'
}

export function CreateListingPetSelectorModal({ isOpen, onClose, mode = 'match' }: CreateListingPetSelectorModalProps) {
  const router = useRouter()
  const [pets, setPets] = useState<any[]>([])          // ilan açmaya uygun olanlar
  const [ineligiblePets, setIneligiblePets] = useState<any[]>([]) // sahip olunan ama uygun olmayanlar
  const [ownedCount, setOwnedCount] = useState(0)      // sahip olunan toplam pet
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, mode])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createBrowserSupabaseClient()

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Oturum yoksa sessizce dönmek modalı sonsuz "yükleniyor"da bırakıyordu.
        setPets([]); setIneligiblePets([]); setOwnedCount(0)
        setError('Oturumunuz doğrulanamadı. Lütfen sayfayı yenileyip tekrar deneyin.')
        return
      }

      const uid = session.user.id

      // Sahiplik iki şekilde ifade edilebiliyor: pets.owner_id veya pet_owners.role = 'owner'.
      // Sorgunun tek başına RLS'e güvenmesi, yalnızca bakıcı olarak erişilen petlerin de
      // listeye girmesine yol açıyordu; ilan açmak sahiplik gerektirir.
      const [ownerRowsRes, petsRes] = await Promise.all([
        supabase
          .from('pet_owners')
          .select('pet_id')
          .eq('profile_id', uid)
          // pet_owners yalnızca sahipler için yazılır (owner / co_owner), bakıcılar için yazılmaz.
          // Rol literali yola göre değişiyor: DB trigger'ları 'owner', legacy fallback
          // (create-pet-with-compatibility.ts) 'primary_owner' yazıyor — üçünü de kabul et.
          .in('role', ['owner', 'primary_owner', 'co_owner']),
        supabase
          .from('pets')
          .select('id, name, species, gender, breed, avatar_url, is_neutered, owner_id')
          .order('created_at', { ascending: false }),
      ])

      if (petsRes.error) {
        // Hata durumunda "hiç petiniz yok" göstermek yanıltıcıydı; artık hata olarak bildiriliyor.
        console.error('[CreateListingPetSelectorModal] pets fetch error:', petsRes.error)
        setPets([]); setIneligiblePets([]); setOwnedCount(0)
        setError('Evcil hayvanlarınız yüklenemedi. Lütfen tekrar deneyin.')
        return
      }

      const coOwnedIds = new Set((ownerRowsRes.data ?? []).map((r: any) => r.pet_id))
      const owned = (petsRes.data ?? []).filter((p: any) => p.owner_id === uid || coOwnedIds.has(p.id))

      setOwnedCount(owned.length)

      if (mode === 'adoption') {
        setPets(owned)
        setIneligiblePets([])
      } else {
        // is_neutered null/undefined ise uygun kabul edilir; yalnızca kesin true olan elenir.
        setPets(owned.filter((p: any) => p.is_neutered !== true))
        setIneligiblePets(owned.filter((p: any) => p.is_neutered === true))
      }
    } catch (err) {
      console.error('[CreateListingPetSelectorModal] beklenmeyen hata:', err)
      setPets([]); setIneligiblePets([]); setOwnedCount(0)
      setError('Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (petId: string) => {
    onClose()
    if (mode === 'adoption') {
      router.push(`/owner/pets/${petId}/adoption`)
    } else {
      router.push(`/owner/pets/${petId}/match`)
    }
  }

  if (!isOpen || !mounted) return null

  const modalTitle = mode === 'adoption' ? 'Sahiplendirme İlanı İçin Pet Seçin' : 'Eşleşme İlanı İçin Pet Seçin'
  const modalDescription = mode === 'adoption'
    ? 'Hangi petiniz için sahiplendirme ilanı oluşturmak istiyorsunuz?'
    : 'Hangi dostunuz için eşleşme ilanı oluşturmak istiyorsunuz?'

  const fixHref = ineligiblePets.length === 1
    ? `/owner/pets/${ineligiblePets[0].id}/edit`
    : '/owner/pets'
  const fixLabel = ineligiblePets.length === 1
    ? `${ineligiblePets[0].name} profilini düzenle`
    : 'Evcil Hayvanlarım'

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-100 animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <h2 className="text-base font-bold text-slate-900">{modalTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-10">
              <div className="w-8 h-8 border-3 border-violet-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            /* DURUM 1 — Yükleme hatası. Eskiden "hiç petiniz yok" gibi görünüyordu. */
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 stroke-[1.75]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Liste Yüklenemedi</h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">{error}</p>
              <button
                type="button"
                onClick={fetchData}
                className="inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-6 rounded-2xl active:scale-[0.98] transition-all mt-4"
              >
                Tekrar Dene
              </button>
            </div>
          ) : pets.length === 0 && ownedCount === 0 ? (
            /* DURUM 2 — Gerçekten hiç evcil hayvan yok. */
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <PawPrint className="w-6 h-6 stroke-[1.75]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Henüz Evcil Hayvanınız Yok</h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                İlan oluşturabilmek için önce profilinize bir evcil hayvan eklemelisiniz.
              </p>
              <Link
                href="/owner/pets/add"
                onClick={onClose}
                className="inline-flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs py-2.5 px-6 rounded-2xl active:scale-[0.98] transition-all mt-4"
              >
                Evcil Hayvan Ekle
              </Link>
            </div>
          ) : pets.length === 0 ? (
            /* DURUM 3 — Evcil hayvan VAR ama ilana uygun değil.
               Eskiden bu durumda da "Evcil Hayvan Bulunamadı" + "Evcil Hayvan Ekle" gösteriliyordu;
               başlık gerçeği yalanlıyor, buton da yanlış aksiyona götürüyordu. */
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 stroke-[1.75]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Uygun Dost Bulunamadı</h3>
              <p className="text-xs text-slate-500 font-normal leading-relaxed">
                {ineligiblePets.length === 1
                  ? `${ineligiblePets[0].name} kısırlaştırılmış olarak kayıtlı, bu yüzden eşleşme ilanı açılamıyor.`
                  : `${ineligiblePets.length} dostunuz kısırlaştırılmış olarak kayıtlı, bu yüzden eşleşme ilanı açılamıyor.`}
                {' '}Bilgi yanlışsa pet profilinden güncelleyebilirsiniz.
              </p>

              {ineligiblePets.length > 1 && (
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {ineligiblePets.map(p => (
                    <span key={p.id} className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 text-slate-600 rounded-lg text-2xs font-semibold">
                      {p.name}
                    </span>
                  ))}
                </div>
              )}

              <Link
                href={fixHref}
                onClick={onClose}
                className="inline-flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs py-2.5 px-6 rounded-2xl active:scale-[0.98] transition-all mt-4"
              >
                {fixLabel}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-xs text-slate-500 font-normal">{modalDescription}</p>
              <div className="grid gap-3">
                {pets.map(pet => (
                  <button
                    type="button"
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
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2 truncate">
                        <span className="truncate">{pet.name}</span>
                        {pet.gender === 'male' && <span className="text-2xs font-semibold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-lg border border-blue-100 shrink-0">Erkek</span>}
                        {pet.gender === 'female' && <span className="text-2xs font-semibold bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded-lg border border-pink-100 shrink-0">Dişi</span>}
                      </div>
                      <div className="text-xs text-slate-500 font-normal truncate">{pet.breed || pet.species}</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-violet-600 group-hover:text-white transition-colors shrink-0">
                      <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  </button>
                ))}
              </div>

              {ineligiblePets.length > 0 && mode !== 'adoption' && (
                <p className="text-2xs text-center text-slate-400 mt-2 italic font-normal">
                  * Kısırlaştırılmış {ineligiblePets.length} dostunuz listede gösterilmiyor.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

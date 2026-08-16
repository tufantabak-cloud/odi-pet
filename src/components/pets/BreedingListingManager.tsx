'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Database } from '@/types'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { ArchiveConfirmModal } from '@/components/pets/common/ArchiveConfirmModal'

type PetRow = Database['public']['Tables']['pets']['Row']

export default function BreedingListingManager({ pet, initialListing }: { pet: PetRow; initialListing?: any }) {
  const router = useRouter()
  const [listing, setListing] = useState<any>(initialListing !== undefined ? initialListing : null)
  const [loading, setLoading] = useState(initialListing === undefined)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ type: 'close' | 'delete'; title: string } | null>(null)
  
  // form state
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [reqs, setReqs] = useState<string[]>([])
  
  // eligibility state
  const [eligibilityData, setEligibilityData] = useState<any>(null)
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(false)
  const [eligibilityError, setEligibilityError] = useState(false)
  
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(initialListing?.photo_url || null)
  const [estrusNotif, setEstrusNotif] = useState(initialListing?.estrus_notification_enabled || false)
  const [activeCycle, setActiveCycle] = useState<any>(null)
  const [experience, setExperience] = useState(initialListing?.experience_level || 'beginner')
  const [gallery, setGallery] = useState<any[]>([])

  const availableReqs = ['Aşı Kartı Zorunlu', 'Sağlık Belgesi', 'Aynı Irk', 'Veteriner Onaylı', 'Sözleşmeli']

  useEffect(() => {
    if (initialListing === undefined) {
      const fetchListing = async () => {
        const res = await fetch(`/api/breeding-listings`)
        if (res.ok) {
          const data = await res.json()
          const myListing = data.listings?.find((l: any) => l.pet_id === pet.id)
          if (myListing) {
            setListing(myListing)
            if (myListing.photo_url) setSelectedPhotoUrl(myListing.photo_url)
            if (myListing.estrus_notification_enabled) setEstrusNotif(myListing.estrus_notification_enabled)
            if (myListing.experience_level) setExperience(myListing.experience_level)
          }
        }
        setLoading(false)
      }
      fetchListing()
    }
    const fetchGallery = async () => {
      const supabase = createBrowserSupabaseClient()
      const { data } = await supabase.from('pet_gallery').select('id, image_url').eq('pet_id', pet.id)
      if (data) setGallery(data)
    }
    const fetchEstrusCycle = async () => {
      const supabase = createBrowserSupabaseClient()
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase
        .from('pet_estrus_cycles')
        .select('id, start_date, end_date, notes')
        .eq('pet_id', pet.id)
        .lte('start_date', today)
        .is('end_date', null)
        .order('start_date', { ascending: false })
        .limit(1)
      if (data && data.length > 0) {
        setActiveCycle(data[0])
      }
    }
    fetchGallery()
    if (pet.gender === 'female') {
      fetchEstrusCycle()
    }
  }, [pet.id, pet.gender, initialListing])

  useEffect(() => {
    // Sadece ilan oluşturulurken veya düzenlenirken kontrol et (zaten bu component Breeding amaçlıdır)
    const checkEligibility = async () => {
      setIsCheckingEligibility(true)
      setEligibilityError(false)
      try {
        const res = await fetch(`/api/pets/${pet.id}/breeding-eligibility/evaluate`, { method: 'POST' })
        if (res.ok) {
          const data = await res.json()
          setEligibilityData(data)
        } else {
          setEligibilityError(true)
        }
      } catch (e) {
        setEligibilityError(true)
      }
      setIsCheckingEligibility(false)
    }

    if (!listing || isEditing) {
      checkEligibility()
    }
  }, [pet.id, isEditing, listing])

  if (loading) {
    return (
      <div className="mb-8 card-base bg-white border border-border-main p-5 rounded-2xl shadow-sm min-h-[320px] animate-pulse flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-5 border-b border-border-main pb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-100 rounded w-1/3" />
            <div className="h-3 bg-slate-100 rounded w-2/3" />
          </div>
        </div>
        <div className="space-y-4 flex-1">
          <div className="h-10 bg-slate-100 rounded-xl w-full" />
          <div className="h-20 bg-slate-100 rounded-xl w-full" />
          <div className="h-10 bg-slate-100 rounded-xl w-full" />
        </div>
      </div>
    )
  }

  if (listing && !isEditing) {
    const getExperienceBadge = (level: string) => {
      switch(level) {
        case 'experienced': return { icon: '⭐', label: 'Deneyimli', color: 'bg-amber-50 text-amber-700 border-amber-200' }
        case 'expert': return { icon: '🏆', label: 'Çok Deneyimli', color: 'bg-violet-50 text-violet-700 border-violet-200' }
        case 'beginner':
        default: return { icon: '🌱', label: 'İlk Deneyim', color: 'bg-green-50 text-green-700 border-green-200' }
      }
    }
    const exp = getExperienceBadge(listing.experience_level)

    return (
      <div className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl relative overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white to-transparent opacity-50 rounded-bl-[100px] pointer-events-none" />
        <div className="flex justify-between items-start mb-2 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-rose-700 text-[11px] font-black tracking-wide border border-rose-100 shadow-sm mb-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-rose-400"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              AKTİF İLANINIZ
            </span>
            <h3 className="font-bold text-[16px] text-text-primary">{listing.title}</h3>
          </div>
        </div>
        {listing.notes && <p className="text-[13px] text-text-secondary mb-3 relative z-10 line-clamp-2">{listing.notes}</p>}
        <div className="flex flex-wrap gap-1.5 relative z-10 mb-3">
          {listing.requirements?.map((req: string) => (
            <span key={req} className="px-2 py-1 bg-white border border-rose-100 text-rose-600 rounded-md text-[10px] font-bold shadow-sm">
              {req}
            </span>
          ))}
          <span className={`px-2 py-1 rounded-md text-[10px] font-bold shadow-sm border flex items-center gap-1 bg-white ${exp.color}`}>
            <span>{exp.icon}</span> {exp.label}
          </span>
        </div>
        
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-rose-100/50 relative z-10">
          <button onClick={() => {
            setTitle(listing.title)
            setNotes(listing.notes || '')
            setStart(listing.preferred_date_start || '')
            setEnd(listing.preferred_date_end || '')
            setReqs(listing.requirements || [])
            setSelectedPhotoUrl(listing.photo_url || null)
            setEstrusNotif(listing.estrus_notification_enabled || false)
            setExperience(listing.experience_level || 'beginner')
            setIsEditing(true)
          }} className="btn-secondary flex-1 py-2 text-[12px]">
            Düzenle
          </button>
          <button onClick={() => setConfirmAction({ type: 'close', title: 'Eşleşme İlanı' })} className="btn-secondary flex-1 py-2 text-[12px]">
            İlanı Kapat
          </button>
          <button onClick={() => setConfirmAction({ type: 'delete', title: 'Eşleşme İlanı' })} className="px-4 bg-red-50 border border-red-200 text-red-600 font-bold text-[12px] py-2 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center cursor-pointer">
            🗑 Sil
          </button>
        </div>
      </div>
    )
  }

  if (pet.is_neutered) {
    return (
      <div className="mb-8 card-base bg-white border border-border-main p-5 text-center flex flex-col items-center gap-3 relative overflow-hidden">
        <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center text-2xl mb-1 shadow-inner border border-border-main">
          ✂️
        </div>
        <div>
          <h3 className="font-bold text-text-primary text-base">Kısırlaştırılmış Profil</h3>
          <p className="text-[13px] text-text-secondary mt-1 max-w-[280px]">
            Petinizin profilinde &apos;Kısırlaştırılmış&apos; seçili olduğundan üreme ilanı oluşturamazsınız. Bu bilgide hata varsa profilinizi güncelleyebilirsiniz.
          </p>
        </div>
        <button onClick={() => router.push(`/owner/pets/${pet.id}/edit`)} className="mt-2 btn-primary py-2px-6 h-10 text-[13px] px-6 rounded-xl shadow-md transition-all">
          Profili Güncelle
        </button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    
    try {
      const res = await fetch(`/api/breeding-listings/${pet.id}`, {
        method: listing ? 'PATCH' : 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          title,
          notes,
          preferred_date_start: start || null,
          preferred_date_end: end || null,
          requirements: reqs,
          photo_url: selectedPhotoUrl || null,
          estrus_notification_enabled: estrusNotif,
          experience_level: experience
        })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'İlan oluşturulamadı')
      }
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const toggleReq = (req: string) => {
    if (reqs.includes(req)) {
      setReqs(prev => prev.filter(r => r !== req))
    } else {
      if (reqs.length < 5) {
        setReqs(prev => [...prev, req])
      } else {
        alert('En fazla 5 şart seçebilirsiniz.')
      }
    }
  }

  return (
    <div className="mb-8 card-base bg-white border border-border-main p-5 rounded-2xl shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-pink-50 to-transparent opacity-70 pointer-events-none -z-0 rounded-bl-full"/>
      <div className="flex items-center justify-between mb-5 border-b border-border-main pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-xl shadow-sm border border-pink-100 text-pink-500">❤️</div>
          <div>
            <h3 className="font-extrabold text-[16px] text-text-primary">{listing ? 'İlanı Düzenle' : 'Üreme İlanı Oluştur'}</h3>
            <p className="text-[12px] text-text-secondary font-normal mt-0.5">{listing ? 'İlan bilgilerinizi güncelleyin' : 'Uygun bir eş adayı bulmak için ilan verin'}</p>
          </div>
        </div>
        {listing && (
          <button onClick={() => setIsEditing(false)} className="text-[12px] font-bold text-text-secondary hover:text-text-primary bg-surface hover:bg-bg-main px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
            İptal
          </button>
        )}
      </div>

      {isCheckingEligibility && (
        <div className="p-4 mb-5 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3 relative z-10">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-blue-400"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          <span className="text-[13px] font-bold text-blue-800">Üreme uygunluğu kontrol ediliyor…</span>
        </div>
      )}

      {eligibilityError && !isCheckingEligibility && (
        <div className="p-4 mb-5 bg-red-50 border border-red-100 rounded-xl relative z-10">
          <p className="text-[13px] font-bold text-red-800 mb-2">Uygunluk kontrolü şu anda tamamlanamadı. Lütfen tekrar deneyin.</p>
          <button type="button" onClick={() => {
            setIsCheckingEligibility(true)
            fetch(`/api/pets/${pet.id}/breeding-eligibility/evaluate`, { method: 'POST' })
              .then(res => res.json())
              .then(data => { setEligibilityData(data); setEligibilityError(false) })
              .catch(() => setEligibilityError(true))
              .finally(() => setIsCheckingEligibility(false))
          }} className="px-4 py-2 bg-white text-red-700 text-[12px] font-bold rounded-lg border border-red-200 hover:bg-red-50">Tekrar Dene</button>
        </div>
      )}

      {!isCheckingEligibility && !eligibilityError && eligibilityData && (
        <>
          {eligibilityData.status !== 'eligible' && eligibilityData.blocking_reasons?.length > 0 && (
            <div className="p-4 mb-4 bg-red-50/50 border border-red-200 rounded-xl relative z-10">
              <h4 className="font-bold text-[14px] text-red-800 mb-2 flex items-center gap-2">
                <span>🛑</span> İlan açmadan önce tamamlanması gerekenler
              </h4>
              <ul className="flex flex-col gap-2">
                {eligibilityData.blocking_reasons.map((r: any, i: number) => {
                  let msg = r.message;
                  if (r.code === 'PET_NEUTERED') msg = 'Kısırlaştırılmış petler için üreme ilanı oluşturulamaz.';
                  if (r.code === 'UNSUPPORTED_SPECIES') msg = 'Üreme ilanı yalnızca kedi ve köpekler için kullanılabilir.';
                  if (r.code === 'SEX_REQUIRED') msg = 'Petinizin cinsiyet bilgisini tamamlayın.';
                  if (r.code === 'BIRTH_DATE_REQUIRED') msg = 'Petinizin doğum tarihini tamamlayın.';
                  
                  return (
                    <li key={i} className="text-[13px] text-red-700 bg-white px-3 py-2 rounded-lg border border-red-100 shadow-sm flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      <span>{msg}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {eligibilityData.advisories?.length > 0 && (
            <div className="p-4 mb-5 bg-sky-50/50 border border-sky-200 rounded-xl relative z-10">
              <h4 className="font-bold text-[14px] text-sky-800 mb-2 flex items-center gap-2">
                <span>💡</span> İlanınızı daha güvenilir hâle getirin
              </h4>
              <ul className="flex flex-col gap-2">
                {eligibilityData.advisories.map((a: any, i: number) => {
                  let msg = a.message;
                  if (a.code === 'VETERINARY_CLEARANCE_OPTIONAL') msg = 'Veteriner kontrolü ekleyerek ilanınızda güven rozeti kullanabilirsiniz.';
                  if (a.code === 'AGE_RULE_NOT_CONFIGURED') msg = 'Yaş uygunluğu kuralları henüz değerlendirme kapsamına alınmamıştır.';
                  
                  return (
                    <li key={i} className="text-[13px] text-sky-700 bg-white px-3 py-2 rounded-lg border border-sky-100 shadow-sm flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      <span>{msg}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </>
      )}
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
        <div>
          <label className="block text-[12px] font-bold text-text-secondary mb-1.5">İlan Başlığı *</label>
          <input required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} className="input-base w-full bg-surface border-border-main focus:bg-white focus:border-pink-300 focus:ring-4 focus:ring-pink-50 transition-all placeholder:text-text-secondary text-[13px]" placeholder="Örn: 2 yaşındaki oğluma eş arıyorum" />
        </div>
        
        <div>
          <label className="block text-[12px] font-bold text-text-secondary mb-1.5">Açıklama (Opsiyonel)</label>
          <textarea maxLength={500} rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="input-base w-full bg-surface border-border-main focus:bg-white focus:border-pink-300 focus:ring-4 focus:ring-pink-50 transition-all placeholder:text-text-secondary text-[13px]" placeholder="Aşı durumu, huy, beklentileriniz..." />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-bold text-text-secondary mb-1.5">Başlangıç Tarihi</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} className="input-base h-[42px] w-full text-[13px] bg-surface border-border-main" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-text-secondary mb-1.5">Bitiş Tarihi</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="input-base h-[42px] w-full text-[13px] bg-surface border-border-main" />
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-bold text-text-secondary mb-2 mt-1">Özel Şartlar (Max 5)</label>
          <div className="flex flex-wrap gap-2">
            {availableReqs.map(req => {
              const isSelected = reqs.includes(req)
              return (
                <button type="button" key={req} onClick={() => toggleReq(req)} 
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all border shadow-sm ${isSelected ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-white border-border-main text-text-secondary hover:bg-surface'}`}>
                  {isSelected ? '✓ ' : ''}{req}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="block text-[12px] font-bold text-text-secondary mb-1.5 mt-2">İlan Fotoğrafı (Opsiyonel)</label>
          {gallery.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {gallery.map((p) => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedPhotoUrl(p.image_url)}
                  className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200 ${selectedPhotoUrl === p.image_url ? 'border-violet-500 ring-2 ring-violet-300 scale-105' : 'border-border-main hover:border-violet-300'}`}
                >
                  <img src={p.image_url} alt="Gallery" className="w-full h-full object-cover aspect-square" />
                  {selectedPhotoUrl === p.image_url && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white text-[10px] font-bold">✓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[12px] bg-surface border border-border-main p-3 rounded-xl text-text-secondary">
              Önce galeriye fotoğraf ekleyin. <a href={`/owner/pets/${pet.id}/gallery`} className="text-violet-600 font-bold hover:underline">Galeriye Git →</a>
            </div>
          )}
          {selectedPhotoUrl && (
            <p className="text-[11px] text-violet-600 font-bold mt-2 flex items-center gap-1">
              <span>✓</span> Bu fotoğraf ilanda gösterilecek
            </p>
          )}
        </div>

        <div>
          <label className="block text-[12px] font-bold text-text-secondary mb-1.5 mt-2">Üreme Deneyiminiz</label>
          <div className="flex flex-col gap-2">
            {[
              { id: 'beginner', label: '🌱 İlk Deneyim' },
              { id: 'experienced', label: '⭐ Deneyimliyim' },
              { id: 'expert', label: '🏆 Çok Deneyimliyim' }
            ].map(opt => (
              <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${experience === opt.id ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-border-main text-text-secondary hover:bg-surface'}`}>
                <input type="radio" name="experience" value={opt.id} checked={experience === opt.id} onChange={(e) => setExperience(e.target.value)} className="w-4 h-4 text-violet-600 focus:ring-violet-500 border-border-main" />
                <span className="text-[13px] font-bold">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {pet.gender === 'female' && (
          <div className="p-4 bg-pink-50/50 border border-pink-100 rounded-xl mt-2">
            {activeCycle ? (
              <>
                <h4 className="font-bold text-[13px] text-pink-700 mb-2">🌸 Aktif kızgınlık döngüsü mevcut</h4>
                <div className="text-[12px] font-normal text-pink-800 mb-3 bg-white p-2 rounded border border-pink-100 inline-block">
                  Başlangıç: {new Date(activeCycle.start_date).toLocaleDateString('tr-TR')} — Bitiş: {new Date(activeCycle.end_date).toLocaleDateString('tr-TR')}
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input type="checkbox" checked={estrusNotif} onChange={e => setEstrusNotif(e.target.checked)} className="w-4 h-4 rounded text-pink-500 focus:ring-pink-500 border-pink-300" />
                  <span className="text-[13px] font-bold text-pink-900">Bu ilan için bildirim göndermek ister misiniz?</span>
                </label>
              </>
            ) : (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <h4 className="font-bold text-[13px] text-amber-800 mb-1">🌸 Aktif kızgınlık döngüsü bulunamadı.</h4>
                <p className="text-[12px] text-amber-700 mb-3 leading-relaxed">
                  Eşleşme bildirimleri için önce Sağlık sekmesinden kızgınlık döngüsü ekleyin.
                </p>
                <button type="button" onClick={() => router.push(`/owner/pets/${pet.id}?tab=health`)} className="text-[12px] font-bold bg-white text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg shadow-sm hover:bg-amber-100 transition-colors cursor-pointer">
                  Döngü Ekle →
                </button>
              </div>
            )}
          </div>
        )}

        {error && <div className="text-red-500 text-[13px] font-bold mt-1">{error}</div>}
        
        {(!eligibilityData || eligibilityData.status !== 'eligible' || eligibilityError) && !isCheckingEligibility && (
          <div className="text-center text-[12px] text-text-secondary mt-1 mb-1 font-medium">
            Yukarıdaki zorunlu bilgileri tamamladıktan sonra ilan oluşturabilirsiniz.
          </div>
        )}

        <button 
          type="submit" 
          disabled={submitting || isCheckingEligibility || eligibilityError || (eligibilityData && eligibilityData.status !== 'eligible')} 
          className="btn-primary w-full h-[46px] bg-pink-500 hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-[14px] shadow-lg shadow-pink-500/20 mt-2 transition-all"
        >
          {submitting ? 'Kaydediliyor...' : (listing ? 'Değişiklikleri Kaydet' : 'İlanı Yayınla')}
        </button>
      </form>

      {confirmAction && (
        <ArchiveConfirmModal
          isOpen={!!confirmAction}
          itemTitle={confirmAction.title}
          isHealthRecord={false}
          onClose={() => setConfirmAction(null)}
          onConfirm={async () => {
            if (confirmAction.type === 'close') {
              await fetch(`/api/breeding-listings/${pet.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'closed' }),
              })
            } else {
              await fetch(`/api/breeding-listings/${pet.id}`, { method: 'DELETE' })
            }
            setConfirmAction(null)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

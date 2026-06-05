'use client'

import React, { useState } from 'react'
import EmptyState from '@/components/ui/EmptyState'
import citiesData from '@/lib/cities.json'

interface Candidate {
  id: string
  name: string
  breed: string
  gender: string
  city: string
  avatar_url: string | null
  birth_date: string | null
}

export default function MatchTab({ pet }: { pet: any }) {
  const [selectedCities, setSelectedCities] = useState<string[]>(pet.city ? [pet.city] : ['İstanbul'])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mutualMatch, setMutualMatch] = useState<Candidate | null>(null)

  const handleSearch = async () => {
    if (selectedCities.length === 0) {
      setError('Lütfen en az bir şehir seçin.')
      return
    }
    
    setLoading(true)
    setError(null)
    setMutualMatch(null)
    try {
      const res = await fetch(`/api/pets/${pet.id}/match?cities=${encodeURIComponent(selectedCities.join(','))}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        return
      }
      setCandidates(data.candidates || [])
      setCurrentIndex(0)
      setSearched(true)
    } catch (err) {
      setError('Adaylar getirilirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: 'like' | 'skip') => {
    if (currentIndex >= candidates.length) return
    const candidate = candidates[currentIndex]
    
    // Optimizasyon: Kullanıcı beklememesi için UI anında güncellenir
    setCurrentIndex(prev => prev + 1)
    
    try {
      const res = await fetch(`/api/pets/${pet.id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_pet_id: candidate.id, action })
      })
      const data = await res.json()
      if (res.ok && data.is_mutual) {
        setMutualMatch(candidate)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddCity = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value
    if (city && !selectedCities.includes(city)) {
      setSelectedCities(prev => [...prev, city])
    }
    e.target.value = '' // Reset select
  }

  const removeCity = (city: string) => {
    setSelectedCities(prev => prev.filter(c => c !== city))
  }

  // Pet-odaklı 3D illüstrasyon SVG'si (Empty state ve fallback için)
  const PetPawIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
      <path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 8a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0v-1a3 3 0 0 0-3-3Z" />
      <path d="M5 8a3 3 0 0 0-3 3v1a3 3 0 0 0 6 0v-1a3 3 0 0 0-3-3Z" />
      <path d="M12 22a7 7 0 0 0 7-7 4 4 0 0 0-4-4 4 4 0 0 0-6 0 4 4 0 0 0-4 4 7 7 0 0 0 7 7Z" />
    </svg>
  )

  if (mutualMatch) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center animate-fadeInUp">
        <div className="text-[64px] mb-4">🎉</div>
        <h2 className="text-2xl font-black text-rose-500 mb-2">Eşleşme Sağlandı!</h2>
        <p className="text-text-secondary text-sm mb-6">Sen ve {mutualMatch.name} birbirinizi beğendiniz!</p>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center overflow-hidden border-2 border-rose-200">
            {pet.avatar_url ? <img src={pet.avatar_url} className="w-full h-full object-cover" /> : <PetPawIcon />}
          </div>
          <div className="text-2xl text-rose-400">❤️</div>
          <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center overflow-hidden border-2 border-rose-200">
            {mutualMatch.avatar_url ? <img src={mutualMatch.avatar_url} className="w-full h-full object-cover" /> : <PetPawIcon />}
          </div>
        </div>
        <button onClick={() => setMutualMatch(null)} className="btn-primary py-3 px-8 text-sm">Aramaya Devam Et</button>
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState 
        icon={<PetPawIcon />}
        title="Bir Hata Oluştu"
        message={error}
        cta={{ label: 'Geri Dön', onClick: () => setError(null) }}
      />
    )
  }

  if (!searched && !loading) {
    return (
      <div className="flex flex-col gap-5 animate-fadeInUp">
        <div className="card-base p-6 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
            <span className="text-2xl">❤️</span>
          </div>
          <div>
            <h3 className="font-extrabold text-text-primary text-[17px] mb-1">Eş Bulma Zamanı</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              {pet.name} için seçtiğiniz şehirlerdeki aynı tür ve ırktaki en uygun adayları bulun.
            </p>
          </div>
          <div className="w-full mt-2">
            <label className="block text-[12px] font-bold text-text-secondary text-left mb-2">Şehir(ler) Seçin</label>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedCities.map(city => (
                <span key={city} className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                  {city}
                  <button onClick={() => removeCity(city)} className="w-4 h-4 rounded-full hover:bg-rose-200 flex items-center justify-center transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </span>
              ))}
            </div>

            <select 
              onChange={handleAddCity}
              className="input-base w-full bg-white mb-4"
              defaultValue=""
            >
              <option value="" disabled>+ Şehir Ekle</option>
              {citiesData.map((c: any) => (
                <option key={c.code} value={c.name} disabled={selectedCities.includes(c.name)}>{c.name}</option>
              ))}
            </select>
            <button 
              onClick={handleSearch} 
              disabled={selectedCities.length === 0}
              className="btn-primary w-full py-3.5 text-[14px] disabled:opacity-50"
            >
              Adayları Bul
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card-base p-8 text-center text-text-secondary text-[14px] animate-pulse">
        Uygun adaylar aranıyor...
      </div>
    )
  }

  const currentCandidate = candidates[currentIndex]

  if (!currentCandidate) {
    return (
      <EmptyState 
        icon={<PetPawIcon />}
        title="Aday Bulunamadı"
        message="Seçtiğiniz şehirlerde kendi ırkından uygun bir eş adayı kalmadı veya henüz kayıtlı değil."
        cta={{ label: 'Farklı Şehir Ara', onClick: () => { setSearched(false); setCurrentIndex(0); setCandidates([]); } }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 animate-fadeInUp">
      <div className="card-base overflow-hidden border border-border-main relative">
        <div className="w-full aspect-square bg-slate-100 flex items-center justify-center">
          {currentCandidate.avatar_url ? (
             <img src={currentCandidate.avatar_url} alt={currentCandidate.name} className="w-full h-full object-cover" />
          ) : (
            <PetPawIcon />
          )}
        </div>
        <div className="p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-extrabold text-[20px] text-text-primary">{currentCandidate.name}</h3>
            <span className="text-xs font-bold px-2 py-1 bg-bg-main rounded-md text-text-secondary">
              {currentCandidate.gender}
            </span>
          </div>
          <p className="text-[14px] text-text-secondary font-medium">{currentCandidate.breed}</p>
          <p className="text-[13px] text-text-secondary mt-1 flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {currentCandidate.city}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 justify-center mt-2">
        <button 
          onClick={() => handleAction('skip')}
          className="w-16 h-16 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-500 transition-all active:scale-95 shadow-sm"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <button 
          onClick={() => handleAction('like')}
          className="w-20 h-20 rounded-full bg-white border-2 border-rose-100 flex items-center justify-center text-4xl hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-95 shadow-sm"
        >
          ❤️
        </button>
      </div>
    </div>
  )
}

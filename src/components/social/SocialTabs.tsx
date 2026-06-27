'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AdoptionFeedCard } from './AdoptionFeedCard'
import { BreedingFeedCard } from './BreedingFeedCard'
import { LostFeedCard } from './LostFeedCard'
import { BreedingApplicationsManager } from './BreedingApplicationsManager'
import { CreateListingPetSelectorModal } from './CreateListingPetSelectorModal'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import citiesData from '@/lib/cities.json'
import dynamic from 'next/dynamic'

const LostMapView = dynamic(() => import('./LostMapView'), { ssr: false, loading: () => <div className="w-full h-[500px] bg-bg-main animate-pulse rounded-2xl flex items-center justify-center font-normal text-text-secondary">Harita Yükleniyor...</div> })

type Tab = 'adoption' | 'lost' | 'match'

const getAge = (birthDate: string) => {
  const ageInMs = Date.now() - new Date(birthDate).getTime()
  const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25)
  if (ageInYears < 1) {
    return `${Math.floor(ageInYears * 12)} aylık`
  }
  return `${Math.floor(ageInYears)} yaşında`
}

const getExperienceBadge = (level: string) => {
  switch(level) {
    case 'experienced': 
      return { 
        icon: '⭐', 
        label: 'Deneyimli', 
        color: 'bg-amber-50 text-amber-700 border-amber-200' 
      }
    case 'expert': 
      return { 
        icon: '🏆', 
        label: 'Çok Deneyimli', 
        color: 'bg-violet-50 text-violet-700 border-violet-200' 
      }
    default: 
      return { 
        icon: '🌱', 
        label: 'İlk Deneyim', 
        color: 'bg-green-50 text-green-700 border-green-200' 
      }
  }
}

export function SocialTabs({ 
  adoptions, 
  lostPets, 
  matches: initialMatches 
}: { 
  adoptions: any[]
  lostPets: any[]
  matches: any[] 
}) {
  const [activeTab, setActiveTab] = useState<Tab>('adoption')

  const [matches, setMatches] = useState<any[]>(initialMatches || [])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [myListings, setMyListings] = useState<any[]>([])
  const [userApplications, setUserApplications] = useState<any[]>([])
  const [estrusOnly, setEstrusOnly] = useState(false)
  
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Discover candidates states
  const [showDiscover, setShowDiscover] = useState(false)
  const [candidates, setCandidates] = useState<any[]>([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [mutualMatch, setMutualMatch] = useState<any | null>(null)
  const [discoverError, setDiscoverError] = useState<string | null>(null)
  const [searchedDiscover, setSearchedDiscover] = useState(false)

  // Distance states
  const [maxDistance, setMaxDistance] = useState<number | null>(null)
  const [userCity, setUserCity] = useState<string>('')

  // Lost reports states
  const [myLostReports, setMyLostReports] = useState<any[]>([])
  const [myLostReportsLoaded, setMyLostReportsLoaded] = useState(false)
  const [lostSpeciesFilter, setLostSpeciesFilter] = useState('Tümü')
  const [lostCityFilter, setLostCityFilter] = useState('')
  const [lostDateFilter, setLostDateFilter] = useState('Tümü')
  const [lostViewMode, setLostViewMode] = useState<'list' | 'map'>('list')

  const [speciesFilter, setSpeciesFilter] = useState('Tümü')
  const [genderFilter, setGenderFilter] = useState('Tümü')
  const [cityFilter, setCityFilter] = useState('')
  const [breedFilter, setBreedFilter] = useState('')

  useEffect(() => {
    if (activeTab === 'match') {
      const handler = setTimeout(() => {
        fetchMatches()
      }, 300)
      return () => clearTimeout(handler)
    }
  }, [activeTab, speciesFilter, genderFilter, cityFilter, breedFilter, estrusOnly, maxDistance, userCity])

  useEffect(() => {
    if (activeTab === 'match') {
      checkMyListing()
      fetchUserApplications()
    } else if (activeTab === 'lost') {
      checkMyLostReports()
    }
  }, [activeTab])

  useEffect(() => {
    if (myListings?.[0]?.pets?.city) {
      const petCity = myListings[0].pets.city
      setSelectedCities([petCity])
      setUserCity(petCity)
    } else {
      setSelectedCities(['İstanbul'])
      setUserCity('')
    }
  }, [myListings])

  const checkMyListing = async () => {
    const supabase = createBrowserSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data } = await supabase
      .from('breeding_listings')
      .select('*, pets(id, name, avatar_url, species, breed, gender, birth_date, city)')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (data) setMyListings(data)
    else setMyListings([])
  }

  const checkMyLostReports = async () => {
    const supabase = createBrowserSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setMyLostReportsLoaded(true)
      return
    }

    const { data } = await supabase
      .from('lost_reports')
      .select('*, pets!inner(id, name, avatar_url, species, breed, city, birth_date, owner_id)')
      .eq('status', 'active')
      .eq('pets.owner_id', session.user.id)

    if (data) setMyLostReports(data)
    else setMyLostReports([])
    setMyLostReportsLoaded(true)
  }

  const handleMarkLostReportFound = async (petId: string) => {
    if (!confirm('Dostunuz bulundu mu? İlan kapatılacaktır.')) return
    try {
      const res = await fetch(`/api/pets/${petId}/lost`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'found' })
      })
      if (!res.ok) throw new Error('Hata oluştu')
      checkMyLostReports()
      window.location.reload()
    } catch (err) {
      alert('İşlem başarısız oldu.')
    }
  }

  const fetchUserApplications = async () => {
    try {
      const res = await fetch('/api/user/applications')
      const json = await res.json()
      if (res.ok) {
        setUserApplications(json.data || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const currentPetId = myListings?.[0]?.pet_id ?? null

  const handleDiscover = async () => {
    if (!currentPetId) return
    if (selectedCities.length === 0) {
      setDiscoverError('Lütfen en az bir şehir seçin.')
      return
    }
    setDiscoverLoading(true)
    setDiscoverError(null)
    setMutualMatch(null)
    setSearchedDiscover(false)
    try {
      const res = await fetch(`/api/pets/${currentPetId}/match?cities=${encodeURIComponent(selectedCities.join(','))}`)
      const data = await res.json()
      if (!res.ok) {
        setDiscoverError(data.error || 'Adaylar getirilirken hata oluştu.')
        return
      }
      setCandidates(data.candidates || [])
      setCurrentIndex(0)
      setSearchedDiscover(true)
    } catch (err) {
      setDiscoverError('Adaylar getirilirken bir hata oluştu.')
    } finally {
      setDiscoverLoading(false)
    }
  }

  const handleDiscoverAction = async (action: 'like' | 'skip') => {
    if (!currentPetId || currentIndex >= candidates.length) return
    const candidate = candidates[currentIndex]
    
    setCurrentIndex(prev => prev + 1)
    
    try {
      const res = await fetch(`/api/pets/${currentPetId}/match`, {
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

  const fetchMatches = async () => {
    setLoadingMatches(true)
    try {
      const params = new URLSearchParams()
      if (speciesFilter !== 'Tümü') params.append('species', speciesFilter)
      if (genderFilter !== 'Tümü') params.append('gender', genderFilter)
      if (cityFilter.trim()) params.append('city', cityFilter.trim())
      if (breedFilter.trim()) params.append('breed', breedFilter.trim())
      if (estrusOnly) params.append('estrus', 'true')
      if (maxDistance && userCity) {
        params.append('maxDistanceKm', String(maxDistance))
        params.append('userCity', userCity)
      }

      const res = await fetch(`/api/social/breeding-listings?${params.toString()}`)
      const json = await res.json()
      if (res.ok) {
        setMatches(json.data || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMatches(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      {/* Tab Switcher */}
      <div className="flex bg-white rounded-2xl p-1.5 border border-border-main shadow-sm mb-2">
        <button
          onClick={() => setActiveTab('adoption')}
          className={`flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all ${
            activeTab === 'adoption' 
              ? 'bg-violet-50 text-violet-700 shadow-sm' 
              : 'text-text-secondary hover:bg-surface'
          }`}
        >
          🏠 Sahiplendirme
        </button>
        <button
          onClick={() => setActiveTab('lost')}
          className={`flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all ${
            activeTab === 'lost' 
              ? 'bg-red-50 text-red-700 shadow-sm' 
              : 'text-text-secondary hover:bg-surface'
          }`}
        >
          🚨 Kayıp İlanları
        </button>
        <button
          onClick={() => setActiveTab('match')}
          className={`flex-1 py-2.5 text-[13px] font-bold rounded-xl transition-all ${
            activeTab === 'match' 
              ? 'bg-pink-50 text-pink-700 shadow-sm' 
              : 'text-text-secondary hover:bg-surface'
          }`}
        >
          ❤️ Eşleştirme
        </button>
      </div>

      {/* Adoption Tab Content */}
      {activeTab === 'adoption' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {adoptions.length === 0 ? (
            <div className="card-base bg-white border border-border-main p-10 text-center flex flex-col items-center gap-3">
              <span className="text-[36px]">🏠</span>
              <p className="text-[14px] text-text-secondary font-normal">Şu an için aktif bir sahiplendirme ilanı bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adoptions.map(adoption => (
                <AdoptionFeedCard key={adoption.id} adoption={adoption} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lost Pets Tab Content */}
      {activeTab === 'lost' && (() => {
        const filteredLostPets = lostPets.filter(report => {
          if (myLostReports.some(r => r.id === report.id)) {
            return false
          }

          const pet = report.pet
          if (!pet) return false

          if (lostSpeciesFilter !== 'Tümü') {
            const matchSpecies = lostSpeciesFilter === 'Kedi' ? 'kedi' : 'köpek'
            const petSpeciesLower = (pet.species || '').toLowerCase()
            if (petSpeciesLower !== matchSpecies && petSpeciesLower !== (matchSpecies === 'kedi' ? 'cat' : 'dog')) {
              return false
            }
          }

          if (lostCityFilter.trim() !== '') {
            const cityMatch = (pet.city || '').toLowerCase().includes(lostCityFilter.trim().toLowerCase())
            if (!cityMatch) return false
          }

          if (lostDateFilter !== 'Tümü') {
            if (report.last_seen_at) {
              const diffMs = Date.now() - new Date(report.last_seen_at).getTime()
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
              if (lostDateFilter === 'Bugün' && diffDays > 0) return false
              if (lostDateFilter === 'Son 3 Gün' && diffDays > 3) return false
              if (lostDateFilter === 'Son 7 Gün' && diffDays > 7) return false
            }
          }

          return true
        })

        return (
          <div className="flex flex-col gap-4 animate-fadeIn">
            {/* Kendi Aktif Kayıp İlanınız */}
            {myLostReports.length > 0 && (
              <div className="mb-2 flex flex-col gap-4">
                {myLostReports.map(report => {
                  const pet = report.pets
                  return (
                    <div key={report.id} className="card-base bg-white border-2 border-red-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-50 to-transparent rounded-bl-full opacity-50 -z-10" />
                      
                      <div className="flex justify-between items-start mb-3">
                        <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-100 text-[10px] font-black px-2 py-0.5 rounded-md">
                          📢 AKTİF KAYIP İLANINIZ
                        </span>
                      </div>

                      <div className="flex gap-4 items-center">
                        <div className="w-14 h-14 rounded-xl bg-bg-main overflow-hidden relative shrink-0">
                          {pet?.avatar_url ? (
                            <Image src={pet.avatar_url} alt={pet?.name || 'Pet'} fill sizes="56px" className="object-cover" />
                          ) : (
                            <span className="flex items-center justify-center w-full h-full text-2xl">🐾</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-text-primary text-[16px] truncate">{pet?.name}</h4>
                          <p className="text-[12px] text-text-secondary font-normal truncate flex items-center gap-1.5 mt-0.5">
                            <span>🚨</span> Son Görülme: {report.last_seen_location}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-4 border-t border-red-100">
                        <button 
                          onClick={() => handleMarkLostReportFound(pet.id)}
                          className="w-full text-center py-2.5 text-[13px] font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20"
                        >
                          Bulundu Olarak İşaretle ✓
                        </button>
                      </div>
                    </div>
                  )
                })}
                <div className="h-px bg-border-main my-2 w-full max-w-[200px] mx-auto" />
              </div>
            )}

            {/* Filtre Bar */}
            <div className="bg-white border border-border-main p-4 rounded-2xl shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h4 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Kayıp İlanı Filtrele</h4>
                <div className="flex bg-bg-main p-1 rounded-lg">
                  <button onClick={() => setLostViewMode('list')} className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${lostViewMode === 'list' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Liste</button>
                  <button onClick={() => setLostViewMode('map')} className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${lostViewMode === 'map' ? 'bg-white shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>🗺️ Harita</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <select className="input-base text-[13px] py-2 bg-white" value={lostSpeciesFilter} onChange={e => setLostSpeciesFilter(e.target.value)}>
                  <option value="Tümü">Tüm Türler</option>
                  <option value="Kedi">🐱 Kedi</option>
                  <option value="Köpek">🐶 Köpek</option>
                </select>
                <input 
                  type="text" 
                  placeholder="Şehir Ara..." 
                  className="input-base text-[13px] py-2" 
                  value={lostCityFilter}
                  onChange={e => setLostCityFilter(e.target.value)}
                />
                <select className="input-base text-[13px] py-2 bg-white" value={lostDateFilter} onChange={e => setLostDateFilter(e.target.value)}>
                  <option value="Tümü">Tüm Zamanlar</option>
                  <option value="Bugün">Bugün</option>
                  <option value="Son 3 Gün">Son 3 Gün</option>
                  <option value="Son 7 Gün">Son 7 Gün</option>
                </select>
              </div>
            </div>

            {/* İlan Feed */}
            {!myLostReportsLoaded ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 rounded-2xl bg-bg-main animate-pulse" />
                ))}
              </div>
            ) : filteredLostPets.length === 0 ? (
              <div className="card-base bg-white border border-border-main p-10 text-center flex flex-col items-center gap-3">
                <span className="text-[36px]">🚨</span>
                <p className="text-[14px] text-text-secondary font-normal">Aranan kriterlere uygun aktif kayıp ilanı bulunmuyor.</p>
              </div>
            ) : lostViewMode === 'map' ? (
              <LostMapView reports={filteredLostPets} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredLostPets.map(report => (
                  <LostFeedCard key={report.id} report={report} />
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* Match Tab Content */}
      {activeTab === 'match' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          
          {myListings.length > 0 ? (
            <div className="mb-2 flex flex-col gap-4">
              {myListings.map(listing => {
                const pet = listing.pets
                const speciesIcon = pet?.species === 'Kedi' || pet?.species === 'cat' ? '🐱' : pet?.species === 'Köpek' || pet?.species === 'dog' ? '🐶' : '🐾'
                const exp = getExperienceBadge(listing.experience_level)
                
                return (
                  <div key={listing.id} className="flex flex-col gap-3">
                    <div className="card-base bg-white border-2 border-violet-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-50 to-transparent rounded-bl-full opacity-50 -z-10 animate-pulse" />
                      
                      <div className="flex justify-between items-start mb-3">
                        <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 border border-violet-100 text-[10px] font-black px-2 py-0.5 rounded-md">
                          📢 AKTİF İLANINIZ
                        </span>
                      </div>

                      <div className="flex gap-4 items-center">
                        <div className="w-14 h-14 rounded-xl bg-bg-main overflow-hidden relative shrink-0">
                          {pet?.avatar_url ? (
                            <Image src={pet.avatar_url} alt={pet?.name || 'Pet'} fill sizes="56px" className="object-cover" />
                          ) : (
                            <span className="flex items-center justify-center w-full h-full text-2xl">🐾</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <h4 className="font-black text-text-primary text-[16px] truncate">{listing.title}</h4>
                            {pet?.gender === 'male' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 shrink-0">♂ Erkek</span>}
                            {pet?.gender === 'female' && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-50 text-pink-600 border border-pink-100 shrink-0">♀ Dişi</span>}
                          </div>
                          <p className="text-[12px] text-text-secondary font-normal truncate flex items-center gap-1">
                            <span>{speciesIcon}</span>
                            {pet?.name} {pet?.breed ? `• ${pet.breed}` : ''} {pet?.birth_date ? `• ${getAge(pet.birth_date)}` : ''} {pet?.city ? `• ${pet.city}` : ''}
                          </p>
                        </div>
                      </div>

                      {listing.requirements && listing.requirements.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {listing.requirements.map((req: string) => (
                            <span key={req} className="px-2 py-0.5 bg-surface border border-border-main text-text-secondary rounded-md text-[9px] font-bold">
                              {req}
                            </span>
                          ))}
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border flex items-center gap-0.5 ${exp.color}`}>
                            {exp.icon} {exp.label}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4 pt-4 border-t border-violet-100">
                        <Link href={`/owner/pets/${listing.pet_id}/match`} className="w-full text-center py-2.5 text-[13px] font-bold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors shadow-sm shadow-violet-600/20">
                          İlanı Yönet & Düzenle →
                        </Link>
                      </div>
                    </div>

                    <h3 className="font-black text-text-primary text-[15px] flex items-center gap-2 px-1">
                      <span>📋</span> Gelen Başvurular ({pet?.name})
                    </h3>
                    <BreedingApplicationsManager listingId={listing.id} />
                    
                    <div className="h-px bg-border-main my-4 w-full max-w-[200px] mx-auto" />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mb-2">
              <div className="card-base bg-white border border-border-main p-6 rounded-2xl shadow-sm text-center flex flex-col items-center gap-3">
                <span className="text-3xl">➕</span>
                <h3 className="font-black text-text-primary text-[16px]">Üreme İlanı Oluştur</h3>
                <p className="text-[13px] text-text-secondary">Dostunuza uygun bir eş bulmak için hemen bir ilan verin.</p>
                <button onClick={() => setShowCreateModal(true)} className="btn-primary py-2.5 px-6 text-[14px] mt-2 w-full max-w-[200px]">
                  İlan Oluştur
                </button>
              </div>
              <div className="h-px bg-border-main mt-6 w-full max-w-[200px] mx-auto" />
            </div>
          )}

          {/* Modal state */}
          <CreateListingPetSelectorModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
          />

          {/* BAŞVURULARIM (Applicant Side) */}
          {userApplications.length > 0 && (
            <div className="mb-2 flex flex-col gap-3">
              <h3 className="font-black text-text-primary text-[15px] flex items-center gap-2 px-1">
                <span>📬</span> Başvurularım
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userApplications.map(app => {
                  const pet = app.applicant_pet
                  const listingTitle = app.listing?.title || 'Bilinmeyen İlan'
                  
                  let statusBadge = null
                  switch(app.status) {
                    case 'pending':
                      statusBadge = <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200">⏳ Bekliyor</span>
                      break
                    case 'approved':
                      statusBadge = <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-600 border border-green-200">✅ Onaylandı</span>
                      break
                    case 'rejected':
                      statusBadge = <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">❌ Reddedildi</span>
                      break
                    default:
                      statusBadge = <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-surface text-text-secondary border border-border-main">{app.status}</span>
                  }

                  return (
                    <div key={app.id} className="card-base bg-white border border-border-main p-3.5 rounded-xl shadow-sm flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-bg-main overflow-hidden relative shrink-0">
                        {pet?.avatar_url ? (
                          <Image src={pet.avatar_url} alt={pet?.name || 'Pet'} fill sizes="40px" className="object-cover" />
                        ) : (
                          <span className="flex items-center justify-center w-full h-full text-lg">🐾</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="font-bold text-text-primary text-[13px] truncate">{pet?.name}</h4>
                          {statusBadge}
                        </div>
                        <p className="text-[11px] text-text-secondary truncate">
                          İlan: <span className="font-normal text-text-primary">{listingTitle}</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="h-px bg-border-main my-2 w-full max-w-[200px] mx-auto" />
            </div>
          )}

          {/* BÖLÜM 4: ADAY KEŞFET */}
          <div className="mb-4 rounded-2xl border border-pink-100 bg-pink-50/30 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[17px]">🔍</span>
                <h3 className="font-bold text-[14px] text-text-primary">
                  Aday Keşfet
                </h3>
              </div>
              <button
                onClick={() => setShowDiscover(!showDiscover)}
                className="text-[12px] text-pink-500 font-bold hover:text-pink-700 transition-colors"
              >
                {showDiscover ? 'Gizle ▲' : 'Göster ▼'}
              </button>
            </div>

            {showDiscover && (
              <div className="mt-3 flex flex-col gap-3 animate-fadeIn">
                {!currentPetId ? (
                  <div className="text-center py-4 bg-white/50 border border-dashed border-pink-200 rounded-xl p-3">
                    <p className="text-[12px] text-pink-600 font-bold">
                      Adayları keşfetmek için önce aktif bir ilan oluşturmanız gerekmektedir.
                    </p>
                  </div>
                ) : mutualMatch ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center bg-white rounded-xl border border-pink-100 animate-fadeInUp">
                    <div className="text-[48px] mb-2">🎉</div>
                    <h4 className="text-[17px] font-black text-rose-500 mb-1">Eşleşme Sağlandı!</h4>
                    <p className="text-text-secondary text-[12px] mb-4">Sen ve {mutualMatch.name} birbirinizi beğendiniz!</p>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center overflow-hidden border-2 border-rose-200 relative shrink-0">
                        {myListings[0]?.pets?.avatar_url ? (
                          <Image src={myListings[0].pets.avatar_url} alt={myListings[0].pets.name} fill className="object-cover" sizes="64px" />
                        ) : (
                          <span className="text-xl">🐾</span>
                        )}
                      </div>
                      <div className="text-[20px] text-rose-400">❤️</div>
                      <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center overflow-hidden border-2 border-rose-200 relative shrink-0">
                        {mutualMatch.avatar_url ? (
                          <Image src={mutualMatch.avatar_url} alt={mutualMatch.name} fill className="object-cover" sizes="64px" />
                        ) : (
                          <span className="text-xl">🐾</span>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => setMutualMatch(null)} 
                      className="btn-primary py-2 px-6 text-[12px] font-bold bg-pink-500 hover:bg-pink-600 text-white rounded-xl"
                    >
                      Aramaya Devam Et
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-[12px] text-text-secondary">
                      Petiniz için şehir seçerek uygun eşleşme adaylarını listeleyin.
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {selectedCities.map(city => (
                        <span key={city} className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-700 text-[11px] font-bold rounded-full">
                          {city}
                          <button 
                            onClick={() => setSelectedCities(prev => prev.filter(c => c !== city))} 
                            className="w-3.5 h-3.5 rounded-full hover:bg-rose-200 flex items-center justify-center transition-colors text-[9px]"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <select 
                        onChange={(e) => {
                          const val = e.target.value
                          if (val && !selectedCities.includes(val)) {
                            setSelectedCities(prev => [...prev, val])
                          }
                          e.target.value = ''
                        }}
                        className="input-base text-[12px] py-1.5 flex-1 bg-white"
                        defaultValue=""
                      >
                        <option value="" disabled>+ Şehir Ekle</option>
                        {citiesData.map((c: any) => (
                          <option key={c.code} value={c.name} disabled={selectedCities.includes(c.name)}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleDiscover}
                        disabled={selectedCities.length === 0}
                        className="btn-primary py-2 px-5 text-[12px] font-bold shrink-0 disabled:opacity-50"
                      >
                        Adayları Bul
                      </button>
                    </div>

                    {discoverError && (
                      <p className="text-red-500 text-[12px] font-bold mt-1">{discoverError}</p>
                    )}

                    {/* Sonuç Listesi / Swipe Kartı */}
                    {discoverLoading ? (
                      <div className="grid grid-cols-1 gap-3 mt-2 animate-pulse">
                        <div className="bg-bg-main h-32 rounded-xl" />
                      </div>
                    ) : candidates.length > 0 && currentIndex < candidates.length ? (
                      (() => {
                        const candidate = candidates[currentIndex]
                        return (
                          <div className="mt-3 flex flex-col gap-3 animate-fadeInUp">
                            <div className="bg-white rounded-2xl border border-border-main overflow-hidden shadow-sm flex flex-col sm:flex-row">
                              <div className="w-full sm:w-[150px] aspect-square relative bg-surface shrink-0">
                                {candidate.avatar_url ? (
                                  <Image src={candidate.avatar_url} alt={candidate.name} fill className="object-cover" sizes="150px" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-3xl bg-bg-main">🐾</div>
                                )}
                              </div>
                              <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <h4 className="font-extrabold text-[16px] text-text-primary">{candidate.name}</h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-bg-main rounded-md text-text-secondary">
                                      {candidate.gender === 'male' ? 'Erkek' : 'Dişi'}
                                    </span>
                                  </div>
                                  <p className="text-[12px] text-text-secondary font-normal">{candidate.breed}</p>
                                  <p className="text-[11px] text-text-secondary mt-1 flex items-center gap-1">
                                    📍 {candidate.city}
                                  </p>
                                  {candidate.breeding_listing?.notes && (
                                    <p className="text-[12px] text-text-secondary italic mt-2 line-clamp-2 bg-surface p-2 rounded-lg border border-border-main">
                                      "{candidate.breeding_listing.notes}"
                                    </p>
                                  )}
                                </div>

                                <div className="flex gap-2 justify-end mt-4">
                                  <button 
                                    onClick={() => handleDiscoverAction('skip')}
                                    className="px-4 py-2 bg-white border border-border-main text-text-secondary font-bold text-[12px] rounded-xl hover:bg-surface transition-colors"
                                  >
                                    Geç ✕
                                  </button>
                                  <button 
                                    onClick={() => handleDiscoverAction('like')}
                                    className="px-5 py-2 bg-pink-500 text-white font-bold text-[12px] rounded-xl hover:bg-pink-600 shadow-md shadow-pink-500/20 transition-colors"
                                  >
                                    Beğen ❤️
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()
                    ) : searchedDiscover ? (
                      <div className="text-center py-6 bg-white/50 border border-dashed border-pink-200 rounded-xl p-3 mt-2">
                        <p className="text-[12px] text-text-secondary">Seçtiğiniz şehirlerde yeni bir aday bulunmuyor.</p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-border-main p-4 rounded-2xl shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h4 className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">İlan Filtrele</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEstrusOnly(!estrusOnly)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                    estrusOnly 
                      ? 'bg-pink-500 text-white border-pink-500' 
                      : 'bg-white text-pink-500 border-pink-200 hover:bg-pink-50'
                  }`}
                >
                  🌸 Aktif Kızgınlık
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-text-secondary whitespace-nowrap">📍 Mesafe:</span>
                  <select
                    value={maxDistance ?? ''}
                    onChange={e => setMaxDistance(e.target.value ? Number(e.target.value) : null)}
                    className="text-[11px] border border-border-main rounded-xl px-2 py-1.5 bg-white font-bold text-text-primary"
                  >
                    <option value="">Tüm Türkiye</option>
                    <option value="50">50 km</option>
                    <option value="100">100 km</option>
                    <option value="200">200 km</option>
                    <option value="300">300 km</option>
                    <option value="500">500 km</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select className="input-base text-[13px] py-2" value={speciesFilter} onChange={e => setSpeciesFilter(e.target.value)}>
                <option value="Tümü">Tüm Türler</option>
                <option value="Kedi">🐱 Kedi</option>
                <option value="Köpek">🐶 Köpek</option>
              </select>
              <select className="input-base text-[13px] py-2" value={genderFilter} onChange={e => setGenderFilter(e.target.value)}>
                <option value="Tümü">Tüm Cinsiyetler</option>
                <option value="Erkek">♂ Erkek</option>
                <option value="Dişi">♀ Dişi</option>
              </select>
              <input 
                type="text" 
                placeholder="Şehir Ara..." 
                className="input-base text-[13px] py-2" 
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Irk Ara..." 
                className="input-base text-[13px] py-2" 
                value={breedFilter}
                onChange={e => setBreedFilter(e.target.value)}
              />
            </div>
          </div>

          {loadingMatches ? (
            <div className="p-10 text-center text-text-secondary text-[13px] animate-pulse">İlanlar aranıyor...</div>
          ) : matches.length === 0 ? (
            <div className="card-base bg-white border border-border-main p-10 text-center flex flex-col items-center gap-3">
              <span className="text-4xl">❤️</span>
              <p className="text-[14px] text-text-secondary font-normal">Bu kriterlere uygun aktif üreme ilanı bulunmuyor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map(listing => (
                <BreedingFeedCard key={listing.id} listing={listing} userApplications={userApplications} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

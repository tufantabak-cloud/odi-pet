'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AdoptionFeedCard } from './AdoptionFeedCard'
import { AdoptionFeaturedCard } from './AdoptionFeaturedCard'
import { BreedingFeedCard } from './BreedingFeedCard'
import { BreedingFeaturedCard } from './BreedingFeaturedCard'
import { LostFeedCard } from './LostFeedCard'
import { LostFeaturedCard } from './LostFeaturedCard'
import { BreedingApplicationsManager } from './BreedingApplicationsManager'
import { AdoptionApplicationsManager } from './AdoptionApplicationsManager'
import { CreateListingPetSelectorModal } from './CreateListingPetSelectorModal'
import PaywallCard from '@/components/subscription/PaywallCard'
import { ArchiveConfirmModal } from '@/components/pets/common/ArchiveConfirmModal'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import citiesData from '@/lib/cities.json'
import { TURKIYE_ILLER } from '@/lib/utils/turkiyeIller'
import dynamic from 'next/dynamic'
import { 
  Home, AlertTriangle, Heart, Megaphone, PawPrint, ClipboardList, 
  Plus, Inbox, Search, Sparkles, MapPin, Calendar, Filter, SlidersHorizontal,
  CheckCircle2, XCircle, Compass, List, Map, ChevronDown, ChevronUp, 
  X, Check, Eye, Clock, Lock, ChevronRight, ArrowLeft
} from 'lucide-react'
import { useFeature } from '@/lib/features/hooks'
import { normalizeSpecies, getSpeciesLabel } from '@/lib/species'
import { useSearchParams } from 'next/navigation'

const LostMapView = dynamic(() => import('./LostMapView'), { 
  ssr: false, 
  loading: () => (
    <div className="w-full h-[500px] bg-slate-100 animate-pulse rounded-3xl flex items-center justify-center font-normal text-slate-500 text-xs">
      Harita Yükleniyor...
    </div>
  ) 
})

type Tab = 'adoption' | 'lost' | 'match'

const TAB_MAP: Record<string, Tab> = {
  'sahiplendir': 'adoption',
  'sahiplendirme': 'adoption',
  'adoption': 'adoption',
  'lost': 'lost',
  'kayip': 'lost',
  'eslestirme': 'match',
  'eslesme': 'match',
  'match': 'match'
}

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
        label: 'Deneyimli', 
        color: 'bg-amber-50 text-amber-700 border-amber-200' 
      }
    case 'expert': 
      return { 
        label: 'Çok Deneyimli', 
        color: 'bg-violet-50 text-violet-700 border-violet-200' 
      }
    default: 
      return { 
        label: 'İlk Deneyim', 
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
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
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const initialTab = (urlTab && TAB_MAP[urlTab]) || 'adoption'
  
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    const paramMap: Record<Tab, string> = {
      adoption: 'sahiplendir',
      lost: 'lost',
      match: 'eslestirme'
    }
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `/owner/social?tab=${paramMap[tab]}`)
    }
  }

  useEffect(() => {
    if (urlTab && TAB_MAP[urlTab]) {
      setActiveTab(TAB_MAP[urlTab])
    }
  }, [urlTab])

  const [currentUserId, setCurrentUserId] = useState<string>('')

  useEffect(() => {
    const fetchUserId = async () => {
      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) setCurrentUserId(session.user.id)
    }
    fetchUserId()
  }, [])

  const [matches, setMatches] = useState<any[]>(initialMatches || [])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [myListings, setMyListings] = useState<any[]>([])

  const matchFeature = useFeature({
    userId: currentUserId,
    featureKey: 'smart_matching'
  })
  const [myAdoptionListings, setMyAdoptionListings] = useState<any[]>([])
  const [userApplications, setUserApplications] = useState<any[]>([])
  const [estrusOnly, setEstrusOnly] = useState(false)
  
  const [adoptionSpeciesFilter, setAdoptionSpeciesFilter] = useState<'all' | 'cat' | 'dog'>('all')
  const [adoptionCityFilter, setAdoptionCityFilter] = useState<string>('')
  const [adoptionDateFilter, setAdoptionDateFilter] = useState<'all' | '7days' | '30days'>('all')
  const [adoptionSearchQuery, setAdoptionSearchQuery] = useState<string>('')
  const [adoptionAgeFilter, setAdoptionAgeFilter] = useState<'all' | 'puppy' | 'adult'>('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false)
  
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
  const [closeReportPetId, setCloseReportPetId] = useState<string | null>(null)
  const [myLostReports, setMyLostReports] = useState<any[]>([])
  const [myLostReportsLoaded, setMyLostReportsLoaded] = useState(false)
  const [lostSpeciesFilter, setLostSpeciesFilter] = useState('Tümü')
  const [lostCityFilter, setLostCityFilter] = useState('')
  const [lostDateFilter, setLostDateFilter] = useState('Tümü')
  const [lostSearchQuery, setLostSearchQuery] = useState('')
  const [showLostAdvancedFilters, setShowLostAdvancedFilters] = useState(false)
  const [lostViewMode, setLostViewMode] = useState<'list' | 'map'>('list')

  const [speciesFilter, setSpeciesFilter] = useState('Tümü')
  const [genderFilter, setGenderFilter] = useState('Tümü')
  const [cityFilter, setCityFilter] = useState('')
  const [breedFilter, setBreedFilter] = useState('')
  const [matchSearchQuery, setMatchSearchQuery] = useState('')
  const [showMatchAdvancedFilters, setShowMatchAdvancedFilters] = useState(false)

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
    } else if (activeTab === 'adoption') {
      checkMyAdoptionListing()
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

  const checkMyAdoptionListing = async () => {
    const supabase = createBrowserSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setCurrentUserId(session.user.id)

    const { data } = await supabase
      .from('pet_adoptions')
      .select('*, pets(id, name, avatar_url, species, breed, gender, birth_date, city)')
      .eq('user_id', session.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (data) setMyAdoptionListings(data)
    else setMyAdoptionListings([])
  }

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

  const handleMarkLostReportFound = (petId: string) => {
    setCloseReportPetId(petId)
  }

  const confirmMarkLostReportFound = async () => {
    if (!closeReportPetId) return
    try {
      const res = await fetch(`/api/pets/${closeReportPetId}/lost`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'found' })
      })
      if (!res.ok) throw new Error('Hata oluştu')
      checkMyLostReports()
      window.location.reload()
    } catch (err) {
      console.error(err)
    } finally {
      setCloseReportPetId(null)
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
    <section className="flex flex-col gap-5">
      {/* Page Header with Back Button */}
      <div className="flex items-center gap-3 pt-1">
        <Link 
          href="/owner/dashboard"
          className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-50 active:scale-[0.98] transition-all shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] shrink-0"
          title="Ana Sayfaya Dön"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-extrabold text-slate-900 truncate">Sosyal & Topluluk</h1>
          <p className="text-2xs text-slate-500 font-normal truncate">Sahiplendirme, kayıp ve eşleştirme merkezi</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner">
        <button
          onClick={() => handleTabChange('adoption')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all active:scale-[0.98] ${
            activeTab === 'adoption' 
              ? 'bg-white text-violet-700 shadow-sm border border-violet-100 font-semibold' 
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Home className="w-4 h-4 stroke-[2]" />
          <span className="text-xs leading-tight text-center">Sahiplendirme</span>
        </button>

        <button
          onClick={() => handleTabChange('lost')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all active:scale-[0.98] ${
            activeTab === 'lost' 
              ? 'bg-white text-violet-700 shadow-sm border border-violet-100 font-semibold' 
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <AlertTriangle className="w-4 h-4 stroke-[2]" />
          <span className="text-xs leading-tight text-center">Kayıp İlanları</span>
        </button>

        <button
          onClick={() => handleTabChange('match')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all active:scale-[0.98] ${
            activeTab === 'match' 
              ? 'bg-white text-violet-700 shadow-sm border border-violet-100 font-semibold' 
              : 'text-slate-500 hover:text-slate-900 font-medium'
          }`}
        >
          <Heart className="w-4 h-4 stroke-[2]" />
          <span className="text-xs leading-tight text-center">Eşleştirme</span>
        </button>
      </div>

      {/* Tab Description */}
      <div className="text-center px-4 pb-2 animate-fadeIn">
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          {activeTab === 'adoption' && "Yeni bir dost sahiplenin veya sahiplendirme ilanı oluşturun"}
          {activeTab === 'lost' && "Kayıp ve bulunan evcil hayvan ilanlarını görüntüleyin."}
          {activeTab === 'match' && "Tür, ırk ve konuma göre uygun eş adaylarını keşfedin."}
        </p>
      </div>

      {/* Adoption Tab Content */}
      {activeTab === 'adoption' && (() => {
        const filteredAdoptions = adoptions.filter(adoption => {
          const pet = adoption.pet
          if (!pet) return false

          // Species filter
          if (adoptionSpeciesFilter !== 'all') {
            const species = pet.species?.toLowerCase()
            if (adoptionSpeciesFilter === 'cat' && normalizeSpecies(species) !== 'cat') return false
            if (adoptionSpeciesFilter === 'dog' && normalizeSpecies(species) !== 'dog') return false
          }

          // Age filter
          if (adoptionAgeFilter !== 'all' && pet.birth_date) {
            const ageInMs = Date.now() - new Date(pet.birth_date).getTime()
            const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25)
            if (adoptionAgeFilter === 'puppy' && ageInYears >= 1) return false
            if (adoptionAgeFilter === 'adult' && ageInYears < 1) return false
          }

          // City filter
          if (adoptionCityFilter) {
            const city = (pet.city || '').toLowerCase()
            if (!city.includes(adoptionCityFilter.toLowerCase())) return false
          }

          // Date filter
          if (adoptionDateFilter !== 'all') {
            if (!adoption.created_at) return false
            const days = Math.floor((Date.now() - new Date(adoption.created_at).getTime()) / (1000 * 60 * 60 * 24))
            if (adoptionDateFilter === '7days' && days > 7) return false
            if (adoptionDateFilter === '30days' && days > 30) return false
          }

          // Search query filter
          if (adoptionSearchQuery.trim()) {
            const query = adoptionSearchQuery.toLowerCase().trim()
            const nameMatch = (pet.name || '').toLowerCase().includes(query)
            const breedMatch = (pet.breed || '').toLowerCase().includes(query)
            const cityMatch = (pet.city || '').toLowerCase().includes(query)
            const speciesMatch = (pet.species || '').toLowerCase().includes(query)
            if (!nameMatch && !breedMatch && !cityMatch && !speciesMatch) return false
          }

          return true
        })

        // Partition into Featured and Recent
        const featuredListings = filteredAdoptions.slice(0, 4)
        const recentListings = filteredAdoptions

        return (
          <div className="flex flex-col gap-5 animate-fadeIn">
            {/* My Active Listings & Applications */}
            {myAdoptionListings.length > 0 && (
              <div className="flex flex-col gap-4">
                {myAdoptionListings.map(listing => {
                  const pet = listing.pets
                  
                  return (
                    <div key={listing.id} className="flex flex-col gap-3">
                      <div className="bg-white border border-violet-100 p-5 rounded-3xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-violet-50 to-transparent rounded-bl-full opacity-60 -z-10" />
                        
                        <div className="flex justify-between items-start mb-3">
                          <span className="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 border border-violet-100 text-2xs font-semibold px-2.5 py-1 rounded-lg">
                            <Megaphone className="w-3 h-3 stroke-[2]" /> AKTİF SAHİPLENDİRME İLANINIZ
                          </span>
                        </div>

                        <div className="flex gap-4 items-center">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden relative shrink-0">
                            {pet?.avatar_url ? (
                              <Image src={pet.avatar_url} alt={pet?.name || 'Pet'} fill sizes="56px" className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">🐾</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 text-base truncate">{pet?.name}</h4>
                            <p className="text-xs text-slate-500 font-normal truncate flex items-center gap-1 mt-0.5">
                              {pet?.breed || pet?.species} {pet?.city ? `• ${pet.city}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4 pt-3.5 border-t border-violet-100">
                          <Link 
                            href={`/owner/pets/${listing.pet_id}/adoption`} 
                            className="w-full text-center py-2.5 text-xs font-semibold text-white bg-violet-600 rounded-2xl hover:bg-violet-700 active:scale-[0.98] transition-all shadow-sm shadow-violet-600/20"
                          >
                            İlanı Yönet & Düzenle →
                          </Link>
                        </div>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 px-1">
                        <ClipboardList className="w-4 h-4 text-violet-600 stroke-[2]" /> 
                        Başvurular Yönetimi ({pet?.name})
                      </h3>
                      <AdoptionApplicationsManager listingId={listing.id} petId={listing.pet_id} />
                      
                      <div className="h-px bg-slate-200/80 my-3 w-full max-w-[200px] mx-auto" />
                    </div>
                  )
                })}
              </div>
            )}

            {/* Action Banner: İlan Ver (Alt navigasyonu bozmayacak şekilde konumlandırıldı) */}
            <div className="flex justify-between items-center bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 rounded-3xl shadow-sm">
              <div className="flex flex-col gap-0.5">
                <span className="font-extrabold text-sm">Sahiplendirme İlanı Oluştur</span>
                <span className="text-2xs text-violet-100 font-normal">Sıcak bir yuva arayan dostunuza ilan açın</span>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-violet-700 font-bold text-xs px-4 py-2.5 rounded-2xl shadow-sm hover:bg-violet-50 active:scale-[0.98] transition-all shrink-0 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> İlan Ver
              </button>
            </div>

            {/* Arama Barı & Filtre Butonu */}
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input 
                  type="text" 
                  placeholder="Evcil hayvan, ırk veya şehir ara..." 
                  value={adoptionSearchQuery}
                  onChange={e => setAdoptionSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-2xl text-xs font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all placeholder:text-slate-400 shadow-sm"
                />
              </div>
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`p-2.5 rounded-2xl border transition-all shadow-sm ${
                  showAdvancedFilters ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            {/* Gelişmiş Tarih Filtresi Dropdown */}
            {showAdvancedFilters && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 animate-fadeIn">
                <span className="text-xs font-semibold text-slate-600">Ek Filtreler:</span>
                <select
                  value={adoptionDateFilter}
                  onChange={e => setAdoptionDateFilter(e.target.value as any)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
                >
                  <option value="all">Tüm Zamanlar</option>
                  <option value="7days">Son 7 Gün</option>
                  <option value="30days">Son 30 Gün</option>
                </select>
              </div>
            )}

            {/* Kategori Filtre Çipleri */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button 
                onClick={() => setAdoptionSpeciesFilter(adoptionSpeciesFilter === 'dog' ? 'all' : 'dog')}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  adoptionSpeciesFilter === 'dog' ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                🐶 Köpek
              </button>
              <button 
                onClick={() => setAdoptionSpeciesFilter(adoptionSpeciesFilter === 'cat' ? 'all' : 'cat')}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  adoptionSpeciesFilter === 'cat' ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                🐱 Kedi
              </button>
              <button 
                onClick={() => {
                  setAdoptionSpeciesFilter('all')
                  setAdoptionAgeFilter('all')
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  adoptionSpeciesFilter === 'all' && adoptionAgeFilter === 'all' ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tümü
              </button>
              <button 
                onClick={() => setAdoptionAgeFilter(adoptionAgeFilter === 'puppy' ? 'all' : 'puppy')}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  adoptionAgeFilter === 'puppy' ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Yavru
              </button>
              <button 
                onClick={() => setAdoptionAgeFilter(adoptionAgeFilter === 'adult' ? 'all' : 'adult')}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  adoptionAgeFilter === 'adult' ? 'bg-violet-600 text-white border-violet-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Yetişkin
              </button>
            </div>

            {/* Konum Seçimi */}
            <div className="flex items-center gap-2">
              <div className="relative inline-block">
                <select
                  value={adoptionCityFilter}
                  onChange={e => setAdoptionCityFilter(e.target.value)}
                  className="appearance-none px-4 py-2 pr-9 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all shadow-sm"
                >
                  <option value="">📍 Konum (Tümü)</option>
                  {Object.keys(TURKIYE_ILLER).sort().map(city => (
                    <option key={city} value={city}>📍 {city}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" />
              </div>
            </div>

            {filteredAdoptions.length === 0 ? (
              <div className="rounded-3xl bg-white border border-slate-100 p-10 text-center flex flex-col items-center justify-center gap-3 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
                  <Compass className="w-6 h-6 stroke-[1.75]" />
                </div>
                <p className="text-sm font-semibold text-slate-900 text-center">
                  Yakınında ilan bulunamadı.
                </p>
                <p className="text-xs text-slate-500 text-center font-normal">
                  İlk ilanı sen oluştur.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Section 1: Öne Çıkan Dostlar */}
                {featuredListings.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="font-extrabold text-slate-900 text-base">Öne Çıkan Dostlar</h3>
                      <button className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-0.5">
                        Tümünü Gör <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                    <div className="flex gap-3.5 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-1 px-1">
                      {featuredListings.map(adoption => (
                        <AdoptionFeaturedCard key={adoption.id} adoption={adoption} currentUserId={currentUserId} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Son Eklenen İlanlar */}
                {recentListings.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="font-extrabold text-slate-900 text-base">Son Eklenen İlanlar</h3>
                      <button className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-0.5">
                        Tümünü Gör <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {recentListings.map(adoption => (
                        <AdoptionFeedCard key={adoption.id} adoption={adoption} currentUserId={currentUserId} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* Lost Pets Tab Content */}
      {activeTab === 'lost' && (() => {
        const filteredLostPets = lostPets.filter(report => {
          if (myLostReports.some(r => r.id === report.id)) return false
          const pet = report.pet
          if (!pet) return false

          // Species filter
          if (lostSpeciesFilter !== 'Tümü') {
            const matchSpecies = lostSpeciesFilter === 'Kedi' ? 'cat' : 'dog'
            if (normalizeSpecies(pet.species) !== matchSpecies) return false
          }

          // City filter
          if (lostCityFilter.trim() !== '') {
            const cityMatch = (pet.city || '').toLowerCase().includes(lostCityFilter.trim().toLowerCase())
            const locMatch = (report.last_seen_location || '').toLowerCase().includes(lostCityFilter.trim().toLowerCase())
            if (!cityMatch && !locMatch) return false
          }

          // Date filter
          if (lostDateFilter !== 'Tümü') {
            if (report.last_seen_at) {
              const diffMs = Date.now() - new Date(report.last_seen_at).getTime()
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
              if (lostDateFilter === 'Bugün' && diffDays > 0) return false
              if (lostDateFilter === 'Son 3 Gün' && diffDays > 3) return false
              if (lostDateFilter === 'Son 7 Gün' && diffDays > 7) return false
            }
          }

          // Search query filter
          if (lostSearchQuery.trim()) {
            const query = lostSearchQuery.toLowerCase().trim()
            const nameMatch = (pet.name || '').toLowerCase().includes(query)
            const breedMatch = (pet.breed || '').toLowerCase().includes(query)
            const cityMatch = (pet.city || '').toLowerCase().includes(query)
            const locMatch = (report.last_seen_location || '').toLowerCase().includes(query)
            const speciesMatch = (pet.species || '').toLowerCase().includes(query)
            if (!nameMatch && !breedMatch && !cityMatch && !locMatch && !speciesMatch) return false
          }

          return true
        })

        // Partition into Emergency and Recent
        const emergencyLostPets = filteredLostPets.slice(0, 4)
        const recentLostPets = filteredLostPets

        return (
          <div className="flex flex-col gap-5 animate-fadeIn">
            {/* Kendi Aktif Kayıp İlanınız */}
            {myLostReports.length > 0 && (
              <div className="flex flex-col gap-4">
                {myLostReports.map(report => {
                  const pet = report.pets
                  return (
                    <div key={report.id} className="bg-white border border-rose-200 p-5 rounded-3xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-rose-50 to-transparent rounded-bl-full opacity-60 -z-10" />
                      
                      <div className="flex justify-between items-start mb-3">
                        <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-100 text-2xs font-semibold px-2.5 py-1 rounded-lg">
                          <Megaphone className="w-3 h-3 stroke-[2]" /> AKTİF KAYIP İLANINIZ
                        </span>
                      </div>

                      <div className="flex gap-4 items-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden relative shrink-0">
                          {pet?.avatar_url ? (
                            <Image src={pet.avatar_url} alt={pet?.name || 'Pet'} fill sizes="56px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">🐾</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-base truncate">{pet?.name}</h4>
                          <p className="text-xs text-slate-500 font-normal truncate flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 stroke-[2]" /> Son Görülme: {report.last_seen_location}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4 pt-3.5 border-t border-rose-100">
                        <button 
                          onClick={() => handleMarkLostReportFound(pet.id)}
                          className="w-full text-center py-2.5 text-xs font-semibold text-white bg-rose-600 rounded-2xl hover:bg-rose-700 active:scale-[0.98] transition-all shadow-sm shadow-rose-600/20"
                        >
                          Bulundu Olarak İşaretle ✓
                        </button>
                      </div>
                    </div>
                  )
                })}
                <div className="h-px bg-slate-200/80 my-1 w-full max-w-[200px] mx-auto" />
              </div>
            )}

            {/* Action Row: Kayıp İlanı Ver / Buldum Bildir */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/owner/lost-report?mode=lost"
                className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white p-3.5 rounded-2xl font-bold text-xs active:scale-[0.98] transition-all shadow-sm shadow-rose-600/20"
              >
                <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                Kayıp İlanı Ver
              </Link>
              <Link
                href="/owner/lost-report?mode=found"
                className="flex items-center justify-center gap-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 p-3.5 rounded-2xl font-bold text-xs active:scale-[0.98] transition-all shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                Buldum Bildir
              </Link>
            </div>

            {/* Arama Barı & Gelişmiş Filtre Butonu */}
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input 
                  type="text" 
                  placeholder="Kayıp pet, ırk veya ilçe/şehir ara..." 
                  value={lostSearchQuery}
                  onChange={e => setLostSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-2xl text-xs font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all placeholder:text-slate-400 shadow-sm"
                />
              </div>
              <button 
                onClick={() => setShowLostAdvancedFilters(!showLostAdvancedFilters)}
                className={`p-2.5 rounded-2xl border transition-all shadow-sm ${
                  showLostAdvancedFilters ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            {/* Gelişmiş Filtre Dropdown */}
            {showLostAdvancedFilters && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 animate-fadeIn">
                <span className="text-xs font-semibold text-slate-600">Zaman Filtresi:</span>
                <select
                  value={lostDateFilter}
                  onChange={e => setLostDateFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
                >
                  <option value="Tümü">Tüm Zamanlar</option>
                  <option value="Bugün">Bugün</option>
                  <option value="Son 3 Gün">Son 3 Gün</option>
                  <option value="Son 7 Gün">Son 7 Gün</option>
                </select>
              </div>
            )}

            {/* Kategori Filtre Çipleri */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button 
                onClick={() => setLostSpeciesFilter(lostSpeciesFilter === 'Köpek' ? 'Tümü' : 'Köpek')}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  lostSpeciesFilter === 'Köpek' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                🐶 Köpek
              </button>
              <button 
                onClick={() => setLostSpeciesFilter(lostSpeciesFilter === 'Kedi' ? 'Tümü' : 'Kedi')}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  lostSpeciesFilter === 'Kedi' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                🐱 Kedi
              </button>
              <button 
                onClick={() => {
                  setLostSpeciesFilter('Tümü')
                  setLostDateFilter('Tümü')
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  lostSpeciesFilter === 'Tümü' && lostDateFilter === 'Tümü' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tümü
              </button>
              <button 
                onClick={() => setLostDateFilter(lostDateFilter === 'Bugün' ? 'Tümü' : 'Bugün')}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  lostDateFilter === 'Bugün' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Bugün
              </button>
              <button 
                onClick={() => setLostDateFilter(lostDateFilter === 'Son 3 Gün' ? 'Tümü' : 'Son 3 Gün')}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  lostDateFilter === 'Son 3 Gün' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Son 3 Gün
              </button>
              <button 
                onClick={() => setLostDateFilter(lostDateFilter === 'Son 7 Gün' ? 'Tümü' : 'Son 7 Gün')}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  lostDateFilter === 'Son 7 Gün' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Son 7 Gün
              </button>
            </div>

            {/* Konum & Görünüm Modu (Liste / Harita) */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="relative inline-block">
                <select
                  value={lostCityFilter}
                  onChange={e => setLostCityFilter(e.target.value)}
                  className="appearance-none px-4 py-2 pr-9 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-sm"
                >
                  <option value="">📍 Konum (Tüm Türkiye)</option>
                  {Object.keys(TURKIYE_ILLER).sort().map(city => (
                    <option key={city} value={city}>📍 {city}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" />
              </div>

              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 shrink-0">
                <button 
                  onClick={() => setLostViewMode('list')} 
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 ${
                    lostViewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5 stroke-[2]" /> Liste
                </button>
                <button 
                  onClick={() => setLostViewMode('map')} 
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 ${
                    lostViewMode === 'map' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Map className="w-3.5 h-3.5 stroke-[2]" /> Harita
                </button>
              </div>
            </div>

            {/* İlan Feed */}
            {!myLostReportsLoaded ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : filteredLostPets.length === 0 ? (
              <div className="rounded-3xl bg-white border border-slate-100 p-10 text-center flex flex-col items-center justify-center gap-3 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
                  <Compass className="w-6 h-6 stroke-[1.75]" />
                </div>
                <p className="text-sm font-semibold text-slate-900 text-center">
                  Yakınında kayıp ilanı bulunamadı.
                </p>
                <p className="text-xs text-slate-500 text-center font-normal">
                  İlk ilanı sen oluştur.
                </p>
              </div>
            ) : lostViewMode === 'map' ? (
              <LostMapView reports={filteredLostPets} />
            ) : (
              <div className="flex flex-col gap-6">
                {/* Section 1: Acil Kayıp İlanları */}
                {emergencyLostPets.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 stroke-[2.5]" />
                        Acil Kayıp İlanları
                      </h3>
                      <button className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5">
                        Tümünü Gör <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                    <div className="flex gap-3.5 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-1 px-1">
                      {emergencyLostPets.map(report => (
                        <LostFeaturedCard key={report.id} report={report} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Son Eklenen İlanlar */}
                {recentLostPets.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="font-extrabold text-slate-900 text-base">Son Eklenen İlanlar</h3>
                      <button className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-0.5">
                        Tümünü Gör <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {recentLostPets.map(report => (
                        <LostFeedCard key={report.id} report={report} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* Match Tab Content */}
      {activeTab === 'match' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {!matchFeature.enabled && (
            <div className="h-16 flex items-center justify-between px-4 rounded-2xl bg-gradient-to-r from-amber-50 to-violet-50 border border-violet-100 mb-2 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
                  <Lock className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Eşleştirme Premium Özelliği</h4>
                  <p className="text-xs text-slate-500">Adayları görmek için yükseltin</p>
                </div>
              </div>
              <Link href="/pricing" className="bg-white text-violet-700 text-xs font-bold px-4 py-2 rounded-xl shadow-sm border border-violet-100 hover:bg-violet-50 transition-colors">
                İncele
              </Link>
            </div>
          )}

          {!matchFeature.enabled ? (
             <div className="rounded-3xl bg-white border border-slate-100 p-10 text-center flex flex-col items-center justify-center gap-3 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
                  <Compass className="w-6 h-6 stroke-[1.75]" />
                </div>
                <p className="text-sm font-semibold text-slate-900 text-center">
                  İçerik Gizli
                </p>
                <p className="text-xs text-slate-500 text-center font-normal">
                  Eşleşmeleri görmek için Premium abonesi olmalısınız.
                </p>
              </div>
          ) : (
            <div className="flex flex-col gap-4">
          
          {myListings.length > 0 ? (
            <div className="flex flex-col gap-4">
              {myListings.map(listing => {
                const pet = listing.pets
                const exp = getExperienceBadge(listing.experience_level)
                
                return (
                  <div key={listing.id} className="flex flex-col gap-3">
                    <div className="bg-white border border-pink-100 p-5 rounded-3xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-pink-50 to-transparent rounded-bl-full opacity-60 -z-10" />
                      
                      <div className="flex justify-between items-start mb-3">
                        <span className="inline-flex items-center gap-1.5 bg-pink-50 text-pink-700 border border-pink-100 text-2xs font-semibold px-2.5 py-1 rounded-lg">
                          <Megaphone className="w-3 h-3 stroke-[2]" /> AKTİF İLANINIZ
                        </span>
                      </div>

                      <div className="flex gap-4 items-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden relative shrink-0">
                          {pet?.avatar_url ? (
                            <Image src={pet.avatar_url} alt={pet?.name || 'Pet'} fill sizes="56px" className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">🐾</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-base truncate">{listing.title}</h4>
                            {pet?.gender === 'male' && <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">♂ Erkek</span>}
                            {pet?.gender === 'female' && <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-pink-50 text-pink-600 border border-pink-100 shrink-0">♀ Dişi</span>}
                          </div>
                          <p className="text-xs text-slate-500 font-normal truncate flex items-center gap-1">
                            {pet?.name} {pet?.breed ? `• ${pet.breed}` : ''} {pet?.birth_date ? `• ${getAge(pet.birth_date)}` : ''} {pet?.city ? `• ${pet.city}` : ''}
                          </p>
                        </div>
                      </div>

                      {listing.requirements && listing.requirements.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {listing.requirements.map((req: string) => (
                            <span key={req} className="px-2.5 py-1 bg-slate-50 border border-slate-200/80 text-slate-600 rounded-lg text-2xs font-semibold">
                              {req}
                            </span>
                          ))}
                          <span className={`px-2.5 py-1 rounded-lg text-2xs font-semibold border flex items-center gap-1 ${exp.color}`}>
                            <Sparkles className="w-3 h-3 stroke-[2]" /> {exp.label}
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4 pt-3.5 border-t border-pink-100">
                        <Link 
                          href={`/owner/pets/${listing.pet_id}/match`} 
                          className="w-full text-center py-2.5 text-xs font-semibold text-white bg-pink-500 rounded-2xl hover:bg-pink-600 active:scale-[0.98] transition-all shadow-sm shadow-pink-500/20"
                        >
                          İlanı Yönet & Düzenle →
                        </Link>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 px-1">
                      <ClipboardList className="w-4 h-4 text-pink-500 stroke-[2]" /> Gelen Başvurular ({pet?.name})
                    </h3>
                    <BreedingApplicationsManager listingId={listing.id} />
                    
                    <div className="h-px bg-slate-200/80 my-3 w-full max-w-[200px] mx-auto" />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mb-1">
              <div className="rounded-3xl bg-white border border-slate-100 p-8 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center">
                  <Plus className="w-6 h-6 stroke-[2]" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Üreme İlanı Oluştur</h3>
                <p className="text-xs text-slate-500 font-normal">Dostunuza uygun bir eş bulmak için hemen bir ilan verin.</p>
                <button 
                  onClick={() => setShowCreateModal(true)} 
                  className="inline-flex items-center justify-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs py-2.5 px-6 rounded-2xl active:scale-[0.98] transition-all shadow-sm shadow-pink-500/20 mt-1 w-full max-w-[200px]"
                >
                  <Plus className="w-4 h-4 stroke-[2]" />
                  İlan Oluştur
                </button>
              </div>
              <div className="h-px bg-slate-200/80 my-6 w-full max-w-[200px] mx-auto" />
            </div>
          )}



          {/* BAŞVURULARIM (Applicant Side) */}
          {userApplications.length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 px-1">
                <Inbox className="w-4 h-4 text-pink-500 stroke-[2]" /> Başvurularım
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {userApplications.map(app => {
                  const pet = app.applicant_pet
                  const listingTitle = app.listing?.title || 'Bilinmeyen İlan'
                  
                  let statusBadge = null
                  switch(app.status) {
                    case 'pending':
                      statusBadge = <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1"><Clock className="w-3 h-3 stroke-[2]" /> Bekliyor</span>
                      break
                    case 'approved':
                      statusBadge = <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 stroke-[2]" /> Onaylandı</span>
                      break
                    case 'rejected':
                      statusBadge = <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center gap-1"><XCircle className="w-3 h-3 stroke-[2]" /> Reddedildi</span>
                      break
                    default:
                      statusBadge = <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">{app.status}</span>
                  }

                  return (
                    <div key={app.id} className="bg-white border border-slate-100 p-4 rounded-2xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden relative shrink-0">
                        {pet?.avatar_url ? (
                          <Image src={pet.avatar_url} alt={pet?.name || 'Pet'} fill sizes="40px" className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-2xs">🐾</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h4 className="font-semibold text-slate-900 text-xs truncate">{pet?.name}</h4>
                          {statusBadge}
                        </div>
                        <p className="text-2xs text-slate-500 truncate font-normal">
                          İlan: <span className="font-medium text-slate-800">{listingTitle}</span>
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="h-px bg-slate-200/80 my-3 w-full max-w-[200px] mx-auto" />
            </div>
          )}

          {/* ADAY KEŞFET */}
          <div className="rounded-3xl border border-pink-100 bg-pink-50/40 p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-pink-600 stroke-[2]" />
                <h3 className="font-bold text-sm text-slate-900">
                  Aday Keşfet
                </h3>
              </div>
              <button
                onClick={() => setShowDiscover(!showDiscover)}
                className="text-xs text-pink-600 font-semibold hover:text-pink-800 transition-colors flex items-center gap-1"
              >
                {showDiscover ? <>Gizle <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" /></> : <>Göster <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" /></>}
              </button>
            </div>

            {showDiscover && (
              <div className="mt-3 flex flex-col gap-3 animate-fadeIn">
                {!currentPetId ? (
                  <div className="text-center py-4 bg-white/60 border border-dashed border-pink-200 rounded-2xl p-4">
                    <p className="text-xs text-pink-700 font-semibold">
                      Adayları keşfetmek için önce aktif bir ilan oluşturmanız gerekmektedir.
                    </p>
                  </div>
                ) : mutualMatch ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center bg-white rounded-3xl border border-pink-100 animate-fadeInUp">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-2">
                      <Sparkles className="w-6 h-6 stroke-[2]" />
                    </div>
                    <h4 className="text-base font-extrabold text-rose-600 mb-1">Eşleşme Sağlandı!</h4>
                    <p className="text-slate-600 text-xs mb-4 font-normal">Sen ve {mutualMatch.name} birbirinizi beğendiniz!</p>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center overflow-hidden border-2 border-rose-200 relative shrink-0">
                        {myListings[0]?.pets?.avatar_url ? (
                          <Image src={myListings[0].pets.avatar_url} alt={myListings[0].pets.name} fill className="object-cover" sizes="64px" />
                        ) : (
                          <span className="text-xl">🐾</span>
                        )}
                      </div>
                      <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-bounce" />
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
                      className="inline-flex items-center justify-center bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs py-2 px-6 rounded-2xl active:scale-[0.98] transition-all"
                    >
                      Aramaya Devam Et
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-500 font-normal">
                      Petiniz için şehir seçerek uygun eşleşme adaylarını listeleyin.
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {selectedCities.map(city => (
                        <span key={city} className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100/80 text-rose-800 text-2xs font-semibold rounded-full">
                          {city}
                          <button 
                            onClick={() => setSelectedCities(prev => prev.filter(c => c !== city))} 
                            className="w-3.5 h-3.5 rounded-full hover:bg-rose-200 flex items-center justify-center transition-colors text-2xs"
                          >
                            <X className="w-2.5 h-2.5 stroke-[2.5]" />
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
                        className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-2xl flex-1 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all font-semibold text-slate-700"
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
                        className="inline-flex items-center justify-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white font-semibold text-xs py-2 px-5 rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-all shrink-0"
                      >
                        <Search className="w-3.5 h-3.5 stroke-[2]" /> Adayları Bul
                      </button>
                    </div>

                    {discoverError && (
                      <p className="text-rose-600 text-xs font-medium mt-1">{discoverError}</p>
                    )}

                    {/* Sonuç Listesi / Swipe Kartı */}
                    {discoverLoading ? (
                      <div className="grid grid-cols-1 gap-3 mt-2 animate-pulse">
                        <div className="bg-slate-200/60 h-32 rounded-2xl" />
                      </div>
                    ) : candidates.length > 0 && currentIndex < candidates.length ? (
                      (() => {
                        const candidate = candidates[currentIndex]
                        return (
                          <div className="mt-3 flex flex-col gap-3 animate-fadeInUp">
                            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm flex flex-col sm:flex-row">
                              <div className="w-full sm:w-[150px] aspect-square relative bg-slate-50 shrink-0">
                                {candidate.avatar_url ? (
                                  <Image src={candidate.avatar_url} alt={candidate.name} fill className="object-cover" sizes="150px" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-semibold">🐾</div>
                                )}
                              </div>
                              <div className="p-4 flex-1 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <h4 className="font-bold text-base text-slate-900">{candidate.name}</h4>
                                    <span className="text-2xs font-semibold px-2 py-0.5 bg-slate-100 rounded-lg text-slate-600">
                                      {candidate.gender === 'male' ? 'Erkek' : 'Dişi'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-normal">{candidate.breed}</p>
                                </div>
                                <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-slate-100">
                                  <button 
                                    onClick={() => handleDiscoverAction('skip')}
                                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-semibold text-xs rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all"
                                  >
                                    Geç ✕
                                  </button>
                                  <button 
                                    onClick={() => handleDiscoverAction('like')}
                                    className="px-5 py-2 bg-pink-500 text-white font-semibold text-xs rounded-2xl hover:bg-pink-600 shadow-sm shadow-pink-500/20 active:scale-[0.98] transition-all flex items-center gap-1"
                                  >
                                    <Heart className="w-3.5 h-3.5 fill-white stroke-none" /> Beğen
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })()
                    ) : searchedDiscover ? (
                      <div className="text-center py-6 bg-white/60 border border-dashed border-pink-200 rounded-2xl p-4 mt-2">
                        <p className="text-xs text-slate-500 font-normal">Seçtiğiniz şehirlerde yeni bir aday bulunmuyor.</p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </div>

          {/* İLAN FİLTRELEME & ARAMA BARLARI */}
          <div className="flex flex-col gap-3">
            {/* Action Banner */}
            <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 rounded-3xl p-5 text-white shadow-sm flex justify-between items-center gap-4 relative overflow-hidden">
              <div className="flex flex-col gap-1 z-10">
                <h3 className="font-extrabold text-lg">Eşleşme İlanı Oluştur</h3>
                <p className="text-xs text-white/90 font-medium">Dostunuz için ideal bir eşleşme ilanı yayınlayın.</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-pink-600 hover:bg-pink-50 font-extrabold text-xs px-4 py-2.5 rounded-2xl active:scale-[0.98] transition-all shadow-sm shrink-0 flex items-center gap-1.5 z-10"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" /> İlan Ver
              </button>
            </div>

            {/* Arama Barı & Gelişmiş Filtre */}
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 stroke-[2]" />
                <input 
                  type="text" 
                  placeholder="Evcil hayvan, ırk veya şehir ara..." 
                  value={matchSearchQuery}
                  onChange={e => setMatchSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-2xl text-xs font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all placeholder:text-slate-400 shadow-sm"
                />
              </div>
              <button 
                onClick={() => setShowMatchAdvancedFilters(!showMatchAdvancedFilters)}
                className={`p-2.5 rounded-2xl border transition-all shadow-sm ${
                  showMatchAdvancedFilters ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            {/* Gelişmiş Filtre Dropdown */}
            {showMatchAdvancedFilters && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center gap-3 animate-fadeIn">
                <button
                  onClick={() => setEstrusOnly(!estrusOnly)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    estrusOnly 
                      ? 'bg-pink-500 text-white border-pink-500 shadow-sm' 
                      : 'bg-white text-pink-600 border-pink-200 hover:bg-pink-50'
                  }`}
                >
                  🌸 Aktif Kızgınlık
                </button>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-600">Mesafe:</span>
                  <select
                    value={maxDistance ?? ''}
                    onChange={e => setMaxDistance(e.target.value ? Number(e.target.value) : null)}
                    className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="">Tüm Türkiye</option>
                    <option value="50">50 km</option>
                    <option value="100">100 km</option>
                    <option value="200">200 km</option>
                    <option value="500">500 km</option>
                  </select>
                </div>
              </div>
            )}

            {/* Kategori Filtre Çipleri */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button 
                onClick={() => setSpeciesFilter(speciesFilter === 'Köpek' ? 'Tümü' : 'Köpek')}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  speciesFilter === 'Köpek' ? 'bg-pink-600 text-white border-pink-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                🐶 Köpek
              </button>
              <button 
                onClick={() => setSpeciesFilter(speciesFilter === 'Kedi' ? 'Tümü' : 'Kedi')}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  speciesFilter === 'Kedi' ? 'bg-pink-600 text-white border-pink-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                🐱 Kedi
              </button>
              <button 
                onClick={() => {
                  setSpeciesFilter('Tümü')
                  setGenderFilter('Tümü')
                }}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  speciesFilter === 'Tümü' && genderFilter === 'Tümü' ? 'bg-pink-600 text-white border-pink-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Tümü
              </button>
              <button 
                onClick={() => setGenderFilter(genderFilter === 'Erkek' ? 'Tümü' : 'Erkek')}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  genderFilter === 'Erkek' ? 'bg-pink-600 text-white border-pink-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ♂ Erkek
              </button>
              <button 
                onClick={() => setGenderFilter(genderFilter === 'Dişi' ? 'Tümü' : 'Dişi')}
                className={`px-4 py-2 rounded-2xl text-xs font-semibold shrink-0 transition-all border ${
                  genderFilter === 'Dişi' ? 'bg-pink-600 text-white border-pink-600 shadow-sm' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ♀ Dişi
              </button>
            </div>

            {/* Konum Seçimi */}
            <div className="flex items-center gap-2">
              <div className="relative inline-block">
                <select
                  value={cityFilter}
                  onChange={e => setCityFilter(e.target.value)}
                  className="appearance-none px-4 py-2 pr-9 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all shadow-sm"
                >
                  <option value="">📍 Konum (Tüm Türkiye)</option>
                  {Object.keys(TURKIYE_ILLER).sort().map(city => (
                    <option key={city} value={city}>📍 {city}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" />
              </div>
            </div>
          </div>

          {/* İLAN FEED / SECTIONS */}
          {(() => {
            const filteredMatches = matches.filter(listing => {
              if (!matchSearchQuery.trim()) return true
              const query = matchSearchQuery.toLowerCase().trim()
              const pet = listing.pets
              if (!pet) return false
              const nameMatch = (pet.name || '').toLowerCase().includes(query)
              const titleMatch = (listing.title || '').toLowerCase().includes(query)
              const breedMatch = (pet.breed || '').toLowerCase().includes(query)
              const cityMatch = (pet.city || '').toLowerCase().includes(query)
              return nameMatch || titleMatch || breedMatch || cityMatch
            })

            const featuredMatches = filteredMatches.slice(0, 4)
            const recentMatches = filteredMatches

            if (loadingMatches) {
              return (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />
                  ))}
                </div>
              )
            }

            if (filteredMatches.length === 0) {
              return (
                <div className="rounded-3xl bg-white border border-slate-100 p-10 text-center flex flex-col items-center justify-center gap-3 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center">
                    <Compass className="w-6 h-6 stroke-[1.75]" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 text-center">
                    Aramanıza uygun eşleşme ilanı bulunamadı.
                  </p>
                  <p className="text-xs text-slate-500 text-center font-normal">
                    Filtreleri değiştirebilir veya ilk ilanı siz oluşturabilirsiniz.
                  </p>
                </div>
              )
            }

            return (
              <div className="flex flex-col gap-6">
                {/* Section 1: Öne Çıkan Adaylar */}
                {featuredMatches.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-pink-600 stroke-[2.5]" />
                        Öne Çıkan Adaylar
                      </h3>
                      <button className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-0.5">
                        Tümünü Gör <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                    <div className="flex gap-3.5 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-1 px-1">
                      {featuredMatches.map(listing => (
                        <BreedingFeaturedCard key={listing.id} listing={listing} userApplications={userApplications} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Son Eklenen İlanlar */}
                {recentMatches.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="font-extrabold text-slate-900 text-base">Son Eklenen İlanlar</h3>
                      <button className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-0.5">
                        Tümünü Gör <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {recentMatches.map(listing => (
                        <BreedingFeedCard key={listing.id} listing={listing} userApplications={userApplications} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )}
      {/* Universal Listing Create Modal */}
      <CreateListingPetSelectorModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        mode={activeTab === 'adoption' ? 'adoption' : 'match'}
      />

      {closeReportPetId && (
        <ArchiveConfirmModal
          isOpen={!!closeReportPetId}
          itemTitle="Kayıp İlanı"
          isHealthRecord={false}
          onClose={() => setCloseReportPetId(null)}
          onConfirm={confirmMarkLostReportFound}
        />
      )}
    </section>
  )
}


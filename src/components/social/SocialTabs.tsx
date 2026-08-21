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
import { ArchiveConfirmModal } from '@/components/pets/common/ArchiveConfirmModal'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import citiesData from '@/lib/cities.json'
import dynamic from 'next/dynamic'
import {
  Home, AlertTriangle, Heart, ClipboardList,
  Plus, Inbox, Search, Sparkles, MapPin,
  CheckCircle2, XCircle, Compass, List, Map, ChevronDown, ChevronUp,
  X, Clock, Lock, ArrowLeft
} from 'lucide-react'
import { useFeature } from '@/lib/features/hooks'
import { normalizeSpecies } from '@/lib/species'
import { useSearchParams } from 'next/navigation'
import {
  TabDescription, ActiveListingCard, CtaBar, CTA_BUTTON_BASE, CtaSolid,
  SearchBar, FilterPanel, ChipRow, FilterChip, LocationRow,
  SectionHeading, FeaturedRail, ResultsGrid, ResultsSkeleton, EmptyState,
  SubSectionHeading, accentOf,
} from './SocialLayout'

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

  /** "Tümünü Gör" → ilgili sonuç bölümüne kaydırır (canonical blok 10). */
  const scrollToSection = (id: string) => {
    if (typeof document === 'undefined') return
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
  const [matchesError, setMatchesError] = useState<string | null>(null)
  const [lostActionError, setLostActionError] = useState<string | null>(null)
  const [myAdoptionApplications, setMyAdoptionApplications] = useState<any[]>([])
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
  const [matchSearchQuery, setMatchSearchQuery] = useState('')
  const [showMatchAdvancedFilters, setShowMatchAdvancedFilters] = useState(false)

  useEffect(() => {
    if (activeTab === 'match') {
      const handler = setTimeout(() => {
        fetchMatches()
      }, 300)
      return () => clearTimeout(handler)
    }
  }, [activeTab, speciesFilter, genderFilter, cityFilter, estrusOnly, maxDistance, userCity])

  useEffect(() => {
    if (activeTab === 'match') {
      checkMyListing()
      fetchUserApplications()
    } else if (activeTab === 'lost') {
      checkMyLostReports()
    } else if (activeTab === 'adoption') {
      checkMyAdoptionListing()
      fetchMyAdoptionApplications()
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
      console.error('[SocialTabs] mark-found failed:', err)
      setLostActionError('İlan kapatılamadı. Lütfen tekrar deneyin.')
    } finally {
      setCloseReportPetId(null)
    }
  }

  const fetchMyAdoptionApplications = async () => {
    try {
      const res = await fetch('/api/adoption-applications')
      const json = await res.json()
      if (res.ok) setMyAdoptionApplications(json.applications || [])
      else console.error('[SocialTabs] adoption-applications error:', json?.error)
    } catch (err) {
      console.error('[SocialTabs] adoption-applications fetch failed:', err)
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
    setMatchesError(null)
    try {
      const params = new URLSearchParams()
      if (speciesFilter !== 'Tümü') params.append('species', speciesFilter)
      if (genderFilter !== 'Tümü') params.append('gender', genderFilter)
      if (cityFilter.trim()) params.append('city', cityFilter.trim())
      if (estrusOnly) params.append('estrus', 'true')
      if (maxDistance && userCity) {
        params.append('maxDistanceKm', String(maxDistance))
        params.append('userCity', userCity)
      }

      const res = await fetch(`/api/social/breeding-listings?${params.toString()}`)
      const json = await res.json()
      if (res.ok) {
        setMatches(json.data || [])
      } else {
        // Eskiden sessizce "sonuç yok" gibi görünüyordu; artık hata olarak bildiriliyor.
        console.error('[SocialTabs] breeding-listings error:', json?.error)
        setMatches([])
        setMatchesError(json?.error || 'Eşleşme ilanları yüklenemedi.')
      }
    } catch (err) {
      console.error('[SocialTabs] breeding-listings fetch failed:', err)
      setMatches([])
      setMatchesError('Bağlantı hatası. Lütfen tekrar deneyin.')
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

      {/* ═══ BLOK 3 — Sekme açıklaması (ortak ölçü) ═══ */}
      <TabDescription>
        {activeTab === 'adoption' && "Yeni bir dost sahiplenin veya sahiplendirme ilanı oluşturun"}
        {activeTab === 'lost' && "Kayıp ve bulunan evcil hayvan ilanlarını görüntüleyin."}
        {activeTab === 'match' && "Tür, ırk ve konuma göre uygun eş adaylarını keşfedin."}
      </TabDescription>

      {/* ═════════════ SEKME: SAHİPLENDİRME — canonical 11 blok ═════════════ */}
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

        const activeFilterCount =
          (adoptionSpeciesFilter !== 'all' ? 1 : 0) +
          (adoptionAgeFilter !== 'all' ? 1 : 0) +
          (adoptionCityFilter ? 1 : 0) +
          (adoptionDateFilter !== 'all' ? 1 : 0)

        const clearAdoptionFilters = () => {
          setAdoptionSpeciesFilter('all')
          setAdoptionAgeFilter('all')
          setAdoptionCityFilter('')
          setAdoptionDateFilter('all')
        }

        return (
          <div className="flex flex-col gap-5 animate-fadeIn">

            {/* ── BLOK 4: Aktif İlanınız (yalnızca ilan varsa) ── */}
            {myAdoptionListings.length > 0 && (
              <div className="flex flex-col gap-4">
                {myAdoptionListings.map(listing => {
                  const pet = listing.pets
                  return (
                    <div key={listing.id} className="flex flex-col gap-3">
                      <ActiveListingCard
                        accent="violet"
                        avatarUrl={pet?.avatar_url}
                        title={pet?.name}
                        meta={<>{pet?.breed || pet?.species}{pet?.city ? ` • ${pet.city}` : ''}</>}
                        action={
                          <Link
                            href={`/owner/pets/${listing.pet_id}/adoption`}
                            className={`${CTA_BUTTON_BASE} ${accentOf('violet').solid}`}
                          >
                            İlanı Yönet &amp; Düzenle →
                          </Link>
                        }
                      />
                      <SubSectionHeading icon={<ClipboardList className="w-4 h-4 text-violet-600 stroke-[2]" />}>
                        Başvurular Yönetimi ({pet?.name})
                      </SubSectionHeading>
                      <AdoptionApplicationsManager listingId={listing.id} petId={listing.pet_id} />
                    </div>
                  )
                })}
              </div>
            )}


            {/* Blok 4 devamı — kendi başvurularının durumu (Eşleştirme ile simetrik) */}
            {myAdoptionApplications.length > 0 && (
              <div className="flex flex-col gap-3">
                <SubSectionHeading icon={<Inbox className="w-4 h-4 text-violet-600 stroke-[2]" />}>
                  Başvurularım
                </SubSectionHeading>
                <ResultsGrid>
                  {myAdoptionApplications.map(app => {
                    const listing = Array.isArray(app.pet_adoptions) ? app.pet_adoptions[0] : app.pet_adoptions
                    const pet = Array.isArray(listing?.pets) ? listing?.pets[0] : listing?.pets
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
                            <h4 className="font-semibold text-slate-900 text-xs truncate">{pet?.name || 'İlan'}</h4>
                        {(() => {
                          switch (app.status) {
                            case 'pending':
                              return <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1"><Clock className="w-3 h-3 stroke-[2]" /> Bekliyor</span>
                            case 'approved':
                              return <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1"><CheckCircle2 className="w-3 h-3 stroke-[2]" /> Onaylandı</span>
                            case 'rejected':
                              return <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center gap-1"><XCircle className="w-3 h-3 stroke-[2]" /> Reddedildi</span>
                            default:
                              return <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">{app.status}</span>
                          }
                        })()}
                          </div>
                          <p className="text-2xs text-slate-500 truncate font-normal">
                            Sahiplendirme başvurunuz
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </ResultsGrid>
              </div>
            )}

            {/* ── BLOK 5: CTA ── */}
            <CtaBar>
              <CtaSolid accent="violet" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 stroke-[2.5]" /> İlan Ver
              </CtaSolid>
            </CtaBar>

            {/* ── BLOK 6: Arama + filtre butonu ── */}
            <SearchBar
              accent="violet"
              activeCount={activeFilterCount}
              value={adoptionSearchQuery}
              onChange={setAdoptionSearchQuery}
              placeholder="Evcil hayvan, ırk veya şehir ara..."
              filtersOpen={showAdvancedFilters}
              onToggleFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
            />

            {/* ── BLOK 7: Filtre paneli ── */}
            <FilterPanel
              accent="violet"
              open={showAdvancedFilters}
              onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
              activeCount={activeFilterCount}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-600">Tarih:</span>
                <select
                  value={adoptionDateFilter}
                  onChange={e => setAdoptionDateFilter(e.target.value as any)}
                  aria-label="Tarih filtresi"
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
                >
                  <option value="all">Tüm Zamanlar</option>
                  <option value="7days">Son 7 Gün</option>
                  <option value="30days">Son 30 Gün</option>
                </select>
              </div>
              {activeFilterCount === 0 && (
                <span className="text-xs text-slate-400 font-normal">Aktif filtre yok.</span>
              )}
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAdoptionFilters}
                  className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2"
                >
                  Filtreleri Temizle
                </button>
              )}
            </FilterPanel>

            {/* ── BLOK 8: Hızlı filtre chip'leri (kriter: tür + yaş) ── */}
            <ChipRow>
              <FilterChip accent="violet" active={adoptionSpeciesFilter === 'dog'} onClick={() => setAdoptionSpeciesFilter(adoptionSpeciesFilter === 'dog' ? 'all' : 'dog')}>🐶 Köpek</FilterChip>
              <FilterChip accent="violet" active={adoptionSpeciesFilter === 'cat'} onClick={() => setAdoptionSpeciesFilter(adoptionSpeciesFilter === 'cat' ? 'all' : 'cat')}>🐱 Kedi</FilterChip>
              <FilterChip accent="violet" active={adoptionSpeciesFilter === 'all' && adoptionAgeFilter === 'all'} onClick={() => { setAdoptionSpeciesFilter('all'); setAdoptionAgeFilter('all') }}>Tümü</FilterChip>
              <FilterChip accent="violet" active={adoptionAgeFilter === 'puppy'} onClick={() => setAdoptionAgeFilter(adoptionAgeFilter === 'puppy' ? 'all' : 'puppy')}>Yavru</FilterChip>
              <FilterChip accent="violet" active={adoptionAgeFilter === 'adult'} onClick={() => setAdoptionAgeFilter(adoptionAgeFilter === 'adult' ? 'all' : 'adult')}>Yetişkin</FilterChip>
            </ChipRow>

            {/* ── BLOK 9: Konum ── */}
            <LocationRow
              accent="violet"
              value={adoptionCityFilter}
              onChange={setAdoptionCityFilter}
              allLabel="Konum (Tüm Türkiye)"
            />

            {/* ── BLOK 10 / 11: Sonuçlar veya boş durum ── */}
            {filteredAdoptions.length === 0 ? (
              <EmptyState title="Aramanıza uygun ilan bulunamadı." />
            ) : (
              <div className="flex flex-col gap-6">
                {featuredListings.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <SectionHeading accent="violet" icon={<Sparkles className="w-4 h-4 text-violet-600 stroke-[2.5]" />} onSeeAll={() => scrollToSection('adoption-recent')}>
                      Öne Çıkanlar
                    </SectionHeading>
                    <FeaturedRail>
                      {featuredListings.map(adoption => (
                        <AdoptionFeaturedCard key={adoption.id} adoption={adoption} currentUserId={currentUserId} />
                      ))}
                    </FeaturedRail>
                  </div>
                )}

                {recentListings.length > 0 && (
                  <div className="flex flex-col gap-3" id="adoption-recent">
                    <SectionHeading accent="violet">Tüm İlanlar</SectionHeading>
                    <ResultsGrid>
                      {recentListings.map(adoption => (
                        <AdoptionFeedCard key={adoption.id} adoption={adoption} currentUserId={currentUserId} />
                      ))}
                    </ResultsGrid>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* ═════════════ SEKME: KAYIP İLANLARI — canonical 11 blok ═════════════ */}
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

        const activeFilterCount =
          (lostSpeciesFilter !== 'Tümü' ? 1 : 0) +
          (lostDateFilter !== 'Tümü' ? 1 : 0) +
          (lostCityFilter ? 1 : 0)

        const clearLostFilters = () => {
          setLostSpeciesFilter('Tümü')
          setLostDateFilter('Tümü')
          setLostCityFilter('')
        }

        return (
          <div className="flex flex-col gap-5 animate-fadeIn">

            {/* ── BLOK 4: Aktif İlanınız (yalnızca ilan varsa) ── */}
            {myLostReports.length > 0 && (
              <div className="flex flex-col gap-4">
                {myLostReports.map(report => {
                  const pet = report.pets
                  return (
                    <ActiveListingCard
                      key={report.id}
                      accent="orange"
                      avatarUrl={pet?.avatar_url}
                      title={pet?.name}
                      meta={<><MapPin className="w-3.5 h-3.5 text-orange-700 stroke-[2] shrink-0" /> Son Görülme: {report.last_seen_location}</>}
                      action={
                        <button
                          type="button"
                          onClick={() => handleMarkLostReportFound(pet.id)}
                          className={`${CTA_BUTTON_BASE} ${accentOf('orange').solid}`}
                        >
                          Bulundu Olarak İşaretle ✓
                        </button>
                      }
                    />
                  )
                })}
              </div>
            )}

            {lostActionError && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200" role="alert">
                <p className="text-xs font-semibold text-rose-800">{lostActionError}</p>
                <button
                  type="button"
                  onClick={() => setLostActionError(null)}
                  aria-label="Uyarıyı kapat"
                  className="text-rose-700 hover:text-rose-900 shrink-0"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            )}

            {/* ── BLOK 5: CTA (bu sekmede iki eşit ağırlıklı aksiyon) ── */}
            <CtaBar twoUp>
              <Link
                href="/owner/lost-report?mode=lost"
                className={`${CTA_BUTTON_BASE} ${accentOf('orange').solid}`}
              >
                <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                Kayıp İlanı Ver
              </Link>
              <Link
                href="/owner/lost-report?mode=found"
                className={`${CTA_BUTTON_BASE} ${accentOf('orange').outline}`}
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                Buldum Bildir
              </Link>
            </CtaBar>

            {/* ── BLOK 6: Arama + filtre butonu ── */}
            <SearchBar
              accent="orange"
              activeCount={activeFilterCount}
              value={lostSearchQuery}
              onChange={setLostSearchQuery}
              placeholder="Kayıp pet, ırk veya ilçe/şehir ara..."
              filtersOpen={showLostAdvancedFilters}
              onToggleFilters={() => setShowLostAdvancedFilters(!showLostAdvancedFilters)}
            />

            {/* ── BLOK 7: Filtre paneli ── */}
            <FilterPanel
              accent="orange"
              open={showLostAdvancedFilters}
              onToggle={() => setShowLostAdvancedFilters(!showLostAdvancedFilters)}
              activeCount={activeFilterCount}
            >
              {activeFilterCount === 0 && (
                <span className="text-xs text-slate-400 font-normal">Aktif filtre yok.</span>
              )}
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearLostFilters}
                  className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2"
                >
                  Filtreleri Temizle
                </button>
              )}
            </FilterPanel>

            {/* ── BLOK 8: Hızlı filtre chip'leri (kriter: tür + zaman) ── */}
            <ChipRow>
              <FilterChip accent="orange" active={lostSpeciesFilter === 'Köpek'} onClick={() => setLostSpeciesFilter(lostSpeciesFilter === 'Köpek' ? 'Tümü' : 'Köpek')}>🐶 Köpek</FilterChip>
              <FilterChip accent="orange" active={lostSpeciesFilter === 'Kedi'} onClick={() => setLostSpeciesFilter(lostSpeciesFilter === 'Kedi' ? 'Tümü' : 'Kedi')}>🐱 Kedi</FilterChip>
              <FilterChip accent="orange" active={lostSpeciesFilter === 'Tümü' && lostDateFilter === 'Tümü'} onClick={() => { setLostSpeciesFilter('Tümü'); setLostDateFilter('Tümü') }}>Tümü</FilterChip>
              <FilterChip accent="orange" active={lostDateFilter === 'Bugün'} onClick={() => setLostDateFilter(lostDateFilter === 'Bugün' ? 'Tümü' : 'Bugün')}>Bugün</FilterChip>
              <FilterChip accent="orange" active={lostDateFilter === 'Son 3 Gün'} onClick={() => setLostDateFilter(lostDateFilter === 'Son 3 Gün' ? 'Tümü' : 'Son 3 Gün')}>Son 3 Gün</FilterChip>
              <FilterChip accent="orange" active={lostDateFilter === 'Son 7 Gün'} onClick={() => setLostDateFilter(lostDateFilter === 'Son 7 Gün' ? 'Tümü' : 'Son 7 Gün')}>Son 7 Gün</FilterChip>
            </ChipRow>

            {/* ── BLOK 9: Konum (+ bu sekmeye özel Liste/Harita istisnası) ── */}
            <LocationRow
              accent="orange"
              value={lostCityFilter}
              onChange={setLostCityFilter}
              allLabel="Konum (Tüm Türkiye)"
              right={
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setLostViewMode('list')}
                    aria-pressed={lostViewMode === 'list'}
                    className={`px-3 py-1.5 min-h-[32px] text-xs font-semibold rounded-xl transition-all flex items-center gap-1 ${
                      lostViewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <List className="w-3.5 h-3.5 stroke-[2]" /> Liste
                  </button>
                  <button
                    type="button"
                    onClick={() => setLostViewMode('map')}
                    aria-pressed={lostViewMode === 'map'}
                    className={`px-3 py-1.5 min-h-[32px] text-xs font-semibold rounded-xl transition-all flex items-center gap-1 ${
                      lostViewMode === 'map' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Map className="w-3.5 h-3.5 stroke-[2]" /> Harita
                  </button>
                </div>
              }
            />

            {/* ── BLOK 10 / 11: Sonuçlar veya boş durum ── */}
            {!myLostReportsLoaded ? (
              <ResultsSkeleton />
            ) : filteredLostPets.length === 0 ? (
              <EmptyState title="Aramanıza uygun kayıp ilanı bulunamadı." />
            ) : lostViewMode === 'map' ? (
              <LostMapView reports={filteredLostPets} />
            ) : (
              <div className="flex flex-col gap-6">
                {emergencyLostPets.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <SectionHeading accent="orange" icon={<AlertTriangle className="w-4 h-4 text-orange-700 stroke-[2.5]" />} onSeeAll={() => scrollToSection('lost-recent')}>
                      Acil Kayıp İlanları
                    </SectionHeading>
                    <FeaturedRail>
                      {emergencyLostPets.map(report => (
                        <LostFeaturedCard key={report.id} report={report} />
                      ))}
                    </FeaturedRail>
                  </div>
                )}

                {recentLostPets.length > 0 && (
                  <div className="flex flex-col gap-3" id="lost-recent">
                    <SectionHeading accent="orange">Tüm Kayıp İlanları</SectionHeading>
                    <ResultsGrid>
                      {recentLostPets.map(report => (
                        <LostFeedCard key={report.id} report={report} />
                      ))}
                    </ResultsGrid>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* ═════════════ SEKME: EŞLEŞTİRME — canonical 11 blok ═════════════ */}
      {activeTab === 'match' && (() => {
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

        const activeFilterCount =
          (speciesFilter !== 'Tümü' ? 1 : 0) +
          (genderFilter !== 'Tümü' ? 1 : 0) +
          (cityFilter ? 1 : 0) +
          (estrusOnly ? 1 : 0) +
          (maxDistance ? 1 : 0)

        const clearMatchFilters = () => {
          setSpeciesFilter('Tümü')
          setGenderFilter('Tümü')
          setCityFilter('')
          setEstrusOnly(false)
          setMaxDistance(null)
        }

        return (
          <div className="flex flex-col gap-5 animate-fadeIn">

            {/* ── BLOK 4 ve 5 PRO kapısının DIŞINDA: kendi ilanını ve
                 gelen başvurularını PRO olmayan kullanıcı da yönetebilmeli. ── */}
            {/* ── BLOK 4: Aktif İlanınız (yalnızca ilan varsa) + başvuru durumu ── */}
            {myListings.length > 0 && (
              <div className="flex flex-col gap-4">
                {myListings.map(listing => {
                  const pet = listing.pets
                  const exp = getExperienceBadge(listing.experience_level)

                  return (
                    <div key={listing.id} className="flex flex-col gap-3">
                      <ActiveListingCard
                        accent="pink"
                        avatarUrl={pet?.avatar_url}
                        title={listing.title}
                        titleSuffix={
                          <>
                            {pet?.gender === 'male' && <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">♂ Erkek</span>}
                            {pet?.gender === 'female' && <span className="text-2xs font-semibold px-2 py-0.5 rounded-lg bg-pink-50 text-pink-600 border border-pink-100 shrink-0">♀ Dişi</span>}
                          </>
                        }
                        meta={<>{pet?.name}{pet?.breed ? ` • ${pet.breed}` : ''}{pet?.birth_date ? ` • ${getAge(pet.birth_date)}` : ''}{pet?.city ? ` • ${pet.city}` : ''}</>}
                        extras={
                          listing.requirements && listing.requirements.length > 0 ? (
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
                          ) : undefined
                        }
                        action={
                          <Link
                            href={`/owner/pets/${listing.pet_id}/match`}
                            className={`${CTA_BUTTON_BASE} ${accentOf('pink').solid}`}
                          >
                            İlanı Yönet &amp; Düzenle →
                          </Link>
                        }
                      />
                      <SubSectionHeading icon={<ClipboardList className="w-4 h-4 text-pink-500 stroke-[2]" />}>
                        Gelen Başvurular ({pet?.name})
                      </SubSectionHeading>
                      <BreedingApplicationsManager listingId={listing.id} />
                    </div>
                  )
                })}
              </div>
            )}

            {userApplications.length > 0 && (
              <div className="flex flex-col gap-3">
                <SubSectionHeading icon={<Inbox className="w-4 h-4 text-pink-500 stroke-[2]" />}>
                  Başvurularım
                </SubSectionHeading>
                <ResultsGrid>
                  {userApplications.map(app => {
                    const pet = app.applicant_pet
                    const listingTitle = app.listing?.title || 'Bilinmeyen İlan'

                    let statusBadge = null
                    switch (app.status) {
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
                </ResultsGrid>
              </div>
            )}

            {/* ── BLOK 5: CTA ── */}
            <CtaBar>
              <CtaSolid accent="pink" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 stroke-[2.5]" /> Eşleştirme İlanı Ver
              </CtaSolid>
            </CtaBar>

            {/* PRO durumu — bu sekmeye özel erişim kapısı (korunmuştur) */}
            {!matchFeature.enabled && !matchFeature.loading && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-50 to-violet-50 border border-violet-100 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">Eşleştirme PRO Özelliği</h4>
                    <p className="text-xs text-slate-500 truncate">Arkadaşını davet ederek ücretsiz PRO kazanabilirsin</p>
                  </div>
                </div>
                <Link href="/owner/referral" className="bg-white text-violet-700 text-xs font-bold px-4 py-2 rounded-xl shadow-sm border border-violet-100 hover:bg-violet-50 transition-colors shrink-0">
                  PRO Kazan →
                </Link>
              </div>
            )}

            {matchFeature.loading ? (
              <ResultsSkeleton />
            ) : !matchFeature.enabled ? (
              <EmptyState
                icon={<Sparkles className="w-6 h-6 stroke-[1.75]" />}
                title="Eşleştirme Adayları PRO Üyelerimize Özeldir"
                hint="Arkadaşlarını Odi'ye davet ederek anında ücretsiz PRO kazanabilir ve tüm eşleşme adaylarını hemen incelemeye başlayabilirsin."
                action={
                  <Link
                    href="/owner/referral"
                    className="mt-2 inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-sm transition-all active:scale-[0.98]"
                  >
                    Arkadaşını Davet Et (+30 Gün PRO) →
                  </Link>
                }
              />
            ) : (
              <>
                {/* ── BLOK 6: Arama + filtre butonu ── */}
                <SearchBar
                  accent="pink"
                  activeCount={activeFilterCount}
                  value={matchSearchQuery}
                  onChange={setMatchSearchQuery}
                  placeholder="Evcil hayvan, ırk veya şehir ara..."
                  filtersOpen={showMatchAdvancedFilters}
                  onToggleFilters={() => setShowMatchAdvancedFilters(!showMatchAdvancedFilters)}
                />

                {/* ── BLOK 7: Filtre paneli ── */}
                <FilterPanel
                  accent="pink"
                  open={showMatchAdvancedFilters}
                  onToggle={() => setShowMatchAdvancedFilters(!showMatchAdvancedFilters)}
                  activeCount={activeFilterCount}
                >
                  <button
                    type="button"
                    onClick={() => setEstrusOnly(!estrusOnly)}
                    aria-pressed={estrusOnly}
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
                      aria-label="Mesafe filtresi"
                      className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="">Tüm Türkiye</option>
                      <option value="50">50 km</option>
                      <option value="100">100 km</option>
                      <option value="200">200 km</option>
                      <option value="500">500 km</option>
                    </select>
                  </div>
                  {activeFilterCount === 0 && (
                    <span className="text-xs text-slate-400 font-normal">Aktif filtre yok.</span>
                  )}
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearMatchFilters}
                      className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-2"
                    >
                      Filtreleri Temizle
                    </button>
                  )}
                </FilterPanel>

                {/* ── BLOK 8: Hızlı filtre chip'leri (kriter: tür + cinsiyet) ── */}
                <ChipRow>
                  <FilterChip accent="pink" active={speciesFilter === 'Köpek'} onClick={() => setSpeciesFilter(speciesFilter === 'Köpek' ? 'Tümü' : 'Köpek')}>🐶 Köpek</FilterChip>
                  <FilterChip accent="pink" active={speciesFilter === 'Kedi'} onClick={() => setSpeciesFilter(speciesFilter === 'Kedi' ? 'Tümü' : 'Kedi')}>🐱 Kedi</FilterChip>
                  <FilterChip accent="pink" active={speciesFilter === 'Tümü' && genderFilter === 'Tümü'} onClick={() => { setSpeciesFilter('Tümü'); setGenderFilter('Tümü') }}>Tümü</FilterChip>
                  <FilterChip accent="pink" active={genderFilter === 'Erkek'} onClick={() => setGenderFilter(genderFilter === 'Erkek' ? 'Tümü' : 'Erkek')}>♂ Erkek</FilterChip>
                  <FilterChip accent="pink" active={genderFilter === 'Dişi'} onClick={() => setGenderFilter(genderFilter === 'Dişi' ? 'Tümü' : 'Dişi')}>♀ Dişi</FilterChip>
                </ChipRow>

                {/* ── BLOK 9: Konum ── */}
                <LocationRow
                  accent="pink"
                  value={cityFilter}
                  onChange={setCityFilter}
                  allLabel="Konum (Tüm Türkiye)"
                />

                {/* ── BLOK 10 / 11: Sonuçlar veya boş durum ── */}
                {loadingMatches ? (
                  <ResultsSkeleton />
                ) : matchesError ? (
                  <EmptyState
                    icon={<AlertTriangle className="w-6 h-6 stroke-[1.75]" />}
                    title="Eşleşme İlanları Yüklenemedi"
                    hint={matchesError}
                    action={
                      <button
                        type="button"
                        onClick={fetchMatches}
                        className="mt-2 inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-2xl transition-all active:scale-[0.98]"
                      >
                        Tekrar Dene
                      </button>
                    }
                  />
                ) : filteredMatches.length === 0 ? (
                  <EmptyState title="Aramanıza uygun eşleşme ilanı bulunamadı." />
                ) : (
                  <div className="flex flex-col gap-6">
                    {featuredMatches.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <SectionHeading accent="pink" icon={<Sparkles className="w-4 h-4 text-pink-600 stroke-[2.5]" />} onSeeAll={() => scrollToSection('match-recent')}>
                          Öne Çıkanlar
                        </SectionHeading>
                        <FeaturedRail>
                          {featuredMatches.map(listing => (
                            <BreedingFeaturedCard key={listing.id} listing={listing} userApplications={userApplications} />
                          ))}
                        </FeaturedRail>
                      </div>
                    )}

                    {recentMatches.length > 0 && (
                      <div className="flex flex-col gap-3" id="match-recent">
                        <SectionHeading accent="pink">Tüm İlanlar</SectionHeading>
                        <ResultsGrid>
                          {recentMatches.map(listing => (
                            <BreedingFeedCard key={listing.id} listing={listing} userApplications={userApplications} />
                          ))}
                        </ResultsGrid>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Sekmeye özel ek bölüm: Aday Keşfet (canonical blokların dışında) ── */}
                <div className="rounded-3xl border border-pink-100 bg-pink-50/40 p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-pink-600 stroke-[2]" />
                      <h3 className="font-bold text-sm text-slate-900">Aday Keşfet</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDiscover(!showDiscover)}
                      aria-expanded={showDiscover}
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
                            type="button"
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
                                  type="button"
                                  onClick={() => setSelectedCities(prev => prev.filter(c => c !== city))}
                                  aria-label={`${city} şehrini kaldır`}
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
                              aria-label="Şehir ekle"
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
                              type="button"
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
                                          type="button"
                                          onClick={() => handleDiscoverAction('skip')}
                                          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-semibold text-xs rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all"
                                        >
                                          Geç ✕
                                        </button>
                                        <button
                                          type="button"
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
              </>
            )}
          </div>
        )
      })()}
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


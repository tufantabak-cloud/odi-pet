'use client'

import React, { useState, useEffect, useId, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  ArrowRight,
  X,
  MapPin,
  Sparkles,
  ShieldCheck,
  Clock,
  Compass,
  RefreshCw,
  Droplets,
  HeartHandshake,
  Lightbulb,
  Search,
  Loader2,
} from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { evaluateWeatherScenario, WeatherScenarioResult } from '@/lib/weatherScenarios'
import { TURKIYE_ILLER } from '@/lib/utils/turkiyeIller'
import { useGeolocation } from '@/contexts/GeolocationContext'

export interface WeatherData {
  temp: number
  feelsLike: number
  humidity: number
  humidityLevelText: string
  uvIndex: number
  uvLevelText: string
  weatherCode: number
  weatherDescription: string
  weatherIconType: string
  cityName: string
  isDay: boolean
  sunset: string
  sunrise: string
  asphaltTemp: number
  hourlyForecast: Array<{
    time: string
    temp: number
    uv: number
    weatherCode: number
    humidity: number
  }>
  isFallback?: boolean
  hasLocation?: boolean
}

interface WeatherPawAlertProps {
  activePet: {
    id: string
    name: string
    species?: string
    city?: string
    [key: string]: any
  }
  ownerProfile?: {
    id: string
    city?: string
    [key: string]: any
  }
}

/**
 * Dog Walking Vector Illustration (Matching reference artwork)
 */
function DogWalkIllustration({ className = '' }: { className?: string }) {
  const sunGradId = useId()
  const grassGradId = useId()
  const dogGradId = useId()
  const skyGradId = useId()

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 240 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[190px] drop-shadow-xs"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={sunGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="60%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </radialGradient>
          <linearGradient id={grassGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D1FAE5" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#A7F3D0" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#E0E7FF" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id={dogGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <linearGradient id={skyGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#F1F5F9" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* Clouds */}
        <g opacity="0.85">
          <ellipse cx="60" cy="70" rx="35" ry="16" fill={`url(#${skyGradId})`} />
          <ellipse cx="85" cy="62" rx="22" ry="18" fill={`url(#${skyGradId})`} />
          <ellipse cx="180" cy="95" rx="45" ry="18" fill={`url(#${skyGradId})`} />
          <ellipse cx="205" cy="88" rx="26" ry="20" fill={`url(#${skyGradId})`} />
        </g>

        {/* Sun */}
        <g transform="translate(160, 48)">
          <g stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" opacity="0.85">
            <line x1="0" y1="-24" x2="0" y2="-18" />
            <line x1="0" y1="18" x2="0" y2="24" />
            <line x1="-24" y1="0" x2="-18" y2="0" />
            <line x1="18" y1="0" x2="24" y2="0" />
            <line x1="-16" y1="-16" x2="-12" y2="-12" />
            <line x1="12" y1="12" x2="16" y2="16" />
            <line x1="-16" y1="16" x2="-12" y2="12" />
            <line x1="12" y1="-12" x2="16" y2="-16" />
          </g>
          <circle cx="0" cy="0" r="14" fill={`url(#${sunGradId})`} />
        </g>

        {/* Ground */}
        <ellipse cx="140" cy="186" rx="95" ry="10" fill={`url(#${grassGradId})`} />

        {/* Leash */}
        <path
          d="M 195 130 C 180 138, 160 148, 142 149"
          stroke="#475569"
          strokeWidth="1.75"
          fill="none"
          strokeLinecap="round"
        />

        {/* Woman */}
        <g transform="translate(180, 80)">
          <path
            d="M 28 8 C 24 2, 38 0, 42 6 C 46 12, 46 22, 43 28 C 39 28, 35 24, 34 18 Z"
            fill="#451A03"
          />
          <circle cx="34" cy="12" r="7.5" fill="#FED7AA" />
          <path d="M 37 11 Q 39 12 37 14" stroke="#451A03" strokeWidth="0.8" fill="none" />
          <rect x="32" y="18" width="4" height="5" fill="#FED7AA" />
          <path
            d="M 24 23 C 28 21, 40 21, 44 23 L 42 55 C 38 56, 30 56, 26 55 Z"
            fill="#EA580C"
          />
          <path
            d="M 26 23 L 18 36 C 16 38, 14 42, 16 46 L 15 50"
            stroke="#EA580C"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="15" cy="50" r="3" fill="#FED7AA" />
          <path
            d="M 42 24 L 46 38 L 44 48"
            stroke="#C2410C"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 27 54 L 20 86 L 22 98"
            stroke="#1E293B"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M 39 54 L 46 84 L 49 96"
            stroke="#334155"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path d="M 18 97 C 18 95, 26 95, 27 98 L 16 99 Z" fill="#78350F" />
          <path d="M 45 95 C 45 93, 53 93, 54 96 L 43 97 Z" fill="#78350F" />
        </g>

        {/* Dog */}
        <g transform="translate(100, 126)">
          <path
            d="M 58 24 C 64 16, 68 10, 65 6 C 62 4, 57 12, 53 20"
            stroke="#F59E0B"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 52 32 L 56 50 L 59 55"
            stroke="#D97706"
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
          />
          <ellipse cx="36" cy="30" rx="22" ry="13" fill={`url(#${dogGradId})`} />
          <path
            d="M 44 32 L 40 48 L 43 56"
            stroke="#F59E0B"
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 20 32 L 14 48 L 9 55"
            stroke="#F59E0B"
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 28 32 L 32 49 L 34 56"
            stroke="#D97706"
            strokeWidth="5.5"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M 24 24 L 18 10 L 28 8 L 32 20 Z" fill={`url(#${dogGradId})`} />
          <path d="M 18 18 L 26 21" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
          <circle cx="21" cy="23" r="1.5" fill="#FBBF24" />
          <path d="M 12 12 C 10 4, 18 0, 24 4 C 28 7, 26 16, 20 16 Z" fill={`url(#${dogGradId})`} />
          <path d="M 12 8 L 4 11 C 3 13, 6 16, 12 15 Z" fill="#FEF08A" />
          <circle cx="4" cy="11" r="1.75" fill="#1E293B" />
          <circle cx="14" cy="7" r="1.5" fill="#1E293B" />
          <path d="M 6 14 Q 9 17 11 14" stroke="#DC2626" strokeWidth="1.2" fill="#F87171" />
          <path d="M 18 4 C 22 2, 26 8, 23 16 C 20 18, 17 14, 18 4 Z" fill="#B45309" />
        </g>
      </svg>
    </div>
  )
}

/**
 * Cat Indoor Comfort & Play Vector Illustration
 */
function CatIndoorIllustration({ className = '' }: { className?: string }) {
  const sunGradId = useId()
  const catGradId = useId()
  const cushionGradId = useId()

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 240 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-h-[190px] drop-shadow-xs"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={sunGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="60%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </radialGradient>
          <linearGradient id={cushionGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E0E7FF" />
            <stop offset="50%" stopColor="#C7D2FE" />
            <stop offset="100%" stopColor="#DDD6FE" />
          </linearGradient>
          <linearGradient id={catGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FED7AA" />
            <stop offset="100%" stopColor="#FB923C" />
          </linearGradient>
        </defs>

        {/* 1. Soft Window Frame / Sun outside */}
        <g transform="translate(150, 42)">
          <g stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" opacity="0.85">
            <line x1="0" y1="-20" x2="0" y2="-15" />
            <line x1="0" y1="15" x2="0" y2="20" />
            <line x1="-20" y1="0" x2="-15" y2="0" />
            <line x1="15" y1="0" x2="20" y2="0" />
            <line x1="-14" y1="-14" x2="-10" y2="-10" />
            <line x1="10" y1="10" x2="14" y2="14" />
            <line x1="-14" y1="14" x2="-10" y2="10" />
            <line x1="10" y1="-10" x2="14" y2="-14" />
          </g>
          <circle cx="0" cy="0" r="12" fill={`url(#${sunGradId})`} />
        </g>

        {/* Window Clouds */}
        <ellipse cx="65" cy="65" rx="30" ry="14" fill="#FFFFFF" opacity="0.9" />
        <ellipse cx="90" cy="58" rx="20" ry="16" fill="#FFFFFF" opacity="0.9" />

        {/* 2. Cozy Cushion on Floor / Sill */}
        <ellipse cx="120" cy="175" rx="85" ry="16" fill={`url(#${cushionGradId})`} />
        <ellipse cx="120" cy="172" rx="76" ry="12" fill="#EEF2FF" />

        {/* 3. Cat Feather Toy / Wand */}
        <g transform="translate(35, 110)">
          <line x1="0" y1="65" x2="45" y2="15" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          <path d="M 45 15 C 55 25, 65 35, 75 42" stroke="#CBD5E1" strokeWidth="1.2" fill="none" strokeDasharray="3 3" />
          {/* Feathers */}
          <path d="M 75 42 Q 85 38 88 48 Q 78 48 75 42 Z" fill="#F43F5E" />
          <path d="M 75 42 Q 82 48 85 55 Q 77 52 75 42 Z" fill="#3B82F6" />
          <circle cx="75" cy="42" r="2.5" fill="#FBBF24" />
        </g>

        {/* 4. Cute Ginger/Tabby Cat Relaxing / Playing */}
        <g transform="translate(100, 115)">
          {/* Tail curling happily */}
          <path
            d="M 50 40 C 65 30, 72 15, 66 10 C 60 5, 52 20, 44 32"
            stroke="#EA580C"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />

          {/* Cat Body */}
          <ellipse cx="30" cy="38" rx="24" ry="16" fill={`url(#${catGradId})`} />

          {/* Back Leg */}
          <ellipse cx="44" cy="45" rx="10" ry="8" fill="#EA580C" />

          {/* Front Paws stretched */}
          <ellipse cx="10" cy="48" rx="6" ry="4" fill="#FED7AA" />
          <ellipse cx="18" cy="50" rx="6" ry="4" fill="#FED7AA" />

          {/* Cat Head */}
          <circle cx="12" cy="22" r="14" fill={`url(#${catGradId})`} />

          {/* Ears */}
          <polygon points="4,12 0,2 10,8" fill="#EA580C" />
          <polygon points="3,10 2,4 8,8" fill="#FECDD3" />
          <polygon points="14,8 24,2 20,12" fill="#EA580C" />
          <polygon points="16,8 22,4 19,10" fill="#FECDD3" />

          {/* Eyes (Happy Closed Arch) */}
          <path d="M 6 20 Q 9 17 12 20" stroke="#431407" strokeWidth="1.75" fill="none" strokeLinecap="round" />
          <path d="M 15 20 Q 18 17 21 20" stroke="#431407" strokeWidth="1.75" fill="none" strokeLinecap="round" />

          {/* Cute Pink Nose & Mouth */}
          <polygon points="13,24 15,24 14,26" fill="#F43F5E" />
          <path d="M 12 27 Q 14 29 16 27" stroke="#431407" strokeWidth="1" fill="none" />

          {/* Whiskers */}
          <line x1="3" y1="23" x2="-5" y2="21" stroke="#9A3412" strokeWidth="0.8" />
          <line x1="3" y1="26" x2="-4" y2="27" stroke="#9A3412" strokeWidth="0.8" />
          <line x1="22" y1="23" x2="30" y2="21" stroke="#9A3412" strokeWidth="0.8" />
          <line x1="22" y1="26" x2="29" y2="27" stroke="#9A3412" strokeWidth="0.8" />
        </g>
      </svg>
    </div>
  )
}

function renderWeatherIcon(iconType: string, className: string = 'w-8 h-8 text-slate-800 stroke-[1.75]') {
  switch (iconType) {
    case 'sun':
      return <Sun className={className} />
    case 'cloud-sun':
      return <CloudSun className={className} />
    case 'cloud':
      return <Cloud className={className} />
    case 'rain':
    case 'heavy-rain':
    case 'drizzle':
      return <CloudRain className={className} />
    case 'snow':
      return <CloudSnow className={className} />
    case 'thunder':
      return <CloudLightning className={className} />
    case 'fog':
      return <CloudFog className={className} />
    default:
      return <Sun className={className} />
  }
}

export default function WeatherPawAlert({ activePet, ownerProfile }: WeatherPawAlertProps) {
  const router = useRouter()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Location Modal States
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSavingLocation, setIsSavingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')

  const effectiveCity = activePet?.city || ownerProfile?.city || ''
  const petName = activePet?.name || 'Dostunuz'
  const petSpecies = activePet?.species || ''
  const profileId = ownerProfile?.id


  const citiesList = useMemo(() => {
    return Object.values(TURKIYE_ILLER).sort((a, b) => a.label.localeCompare(b.label))
  }, [])

  const filteredCities = useMemo(() => {
    if (!searchQuery) return citiesList
    const lowerQ = searchQuery.toLowerCase()
    // Türkçe karaktere duyarlı basit arama
    return citiesList.filter((city) => 
      city.label.toLowerCase().includes(lowerQ) || 
      city.label.toLocaleLowerCase('tr-TR').includes(lowerQ)
    )
  }, [searchQuery, citiesList])

  const saveCityToProfile = async (cityName: string) => {
    if (!profileId) return
    setIsSavingLocation(true)
    setLocationError('')
    try {
      const supabase = createBrowserSupabaseClient()
      const { error } = await supabase.from('profiles').update({ city: cityName }).eq('id', profileId)

      if (!error) {
        sessionStorage.removeItem('odi_weather_data_v3')
        setShowLocationModal(false)
        router.refresh()
      } else {
        setLocationError('Konum kaydedilirken bir hata oluştu.')
      }
    } catch (err) {
      setLocationError('Bağlantı hatası oluştu.')
    } finally {
      setIsSavingLocation(false)
    }
  }

  const { requestLocation } = useGeolocation()

  const fetchWeather = async (signal: AbortSignal, coords?: { latitude: number; longitude: number }) => {
    try {
      let url = `/api/weather`
      if (coords) {
        url += `?lat=${coords.latitude}&lon=${coords.longitude}`
        if (effectiveCity) url += `&city=${encodeURIComponent(effectiveCity)}`
      } else if (effectiveCity) {
        url += `?city=${encodeURIComponent(effectiveCity)}`
      }

      const res = await fetch(url, { signal })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data && !signal.aborted) {
          setWeather(json.data)
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(
              'odi_weather_data_v3',
              JSON.stringify({
                data: json.data,
                timestamp: Date.now(),
                city: effectiveCity,
              })
            )
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Weather fetch warning:', err)
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false)
        setIsRefreshing(false)
      }
    }
  }

  useEffect(() => {
    if (dismissed) return

    const controller = new AbortController()

    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem('odi_weather_data_v3')
      if (cached) {
        try {
          const { data, timestamp, city } = JSON.parse(cached)
          if (Date.now() - timestamp < 15 * 60 * 1000 && city === effectiveCity) {
            setWeather(data)
            setLoading(false)
            return
          }
        } catch {
          // ignore cache error
        }
      }
    }

    fetchWeather(controller.signal)
    
    return () => {
      controller.abort()
    }
  }, [effectiveCity, dismissed, activePet?.id])

  const handleRequestLocation = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setShowLocationModal(true)
  }

  const handleGpsLocation = async () => {
    setIsSavingLocation(true)
    setLocationError('')
    
    const coords = await requestLocation()
    if (!coords) {
      // The context handles mapping the error, we just show a generic fallback message here since the error could be denied/timeout etc.
      setLocationError('Konum alınamadı, lütfen manuel seçin veya izinleri kontrol edin.')
      setIsSavingLocation(false)
      return
    }

    try {
      const res = await fetch(`/api/weather?lat=${coords.latitude}&lon=${coords.longitude}`)
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data?.cityName) {
          await saveCityToProfile(json.data.cityName)
        } else {
          setLocationError('Konumunuz belirlenemedi, lütfen listeden seçin.')
        }
      } else {
        setLocationError('Konum servisine erişilemedi.')
      }
    } catch (err) {
       setLocationError('Hava durumu servisine erişilemedi.')
    } finally {
      setIsSavingLocation(false)
    }
  }

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    const controller = new AbortController()
    await fetchWeather(controller.signal)
  }

  // Evaluate the intelligent scenario for Dog or Cat
  const activeScenario: WeatherScenarioResult | null = useMemo(() => {
    if (!weather) return null
    return evaluateWeatherScenario({
      species: petSpecies,
      petName: petName,
      temp: weather.temp,
      feelsLike: weather.feelsLike,
      humidity: weather.humidity,
      uvIndex: weather.uvIndex,
      weatherCode: weather.weatherCode,
      isDay: weather.isDay,
      cityName: weather.cityName || effectiveCity || '',
      sunset: weather.sunset,
      sunrise: weather.sunrise,
      asphaltTemp: weather.asphaltTemp,
    })
  }, [weather, petSpecies, petName, effectiveCity])

  if (dismissed) return null

  // Loading Skeleton
  if (loading && !weather) {
    return (
      <div
        data-testid="weather-paw-alert-loading"
        className="w-full rounded-[24px] bg-[#F0F5FF] border border-[#DCE7FC] p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(37,99,235,0.05)] animate-pulse mb-2"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="h-3.5 w-32 bg-blue-200/70 rounded-full" />
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-200/60" />
          <div className="space-y-2">
            <div className="h-4 w-28 bg-blue-200/60 rounded" />
            <div className="h-3 w-20 bg-blue-200/40 rounded" />
          </div>
        </div>
        <div className="h-4 w-3/4 bg-blue-200/50 rounded mb-4" />
        <div className="flex gap-6">
          <div className="h-8 w-16 bg-blue-200/40 rounded" />
          <div className="h-8 w-16 bg-blue-200/40 rounded" />
        </div>
      </div>
    )
  }

  if (!weather || !activeScenario) return null

  const temp = Math.round(weather.temp)
  // Re-evaluating hasLocation logic. If weather is fallback, and effectiveCity is null, we shouldn't show weather as real.
  const hasLocation = Boolean(effectiveCity || (weather.hasLocation && weather.cityName) || (weather.cityName && !weather.isFallback))
  const cityName = hasLocation ? (weather.cityName || effectiveCity) : ''
  const description = weather.weatherDescription || 'Az bulutlu'
  const iconType = weather.weatherIconType || 'cloud-sun'

  const { categoryTitle, headline, metric1, metric2, ctaText, illustrationType } = activeScenario

  const getMetricColorClass = (color: string) => {
    switch (color) {
      case 'rose':
        return 'text-[#E11D48]'
      case 'amber':
        return 'text-[#D97706]'
      case 'blue':
        return 'text-[#2563EB]'
      case 'purple':
        return 'text-[#7C3AED]'
      case 'emerald':
      default:
        return 'text-[#059669]'
    }
  }

  const emptyStateText = petSpecies === 'cat'
    ? 'Konumunuzu ekleyin — size özel ev ortamı ve bakım tavsiyeleri için.'
    : 'Konumunuzu ekleyin — size özel yürüyüş ve pati güvenliği tavsiyeleri için.'

  return (
    <>
      <div
        data-testid="weather-paw-alert"
        className="relative w-full rounded-[24px] bg-gradient-to-br from-[#EFF5FF] via-[#F3F7FF] to-[#E5EFFF] border border-[#D9E6FC] p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(37,99,235,0.06)] hover:shadow-[0_8px_24px_-4px_rgba(37,99,235,0.09)] transition-all duration-200 overflow-hidden mb-2"
      >
        {/* 1. Header: HAVA VE AKTİVİTE / EV ORTAMI */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-black tracking-wider text-[#1E3A8A] uppercase">
              {categoryTitle}
            </span>
          </div>
        </div>

        {/* 2. Main Content Grid (Left Data + Right Illustration) */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-2">
          {/* Left Column */}
          <div className="flex-1 min-w-0 z-10">
            {/* Weather & Location Row */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-800 shrink-0">
                {renderWeatherIcon(iconType, 'w-8 h-8 text-slate-800 stroke-[1.75]')}
              </div>
              <div>
                {hasLocation && cityName ? (
                  <>
                    <div className="text-[17px] sm:text-[18px] font-bold text-slate-900 tracking-tight leading-tight">
                      {cityName}, {temp}°C
                    </div>
                    <div className="text-[13px] sm:text-[14px] text-slate-500 font-medium leading-tight mt-0.5">
                      {description}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[17px] sm:text-[18px] font-bold text-slate-900 tracking-tight leading-tight">
                      Hava Durumu
                    </div>
                    <button
                      type="button"
                      onClick={handleRequestLocation}
                      disabled={isRefreshing}
                      className="inline-flex items-center gap-1 text-[13px] sm:text-[14px] text-blue-600 hover:text-blue-700 font-bold leading-tight mt-0.5 group cursor-pointer active:scale-[0.98] transition-all"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 group-hover:scale-110 transition-transform" />
                      <span>{isRefreshing ? 'Konum alınıyor...' : 'Konumunuzu ekleyin'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Data or Empty State */}
            {hasLocation ? (
              <>
                {/* Advice / Headline */}
                <div className="text-[15px] sm:text-[16px] font-bold text-slate-800 leading-snug tracking-tight max-w-[320px] mt-4 mb-4">
                  {headline}
                </div>

                {/* Dynamic Metrics */}
                <div className="flex items-center">
                  {/* Metric 1 */}
                  <div className="flex flex-col">
                    <span className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 leading-tight">
                      {metric1.label}
                    </span>
                    <span
                      className={`text-[12px] sm:text-[13px] font-bold mt-0.5 ${getMetricColorClass(
                        metric1.color
                      )}`}
                    >
                      {metric1.statusText}
                    </span>
                  </div>

                  {/* Divider Line */}
                  <div className="w-[1px] h-8 bg-blue-200/80 mx-4 sm:mx-6 shrink-0" />

                  {/* Metric 2 */}
                  <div className="flex flex-col">
                    <span className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 leading-tight">
                      {metric2.label}
                    </span>
                    <span
                      className={`text-[12px] sm:text-[13px] font-bold mt-0.5 ${getMetricColorClass(
                        metric2.color
                      )}`}
                    >
                      {metric2.statusText}
                    </span>
                  </div>
                </div>

                {/* Action Link */}
                <button
                  type="button"
                  onClick={() => setShowDetailModal(true)}
                  className="inline-flex items-center gap-1.5 text-[13px] sm:text-[14px] font-bold text-[#2563EB] hover:text-blue-700 active:scale-[0.98] transition-all mt-4 group cursor-pointer"
                >
                  <span>{ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
                </button>
              </>
            ) : (
              <div className="text-[14px] sm:text-[15px] text-slate-600 font-medium leading-relaxed max-w-[280px] mt-4">
                {emptyStateText}
              </div>
            )}
          </div>

          {/* Right Column: Illustration */}
          <div className="w-full md:w-[220px] lg:w-[240px] shrink-0 flex items-center justify-end self-end md:self-center -mb-2 md:mb-0">
            {illustrationType === 'cat_indoor' ? (
              <CatIndoorIllustration className="w-[190px] sm:w-[210px] md:w-full" />
            ) : (
              <DogWalkIllustration className="w-[190px] sm:w-[210px] md:w-full" />
            )}
          </div>
        </div>
      </div>

      {/* 3. Detailed Forecast / Care Report Modal */}
      {showDetailModal && (
        <div
          className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Compass className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-[17px] font-extrabold text-slate-900">
                    {activeScenario.modalTitle}
                  </h3>
                  <p className="text-[12px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    {hasLocation && cityName ? (
                      <>
                        <span>{cityName}</span>
                        <span>•</span>
                        <span>Canlı Ortam ve Hava Verisi</span>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={handleRequestLocation}
                          disabled={isRefreshing}
                          className="text-blue-600 hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          {isRefreshing ? 'Konum alınıyor...' : 'Konumunuzu ekleyin'}
                        </button>
                        <span>•</span>
                        <span>Genel Çevre Verisi</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
                aria-label="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col gap-4 pt-4">
              {/* Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/40 border border-blue-100/80 flex items-center justify-between">
                <div>
                  <div className="text-[28px] font-black text-slate-900 leading-none">
                    {temp}°C
                  </div>
                  <div className="text-[13px] font-semibold text-slate-600 mt-1">
                    {description} • Hissedilen {weather.feelsLike}°C
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">
                    {activeScenario.species === 'cat' ? 'Ortam Nemi' : 'Asfalt Sıcaklığı'}
                  </div>
                  <div
                    className={`text-[18px] font-extrabold mt-0.5 ${
                      activeScenario.species === 'cat' ? 'text-blue-600' : 'text-amber-600'
                    }`}
                  >
                    {activeScenario.species === 'cat' ? `%${weather.humidity}` : `~${weather.asphaltTemp}°C`}
                  </div>
                </div>
              </div>

              {/* Actionable Scenario Advice */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[14px] font-bold text-slate-900">
                    {petName} İçin Günlük Değerlendirme
                  </h4>
                  <p className="text-[13px] text-slate-600 mt-1 leading-relaxed">
                    {activeScenario.subtext}
                  </p>
                </div>
              </div>

              {/* Smart Care Tips */}
              <div>
                <h4 className="text-[13px] font-extrabold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Akıllı Bakım & İpuçları</span>
                </h4>
                <div className="flex flex-col gap-2">
                  {activeScenario.modalTips.map((tip, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-bold text-slate-900">{tip.title}</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {tip.tag}
                        </span>
                      </div>
                      <p className="text-[12px] text-slate-600 leading-relaxed">
                        {tip.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hourly Forecast */}
              {weather.hourlyForecast && weather.hourlyForecast.length > 0 && (
                <div>
                  <h4 className="text-[13px] font-extrabold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Önümüzdeki Saatler</span>
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {weather.hourlyForecast.map((hour, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center"
                      >
                        <span className="text-[11px] font-bold text-slate-500">{hour.time}</span>
                        <div className="my-1.5">
                          {renderWeatherIcon('cloud-sun', 'w-5 h-5 text-amber-500 stroke-[2]')}
                        </div>
                        <span className="text-[13px] font-extrabold text-slate-900">
                          {hour.temp}°
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-600 mt-0.5">
                          {activeScenario.species === 'cat' ? `Nem %${hour.humidity}` : `UV ${hour.uv}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-600 hover:text-blue-600 active:scale-[0.98] transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Yenileniyor...' : 'Verileri Yenile'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-[13px] font-bold rounded-xl active:scale-[0.98] transition-all shadow-xs"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Location Search & GPS Modal */}
      {showLocationModal && (
        <div
          className="fixed inset-0 z-[10001] bg-slate-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowLocationModal(false)}
        >
          <div
            className="bg-white w-full max-w-md rounded-t-[28px] sm:rounded-3xl p-5 shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300 max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Konum Belirle
              </h3>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleGpsLocation}
              disabled={isSavingLocation}
              className="w-full flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-xl font-bold mb-4 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {isSavingLocation ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Konum Bulunuyor...
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5" />
                  Mevcut Konumumu Kullan
                </>
              )}
            </button>

            {locationError && (
              <div className="mb-4 text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                {locationError}
              </div>
            )}

            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Şehir ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-[200px]">
              <div className="grid grid-cols-2 gap-2 pb-6">
                {filteredCities.length > 0 ? (
                  filteredCities.map((city) => (
                    <button
                      key={city.label}
                      onClick={() => saveCityToProfile(city.label)}
                      disabled={isSavingLocation}
                      className="text-left px-3 py-2.5 rounded-lg hover:bg-slate-50 active:bg-slate-100 text-sm font-semibold text-slate-700 transition-colors"
                    >
                      {city.label}
                    </button>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-6 text-sm text-slate-500 font-medium">
                    Şehir bulunamadı
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

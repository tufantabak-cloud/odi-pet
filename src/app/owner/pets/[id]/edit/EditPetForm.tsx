'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { calcAge } from '@/lib/pets/utils'
import { SmartScanner } from '@/components/ui/SmartScanner'
import { RulerPicker } from '@/components/ui/RulerPicker'
import { DefaultCatAvatar, DefaultDogAvatar, RulerIcon } from '@/components/icons/PetIcons'
import { 
  PawPrint, 
  Camera, 
  AlertTriangle, 
  Scale, 
  Sparkles, 
  Building2, 
  RotateCcw, 
  Trash2, 
  Navigation, 
  Lock, 
  Paperclip, 
  Check, 
  X,
  MapPin
} from 'lucide-react'

import { BreedCombobox } from '@/components/ui/BreedCombobox'
import {
  CAT_BREED_NAMES,
  DOG_BREEDS_NAMES,
  POPULAR_CAT_BREED_NAMES,
  POPULAR_DOG_BREED_NAMES,
} from '@/lib/pets/breedsMaster'
import { useGeolocation } from '@/contexts/GeolocationContext'

const CAT_BREEDS = CAT_BREED_NAMES
const DOG_BREEDS = DOG_BREEDS_NAMES

const CAT_COLORS = ['Siyah', 'Beyaz', 'Gri', 'Turuncu', 'Karamel', 'Tekir', 'Calico', 'Beyaz-Siyah', 'Diğer']
const DOG_COLORS = ['Siyah', 'Beyaz', 'Kahverengi', 'Altın Sarısı', 'Krem', 'Gri', 'Siyah-Beyaz', 'Üç Renkli', 'Diğer']

const AGE_PRESETS = [
  { label: '1 yaş altı', years: 0, months: 6 },
  { label: '1 yaş', years: 1, months: 0 },
  { label: '2 yaş', years: 2, months: 0 },
  { label: '3 yaş', years: 3, months: 0 },
  { label: '5 yaş', years: 5, months: 0 },
  { label: '8 yaş', years: 8, months: 0 },
  { label: '12 yaş', years: 12, months: 0 },
]

export default function EditPetForm({ pet, ownerProfile }: { pet: any; ownerProfile?: any }) {
  const { requestLocation: requestGeoLocation } = useGeolocation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlight = searchParams ? searchParams.get('highlight') : null
  const isHighlighted = (field: string) => highlight === field

  useEffect(() => {
    if (!highlight) return
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-highlight="${highlight}"], [data-highlight-cover="${highlight}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlight])

  const [loading, setLoading] = useState(false)
  const [showDocScanner, setShowDocScanner] = useState(false)
  const [birthDateMode, setBirthDateMode] = useState<'exact' | 'approximate'>(
    pet.birth_date_precision === 'approximate' ? 'approximate' : 'exact'
  )
  const [sizeLocked, setSizeLocked] = useState(false)
  
  const [petName, setPetName] = useState(pet.name || '')
  const [birthDate, setBirthDate] = useState(pet.birth_date || '')

  // Parse existing birth date to calculate Yıl and Ay
  const [approxYears, setApproxYears] = useState(() => {
    if (!pet.birth_date) return ''
    const born = new Date(pet.birth_date)
    const now = new Date()
    let diffMonths = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
    if (diffMonths < 0) diffMonths = 0
    const y = Math.floor(diffMonths / 12)
    return y > 0 ? String(y) : ''
  })

  const [approxMonths, setApproxMonths] = useState(() => {
    if (!pet.birth_date) return ''
    const born = new Date(pet.birth_date)
    const now = new Date()
    let diffMonths = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
    if (diffMonths < 0) diffMonths = 0
    const m = diffMonths % 12
    return m > 0 ? String(m) : ''
  })

  const handleApproxChange = (yStr: string, mStr: string) => {
    setApproxYears(yStr)
    setApproxMonths(mStr)
    
    const years = parseInt(yStr) || 0
    const months = parseInt(mStr) || 0
    
    if (years === 0 && months === 0) {
      setBirthDate('')
      return
    }
    
    const now = new Date()
    const todayDay = now.getDate()
    
    const targetMonth = (now.getMonth() - (months % 12) + 12) % 12
    const yearOffset = Math.floor((months) / 12) + years + (targetMonth > now.getMonth() ? 1 : 0)
    const targetYear = now.getFullYear() - yearOffset
    
    const maxDaysInTarget = new Date(targetYear, targetMonth + 1, 0).getDate()
    const targetDay = Math.min(todayDay, maxDaysInTarget)
    
    const targetDate = new Date(targetYear, targetMonth, targetDay)
    setBirthDate(targetDate.toISOString().split('T')[0])
  }

  const handleStep = (field: 'weight' | 'height', type: 'inc' | 'dec') => {
    if (field === 'weight') {
      const current = parseFloat(weightKg) || 0
      const next = type === 'inc' ? current + 0.1 : current - 0.1
      setWeightKg(next > 0 ? String(parseFloat(next.toFixed(1))) : '0.1')
    } else {
      const current = parseFloat(heightCm) || 0
      const next = type === 'inc' ? current + 1 : current - 1
      setHeightCm(next > 0 ? String(parseFloat(next.toFixed(1))) : '1')
    }
  }

  const [selectedBreed, setSelectedBreed] = useState(pet.breed || '')
  const [selectedCity, setSelectedCity] = useState(pet.city || '')
  const [selectedDistrict, setSelectedDistrict] = useState(pet.district || '')
  const [provinces, setProvinces] = useState<any[]>([])
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoMsg, setGeoMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/provinces')
      .then(res => res.json())
      .then(res => {
        if (res.status === 'OK' && res.data) {
          const sorted = res.data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr'))
          setProvinces(sorted)
        }
      })
      .catch(err => console.error("Provinces fetch error:", err))
  }, [])

  const [photoPreview, setPhotoPreview] = useState(pet.avatar_url || '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [submitError, setSubmitError] = useState('')

  const [gender, setGender] = useState(pet.gender || '')
  const [color, setColor] = useState(pet.color || '')
  const [lifestyle, setLifestyle] = useState(pet.lifestyle || '')
  const [size, setSize] = useState(pet.size || '')
  const [isNeutered, setIsNeutered] = useState<boolean>(pet.is_neutered || false)
  const defaultWeight = pet.species === 'cat' ? '4.1' : '10.0'
  const initialWeight = (pet.weight_kg !== undefined && pet.weight_kg !== null && String(pet.weight_kg).trim() !== '')
    ? String(pet.weight_kg).trim()
    : defaultWeight
  const [weightKg, setWeightKg] = useState(initialWeight)

  const initialTarget = (pet.target_weight_kg !== undefined && pet.target_weight_kg !== null && String(pet.target_weight_kg).trim() !== '')
    ? String(pet.target_weight_kg).trim()
    : initialWeight
  const [targetWeight, setTargetWeight] = useState(initialTarget)
  const [heightCm, setHeightCm] = useState(pet.height_cm !== undefined && pet.height_cm !== null ? String(pet.height_cm) : '')
  const [editMeasureTab, setEditMeasureTab] = useState<'weight' | 'height'>('weight')
  const [microchipNo, setMicrochipNo] = useState(pet.microchip_no || '')
  const [passportNo, setPassportNo] = useState(pet.passport_no || '')
  const [vetCompany, setVetCompany] = useState(pet.vet_company || '')
  const [vetName, setVetName] = useState(pet.vet_name || '')

  const [registrationCity, setRegistrationCity] = useState(pet.registration_city || '')
  const [registrationDistrict, setRegistrationDistrict] = useState(pet.registration_district || '')
  const [agricultureDirectorate, setAgricultureDirectorate] = useState(pet.agriculture_directorate || '')

  // Modals state
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleRegistrationCityChange = (city: string) => {
    setRegistrationCity(city)
    setRegistrationDistrict('')
    setAgricultureDirectorate('')
  }

  const handleRegistrationDistrictChange = (district: string) => {
    setRegistrationDistrict(district)
    if (district) {
      setAgricultureDirectorate(`${district} İlçe Tarım ve Orman Müdürlüğü`)
    } else {
      setAgricultureDirectorate('')
    }
  }

  const initialC1Name = pet.sos_contacts?.[0]?.name || ownerProfile?.emergency_contact_name || `${ownerProfile?.first_name || ''} ${ownerProfile?.last_name || ''}`.trim()
  const initialC1Phone = pet.sos_contacts?.[0]?.phone || ownerProfile?.emergency_contact_phone || ownerProfile?.phone || ''
  const initialC2Name = pet.sos_contacts?.[1]?.name || ownerProfile?.emergency_contact2_name || ''
  const initialC2Phone = pet.sos_contacts?.[1]?.phone || ownerProfile?.emergency_contact2_phone || ''
  const initialC2Relation = pet.sos_contacts?.[1]?.relation || ownerProfile?.emergency_contact2_relation || ''

  const [sosContacts, setSosContacts] = useState<{name:string; phone:string; relation:string}[]>([
    { name: initialC1Name, phone: initialC1Phone, relation: 'Sahibi' },
    { name: initialC2Name, phone: initialC2Phone, relation: initialC2Relation }
  ])
  const [successToast, setSuccessToast] = useState(false)

  const species = pet.species as 'cat' | 'dog'
  const breeds = species === 'cat' ? CAT_BREEDS : DOG_BREEDS
  const colors = species === 'cat' ? CAT_COLORS : DOG_COLORS

  const calculateSize = (weightStr: string, petSpecies: 'cat' | 'dog'): string => {
    const w = parseFloat(weightStr)
    if (isNaN(w) || w <= 0) return ''
    if (petSpecies === 'cat') {
      if (w < 4) return 'small'
      if (w < 6.5) return 'medium'
      return 'large'
    } else {
      if (w < 5) return 'toy'
      if (w < 10) return 'small'
      if (w < 25) return 'medium'
      if (w < 45) return 'large'
      return 'giant'
    }
  }

  const breedSizeLabel = (breed: string, petSpecies: 'cat' | 'dog'): string => {
    if (petSpecies === 'cat') return 'Kedi Boyut Skalası'
    const small = ['Chihuahua', 'Pomeranian', 'Maltese', 'Dachshund (Sosis)', 'Poodle (Kaniş)', 'Shih Tzu']
    const medium = ['Beagle', 'Cocker Spaniel', 'Border Collie', 'French Bulldog', 'Bulldog']
    const large = ['Golden Retriever', 'Labrador Retriever', 'Alman Çoban Köpeği', 'Rottweiler', 'Husky']
    const giant = ['Kangal', 'Akbaş']
    if (small.some(b => breed.includes(b.split(' ')[0]))) return 'Köpek Boyut Skalası (Küçük Irk)'
    if (medium.some(b => breed.includes(b.split(' ')[0]))) return 'Köpek Boyut Skalası (Orta Irk)'
    if (large.some(b => breed.includes(b.split(' ')[0]))) return 'Köpek Boyut Skalası (Büyük Irk)'
    if (giant.some(b => breed.includes(b.split(' ')[0]))) return 'Köpek Boyut Skalası (Dev Irk)'
    return 'Köpek Boyut Skalası'
  }

  const sizeTextLabel = (sz: string) => {
    switch(sz) {
      case 'toy': return 'Oyuncak'
      case 'small': return 'Küçük'
      case 'medium': return 'Orta'
      case 'large': return 'Büyük'
      case 'giant': return 'Dev'
      default: return 'Orta'
    }
  }

  useEffect(() => {
    if (sizeLocked) return
    const calculated = calculateSize(weightKg, species)
    setSize(calculated)
  }, [weightKg, species, sizeLocked])

  // Geolocation handler
  const handleUseLocation = async () => {
    setGeoLoading(true)
    setGeoMsg(null)

    const coords = await requestGeoLocation()
    if (!coords) {
      setGeoMsg({ type: 'err', text: 'Konum izni verilmedi veya konum alınamadı.' })
      setGeoLoading(false)
      return
    }

    try {
      const lat = coords.latitude
      const lng = coords.longitude
      const res = await fetch(`/api/v1/reports/lost/reverse-geocode?lat=${lat}&lng=${lng}`)
      if (res.ok) {
        const data = await res.json()
        if (data.name) {
          const parts = data.name.split(',').map((s: string) => s.trim())
          const matchedCity = provinces.find(p => 
            parts.some((part: string) => p.name.toLocaleLowerCase('tr').includes(part.toLocaleLowerCase('tr')) || part.toLocaleLowerCase('tr').includes(p.name.toLocaleLowerCase('tr')))
          )

          if (matchedCity) {
            setSelectedCity(matchedCity.name)
            const matchedDistrict = matchedCity.districts?.find((d: any) =>
              parts.some((part: string) => d.name.toLocaleLowerCase('tr').includes(part.toLocaleLowerCase('tr')) || part.toLocaleLowerCase('tr').includes(d.name.toLocaleLowerCase('tr')))
            )
            if (matchedDistrict) {
              setSelectedDistrict(matchedDistrict.name)
            }
            setGeoMsg({ type: 'ok', text: `Konum belirlendi: ${matchedDistrict ? matchedDistrict.name + ', ' : ''}${matchedCity.name}` })
          } else {
            setGeoMsg({ type: 'err', text: `Bulunan konum: ${data.name}. Lütfen listeden ili seçiniz.` })
          }
        } else {
          setGeoMsg({ type: 'err', text: 'Konum adresi çözümlenemedi.' })
        }
      } else {
        setGeoMsg({ type: 'err', text: 'Konum servisine ulaşılamadı.' })
      }
    } catch {
      setGeoMsg({ type: 'err', text: 'Konum alınırken bir hata oluştu.' })
    } finally {
      setGeoLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitError('')

    if (!petName.trim() || !selectedBreed) {
      setSubmitError('Lütfen İsim ve Irk alanlarını doldurun.')
      return
    }

    setLoading(true)

    const fd = new FormData()
    fd.set('species', species)
    fd.set('name', petName.trim())
    fd.set('breed', selectedBreed)
    if (gender) fd.set('gender', gender)
    if (birthDate) fd.set('birth_date', birthDate)
    fd.set('birth_date_precision', birthDateMode)
    if (color) fd.set('color', color)
    if (lifestyle) fd.set('lifestyle', lifestyle)
    if (size) fd.set('size', size)
    if (microchipNo) fd.set('microchip_no', microchipNo)
    if (passportNo) fd.set('passport_no', passportNo)
    fd.set('vet_company', vetCompany)
    fd.set('vet_name', vetName)
    if (photoFile) fd.set('avatar', photoFile)
    
    if (registrationCity) fd.set('registration_city', registrationCity)
    if (registrationDistrict) fd.set('registration_district', registrationDistrict)
    if (agricultureDirectorate) fd.set('agriculture_directorate', agricultureDirectorate)

    if (selectedCity) fd.set('city', selectedCity)
    if (selectedDistrict) fd.set('district', selectedDistrict)
    fd.set('is_neutered', String(isNeutered))
    fd.set('weight_kg', weightKg.trim())
    fd.set('target_weight_kg', targetWeight.trim())
    if (heightCm) fd.set('height_cm', heightCm.trim())

    try {
      const res = await fetch(`/api/pets/${pet.id}`, { method: 'PATCH', body: fd })
      let data: any = {}
      try {
        data = await res.json()
      } catch {}

      if (!res.ok) {
        if (res.status === 413) {
          setSubmitError('Seçilen fotoğrafın boyutu çok yüksek. Lütfen daha küçük bir görsel seçin.')
        } else {
          setSubmitError(data.error || `Güncelleme sırasında bir hata oluştu (Hata kodu: ${res.status}).`)
        }
        return
      }

      // Also sync SOS contacts seamlessly
      if (sosContacts.some(c => c.name || c.phone)) {
        await fetch(`/api/pets/${pet.id}/sos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sos_contacts: sosContacts
              .filter(c => c.name || c.phone)
              .map((c, idx) => idx === 0 ? { ...c, relation: 'Sahibi' } : c),
          }),
        }).catch(err => console.warn('SOS sync background warn:', err))
      }

      setSuccessToast(true)
      router.refresh()
      setTimeout(() => setSuccessToast(false), 3000)
    } catch (err: any) {
      setSubmitError('Sunucu bağlantı hatası: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Reset Records Action
  const handleExecuteReset = async () => {
    setResetLoading(true)
    try {
      const res = await fetch(`/api/pets/${pet.id}/reset`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(d.error || 'Kayıtlar sıfırlanırken bir hata oluştu.')
        return
      }
      setShowResetModal(false)
      setSuccessToast(true)
      router.refresh()
      setTimeout(() => setSuccessToast(false), 3000)
    } catch (e: any) {
      alert('Bağlantı hatası: ' + e.message)
    } finally {
      setResetLoading(false)
    }
  }

  // Handle Delete Pet Action
  const handleExecuteDelete = async () => {
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/pets/${pet.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        alert(d.error || 'Profil silinirken bir hata oluştu.')
        return
      }
      setShowDeleteModal(false)
      router.push('/owner/dashboard')
    } catch (e: any) {
      alert('Bağlantı hatası: ' + e.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const weightPresets = species === 'cat' ? [2, 3, 4, 5, 7] : [5, 10, 18, 25, 35]

  return (
    <div className="flex flex-col w-full mx-auto pb-32 pb-safe max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-main sticky top-0 bg-surface/90 backdrop-blur z-10 pt-2">
        <button 
          type="button" 
          onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border-main text-text-secondary hover:text-primary hover:border-primary/40 transition-all text-xs font-bold bg-surface"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          <span>{pet.name}</span>
        </button>
        <div className="flex flex-col flex-1">
          <h1 className="text-xl font-extrabold text-text-primary tracking-tight">Profil ayarları</h1>
          <p className="text-xs text-text-secondary font-normal">Bilgileri güncelleyip aşağıdan kaydedin.</p>
        </div>
      </div>

      {successToast && (
        <div role="status" aria-live="polite" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl bg-green-500 text-white text-sm font-bold shadow-xl animate-scaleIn">
          <Check size={18} />
          Bilgiler başarıyla güncellendi.
        </div>
      )}

      {submitError && (
        <div role="alert" aria-live="assertive" className="mb-4 p-4 rounded-2xl bg-error/10 border border-error/20 text-error text-sm font-bold text-center flex items-center justify-center gap-2">
          <AlertTriangle size={18} className="text-error shrink-0" /> {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* ─── BÖLÜM 1: Temel Kimlik ve Fotoğraf ─── */}
        <section id="temel-section" className="card-base p-6 sm:p-7 flex flex-col gap-5 rounded-3xl">
          <h2 className="text-base font-bold text-text-primary border-b border-border-main pb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
            Temel Kimlik ve Fotoğraf
          </h2>
          
          {/* Avatar Preview */}
          <div 
            data-highlight="photo"
            className={`flex flex-col items-center gap-3 py-2 ${
              isHighlighted('photo') ? 'ring-2 ring-purple-400 bg-purple-50 rounded-2xl p-3' : ''
            }`}
          >
            <div className="relative w-[110px] h-[110px] rounded-3xl bg-gradient-to-br from-primary-soft to-white border-2 border-primary/20 flex items-center justify-center overflow-hidden shadow-sm">
              {photoPreview ? (
                photoPreview.startsWith('http') ? (
                  <Image src={photoPreview} alt="Önizleme" fill={true} className="object-cover" sizes="110px" />
                ) : (
                  <img src={photoPreview} alt="Önizleme" className="w-full h-full object-cover" />
                )
              ) : (
                species === 'cat' ? <DefaultCatAvatar className="w-16 h-16" /> : <DefaultDogAvatar className="w-16 h-16" />
              )}
            </div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-full cursor-pointer hover:bg-primary/20 transition-all active:scale-95">
              <Camera size={14} />
              <span>Fotoğrafı değiştir</span>
              <input type="file" accept="image/*" className="sr-only" onChange={e => {
                const file = e.target.files?.[0]
                if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)) }
              }}/>
            </label>
          </div>

          <div className="flex flex-col gap-4">
            {/* İsim */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-primary">İsim *</label>
              <input 
                id="name" 
                value={petName} 
                onChange={e => setPetName(e.target.value)} 
                className="input-base" 
                placeholder="Örn: Boncuk"
                required
              />
            </div>

            {/* Irk */}
            <div id="breed-input" className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-primary">Irk *</label>
              <BreedCombobox
                id="breed-input-combobox"
                value={selectedBreed}
                onChange={(b) => setSelectedBreed(b)}
                species={species}
                breeds={breeds}
                popularBreeds={species === 'cat' ? POPULAR_CAT_BREED_NAMES : POPULAR_DOG_BREED_NAMES}
                placeholder="Seçin"
                required
              />
            </div>

            {/* Cinsiyet */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-primary">Cinsiyet</label>
              <div className="flex gap-2.5">
                {[['male', 'Erkek'], ['female', 'Dişi']].map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setGender(v)}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
                      gender === v
                        ? 'bg-primary text-white shadow-sm shadow-primary/30'
                        : 'bg-surface border border-border-main text-text-secondary hover:border-primary/40'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Doğum Tarihi / Yaş */}
            <div className="flex flex-col gap-2.5 pt-1">
              <label className="text-xs font-bold text-text-primary">Doğum Tarihi / Yaş</label>
              
              {/* Sekme Seçici */}
              <div className="flex p-1 bg-slate-100/80 rounded-2xl border border-border-main">
                <button
                  type="button"
                  onClick={() => {
                    setBirthDateMode('exact')
                    setBirthDate(pet.birth_date || '')
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    birthDateMode === 'exact'
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Tam Tarih
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBirthDateMode('approximate')
                    handleApproxChange(approxYears, approxMonths)
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    birthDateMode === 'approximate'
                      ? 'bg-primary text-white shadow-sm shadow-primary/30'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Yaklaşık Yaş
                </button>
              </div>

              {birthDateMode === 'exact' ? (
                <div className="animate-fadeIn">
                  <input
                    type="date"
                    value={birthDate}
                    max={new Date().toISOString().split('T')[0]}
                    className="input-base w-full"
                    onChange={e => setBirthDate(e.target.value)}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-3 animate-fadeIn">
                  {/* Yaş Girdisi */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={approxYears}
                      onChange={e => handleApproxChange(e.target.value, approxMonths)}
                      placeholder="2"
                      className="input-base w-24 text-center font-bold"
                    />
                    <span className="text-xs font-medium text-text-secondary">yaş — elle de girebilirsiniz</span>
                  </div>

                  {/* Hızlı Yaş Seçim Çipleri */}
                  <div className="flex flex-wrap gap-1.5">
                    {AGE_PRESETS.map((preset) => {
                      const isSelected = approxYears === String(preset.years) && (preset.years > 0 || approxMonths === '6')
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleApproxChange(String(preset.years), String(preset.months))}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-white shadow-sm shadow-primary/30 scale-[1.02]'
                              : 'bg-surface border border-border-main text-text-secondary hover:border-primary/40 hover:text-text-primary'
                          }`}
                        >
                          {preset.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <p className="text-xs text-text-secondary">Tam tarihi seçebilir veya yaklaşık yaşını girebilirsiniz.</p>

              {birthDate && (
                <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-2.5 rounded-xl border border-emerald-200/80 flex items-center gap-2 animate-fadeIn">
                  <Sparkles size={15} className="text-emerald-600 shrink-0" />
                  <span>Hesaplanan yaş: <strong>{calcAge(birthDate).text}</strong> ({calcAge(birthDate).label})</span>
                </div>
              )}
            </div>

            {/* Fiziksel Ölçüm (Kilo / Boy) */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditMeasureTab('weight')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    editMeasureTab === 'weight'
                      ? 'bg-primary text-white shadow-sm shadow-primary/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Kilo (kg) *
                </button>
                <button
                  type="button"
                  onClick={() => setEditMeasureTab('height')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    editMeasureTab === 'height'
                      ? 'bg-primary text-white shadow-sm shadow-primary/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Boy (cm) (Opsiyonel)
                </button>
              </div>

              {/* Measurement Container */}
              <div className="p-5 bg-slate-50/80 rounded-3xl border border-border-main flex flex-col items-center gap-4">
                {/* Stepper Display */}
                <div className="flex items-center justify-between w-full max-w-xs px-2">
                  <button
                    type="button"
                    onClick={() => handleStep(editMeasureTab, 'dec')}
                    className="w-10 h-10 rounded-full border border-border-main bg-surface flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary active:scale-95 transition-all shadow-sm cursor-pointer"
                    aria-label="Azalt"
                  >
                    <span className="text-xl font-extrabold leading-none">−</span>
                  </button>

                  <div className="flex flex-col items-center">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-text-primary tracking-tight">
                        {editMeasureTab === 'weight' ? (weightKg || '0.0') : (heightCm || '0')}
                      </span>
                      <span className="text-sm font-bold text-text-secondary">
                        {editMeasureTab === 'weight' ? 'kg' : 'cm'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold tracking-widest text-text-tertiary uppercase mt-0.5">
                      <span className="inline md:hidden">DOKUN VE KAYDIR</span>
                      <span className="hidden md:inline">TIKLA VE SÜRÜKLE</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStep(editMeasureTab, 'inc')}
                    className="w-10 h-10 rounded-full border border-border-main bg-surface flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary active:scale-95 transition-all shadow-sm cursor-pointer"
                    aria-label="Artır"
                  >
                    <span className="text-xl font-extrabold leading-none">+</span>
                  </button>
                </div>

                {/* Ruler Component */}
                <div className="w-full">
                  {editMeasureTab === 'weight' ? (
                    <RulerPicker
                      id="edit-pet-weight-ruler"
                      label=""
                      unit="kg"
                      min={0.1}
                      max={120}
                      step={0.1}
                      value={weightKg ? parseFloat(weightKg) : (species === 'cat' ? 4.1 : 10.0)}
                      onChange={(val) => setWeightKg(String(val))}
                    />
                  ) : (
                    <RulerPicker
                      id="edit-pet-height-ruler"
                      label=""
                      unit="cm"
                      min={5}
                      max={180}
                      step={1}
                      value={heightCm ? parseFloat(heightCm) : (species === 'cat' ? 25 : 45)}
                      onChange={(val) => setHeightCm(String(val))}
                    />
                  )}
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                  <span className="text-xs font-bold text-text-secondary">Hızlı seç:</span>
                  {weightPresets.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setWeightKg(String(val))}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        parseFloat(weightKg) === val
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-surface border border-border-main text-text-secondary hover:border-primary/40'
                      }`}
                    >
                      {val} kg
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Otomatik hesaplanan beden büyüklüğü */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="text-xs font-bold text-text-primary">Otomatik hesaplanan beden büyüklüğü</label>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-border-main flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                  <Paperclip size={15} className="text-primary" />
                  <span>{breedSizeLabel(selectedBreed, species)} ({sizeTextLabel(size)})</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                  <Lock size={12} />
                  Hesaplandı
                </span>
              </div>
            </div>

            {/* Hedef Kilo (kg) */}
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-primary">Hedef kilo (kg)</label>
                <span className="text-[11px] font-medium text-text-tertiary">
                  Mevcut Kilo: <strong className="text-text-secondary">{weightKg || initialWeight} kg</strong>
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  step="0.1"
                  value={targetWeight}
                  onChange={e => setTargetWeight(e.target.value)}
                  placeholder="Örn: 4.5"
                  className="input-base flex-1 font-semibold text-text-primary bg-white"
                />
                <button
                  type="button"
                  onClick={() => setTargetWeight(weightKg || initialWeight)}
                  title={`Mevcut kiloyu (${weightKg || initialWeight} kg) hedef kilo alanına doldurur`}
                  className="px-3.5 py-3 rounded-xl border border-border-main bg-surface text-xs font-bold text-text-secondary hover:text-primary hover:border-primary/40 transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
                >
                  <RotateCcw size={13} className="text-primary" />
                  Mevcut kiloyu doldur ({weightKg || initialWeight} kg)
                </button>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Yetişkin hayvanlarda hedef kilo olarak mevcut kilo otomatik önerilir. İstediğiniz ideal hedef kiloyu buraya yazabilirsiniz.
              </p>
            </div>

            {/* Renk / Desen */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="text-xs font-bold text-text-primary">Renk / Desen</label>
              <select value={color} onChange={e => setColor(e.target.value)} className="input-base">
                <option value="">Seçin (opsiyonel)</option>
                {colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Kısırlaştırma Durumu */}
            <div className="flex flex-col gap-1.5 pt-1">
              <label className="text-xs font-bold text-text-primary">Kısırlaştırma Durumu</label>
              <div className="flex gap-2.5">
                {[[true, 'Kısırlaştırıldı'], [false, 'Kısırlaştırılmadı']].map(([v, l]) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setIsNeutered(v as boolean)}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
                      isNeutered === v
                        ? 'bg-primary text-white shadow-sm shadow-primary/30'
                        : 'bg-surface border border-border-main text-text-secondary hover:border-primary/40'
                    }`}
                  >
                    {l as string}
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-secondary">
                {!isNeutered ? 'Kızgınlık takip kartı bu durumda görünür.' : 'Sağlık takip kartı bu duruma göre güncellenir.'}
              </p>
            </div>

          </div>
        </section>

        {/* ─── BÖLÜM 2: Fiziksel ve Yaşam Alanı ─── */}
        <section id="fiziksel-section" className="card-base p-6 sm:p-7 flex flex-col gap-5 rounded-3xl">
          <h2 className="text-base font-bold text-text-primary border-b border-border-main pb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
            Fiziksel ve Yaşam Alanı
          </h2>

          <div className="flex flex-col gap-4">
            {/* Konum Aksiyonu */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-primary">Konum</label>
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={geoLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Navigation size={16} className={geoLoading ? 'animate-spin' : ''} />
                <span>{geoLoading ? 'Konum Alınıyor...' : 'Konumumu Kullan'}</span>
              </button>
              <p className="text-xs text-text-secondary">
                Yalnızca il/ilçe belirlenir — tam adresiniz alınmaz veya saklanmaz.
              </p>
              {geoMsg && (
                <p className={`text-xs font-bold px-3 py-1.5 rounded-lg border animate-fadeIn ${
                  geoMsg.type === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                  {geoMsg.text}
                </p>
              )}
            </div>

            {/* Şehir */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-primary">Şehir</label>
              <select 
                value={selectedCity} 
                onChange={e => { setSelectedCity(e.target.value); setSelectedDistrict('') }} 
                className="input-base"
              >
                <option value="">Şehir seçin</option>
                {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>

            {/* İlçe */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-primary">İlçe</label>
              <select 
                value={selectedDistrict} 
                onChange={e => setSelectedDistrict(e.target.value)} 
                disabled={!selectedCity}
                className="input-base disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">İlçe seçin</option>
                {selectedCity && provinces.find(p => p.name === selectedCity)?.districts?.sort((a:any, b:any) => a.name.localeCompare(b.name, 'tr')).map((d: any) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ─── BÖLÜM 3: Resmi Kurum Kayıtları ─── */}
        <section id="resmi-kurum-section" className="card-base p-6 sm:p-7 flex flex-col gap-5 rounded-3xl">
          <div className="flex items-center justify-between border-b border-border-main pb-3 flex-wrap gap-2">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">3</span>
              Resmi Kurum Kayıtları
            </h2>
            
            {!showDocScanner && (
              <button 
                type="button"
                onClick={() => setShowDocScanner(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/20 rounded-full hover:bg-primary/20 transition-all cursor-pointer active:scale-95"
              >
                <Camera size={13} />
                <span>Pasaport veya belgeyi tara</span>
              </button>
            )}
          </div>

          {showDocScanner && (
            <SmartScanner
              petId={pet.id}
              onClose={() => setShowDocScanner(false)}
              onResult={(data: any) => {
                const parsed = data?.parsed || data
                if (parsed?.microchip_no) setMicrochipNo(parsed.microchip_no)
                if (parsed?.passport_no)  setPassportNo(parsed.passport_no)
                if (parsed?.vet_company)  setVetCompany(parsed.vet_company)
                if (parsed?.vet_name)     setVetName(parsed.vet_name)
                if (parsed?.registration_city) setRegistrationCity(parsed.registration_city)
                if (parsed?.registration_district) setRegistrationDistrict(parsed.registration_district)
                if (parsed?.agriculture_directorate) {
                  setAgricultureDirectorate(parsed.agriculture_directorate)
                } else if (parsed?.registration_district) {
                  setAgricultureDirectorate(`${parsed.registration_district} İlçe Tarım ve Orman Müdürlüğü`)
                }
                setShowDocScanner(false)
              }}
            />
          )}

          <div className="flex flex-col gap-4">
            {/* Mikroçip No */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-primary">Mikroçip No</label>
                {microchipNo.replace(/\s/g, '').length === 15 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-bold border border-green-200">
                    <Check size={11} />
                    Doğrulandı
                  </span>
                )}
              </div>
              <input 
                value={microchipNo} 
                onChange={e => setMicrochipNo(e.target.value)} 
                placeholder="Örn: TR-900182773" 
                className="input-base"
              />
              <p className="text-xs text-text-secondary">Kayıp durumunda dijital kartta gösterilir.</p>
            </div>

            {/* Pasaport No */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-primary">Pasaport No</label>
              <input 
                value={passportNo} 
                onChange={e => setPassportNo(e.target.value)} 
                placeholder="Örn: TR-PASS-88213" 
                className="input-base"
              />
            </div>

            {/* Veteriner Kliniği */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-primary">Veteriner Kliniği / Kurum</label>
              <input 
                value={vetCompany} 
                onChange={e => setVetCompany(e.target.value)} 
                placeholder="Örn: Kadıköy Veteriner Polikliniği" 
                className="input-base"
              />
            </div>

            {/* Veteriner Hekim */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-primary">Veteriner Hekim Adı</label>
              <input 
                value={vetName} 
                onChange={e => setVetName(e.target.value)} 
                placeholder="Örn: Dr. Ahmet Yılmaz" 
                className="input-base"
              />
            </div>

            {/* Tarım Müdürlüğü */}
            <div className="flex flex-col gap-3 pt-2 border-t border-border-main">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Building2 size={15} className="text-primary" />
                Kayıtlı olduğu İlçe Tarım ve Orman Müdürlüğü
              </span>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-text-secondary">Kayıtlı İl</label>
                  <select 
                    value={registrationCity} 
                    onChange={e => handleRegistrationCityChange(e.target.value)} 
                    className="input-base"
                  >
                    <option value="">İl seçin</option>
                    {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-text-secondary">Kayıtlı İlçe</label>
                  <select 
                    value={registrationDistrict} 
                    onChange={e => handleRegistrationDistrictChange(e.target.value)} 
                    disabled={!registrationCity}
                    className="input-base disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">İlçe seçin</option>
                    {registrationCity && provinces.find(p => p.name === registrationCity)?.districts?.sort((a:any, b:any) => a.name.localeCompare(b.name, 'tr')).map((d: any) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-text-secondary">Müdürlük Adı</label>
                  <input 
                    value={agricultureDirectorate} 
                    onChange={e => setAgricultureDirectorate(e.target.value)} 
                    placeholder="Kadıköy İlçe Tarım ve Orman Müdürlüğü" 
                    className="input-base"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── BÖLÜM 4: Acil Durum Ağı (SOS) ─── */}
        <section id="sos-section" className="card-base p-6 sm:p-7 flex flex-col gap-5 rounded-3xl">
          <h2 className="text-base font-bold text-text-primary border-b border-border-main pb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">4</span>
            Acil Durum Ağı
          </h2>
          <p className="text-xs text-text-secondary">
            Dostunuza bir şey olursa aranacak kişiler dijital kartta ve SOS akışında gösterilir.
          </p>

          <div className="flex flex-col gap-4">
            {[0, 1].map(i => (
              <div key={i} className="flex flex-col gap-3 p-4 bg-slate-50/90 rounded-2xl border border-border-main">
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  {i === 0 ? 'Kişi 1 (Birincil)' : 'Kişi 2 (Yedek Bağlantı)'}
                </span>
                
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-text-secondary">Ad Soyad</label>
                    <input 
                      type="text" 
                      className="input-base"
                      value={sosContacts[i]?.name || ''}
                      onChange={e => { 
                        const c = [...sosContacts]; 
                        c[i] = {...c[i], name: e.target.value}; 
                        setSosContacts(c) 
                      }}
                      placeholder="Örn: Tufan Tabak" 
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-text-secondary">Telefon</label>
                    <input 
                      type="tel" 
                      className="input-base"
                      value={sosContacts[i]?.phone || ''}
                      onChange={e => { 
                        const c = [...sosContacts]; 
                        c[i] = {...c[i], phone: e.target.value}; 
                        setSosContacts(c) 
                      }}
                      placeholder="05XX XXX XX XX" 
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-text-secondary">Yakınlık</label>
                    {i === 0 ? (
                      <input 
                        type="text" 
                        readOnly 
                        disabled
                        className="input-base bg-gray-100/80 text-text-secondary font-semibold cursor-not-allowed border-border-main" 
                        value="Sahibi" 
                      />
                    ) : (
                      <select 
                        className="input-base bg-surface"
                        value={sosContacts[i]?.relation || ''}
                        onChange={e => { 
                          const c = [...sosContacts]; 
                          c[i] = {...c[i], relation: e.target.value}; 
                          setSosContacts(c) 
                        }}
                      >
                        <option value="">Seçiniz</option>
                        <option value="Aile Üyesi">Aile Üyesi</option>
                        <option value="Eşi / Partneri">Eşi / Partneri</option>
                        <option value="Eş">Eş</option>
                        <option value="Anne / Baba">Anne / Baba</option>
                        <option value="Kardeş">Kardeş</option>
                        <option value="Komşu / Bakıcı">Komşu / Bakıcı</option>
                        <option value="Arkadaş / Yakın">Arkadaş / Yakın</option>
                        <option value="Evcil Hayvan Bakıcısı">Evcil Hayvan Bakıcısı</option>
                        <option value="Veteriner Hekim">Veteriner Hekim</option>
                        <option value="Diğer">Diğer</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>



        {/* Kaydetme Bilgilendirmesi & Ana Aksiyon */}
        <div className="flex flex-col gap-3 pt-2">
          <p className="text-xs text-text-secondary text-center">
            💾 Tüm değişiklikler &ldquo;Değişiklikleri Kaydet&rdquo; butonuna basıldığında kaydedilir.
          </p>
          <button 
            type="submit" 
            disabled={loading} 
            className="btn-primary w-full h-[52px] flex items-center justify-center text-sm font-bold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>

        {/* ─── BÖLÜM 6: TEHLİKELİ ALAN (Sayfa Altı) ─── */}
        <div className="flex flex-col gap-3 pt-6 border-t border-border-main">
          <span className="text-xs font-bold text-text-secondary tracking-wider uppercase">
            TEHLİKELİ ALAN
          </span>

          {/* Kayıtları Sıfırla Kartı */}
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="w-full text-left p-4.5 bg-amber-50/80 hover:bg-amber-100/70 border border-amber-200/70 rounded-3xl flex items-center gap-3.5 transition-all cursor-pointer active:scale-[0.99] group"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-100/90 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <RotateCcw size={18} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-xs sm:text-sm font-bold text-amber-900">
                Sağlık, bakım ve beslenme kayıtlarını sıfırla
              </span>
              <span className="text-xs text-amber-700/80 mt-0.5">
                {petName || pet.name} silinmez — sıfırdan planlayıp kayıt girebilirsiniz
              </span>
            </div>
          </button>

          {/* Pet Kaydını Sil Kartı */}
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full text-left p-4.5 bg-red-50/80 hover:bg-red-100/70 border border-red-200/70 rounded-3xl flex items-center gap-3.5 transition-all cursor-pointer active:scale-[0.99] group"
          >
            <div className="w-10 h-10 rounded-2xl bg-red-100/90 text-red-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Trash2 size={18} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="text-xs sm:text-sm font-bold text-red-900">
                {petName || pet.name} kaydını sil
              </span>
              <span className="text-xs text-red-700/80 mt-0.5">
                Tüm sağlık, bakım ve beslenme kayıtları dahil
              </span>
            </div>
          </button>
        </div>

      </form>

      {/* ─── ONAY MODALLARI ─── */}
      {/* 1. Kayıtları Sıfırla Onay Modalı */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface rounded-3xl p-6 sm:p-7 max-w-md w-full border border-border-main shadow-2xl flex flex-col gap-4 animate-scaleIn">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <RotateCcw size={20} />
              </div>
              <h3 className="text-base font-bold text-text-primary">Kayıtları Sıfırla</h3>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              <strong>{petName || pet.name}</strong> için tüm geçmiş sağlık, aşı, kilo, beslenme ve bakım kayıtları sıfırlanacaktır. Profil silinmez ancak tüm geçmiş kayıtlar temizlenir. Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={resetLoading}
                className="btn-secondary flex-1 py-2.5 text-xs font-bold rounded-xl"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={resetLoading}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {resetLoading ? 'Sıfırlanıyor...' : 'Evet, Sıfırla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Pet Kaydını Sil Onay Modalı */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-surface rounded-3xl p-6 sm:p-7 max-w-md w-full border border-border-main shadow-2xl flex flex-col gap-4 animate-scaleIn">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <h3 className="text-base font-bold text-text-primary">Emin misiniz?</h3>
            </div>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              <strong>{petName || pet.name}</strong> profilini ve buna bağlı tüm sağlık, aşı ve beslenme kayıtlarını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="btn-secondary flex-1 py-2.5 text-xs font-bold rounded-xl"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={deleteLoading}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {deleteLoading ? 'Siliniyor...' : 'Evet, Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

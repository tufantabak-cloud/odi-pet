'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { calcAge } from '@/lib/pets/utils'
import { SmartScanner } from '@/components/ui/SmartScanner'
import { StepperInput } from '@/components/ui/StepperInput'
import { RulerPicker } from '@/components/ui/RulerPicker'

const CAT_BREEDS = [
  'British Shorthair', 'Scottish Fold', 'Scottish Straight',
  'Persian (İran Kedisi)', 'Maine Coon', 'Ragdoll', 'Siamese (Siyam)',
  'Van Kedisi', 'Ankara Kedisi', 'Bengal', 'Abyssinian', 'Devon Rex',
  'Norwegian Forest Cat', 'Sphynx', 'Tekir (Sokak)', 'Diğer',
]

const DOG_BREEDS = [
  'Golden Retriever', 'Labrador Retriever', 'Alman Çoban Köpeği',
  'French Bulldog', 'Bulldog', 'Poodle (Kaniş)', 'Beagle',
  'Rottweiler', 'Husky', 'Dachshund (Sosis)', 'Chihuahua',
  'Shih Tzu', 'Border Collie', 'Cocker Spaniel', 'Maltese',
  'Pomeranian', 'Kangal', 'Akbaş', 'Diğer',
]

const CAT_COLORS = ['Siyah', 'Beyaz', 'Gri', 'Turuncu', 'Karamel', 'Tekir', 'Calico', 'Beyaz-Siyah', 'Diğer']
const DOG_COLORS = ['Siyah', 'Beyaz', 'Kahverengi', 'Altın Sarısı', 'Krem', 'Gri', 'Siyah-Beyaz', 'Üç Renkli', 'Diğer']

export default function EditPetForm({ pet }: { pet: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlight = searchParams ? searchParams.get('highlight') : null
  const isHighlighted = (field: string) => highlight === field

  useEffect(() => {
    if (!highlight) return
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-highlight="${highlight}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
    return () => clearTimeout(timer)
  }, [highlight])

  const [loading, setLoading] = useState(false)
  const [showDocScanner, setShowDocScanner] = useState(false)
  const [birthDateMode, setBirthDateMode] = useState<'exact' | 'approximate'>('exact')
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
    
    let targetYear = now.getFullYear() - years
    let targetMonth = now.getMonth() - months
    
    while (targetMonth < 0) {
      targetMonth += 12
      targetYear -= 1
    }
    
    // Target ayın maksimum gün sayısını bulup bugünün gün değeriyle sınırla
    const maxDaysInTarget = new Date(targetYear, targetMonth + 1, 0).getDate()
    const targetDay = Math.min(todayDay, maxDaysInTarget)
    
    const targetDate = new Date(targetYear, targetMonth, targetDay)
    setBirthDate(targetDate.toISOString().split('T')[0])
  }

  const handleStep = (field: 'weight' | 'height', type: 'inc' | 'dec') => {
    if (field === 'weight') {
      const current = parseFloat(weightKg) || 0
      const next = type === 'inc' ? current + 0.5 : current - 0.5
      setWeightKg(next > 0 ? String(parseFloat(next.toFixed(2))) : '0')
    } else {
      const current = parseFloat(heightCm) || 0
      const next = type === 'inc' ? current + 1 : current - 1
      setHeightCm(next > 0 ? String(parseFloat(next.toFixed(1))) : '0')
    }
  }



  const [selectedBreed, setSelectedBreed] = useState(pet.breed || '')
  
  const [selectedCity, setSelectedCity] = useState(pet.city || '')
  const [selectedDistrict, setSelectedDistrict] = useState(pet.district || '')
  const [provinces, setProvinces] = useState<any[]>([])

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
  const [weightKg, setWeightKg] = useState(pet.weight_kg !== undefined && pet.weight_kg !== null ? String(pet.weight_kg) : '')
  const [heightCm, setHeightCm] = useState(pet.height_cm !== undefined && pet.height_cm !== null ? String(pet.height_cm) : '')
  const [editMeasureTab, setEditMeasureTab] = useState<'weight' | 'height'>('weight')
  const [microchipNo, setMicrochipNo] = useState(pet.microchip_no || '')
  const [passportNo, setPassportNo] = useState(pet.passport_no || '')
  const [vetCompany, setVetCompany] = useState(pet.vet_company || '')
  const [vetName, setVetName] = useState(pet.vet_name || '')
  const [vetPhone, setVetPhone] = useState(pet.vet_phone || '')
  const [vetEmail, setVetEmail] = useState(pet.vet_email || '')

  const [sosContacts, setSosContacts] = useState<{name:string; phone:string; relation:string}[]>(
    pet.sos_contacts && pet.sos_contacts.length > 0
      ? pet.sos_contacts
      : [{ name: '', phone: '', relation: '' }, { name: '', phone: '', relation: '' }]
  )
  const [sosSaving, setSosSaving] = useState(false)
  const [sosMsg, setSosMsg] = useState<{type:'ok'|'err'; text:string} | null>(null)
  const [successToast, setSuccessToast] = useState(false)

  const species = pet.species as 'cat' | 'dog'
  const breeds = species === 'cat' ? CAT_BREEDS : DOG_BREEDS
  const colors = species === 'cat' ? CAT_COLORS : DOG_COLORS
  const currentYear = new Date().getFullYear()

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
    if (petSpecies === 'cat') return 'Kedi Boyut Skalası (Kilo Bazlı)'
    const small = ['Chihuahua', 'Pomeranian', 'Maltese', 'Dachshund (Sosis)', 'Poodle (Kaniş)', 'Shih Tzu']
    const medium = ['Beagle', 'Cocker Spaniel', 'Border Collie', 'French Bulldog', 'Bulldog']
    const large = ['Golden Retriever', 'Labrador Retriever', 'Alman Çoban Köpeği', 'Rottweiler', 'Husky']
    const giant = ['Kangal', 'Akbaş']
    if (small.some(b => breed.includes(b.split(' ')[0]))) return 'Köpek Boyut Skalası (Küçük Irk)'
    if (medium.some(b => breed.includes(b.split(' ')[0]))) return 'Köpek Boyut Skalası (Orta Irk)'
    if (large.some(b => breed.includes(b.split(' ')[0]))) return 'Köpek Boyut Skalası (Büyük Irk)'
    if (giant.some(b => breed.includes(b.split(' ')[0]))) return 'Köpek Boyut Skalası (Dev Irk)'
    return 'Köpek Boyut Skalası (Ağırlık Bazlı)'
  }

  useEffect(() => {
    if (sizeLocked) return
    const calculated = calculateSize(weightKg, species)
    setSize(calculated)
  }, [weightKg, species, sizeLocked])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const el = document.getElementById(window.location.hash.replace('#', ''))
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [])

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
    if (color) fd.set('color', color)
    if (lifestyle) fd.set('lifestyle', lifestyle)
    if (size) fd.set('size', size)
    if (microchipNo) fd.set('microchip_no', microchipNo)
    if (passportNo) fd.set('passport_no', passportNo)
    if (vetCompany) fd.set('vet_company', vetCompany)
    if (vetName) fd.set('vet_name', vetName)
    if (vetPhone) fd.set('vet_phone', vetPhone)
    if (vetEmail) fd.set('vet_email', vetEmail)
    if (photoFile) fd.set('avatar', photoFile)
    
    if (selectedCity) fd.set('city', selectedCity)
    if (selectedDistrict) fd.set('district', selectedDistrict)
    fd.set('is_neutered', String(isNeutered))
    fd.set('weight_kg', weightKg.trim())
    fd.set('height_cm', heightCm.trim())

    try {
      const res = await fetch(`/api/pets/${pet.id}`, { method: 'PATCH', body: fd })
      let data: any = {}
      try {
        data = await res.json()
      } catch {
        // Sunucu HTTP hata sayfası döndürdüğünde HTML içeriği JSON parse edilemez
      }

      if (!res.ok) {
        if (res.status === 413) {
          setSubmitError('Seçilen fotoğrafın boyutu çok yüksek. Lütfen daha küçük bir görsel seçin.')
        } else {
          setSubmitError(data.error || `Güncelleme sırasında bir hata oluştu (Hata kodu: ${res.status}).`)
        }
        return
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

  const handleSaveSos = async () => {
    setSosSaving(true)
    setSosMsg(null)
    try {
      const res = await fetch(`/api/pets/${pet.id}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sos_contacts: sosContacts.filter(c => c.name || c.phone) }),
      })
      setSosMsg(res.ok ? { type: 'ok', text: 'Acil durum ağı güncellendi.' } : { type: 'err', text: 'Kaydedilemedi.' })
    } catch {
      setSosMsg({ type: 'err', text: 'Bağlantı hatası.' })
    } finally {
      setSosSaving(false)
    }
  }



  return (
    <div className="flex flex-col w-full mx-auto pb-32 pb-safe">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 border-b border-border-main pb-4 sticky top-0 bg-surface/90 backdrop-blur z-10 pt-2">
        <button type="button" onClick={() => router.back()}
          className="w-11 h-11 rounded-full border border-border-main flex items-center justify-center text-text-secondary hover:text-primary transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div className="flex flex-col flex-1">
          <h1 className="text-xl font-extrabold text-text-primary tracking-tight">{pet.name} Profil Ayarları</h1>
          <p className="text-xs text-text-secondary font-normal">Bilgileri güncelleyip aşağıdan kaydedin.</p>
        </div>
      </div>

      {successToast && (
        <div role="status" aria-live="polite" className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-[14px] bg-green-500 text-white text-sm font-bold shadow-xl animate-scaleIn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Bilgiler başarıyla güncellendi.
        </div>
      )}

      {submitError && (
        <div role="alert" aria-live="assertive" className="mb-4 p-3 rounded-[12px] bg-error/10 border border-error/20 text-error text-[13px] font-bold text-center">
          ⚠️ {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">

        {/* ─── BÖLÜM 1: Temel Kimlik ─── */}
        <section id="temel-section" className="card-base p-6 sm:p-8 flex flex-col gap-6">
          <h2 className="text-[15px] font-black text-text-primary border-b border-border-main pb-3">1. Temel Kimlik ve Fotoğraf</h2>
          
          <div 
            data-highlight="photo"
            className={`flex flex-col items-center gap-4 mb-2 ${
              isHighlighted('photo')
                ? 'ring-2 ring-purple-400 bg-purple-50 rounded-xl p-3 transition-all'
                : ''
            }`}
          >
            <div className="relative w-[120px] h-[120px] rounded-[28px] bg-gradient-to-br from-primary-soft to-white border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden shadow-sm">

              {photoPreview ? (
                photoPreview.startsWith('http') ? (
                  <Image src={photoPreview} alt="Önizleme" fill={true} className="object-cover" sizes="120px" />
                ) : (
                   
                  <img src={photoPreview} alt="Önizleme" className="w-full h-full object-cover" />
                )
              ) : (
                <span className="text-4xl">{species === 'cat' ? '🐱' : '🐶'}</span>
              )}
            </div>
            <label className="text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-full cursor-pointer hover:bg-primary/20 transition-colors">
              Fotoğrafı Değiştir
              <input type="file" accept="image/*" className="sr-only" onChange={e => {
                const file = e.target.files?.[0]
                if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)) }
              }}/>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">İsim *</label>
              <input id="name" autoFocus value={petName} onChange={e => setPetName(e.target.value)} className="input-base" required/>
            </div>
            <div 
              id="breed-input" 
              data-highlight="breed"
              className={`flex flex-col gap-2 ${
                isHighlighted('breed')
                  ? 'ring-2 ring-purple-400 bg-purple-50 rounded-xl p-3 transition-all'
                  : ''
              }`}
            >

              <label className="text-[13px] font-bold text-text-primary">Irk *</label>
              <select value={selectedBreed} onChange={e => setSelectedBreed(e.target.value)} className="input-base" required>
                <option value="" disabled>Irk seçin</option>
                {breeds.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Cinsiyet</label>
              <div className="flex gap-2">
                {[['male', '♂ Erkek'], ['female', '♀ Dişi']].map(([v, l]) => (
                  <label key={v} className={`flex-1 flex items-center justify-center p-3 border-2 rounded-[14px] cursor-pointer text-[13px] font-bold transition-all ${gender === v ? 'border-primary bg-primary-soft/30 text-primary' : 'border-border-main text-text-secondary'}`}>
                    <input type="radio" name="gender" value={v} checked={gender === v} onChange={() => setGender(v)} className="sr-only"/>
                    {l}
                  </label>
                ))}
              </div>
            </div>
             <div 
               data-highlight="birthDate"
               className={`flex flex-col gap-3 ${
                 isHighlighted('birthDate')
                   ? 'ring-2 ring-purple-400 bg-purple-50 rounded-xl p-3 transition-all'
                   : ''
               }`}
             >
               <div className="flex flex-col gap-0.5">

                 <label className="text-[13px] font-bold text-text-primary">Doğum Tarihi / Yaş</label>
                 <p className="text-[11px] text-text-secondary">Tam doğum tarihini seçebilir veya yaklaşık yaşını girebilirsiniz.</p>
               </div>
               
               {/* Sekme Seçici (Exact vs Approximate) */}
               <div className="flex border-b border-border-main mb-2">
                 <button
                   type="button"
                   onClick={() => {
                     setBirthDateMode('exact')
                     setBirthDate(pet.birth_date || '')
                     // Recalculate approx values based on original birth date if any
                     if (pet.birth_date) {
                       const born = new Date(pet.birth_date)
                       const now = new Date()
                       let diffMonths = (now.getFullYear() - born.getFullYear()) * 12 + (now.getMonth() - born.getMonth())
                       if (diffMonths < 0) diffMonths = 0
                       const y = Math.floor(diffMonths / 12)
                       const m = diffMonths % 12
                       setApproxYears(y > 0 ? String(y) : '')
                       setApproxMonths(m > 0 ? String(m) : '')
                     } else {
                       setApproxYears('')
                       setApproxMonths('')
                     }
                   }}
                   className={`flex-1 pb-2.5 text-center text-[13px] font-bold transition-all relative ${
                     birthDateMode === 'exact'
                       ? 'text-primary'
                       : 'text-text-secondary hover:text-text-primary'
                   }`}
                 >
                   Tam Tarih
                   {birthDateMode === 'exact' && (
                     <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full animate-scaleIn" />
                   )}
                 </button>
                 <button
                   type="button"
                   onClick={() => {
                     setBirthDateMode('approximate')
                     // Initialize with current values
                     handleApproxChange(approxYears, approxMonths)
                   }}
                   className={`flex-1 pb-2.5 text-center text-[13px] font-bold transition-all relative ${
                     birthDateMode === 'approximate'
                       ? 'text-primary'
                       : 'text-text-secondary hover:text-text-primary'
                   }`}
                 >
                   Yaklaşık Yaş
                   {birthDateMode === 'approximate' && (
                     <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full animate-scaleIn" />
                   )}
                 </button>
               </div>

               {birthDateMode === 'exact' ? (
                 <div className="animate-scaleIn">
                   <input
                     type="date"
                     value={birthDate}
                     max={new Date().toISOString().split('T')[0]}
                     className="input-base w-full animate-scaleIn"
                     onChange={e => setBirthDate(e.target.value)}
                   />
                 </div>
               ) : (
                 <div className="flex flex-col gap-3.5 animate-scaleIn">
                   {/* Yaş Girişi */}
                   <StepperInput
                     min={0} max={30} step={1} unit="Yaş"
                     placeholder="Yaş (Örn: 1)"
                     value={approxYears}
                     onChange={e => handleApproxChange(e.target.value, approxMonths)}
                     className="w-full h-14 !rounded-[16px] border-primary/20 bg-surface"
                   />

                   {/* Ay Girişi */}
                   <StepperInput
                     min={0} max={11} step={1} unit="Ay"
                     placeholder="Ay (Örn: 4)"
                     value={approxMonths}
                     onChange={e => handleApproxChange(approxYears, e.target.value)}
                     className="w-full h-14 !rounded-[16px] border-primary/20 bg-surface"
                   />
                 </div>
               )}

               {birthDate && (
                 <div className="text-[13px] font-bold text-primary bg-primary-soft/40 px-4 py-2.5 rounded-[14px] border border-primary/20 mt-1 animate-scaleIn flex items-center gap-2">
                   <span>✨</span>
                   <span>Hesaplanan Yaş: <strong>{calcAge(birthDate).text}</strong> ({calcAge(birthDate).label})</span>
                 </div>
               )}
             </div>

            {/* Fiziksel Mezüra / Ruler Picker (Kilo & Boy) */}
            <div id="weight-input" className="flex flex-col gap-3.5 col-span-1 sm:col-span-2">
              <div className="flex items-center justify-between gap-2 border-b border-border-main pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditMeasureTab('weight')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                      editMeasureTab === 'weight'
                        ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>⚖️ Kilo (kg) *</span>
                    {weightKg && <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-black">{weightKg} kg</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditMeasureTab('height')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                      editMeasureTab === 'height'
                        ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>📏 Boy (cm)</span>
                    <span className="text-[11px] opacity-80">(Opsiyonel)</span>
                    {heightCm && <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-black">{heightCm} cm</span>}
                  </button>
                </div>
              </div>

              {editMeasureTab === 'weight' ? (
                <RulerPicker
                  id="edit-pet-weight-ruler"
                  label="Güncel Kilo *"
                  sublabel="Cetveli kaydırarak veya sayıya dokunarak kiloyu güncelleyin"
                  unit="kg"
                  min={0.1}
                  max={120}
                  step={0.1}
                  value={weightKg ? parseFloat(weightKg) : (species === 'cat' ? 4.0 : 10.0)}
                  onChange={(val) => setWeightKg(String(val))}
                  presets={species === 'cat' ? [2.5, 4.0, 5.5, 7.0] : [5.0, 10.0, 18.0, 25.0, 35.0]}
                />
              ) : (
                <RulerPicker
                  id="edit-pet-height-ruler"
                  label="Boy / Uzunluk"
                  sublabel="Burundan kuyruk sokumuna veya omuza boy (Opsiyonel)"
                  isOptional
                  unit="cm"
                  min={5}
                  max={180}
                  step={1}
                  value={heightCm ? parseFloat(heightCm) : (species === 'cat' ? 25 : 45)}
                  onChange={(val) => setHeightCm(String(val))}
                  presets={species === 'cat' ? [20, 25, 30, 35] : [30, 45, 60, 80]}
                />
              )}
            </div>

            <div className="flex flex-col gap-2 col-span-1 sm:col-span-2 mt-2">
              <label className="text-[13px] font-bold text-text-primary">Otomatik Hesaplanan Beden Büyüklüğü</label>
              <div className="p-4 bg-primary-soft/20 border border-primary/20 rounded-[16px] flex items-center justify-between gap-3 animate-scaleIn flex-wrap">
                <span className="text-[13px] font-bold text-text-secondary">
                  {breedSizeLabel(selectedBreed, species)}
                </span>
                <div className="flex items-center gap-2">
                  {sizeLocked ? (
                    <select
                      value={size}
                      onChange={e => setSize(e.target.value)}
                      className="text-xs font-bold border border-primary/30 rounded-[10px] px-2 py-1 bg-white text-primary focus:outline-none"
                    >
                      {species === 'dog' && <option value="toy">🧸 Oyuncak / Ekstra Küçük</option>}
                      <option value="small">🐩 Küçük</option>
                      <option value="medium">🐕 Orta</option>
                      <option value="large">🦮 Büyük</option>
                      {species === 'dog' && <option value="giant">🦁 Dev</option>}
                    </select>
                  ) : (
                    <span className="px-4 py-1.5 rounded-full text-[13px] font-black bg-primary text-white flex items-center gap-1.5 shadow-sm">
                      {size === 'toy' && '🧸 Oyuncak / Ekstra Küçük'}
                      {size === 'small' && '🐩 Küçük'}
                      {size === 'medium' && '🐕 Orta'}
                      {size === 'large' && '🦮 Büyük'}
                      {size === 'giant' && '🦁 Dev'}
                      {!size && 'Kilo Girilmelidir'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setSizeLocked(l => !l) }}
                    title={sizeLocked ? 'Otomatik hesaba dön' : 'Manuel olarak kilitle'}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${sizeLocked ? 'bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200' : 'bg-white border-primary/20 text-text-secondary hover:border-primary/40'}`}
                  >
                    {sizeLocked ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        Kilitli
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                        Kilitlenmemiş
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── BÖLÜM 2: Fiziksel Özellikler ─── */}
        <section id="fiziksel-section" className="card-base p-6 sm:p-8 flex flex-col gap-6">
          <h2 className="text-[15px] font-black text-text-primary border-b border-border-main pb-3">2. Fiziksel ve Yaşam Alanı</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Renk / Desen</label>
              <select value={color} onChange={e => setColor(e.target.value)} className="input-base">
                <option value="">Seçin (opsiyonel)</option>
                {colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Şehir</label>
              <select value={selectedCity} onChange={e => { setSelectedCity(e.target.value); setSelectedDistrict('') }} className="input-base">
                <option value="">Şehir seçin (opsiyonel)</option>
                {provinces.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">İlçe</label>
              <select 
                value={selectedDistrict} 
                onChange={e => setSelectedDistrict(e.target.value)} 
                disabled={!selectedCity}
                className="input-base disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">İlçe seçin (opsiyonel)</option>
                {selectedCity && provinces.find(p => p.name === selectedCity)?.districts?.sort((a:any, b:any) => a.name.localeCompare(b.name, 'tr')).map((d: any) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            <div 
              data-highlight="neutered"
              className={`flex flex-col gap-2 ${
                isHighlighted('neutered')
                  ? 'ring-2 ring-purple-400 bg-purple-50 rounded-xl p-3 transition-all'
                  : ''
              }`}
            >

              <label className="text-[13px] font-bold text-text-primary">Kısırlaştırma Durumu</label>
              <div className="flex gap-2">
                {[[true, '✂️ Kısırlaştırıldı'], [false, '❤️ Kısırlaştırılmadı']].map(([v, l]) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setIsNeutered(v as boolean)}
                    className={`flex-1 flex items-center justify-center p-3 border-2 rounded-[14px] cursor-pointer text-[13px] font-bold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                      isNeutered === v 
                        ? 'border-primary bg-primary-soft/30 text-primary' 
                        : 'border-border-main text-text-secondary'
                    }`}
                  >
                    {l as string}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {species === 'cat' && (
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-[13px] font-bold text-text-primary">Yaşam Alanı</label>
              <div className="flex gap-3">
                {[['indoor', '🏠 Tamamen Kapalı'], ['outdoor', '🌳 Dışarı Çıkan']].map(([v, l]) => (
                  <label key={v} className={`flex-1 flex items-center justify-center p-3 border-2 rounded-[14px] cursor-pointer text-[13px] font-bold transition-all ${lifestyle === v ? 'border-primary bg-primary-soft/30 text-primary' : 'border-border-main text-text-secondary'}`}>
                    <input type="radio" name="lifestyle" value={v} checked={lifestyle === v} onChange={() => setLifestyle(v)} className="sr-only"/>
                    {l}
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ─── BÖLÜM 3: Evrak ve Veteriner ─── */}
        <section id="veteriner-section" className="card-base p-6 sm:p-8 flex flex-col gap-6">
          <h2 className="text-[15px] font-black text-text-primary border-b border-border-main pb-3 flex items-center justify-between flex-wrap gap-2">
            <span>3. Evrak & Veteriner Bilgisi</span>
            
            {!showDocScanner && (
              <button type="button"
                onClick={() => setShowDocScanner(true)}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold
                           text-primary bg-primary/5 border border-primary/20 rounded-xl
                           hover:bg-primary/10 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Pasaport veya Belgeyi Tara
              </button>
            )}
          </h2>

          {showDocScanner && (
            <SmartScanner
              petId={pet.id}
              onClose={() => setShowDocScanner(false)}
              onResult={(data: any) => {
                const parsed = data?.parsed || data
                if (parsed?.microchip_no) setMicrochipNo(parsed.microchip_no)
                if (parsed?.passport_no)  setPassportNo(parsed.passport_no)
                if (parsed?.vet_name)     setVetName(parsed.vet_name)
                if (parsed?.vet_phone)    setVetPhone(parsed.vet_phone)
                setShowDocScanner(false)
              }}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary flex items-center gap-2">
                Mikroçip No
                {microchipNo.replace(/\s/g, '').length === 15 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-bold border border-green-200 animate-scaleIn">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Doğrulandı
                  </span>
                )}
              </label>
              <div className="relative">
                <input value={microchipNo} onChange={e => setMicrochipNo(e.target.value)} placeholder="15 haneli no" className={`input-base pr-10 transition-all ${microchipNo.replace(/\s/g, '').length === 15 ? 'border-green-400 focus:border-green-500' : ''}`}/>
                {microchipNo.replace(/\s/g, '').length === 15 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 animate-scaleIn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Pasaport No</label>
              <input value={passportNo} onChange={e => setPassportNo(e.target.value)} className="input-base"/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Klinik / Şirket Adı</label>
              <input value={vetCompany} onChange={e => setVetCompany(e.target.value)} placeholder="Örn: Pati Veteriner Kliniği" className="input-base"/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Veteriner Adı</label>
              <input value={vetName} onChange={e => setVetName(e.target.value)} placeholder="Örn: Dr. Ali Yılmaz" className="input-base"/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Veteriner Telefonu</label>
              <input value={vetPhone} onChange={e => setVetPhone(e.target.value)} type="tel" placeholder="05xx xxx xx xx" className="input-base"/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Veteriner E-posta</label>
              <input value={vetEmail} onChange={e => setVetEmail(e.target.value)} type="email" placeholder="klinik@email.com" className="input-base"/>
            </div>
          </div>
        </section>

        <section 
          id="sos-section" 
          data-highlight="emergencyContact"
          className={`card-base p-6 sm:p-8 flex flex-col gap-6 ${
            isHighlighted('emergencyContact')
              ? 'ring-2 ring-purple-400 bg-purple-50 rounded-xl p-3 transition-all'
              : ''
          }`}
        >

          <h2 className="text-[15px] font-black text-text-primary border-b border-border-main pb-3">4. Acil Durum Ağı</h2>
          <p className="text-xs text-text-secondary">Evcil dostunuza bir şey olursa aranacak kişiler.</p>

          {sosMsg && (
            <div className={`p-3 rounded-xl text-[13px] font-bold border ${sosMsg.type === 'ok' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-error/10 text-error border-error/20'}`}>
              {sosMsg.text}
            </div>
          )}

          {[0, 1].map(i => (
            <div key={i} className="flex flex-col gap-3 p-4 bg-bg-main rounded-2xl border border-border-main">
              <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest">
                {i === 0 ? 'Kişi 1 (Birincil)' : 'Kişi 2 (Yedek Bağlantı)'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-text-secondary">Ad Soyad</label>
                  <input type="text" className="input-base"
                    value={sosContacts[i]?.name || ''}
                    onChange={e => { const c = [...sosContacts]; c[i] = {...c[i], name: e.target.value}; setSosContacts(c) }}
                    placeholder="Örn: Ali Yılmaz" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-text-secondary">Telefon</label>
                  <input type="tel" className="input-base"
                    value={sosContacts[i]?.phone || ''}
                    onChange={e => { const c = [...sosContacts]; c[i] = {...c[i], phone: e.target.value}; setSosContacts(c) }}
                    placeholder="05XX XXX XX XX" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-text-secondary">Yakınlık</label>
                  <select 
                    className="input-base bg-white"
                    value={sosContacts[i]?.relation || ''}
                    onChange={e => { const c = [...sosContacts]; c[i] = {...c[i], relation: e.target.value}; setSosContacts(c) }}
                  >
                    <option value="" disabled>Seçiniz</option>
                    <option value="Aile Üyesi">Aile Üyesi</option>
                    <option value="Eşi / Partneri">Eşi / Partneri</option>
                    <option value="Komşu">Komşu</option>
                    <option value="Arkadaş / Yakın">Arkadaş / Yakın</option>
                    <option value="Evcil Hayvan Bakıcısı">Evcil Hayvan Bakıcısı</option>
                    <option value="Veteriner Hekim">Veteriner Hekim</option>
                    <option value="Diğer">Diğer</option>
                    {sosContacts[i]?.relation && !['Aile Üyesi', 'Eşi / Partneri', 'Komşu', 'Arkadaş / Yakın', 'Evcil Hayvan Bakıcısı', 'Veteriner Hekim', 'Diğer'].includes(sosContacts[i].relation) && (
                      <option value={sosContacts[i].relation}>{sosContacts[i].relation}</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={handleSaveSos} disabled={sosSaving}
            className="btn-secondary w-full sm:w-auto h-[50px] flex items-center justify-center text-sm font-bold disabled:opacity-50">
            {sosSaving ? 'Kaydediliyor...' : '🆘 Acil Durum Ağını Kaydet'}
          </button>
        </section>

        {(() => {
          const enrichTasks: { label: string; icon: string }[] = []
          if (!pet.avatar_url) enrichTasks.push({ label: 'Profil Fotoğrafı Ekle', icon: '📷' })
          if (!pet.cover_url) enrichTasks.push({ label: 'Kapak Fotoğrafı Ekle', icon: '🖼️' })
          if (!pet.breed) enrichTasks.push({ label: 'Irk Bilgisi Gir', icon: '🐾' })
          if (!pet.microchip_no) enrichTasks.push({ label: 'Mikroçip Numarası Ekle', icon: '🆔' })
          if (!pet.vet_name) enrichTasks.push({ label: 'Veteriner Bilgisi Gir', icon: '🩺' })
          if (!pet.sos_contacts || !(pet.sos_contacts as any)?.[0]?.phone) enrichTasks.push({ label: 'Acil Durum (SOS) Ağı Kur', icon: '🆘' })
          const totalFields = 6;

          return enrichTasks.length > 0 && (
            <section 
              id="enrich-profile-section"
              className="card-base p-6 
                flex flex-col gap-4">
              <div className="flex items-center 
                justify-between">
                <h3 className="text-[15px] 
                  font-bold text-text-primary">
                  Profili Zenginleştir
                </h3>
                <span className="text-xs 
                  text-text-secondary">
                  % {Math.round(
                    ((totalFields - enrichTasks.length) 
                    / totalFields) * 100
                  )} tamamlandı
                </span>
              </div>
              <div className="w-full bg-surface-1 
                rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r 
                    from-violet-500 to-pink-400 
                    h-1.5 rounded-full 
                    transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      ((totalFields - enrichTasks.length) 
                      / totalFields) * 100
                    )}%`
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                {enrichTasks.map((task, i) => (
                  <div key={i}
                    className="flex items-center 
                      gap-3 p-3 rounded-xl 
                      bg-surface-1 border 
                      border-border">
                    <span className="text-lg">
                      {task.icon}
                    </span>
                    <div className="flex-1">
                      <p className="text-[13px] 
                        font-medium text-text-primary">
                        {task.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })()}


        <div className="flex flex-col sm:flex-row justify-end gap-4 pt-2">
          <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto min-w-[200px] h-[50px] flex items-center justify-center text-[15px] shadow-2xl shadow-primary/40 disabled:opacity-50">
            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}

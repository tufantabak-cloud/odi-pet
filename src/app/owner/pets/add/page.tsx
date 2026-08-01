'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { calcAge } from '@/lib/pets/utils'
import { DefaultCatAvatar, DefaultDogAvatar } from '@/components/icons/PetIcons'
import catSpeciesImage from '@/assets/pet-species/cat.png'
import dogSpeciesImage from '@/assets/pet-species/dog.png'
import { StepperInput } from '@/components/ui/StepperInput'
import { RulerPicker } from '@/components/ui/RulerPicker'
import { BreedCombobox } from '@/components/ui/BreedCombobox'
import {
  formatTurkishMobileInput,
  isTurkishMobilePhone,
  normalizeTurkishMobilePhone,
} from '@/lib/phone/turkish-mobile'
// ── Irk Listeleri ──────────────────────────────────────────────
const CAT_BREEDS = [
  'British Shorthair', 'Scottish Fold', 'Scottish Straight',
  'Persian (İran Kedisi)', 'Maine Coon', 'Ragdoll', 'Siamese (Siyam)',
  'Van Kedisi', 'Ankara Kedisi', 'Bengal', 'Abyssinian', 'Devon Rex',
  'Norwegian Forest Cat', 'Sphynx', 'Tekir (Sokak)', 'Diğer',
]

const POPULAR_CAT_BREEDS = [
  'British Shorthair', 'Tekir (Sokak)', 'Scottish Fold', 'Persian (İran Kedisi)'
]

const DOG_BREEDS = [
  'Golden Retriever', 'Labrador Retriever', 'Alman Çoban Köpeği',
  'French Bulldog', 'Bulldog', 'Poodle (Kaniş)', 'Beagle',
  'Rottweiler', 'Husky', 'Dachshund (Sosis)', 'Chihuahua',
  'Shih Tzu', 'Border Collie', 'Cocker Spaniel', 'Maltese',
  'Pomeranian', 'Kangal', 'Akbaş', 'Diğer',
]

const POPULAR_DOG_BREEDS = [
  'Golden Retriever', 'Labrador Retriever', 'French Bulldog', 'Pomeranian', 'Poodle (Kaniş)'
]

type Species = 'cat' | 'dog'


// ── Adım 1: Tür Seçimi ──────────────────────────────────────────
function SpeciesSelector({ onSelect, onBack }: { onSelect: (s: Species) => void, onBack: () => void }) {
  return (
    <div className="flex flex-col items-center w-full mx-auto pt-6 pb-10 gap-10 animate-fadeIn">
      <div className="w-full flex justify-start mb-[-20px]">
        <button onClick={onBack}
          aria-label="Geri"
          className="w-10 h-10 rounded-full border border-border-main flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/30 transition-all shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
      </div>
      <div className="text-center">
        <h1 className="text-[32px] font-extrabold text-text-primary tracking-tight">Can Dostun Kim?</h1>
        <p className="text-text-secondary mt-2 text-[16px]">Devam etmek için önce tür seçin</p>
      </div>

      <div className="grid grid-cols-2 gap-5 w-full">
        {([
          {
            species: 'cat' as Species,
            image: catSpeciesImage,
            ariaLabel: 'Kedi seç',
            border: 'hover:border-violet-400',
          },
          {
            species: 'dog' as Species,
            image: dogSpeciesImage,
            ariaLabel: 'Köpek seç',
            border: 'hover:border-amber-400',
          },
        ]).map(({ species, image, ariaLabel, border }) => (
          <button
            key={species}
            onClick={() => onSelect(species)}
            aria-label={ariaLabel}
            data-testid={species === 'cat' ? 'pet-species-cat-button' : 'pet-species-dog-button'}
            className={`relative aspect-square overflow-hidden rounded-[24px] border-2 border-border-main bg-white p-0 ${border} hover:shadow-medium transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] cursor-pointer`}
          >
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 640px) 45vw, 360px"
              placeholder="blur"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Adım 2: Hızlı Kayıt Formu ──────────────────────────────────
interface PetFormProps {
  species: Species
  onBack: () => void
  petName: string
  setPetName: (v: string) => void
  selectedBreed: string
  setSelectedBreed: (v: string) => void
  gender: 'male' | 'female' | ''
  setGender: (v: 'male' | 'female' | '') => void
  birthDateMode: 'exact' | 'approximate'
  setBirthDateMode: (v: 'exact' | 'approximate') => void
  birthDate: string
  setBirthDate: (v: string) => void
  approxYears: string
  setApproxYears: (v: string) => void
  approxMonths: string
  setApproxMonths: (v: string) => void
  isNeutered: boolean
  setIsNeutered: (v: boolean) => void
  weight: string
  setWeight: (v: string) => void
  height: string
  setHeight: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  submitError: string
}

function PetForm({
  species,
  onBack,
  petName,
  setPetName,
  selectedBreed,
  setSelectedBreed,
  gender,
  setGender,
  birthDateMode,
  setBirthDateMode,
  birthDate,
  setBirthDate,
  approxYears,
  setApproxYears,
  approxMonths,
  setApproxMonths,
  isNeutered,
  setIsNeutered,
  weight,
  setWeight,
  height,
  setHeight,
  onSubmit,
  submitError
}: PetFormProps) {
  const [activeMeasureTab, setActiveMeasureTab] = useState<'weight' | 'height'>('weight')
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

  const breeds = species === 'cat' ? CAT_BREEDS : DOG_BREEDS
  const popularBreeds = species === 'cat' ? POPULAR_CAT_BREEDS : POPULAR_DOG_BREEDS
  const AvatarHeader = species === 'cat' ? <DefaultCatAvatar width={36} height={36} /> : <DefaultDogAvatar width={36} height={36} />

  const isFormValid = !!petName.trim() && !!selectedBreed && !!gender && !!birthDate && !!weight

  return (
    <div className="flex flex-col w-full mx-auto pb-10 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 border-b border-border-main pb-4">
        <button onClick={onBack}
          type="button"
          aria-label="Geri"
          className="w-10 h-10 rounded-full border border-border-main flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/30 transition-all shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-9 h-9">{AvatarHeader}</span>
            <h1 className="text-[20px] font-extrabold text-text-primary tracking-tight">Temel Kimlik Bilgileri</h1>
          </div>
          <p className="text-[12px] text-text-secondary font-medium">Bu bilgilerle anında profili oluşturulacaktır.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card-base p-6 sm:p-8 flex flex-col gap-6">
        
        {submitError && (
          <div role="alert" aria-live="assertive" className="p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl border border-error/20">
            ⚠️ {submitError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* İsim */}
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-[13px] font-bold text-text-primary">İsim *</label>
            <input id="name" type="text"
              autoFocus
              value={petName} onChange={e => setPetName(e.target.value.toLocaleUpperCase('tr-TR'))}
              placeholder={species === 'cat' ? 'ÖRN: MİA, BONCUK' : 'ÖRN: MAX, KARAMEL'}
              data-testid="pet-name-input"
              className="input-base uppercase" required/>
          </div>

          {/* Irk Combobox */}
          <div className="flex flex-col gap-2">
            <label htmlFor="pet-breed-combobox" className="text-[13px] font-bold text-text-primary">Irk *</label>
            <BreedCombobox
              id="pet-breed-combobox"
              value={selectedBreed}
              onChange={(b) => setSelectedBreed(b)}
              breeds={breeds}
              popularBreeds={popularBreeds}
              placeholder="Irk yazın veya listeden seçin..."
              required
              data-testid="pet-breed-select"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Cinsiyet */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-text-primary">Cinsiyet *</label>
            <div className="flex gap-3">
              {([['male', '♂ Erkek', 'sky'], ['female', '♀ Dişi', 'pink']] as const).map(([v, l, theme]) => {
                const isSelected = gender === v
                const themeClasses = theme === 'sky'
                  ? (isSelected ? 'border-sky-500 bg-sky-50/80 text-sky-700 shadow-sm scale-[1.02]' : 'hover:border-sky-300 text-text-secondary')
                  : (isSelected ? 'border-pink-500 bg-pink-50/80 text-pink-700 shadow-sm scale-[1.02]' : 'hover:border-pink-300 text-text-secondary')

                return (
                  <label key={v} className={`flex-1 flex items-center justify-center gap-2 p-3.5 border-2 border-border-main rounded-[16px] cursor-pointer transition-all duration-200 text-[13px] font-extrabold ${themeClasses}`}>
                    <input type="radio" name="gender" value={v} checked={gender === v} onChange={() => setGender(v)} className="sr-only"/>
                    {l}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Doğum Tarihi */}
          <div className="flex flex-col gap-3">
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
                  setBirthDate('')
                  setApproxYears('')
                  setApproxMonths('')
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
                  setBirthDate('')
                  setApproxYears('')
                  setApproxMonths('')
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
                  data-testid="pet-birthdate-input"
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
        </div>

        {/* Kısırlaştırılma Durumu */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-bold text-text-primary">Kısırlaştırılma Durumu</label>
          <label className="flex items-center justify-between gap-2 p-3.5 border-2 border-border-main rounded-[14px] cursor-pointer hover:border-primary/50 transition-all text-[13px] font-bold text-text-secondary has-[:checked]:border-primary has-[:checked]:bg-primary-soft/30 group">
            <div className="flex items-center gap-2">
              <span className="text-[16px] group-hover:scale-110 transition-transform">✂️</span>
              <span className="group-has-[:checked]:text-primary">Kısırlaştırıldı</span>
            </div>
            <input type="checkbox" checked={isNeutered} onChange={e => setIsNeutered(e.target.checked)} className="w-5 h-5 text-primary focus:ring-primary rounded-[6px] border-border-main bg-white cursor-pointer"/>
          </label>
        </div>

        {/* Fiziksel Mezüra / Ruler Picker (Kilo & Boy) */}
        <div className="flex flex-col gap-3.5 mt-2">
          {/* Tab Seçimi (Kilo vs Boy) */}
          <div className="flex items-center justify-between gap-2 border-b border-border-main pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveMeasureTab('weight')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                  activeMeasureTab === 'weight'
                    ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>⚖️ Kilo (kg) *</span>
                {weight && <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-black">{weight} kg</span>}
              </button>

              <button
                type="button"
                onClick={() => setActiveMeasureTab('height')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                  activeMeasureTab === 'height'
                    ? 'bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>📏 Boy (cm)</span>
                <span className="text-[11px] opacity-80">(Opsiyonel)</span>
                {height && <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-black">{height} cm</span>}
              </button>
            </div>
          </div>

          {/* Aktif Cetvel Seçici */}
          {activeMeasureTab === 'weight' ? (
            <RulerPicker
              id="pet-weight-ruler"
              label="Kilo Ölçümü *"
              sublabel="Cetveli kaydırarak veya sayıya dokunarak kilo girin"
              unit="kg"
              min={0.1}
              max={120}
              step={0.1}
              value={weight ? parseFloat(weight) : (species === 'cat' ? 4.0 : 10.0)}
              onChange={(val) => setWeight(String(val))}
              presets={species === 'cat' ? [2.5, 4.0, 5.5, 7.0] : [5.0, 10.0, 18.0, 25.0, 35.0]}
            />
          ) : (
            <RulerPicker
              id="pet-height-ruler"
              label="Boy / Uzunluk Ölçümü"
              sublabel="Burundan kuyruk sokumuna veya omuza boy (Opsiyonel)"
              isOptional
              unit="cm"
              min={5}
              max={180}
              step={1}
              value={height ? parseFloat(height) : (species === 'cat' ? 25 : 45)}
              onChange={(val) => setHeight(String(val))}
              presets={species === 'cat' ? [20, 25, 30, 35] : [30, 45, 60, 80]}
            />
          )}
        </div>

        <div className="flex justify-end mt-4 pt-6 border-t border-border-main">
          <button 
            type="submit" 
            disabled={!isFormValid}
            data-testid="pet-save-button"
            className="btn-primary min-w-[200px] py-3.5 text-[15px] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <span>Devam Et →</span>
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Live Camera Modal ──────────────────────────────────────────────
function CameraModal({
  onCapture,
  onClose
}: {
  onCapture: (file: File) => void
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        })
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (err: any) {
        console.error('Kamera erişim hatası:', err)
        setError('Kameraya erişilemedi. Lütfen cihaz izinlerini kontrol edin veya galeri seçimini kullanın.')
      }
    }
    startCamera()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const takePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
          onCapture(file)
          if (stream) {
            stream.getTracks().forEach(track => track.stop())
          }
          onClose()
        }
      }, 'image/jpeg', 0.9)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl p-5 max-w-md w-full flex flex-col gap-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[18px]">📸</span>
            <h3 className="text-[16px] font-extrabold text-text-primary">Fotoğraf Çek</h3>
          </div>
          <button 
            type="button" 
            onClick={() => {
              if (stream) stream.getTracks().forEach(t => t.stop())
              onClose()
            }}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-[13px] text-center font-bold">
            {error}
          </div>
        ) : (
          <div className="relative w-full aspect-4/3 rounded-2xl bg-black overflow-hidden shadow-inner">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <button
            type="button"
            onClick={() => {
              if (stream) stream.getTracks().forEach(t => t.stop())
              onClose()
            }}
            className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-[13px]"
          >
            İptal
          </button>
          {!error && (
            <button
              type="button"
              onClick={takePhoto}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-extrabold text-[13px] shadow-md shadow-primary/20 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <span>📸 Fotoğrafı Çek</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Adım 3: Profil Fotoğrafı Ekleme ────────────────────────────
interface PetPhotoStepProps {
  species: Species
  petName: string
  photoPreview: string
  setPhotoPreview: (p: string) => void
  photoFile: File | null
  setPhotoFile: (f: File | null) => void
  coverPreview: string
  setCoverPreview: (p: string) => void
  coverFile: File | null
  setCoverFile: (f: File | null) => void
  onBack: () => void
  onSubmit: () => void
  loading: boolean
  submitError: string
}

function PetPhotoStep({
  species,
  petName,
  photoPreview,
  setPhotoPreview,
  photoFile,
  setPhotoFile,
  coverPreview,
  setCoverPreview,
  coverFile,
  setCoverFile,
  onBack,
  onSubmit,
  loading,
  submitError
}: PetPhotoStepProps) {
  const [activeCameraTarget, setActiveCameraTarget] = useState<'profile' | 'cover' | null>(null)

  const defaultAvatar = species === 'cat' ? (
    <DefaultCatAvatar width={100} height={100} />
  ) : (
    <DefaultDogAvatar width={100} height={100} />
  )

  const isCat = species === 'cat'
  const gradientClass = isCat 
    ? 'from-violet-50 to-purple-50 border-violet-200 hover:border-violet-400' 
    : 'from-amber-50 to-orange-50 border-amber-200 hover:border-amber-400'
  const bgSoftClass = isCat 
    ? 'bg-violet-100 hover:bg-violet-200 text-violet-700' 
    : 'bg-amber-100 hover:bg-amber-200 text-amber-700'

  const hasPhoto = !!photoPreview || !!photoFile

  return (
    <div className="flex flex-col w-full mx-auto pb-10 animate-fadeIn">
      {activeCameraTarget && (
        <CameraModal 
          onCapture={(file) => {
            if (activeCameraTarget === 'profile') {
              setPhotoFile(file)
              setPhotoPreview(URL.createObjectURL(file))
            } else if (activeCameraTarget === 'cover') {
              setCoverFile(file)
              setCoverPreview(URL.createObjectURL(file))
            }
          }}
          onClose={() => setActiveCameraTarget(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6 border-b border-border-main pb-4">
        <button onClick={onBack}
          type="button"
          aria-label="Geri"
          className="w-10 h-10 rounded-full border border-border-main flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/30 transition-all shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div className="flex flex-col flex-1">
          <h1 className="text-[20px] font-extrabold text-text-primary tracking-tight">Fotoğraf Ekle</h1>
          <p className="text-[12px] text-text-secondary font-medium">{petName} dostumuz için profil ve kapak fotoğrafı seçebilirsiniz.</p>
        </div>
      </div>

      <div className="card-base p-6 sm:p-8 flex flex-col gap-8">
        {submitError && (
          <div role="alert" aria-live="assertive" className="w-full p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl border border-error/20">
            ⚠️ {submitError}
          </div>
        )}

        {/* SECTION 1: PROFIL FOTOĞRAFI (ZORUNLU) */}
        <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-slate-50/60 border border-slate-200/80 w-full text-center">
          <div className="flex items-center justify-between w-full border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">📷</span>
              <span className="text-[14px] font-extrabold text-text-primary">Profil Fotoğrafı</span>
            </div>
            {hasPhoto ? (
              <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                <span>✓</span> Seçildi
              </span>
            ) : (
              <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
                * Zorunlu
              </span>
            )}
          </div>

          <div className={`relative w-[140px] h-[140px] rounded-[32px] bg-gradient-to-br ${gradientClass} border-2 border-dashed flex items-center justify-center overflow-hidden shadow-md group transition-all duration-300 hover:scale-[1.02]`}>
            {photoPreview ? (
              <img src={photoPreview} alt="Profil Önizleme" className="w-full h-full object-cover animate-scaleIn" />
            ) : (
              <div className="w-[95px] h-[95px] flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                {defaultAvatar}
              </div>
            )}

            {!photoPreview && (
              <div className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-text-secondary group-hover:text-primary transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            )}
          </div>

          {/* DUAL ACTION BUTTONS: FOTOĞRAF SEÇ & FOTOĞRAF ÇEK */}
          <div className="flex flex-wrap gap-2.5 justify-center items-center">
            {/* Galeriden Seç */}
            <label className={`text-[13px] font-bold px-4 py-2.5 rounded-full cursor-pointer transition-all duration-200 ${bgSoftClass} active:scale-[0.97] inline-flex items-center gap-1.5 shadow-xs`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>{photoPreview ? 'Galeriden Değiştir' : 'Fotoğraf Seç *'}</span>
              <input 
                type="file" 
                accept="image/*" 
                className="sr-only" 
                data-testid="pet-photo-input"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setPhotoFile(file)
                    setPhotoPreview(URL.createObjectURL(file))
                  }
                }}
              />
            </label>

            {/* Fotoğraf Çek */}
            <button
              type="button"
              onClick={() => setActiveCameraTarget('profile')}
              className="text-[13px] font-bold px-4 py-2.5 rounded-full cursor-pointer transition-all duration-200 bg-primary/10 hover:bg-primary/20 text-primary active:scale-[0.97] inline-flex items-center gap-1.5 shadow-xs"
              data-testid="pet-photo-camera-button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>Fotoğraf Çek</span>
            </button>

            {photoPreview && (
              <button 
                type="button"
                onClick={() => {
                  setPhotoFile(null)
                  setPhotoPreview('')
                }}
                className="text-[13px] font-bold px-3.5 py-2.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all active:scale-[0.97]"
              >
                Görseli Kaldır
              </button>
            )}
          </div>

          {!hasPhoto && (
            <p className="text-[12px] text-rose-600 font-semibold mt-1 animate-pulse">
              * Devam edebilmek için lütfen {petName} için bir profil fotoğrafı seçin veya çekin.
            </p>
          )}
        </div>

        {/* SECTION 2: KAPAK FOTOĞRAFI (OPSİYONEL) */}
        <div className="flex flex-col gap-4 p-5 rounded-2xl bg-slate-50/60 border border-slate-200/80 w-full">
          <div className="flex items-center justify-between w-full border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">🖼️</span>
              <span className="text-[14px] font-extrabold text-text-primary">Kapak Fotoğrafı</span>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
              Opsiyonel
            </span>
          </div>

          <div className="relative w-full h-[140px] sm:h-[160px] rounded-2xl border-2 border-dashed border-slate-300 bg-white overflow-hidden flex items-center justify-center transition-all hover:border-primary/50 group">
            {coverPreview ? (
              <img src={coverPreview} alt="Kapak Önizleme" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary-soft/40 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <p className="text-[12px] font-bold text-text-primary">Kapak Fotoğrafı Yükle</p>
                <p className="text-[11px] text-text-secondary">Göz alıcı bir arka plan görseli ekleyebilirsiniz.</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Galeriden Kapak Seç */}
              <label className="text-[12px] font-bold px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 cursor-pointer transition-all active:scale-[0.97] inline-flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>{coverPreview ? 'Galeriden Değiştir' : 'Fotoğraf Seç'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="sr-only" 
                  data-testid="pet-cover-input"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setCoverFile(file)
                      setCoverPreview(URL.createObjectURL(file))
                    }
                  }}
                />
              </label>

              {/* Kapak Fotoğrafı Çek */}
              <button
                type="button"
                onClick={() => setActiveCameraTarget('cover')}
                className="text-[12px] font-bold px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer transition-all active:scale-[0.97] inline-flex items-center gap-1.5"
                data-testid="pet-cover-camera-button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span>Fotoğraf Çek</span>
              </button>
            </div>

            {coverPreview && (
              <button 
                type="button"
                onClick={() => {
                  setCoverFile(null)
                  setCoverPreview('')
                }}
                className="text-[12px] font-bold px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all"
              >
                Kaldır
              </button>
            )}
          </div>

          {!coverPreview && (
            <p className="text-[11px] text-text-secondary leading-relaxed bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/50">
              💡 <strong>Bilgi:</strong> Kapak fotoğrafı eklemezseniz profiliniz varsayılan görsel ile oluşturulur ve profil tamamlama listenize görev olarak eklenir.
            </p>
          )}
        </div>

        {/* Dynamic Tip Card */}
        <div className="w-full border border-primary/10 bg-primary-soft/20 rounded-2xl p-4 flex gap-3 text-left items-center">
          <span className="text-[20px] shrink-0">✨</span>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            Profil fotoğrafı zorunludur. Görsel eklendikten sonra <strong>Devam Et</strong> butonu aktifleşecektir.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4 pt-4 border-t border-border-main">
          <button 
            type="button" 
            onClick={onBack}
            className="text-[14px] font-bold text-text-secondary hover:text-text-primary px-4 py-2 transition-colors order-2 sm:order-1"
          >
            ← Geri
          </button>
          
          {hasPhoto && (
            <button 
              type="button" 
              onClick={onSubmit} 
              disabled={loading} 
              data-testid="pet-profile-create-button"
              className="btn-primary min-w-[200px] py-3.5 text-[15px] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none hover:-translate-y-0.5 transition-transform w-full sm:w-auto order-1 sm:order-2"
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="15"/></svg>
                  Oluşturuluyor...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Devam Et →
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Adım 4: Acil Durum Ağı ──────────────────────────────────────────
interface PetSOSStepProps {
  petName: string
  sosContacts: { name: string; phone: string; relation: string }[]
  setSosContacts: (contacts: { name: string; phone: string; relation: string }[]) => void
  onSkip: () => void
  onSubmit: () => void
  loading: boolean
  submitError: string
}

function PetSOSStep({
  petName,
  sosContacts,
  setSosContacts,
  onSkip,
  onSubmit,
  loading,
  submitError
}: PetSOSStepProps) {
  const [availableContacts, setAvailableContacts] = useState<{ name: string; phone: string; relation: string }[]>([])
  const [touchedPhones, setTouchedPhones] = useState([false, false])
  const [showValidation, setShowValidation] = useState(false)

  useEffect(() => {
    async function loadContacts() {
      try {
        const res = await fetch('/api/pets')
        if (res.ok) {
          const data = await res.json()
          if (data.pets) {
            const list: { name: string; phone: string; relation: string }[] = []
            const seen = new Set<string>()
            for (const pet of data.pets) {
              const contacts = pet.sos_contacts
              if (Array.isArray(contacts)) {
                for (const c of contacts) {
                  if (c && c.name && c.phone) {
                    const cleanPhone = c.phone.replace(/\D/g, '').slice(-10)
                    const cleanName = c.name.trim().toLowerCase()
                    const key = cleanPhone ? `${cleanName}-${cleanPhone}` : `${cleanName}-${c.phone.trim()}`
                    if (!seen.has(key)) {
                      seen.add(key)
                      list.push({
                        name: c.name.trim(),
                        phone: formatTurkishMobileInput(c.phone),
                        relation: c.relation || 'Diğer'
                      })
                    }
                  }
                }
              }
            }
            setAvailableContacts(list)
          }
        }
      } catch (err) {
        console.error('Kişileri yükleme hatası:', err)
      }
    }
    loadContacts()
  }, [])

  const primaryNameMissing = !sosContacts[0]?.name?.trim()
  const primaryRelationMissing = !sosContacts[0]?.relation?.trim()
  const primaryPhoneInvalid = !isTurkishMobilePhone(sosContacts[0]?.phone || '')
  const secondaryHasData = !!(
    sosContacts[1]?.name?.trim()
    || sosContacts[1]?.phone?.trim()
    || sosContacts[1]?.relation?.trim()
  )
  const secondaryNameMissing = secondaryHasData && !sosContacts[1]?.name?.trim()
  const secondaryRelationMissing = secondaryHasData && !sosContacts[1]?.relation?.trim()
  const secondaryPhoneInvalid = secondaryHasData
    && !isTurkishMobilePhone(sosContacts[1]?.phone || '')

  const handleSave = () => {
    setShowValidation(true)

    if (
      primaryNameMissing
      || primaryPhoneInvalid
      || primaryRelationMissing
      || secondaryNameMissing
      || secondaryPhoneInvalid
      || secondaryRelationMissing
    ) {
      return
    }

    onSubmit()
  }

  return (
    <div className="flex flex-col w-full mx-auto pb-10 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 border-b border-border-main pb-4">
        <div className="flex flex-col flex-1">
          <h1 className="text-[20px] font-extrabold text-text-primary tracking-tight">Acil Durum Ağı 🆘</h1>
          <p className="text-[12px] text-text-secondary font-medium">Evcil dostunuza bir şey olursa kiminle iletişime geçelim? (Birincil kişi zorunludur)</p>
        </div>
      </div>

      <div className="card-base p-6 sm:p-8 flex flex-col gap-6">
        <p className="text-sm text-gray-500 mb-4">
          Acil durumda aranacak kişiyi şimdi eklemek zorunda değilsin.
          Bu bilgiyi daha sonra sağlık güvenliği kartından tamamlayabilirsin.
        </p>

        {submitError && (
          <div role="alert" aria-live="assertive" className="p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl border border-error/20">
            ⚠️ {submitError}
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 p-5 bg-error/[0.02] rounded-2xl border border-error/10 hover:border-error/30 transition-colors">
            <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
              <p className="text-[11px] font-black text-error uppercase tracking-widest">Kişi 1 (Birincil) *</p>
              
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-primary">Kişilerimden Seç:</span>
                <select 
                  onChange={(e) => {
                    const idx = parseInt(e.target.value)
                    if (!isNaN(idx) && availableContacts[idx]) {
                      const selected = availableContacts[idx]
                      const nc = [...sosContacts]
                      nc[0] = {
                        name: selected.name,
                        phone: formatTurkishMobileInput(selected.phone),
                        relation: selected.relation,
                      }
                      setSosContacts(nc)
                    }
                  }}
                  className="text-[11px] font-bold py-1 px-2 border border-primary/20 rounded-lg bg-primary-soft/30 text-primary focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  defaultValue=""
                  disabled={availableContacts.length === 0}
                >
                  {availableContacts.length === 0 ? (
                    <option value="" disabled>Kayıtlı kişi yok</option>
                  ) : (
                    <>
                      <option value="" disabled>Seçiniz</option>
                      {availableContacts.map((c, i) => (
                        <option key={i} value={i}>{c.name} ({c.relation})</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">Ad Soyad *</label>
              <input 
                type="text" 
                className={`input-base text-[14px] py-3 px-4 bg-white ${
                  showValidation && primaryNameMissing ? 'border-error focus:border-error focus:ring-error/20' : ''
                }`}
                placeholder="Örn: Ali Yılmaz" 
                value={sosContacts[0]?.name || ''} 
                data-testid="emergency-contact-name-input"
                aria-invalid={showValidation && primaryNameMissing}
                onChange={e => { const nc = [...sosContacts]; nc[0] = { ...nc[0], name: e.target.value }; setSosContacts(nc); }} 
                required
              />
              {showValidation && primaryNameMissing && (
                <p role="alert" className="text-[11px] font-bold text-error">Ad soyad zorunludur.</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">Telefon *</label>
              <input 
                type="tel" 
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={14}
                className={`input-base text-[14px] py-3 px-4 bg-white ${
                  (touchedPhones[0] || showValidation) && primaryPhoneInvalid
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : ''
                }`}
                placeholder="05XX XXX XX XX"
                value={sosContacts[0]?.phone || ''} 
                data-testid="emergency-contact-phone-input"
                aria-invalid={(touchedPhones[0] || showValidation) && primaryPhoneInvalid}
                aria-describedby="primary-phone-hint primary-phone-error"
                onBlur={() => setTouchedPhones(current => [true, current[1]])}
                onChange={e => {
                  const nc = [...sosContacts]
                  nc[0] = { ...nc[0], phone: formatTurkishMobileInput(e.target.value) }
                  setSosContacts(nc)
                }}
                required
              />
              <p id="primary-phone-hint" className="text-[11px] text-text-secondary">
                Türkiye cep telefonu numarası girin.
              </p>
              {(touchedPhones[0] || showValidation) && primaryPhoneInvalid && (
                <p id="primary-phone-error" role="alert" className="text-[11px] font-bold text-error">
                  Geçerli bir cep telefonu numarası girin: 05XX XXX XX XX
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">Yakınlık *</label>
              <select 
                className={`input-base text-[14px] py-3 px-4 bg-white ${
                  showValidation && primaryRelationMissing ? 'border-error focus:border-error focus:ring-error/20' : ''
                }`}
                value={sosContacts[0]?.relation || ''} 
                data-testid="emergency-contact-relation-select"
                aria-invalid={showValidation && primaryRelationMissing}
                onChange={e => { const nc = [...sosContacts]; nc[0] = { ...nc[0], relation: e.target.value }; setSosContacts(nc); }}
                required
              >
                <option value="" disabled>Seçiniz</option>
                <option value="Sahibi">Sahibi</option>
                <option value="Aile Üyesi">Aile Üyesi</option>
                <option value="Eşi / Partneri">Eşi / Partneri</option>
                <option value="Komşu">Komşu</option>
                <option value="Arkadaş / Yakın">Arkadaş / Yakın</option>
                <option value="Evcil Hayvan Bakıcısı">Evcil Hayvan Bakıcısı</option>
                <option value="Veteriner Hekim">Veteriner Hekim</option>
                <option value="Diğer">Diğer</option>
              </select>
              {showValidation && primaryRelationMissing && (
                <p role="alert" className="text-[11px] font-bold text-error">Yakınlık seçimi zorunludur.</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 p-5 bg-bg-main rounded-2xl border border-border-main hover:border-text-secondary/30 transition-colors">
            <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
              <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Kişi 2 (Yedek Bağlantı)</p>
              
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-primary">Kişilerimden Seç:</span>
                <select 
                  onChange={(e) => {
                    const idx = parseInt(e.target.value)
                    if (!isNaN(idx) && availableContacts[idx]) {
                      const selected = availableContacts[idx]
                      const nc = [...sosContacts]
                      nc[1] = {
                        name: selected.name,
                        phone: formatTurkishMobileInput(selected.phone),
                        relation: selected.relation,
                      }
                      setSosContacts(nc)
                    }
                  }}
                  className="text-[11px] font-bold py-1 px-2 border border-primary/20 rounded-lg bg-primary-soft/30 text-primary focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  defaultValue=""
                  disabled={availableContacts.length === 0}
                >
                  {availableContacts.length === 0 ? (
                    <option value="" disabled>Kayıtlı kişi yok</option>
                  ) : (
                    <>
                      <option value="" disabled>Seçiniz</option>
                      {availableContacts.map((c, i) => (
                        <option key={i} value={i}>{c.name} ({c.relation})</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">Ad Soyad</label>
              <input 
                type="text" 
                className={`input-base text-[14px] py-3 px-4 bg-white ${
                  showValidation && secondaryNameMissing ? 'border-error focus:border-error focus:ring-error/20' : ''
                }`}
                placeholder="Örn: Ayşe Yılmaz" 
                value={sosContacts[1]?.name || ''} 
                aria-invalid={showValidation && secondaryNameMissing}
                onChange={e => { const nc = [...sosContacts]; nc[1] = { ...nc[1], name: e.target.value }; setSosContacts(nc); }} 
              />
              {showValidation && secondaryNameMissing && (
                <p role="alert" className="text-[11px] font-bold text-error">Yedek kişi için ad soyad girin.</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">Telefon</label>
              <input 
                type="tel" 
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={14}
                className={`input-base text-[14px] py-3 px-4 bg-white ${
                  (touchedPhones[1] || showValidation) && secondaryPhoneInvalid
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : ''
                }`}
                placeholder="05XX XXX XX XX"
                value={sosContacts[1]?.phone || ''} 
                aria-invalid={(touchedPhones[1] || showValidation) && secondaryPhoneInvalid}
                aria-describedby="secondary-phone-hint secondary-phone-error"
                onBlur={() => setTouchedPhones(current => [current[0], true])}
                onChange={e => {
                  const nc = [...sosContacts]
                  nc[1] = { ...nc[1], phone: formatTurkishMobileInput(e.target.value) }
                  setSosContacts(nc)
                }}
              />
              <p id="secondary-phone-hint" className="text-[11px] text-text-secondary">
                İsteğe bağlı Türkiye cep telefonu numarası.
              </p>
              {(touchedPhones[1] || showValidation) && secondaryPhoneInvalid && (
                <p id="secondary-phone-error" role="alert" className="text-[11px] font-bold text-error">
                  Geçerli bir cep telefonu numarası girin: 05XX XXX XX XX
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">Yakınlık</label>
              <select 
                className={`input-base text-[14px] py-3 px-4 bg-white ${
                  showValidation && secondaryRelationMissing ? 'border-error focus:border-error focus:ring-error/20' : ''
                }`}
                value={sosContacts[1]?.relation || ''} 
                aria-invalid={showValidation && secondaryRelationMissing}
                onChange={e => { const nc = [...sosContacts]; nc[1] = { ...nc[1], relation: e.target.value }; setSosContacts(nc); }}
              >
                <option value="" disabled>Seçiniz</option>
                <option value="Sahibi">Sahibi</option>
                <option value="Aile Üyesi">Aile Üyesi</option>
                <option value="Eşi / Partneri">Eşi / Partneri</option>
                <option value="Komşu">Komşu</option>
                <option value="Arkadaş / Yakın">Arkadaş / Yakın</option>
                <option value="Evcil Hayvan Bakıcısı">Evcil Hayvan Bakıcısı</option>
                <option value="Veteriner Hekim">Veteriner Hekim</option>
                <option value="Diğer">Diğer</option>
                {sosContacts[1]?.relation && !['Sahibi', 'Aile Üyesi', 'Eşi / Partneri', 'Komşu', 'Arkadaş / Yakın', 'Evcil Hayvan Bakıcısı', 'Veteriner Hekim', 'Diğer'].includes(sosContacts[1].relation) && (
                  <option value={sosContacts[1].relation}>{sosContacts[1].relation}</option>
                )}
              </select>
              {showValidation && secondaryRelationMissing && (
                <p role="alert" className="text-[11px] font-bold text-error">Yedek kişi için yakınlık seçin.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center w-full gap-2 mt-6 pt-6 border-t border-border-main">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            data-testid="emergency-contact-save-button"
            className="btn-primary min-w-[200px] w-full sm:w-auto py-3.5 text-[15px] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                Kaydediliyor...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Kaydet ve Tamamla ✓
              </span>
            )}
          </button>

          <button
            type="button"
            data-testid="emergency-contact-skip-button"
            onClick={() => onSkip()}
            className="w-full mt-2 py-2 text-sm text-gray-400 underline underline-offset-2"
          >
            Daha Sonra Ekle
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Wizard Steps Config ───────────────────────────────────────────────────
const WIZARD_STEPS = [
  { id: 1, label: 'Tür Seçimi' },
  { id: 2, label: 'Bilgiler' },
  { id: 3, label: 'Profil Fotoğrafı' },
  { id: 4, label: 'Acil Durum Ağı' },
  { id: 5, label: 'Bildirim Onayı' },
  { id: 6, label: 'Sağlık Geçmişi' },
]

export default function AddPetPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any })
  }, [step])

  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)

  const [petName, setPetName] = useState('')
  const [selectedBreed, setSelectedBreed] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [birthDateMode, setBirthDateMode] = useState<'exact' | 'approximate'>('exact')
  const [birthDate, setBirthDate] = useState('')
  const [approxYears, setApproxYears] = useState('')
  const [approxMonths, setApproxMonths] = useState('')
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [isNeutered, setIsNeutered] = useState(false)
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [createdPetId, setCreatedPetId] = useState<string | null>(null)
  const [sosContacts, setSosContacts] = useState([
    { name: '', phone: '', relation: '' },
    { name: '', phone: '', relation: '' },
  ])
  const [sosLoading, setSosLoading] = useState(false)

  const handleSpeciesSelect = (species: Species) => {
    setSelectedSpecies(species)
    setStep(2)
  }

  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    
    // Geçici console.log("submit tetiklendi", formData) eklendi
    console.log("submit tetiklendi", {
      name: petName,
      breed: selectedBreed,
      gender,
      birthDate,
      weight,
      height,
      isNeutered
    })

    if (!petName.trim()) {
      setSubmitError('Lütfen can dostunuzun ismini girin.')
      return
    }
    if (!selectedBreed) {
      setSubmitError('Lütfen can dostunuzun ırkını seçin.')
      return
    }
    if (!gender) {
      setSubmitError('Lütfen can dostunuzun cinsiyetini seçin.')
      return
    }
    if (!birthDate) {
      setSubmitError('Lütfen can dostunuzun doğum tarihini veya yaklaşık yaşını belirtin.')
      return
    }
    if (!weight) {
      setSubmitError('Lütfen can dostunuzun kilosunu girin.')
      return
    }

    setStep(3)
  }

  const handleSubmit = async () => {
    setSubmitError('')
    setLoading(true)
    const fd = new FormData()
    fd.set('species', selectedSpecies!)
    fd.set('name', petName.trim())
    fd.set('breed', selectedBreed)
    if (gender) fd.set('gender', gender)
    if (birthDate) fd.set('birth_date', birthDate)
    if (photoFile) fd.set('avatar', photoFile)
    if (coverFile) fd.set('cover', coverFile)
    fd.set('is_neutered', isNeutered.toString())
    if (weight) fd.set('weight', weight)
    if (height) {
      fd.set('height', height)
      fd.set('height_cm', height)
    }
    try {
      const res = await fetch('/api/pets', { method: 'POST', body: fd })
      let data: any = {}
      try {
        data = await res.json()
      } catch {
        // Sunucu HTTP hata sayfası (ör. 413 Request Entity Too Large HTML) döndürdüğünde JSON parse edilemez
      }

      if (!res.ok) {
        if (res.status === 413) {
          setSubmitError('Seçilen fotoğrafın boyutu çok yüksek. Lütfen daha küçük bir görsel seçin.')
        } else {
          setSubmitError(data.error || `Kayıt sırasında bir hata oluştu (Hata kodu: ${res.status}).`)
        }
        return
      }

      setCreatedPetId(data.pet.id)
      if (data.pet?.avatar_url) setCreatedPetAvatar(data.pet.avatar_url)
      setStep(4)
    } catch (err: any) {
      setSubmitError('Sunucu bağlantı hatası: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const [createdPetAvatar, setCreatedPetAvatar] = useState('')

  const getSuccessUrl = (id: string) => {
    const avatar = createdPetAvatar || photoPreview
    const base = `/owner/pets/add/success?id=${id}&name=${encodeURIComponent(petName.trim())}&species=${encodeURIComponent(selectedSpecies ?? '')}`
    return avatar ? `${base}&avatar=${encodeURIComponent(avatar)}` : base
  }

  const handleSosSubmit = async () => {
    if (!createdPetId) return
    setSubmitError('')
    setSosLoading(true)
    try {
      const normalizedContacts = sosContacts
        .filter(c => c.name || c.phone)
        .map(contact => ({
          ...contact,
          phone: normalizeTurkishMobilePhone(contact.phone) ?? contact.phone,
        }))

      const response = await fetch(`/api/pets/${createdPetId}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sos_contacts: normalizedContacts }),
      })

      const data = await response.json()
      if (!response.ok) {
        setSubmitError(data.error || 'Acil durum ağı kaydedilemedi.')
        return
      }

      router.replace(getSuccessUrl(createdPetId))
    } catch {
      setSubmitError('Bağlantı kurulamadı. Lütfen tekrar deneyin.')
    } finally {
      setSosLoading(false)
    }
  }

  const handleSosSkip = () => { if (createdPetId) router.replace(getSuccessUrl(createdPetId)) }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-8">
      {/* Wizard Header & Stepper Bar */}
      <div data-testid="wizard-step-indicator" className="w-full flex flex-col gap-2.5 mb-2 mt-2 px-1">
        {/* Top Progress & Active Title Bar */}
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-extrabold text-primary uppercase tracking-wider">
            Adım {step} / 4 • {WIZARD_STEPS.find(s => s.id === step)?.label || ''}
          </span>
          <span className="text-[11px] font-extrabold text-text-tertiary bg-surface-2 px-2.5 py-0.5 rounded-full border border-border/40">
            %{Math.round((step / 4) * 100)} Tamamlandı
          </span>
        </div>

        {/* Dynamic Gradient Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-border-main/50">
          <div
            className="bg-gradient-to-r from-primary via-indigo-600 to-primary h-full rounded-full transition-all duration-500 shadow-xs"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step Pills for Desktop / Larger Screens */}
        <div className="hidden sm:flex items-center justify-between gap-2 pt-1">
          {WIZARD_STEPS.slice(0, 4).map((s) => {
            const isCurrent = step === s.id
            const isCompleted = step > s.id
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-bold transition-all duration-300 w-full justify-center ${isCurrent ? 'bg-primary-soft/50 border-primary text-primary scale-[1.02] shadow-xs' : isCompleted ? 'bg-green-50 border-green-200 text-green-700' : 'bg-surface border-border-main text-text-secondary'}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold ${isCurrent ? 'bg-primary text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-text-secondary'}`}>
                    {isCompleted ? '✓' : s.id}
                  </div>
                  <span className="truncate">{s.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {step === 1 && <SpeciesSelector onSelect={handleSpeciesSelect} onBack={() => router.back()} />}

      {step === 2 && selectedSpecies && (
        <PetForm
          species={selectedSpecies}
          onBack={() => { setSelectedSpecies(null); setStep(1) }}
          petName={petName} setPetName={setPetName}
          selectedBreed={selectedBreed} setSelectedBreed={setSelectedBreed}
          gender={gender} setGender={setGender}
          birthDateMode={birthDateMode} setBirthDateMode={setBirthDateMode}
          birthDate={birthDate} setBirthDate={setBirthDate}
          approxYears={approxYears} setApproxYears={setApproxYears}
          approxMonths={approxMonths} setApproxMonths={setApproxMonths}
          isNeutered={isNeutered} setIsNeutered={setIsNeutered}
          weight={weight} setWeight={setWeight}
          height={height} setHeight={setHeight}
          onSubmit={handleStep2Next}
          submitError={submitError}
        />
      )}

      {step === 3 && selectedSpecies && (
        <PetPhotoStep
          species={selectedSpecies}
          petName={petName}
          photoPreview={photoPreview} setPhotoPreview={setPhotoPreview}
          photoFile={photoFile} setPhotoFile={setPhotoFile}
          coverPreview={coverPreview} setCoverPreview={setCoverPreview}
          coverFile={coverFile} setCoverFile={setCoverFile}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
          loading={loading}
          submitError={submitError}
        />
      )}

      {step === 4 && (
        <PetSOSStep
          petName={petName}
          sosContacts={sosContacts}
          setSosContacts={setSosContacts}
          onSkip={handleSosSkip}
          onSubmit={handleSosSubmit}
          loading={sosLoading}
          submitError=""
        />
      )}
    </div>
  )
}

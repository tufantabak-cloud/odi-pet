'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { calcAge } from '@/lib/pets/utils'
import { DefaultCatAvatar, DefaultDogAvatar, RulerIcon } from '@/components/icons/PetIcons'
import {
  AlertTriangle,
  Sparkles,
  Scissors,
  Scale,
  Camera,
  X,
  Image as ImageIcon,
  Info,
  Siren,
  Check,
  ArrowLeft,
  Upload,
  Trash2,
  Loader2,
  ChevronRight,
  ShieldCheck,
  User,
  Phone,
} from 'lucide-react'
import { StepperInput } from '@/components/ui/StepperInput'
import { RulerPicker } from '@/components/ui/RulerPicker'
import { BreedCombobox } from '@/components/ui/BreedCombobox'
import {
  formatTurkishMobileInput,
  isTurkishMobilePhone,
  normalizeTurkishMobilePhone,
} from '@/lib/phone/turkish-mobile'
import {
  CAT_BREED_NAMES,
  DOG_BREEDS_NAMES,
  POPULAR_CAT_BREED_NAMES,
  POPULAR_DOG_BREED_NAMES,
} from '@/lib/pets/breedsMaster'

const catSpeciesImage = '/brand/illustrations/species/cat.png'
const dogSpeciesImage = '/brand/illustrations/species/dog.png'

const CAT_BREEDS = CAT_BREED_NAMES
const POPULAR_CAT_BREEDS = POPULAR_CAT_BREED_NAMES
const DOG_BREEDS = DOG_BREEDS_NAMES
const POPULAR_DOG_BREEDS = POPULAR_DOG_BREED_NAMES

type Species = 'cat' | 'dog'

// ── Adım 1: Tür Seçimi ──────────────────────────────────────────
function SpeciesSelector({
  onSelect,
  onBack,
}: {
  onSelect: (s: Species) => void
  onBack: () => void
}) {
  return (
    <div className="flex flex-col items-center w-full mx-auto pt-2 pb-8 gap-8 animate-fadeIn">
      <div className="w-full flex justify-start">
        <button
          type="button"
          onClick={onBack}
          aria-label="Geri"
          className="w-10 h-10 rounded-full border border-border-main bg-surface flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/30 transition-all duration-200 active:scale-[0.95] cursor-pointer shrink-0"
        >
          <ArrowLeft size={18} className="w-4.5 h-4.5" aria-hidden="true" />
        </button>
      </div>

      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          Can Dostun Kim?
        </h1>
        <p className="text-text-secondary mt-2 text-sm sm:text-base">
          Kişiselleştirilmiş sağlık ve bakım takvimi için önce tür seçin
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-lg">
        {([
          {
            species: 'cat' as Species,
            title: 'Kedi',
            subtitle: 'Miyavlayan dostumuz',
            image: catSpeciesImage,
            ariaLabel: 'Kedi seç',
            border: 'hover:border-violet-400 focus:border-violet-500',
            badgeBg: 'bg-violet-100 text-violet-700',
          },
          {
            species: 'dog' as Species,
            title: 'Köpek',
            subtitle: 'Sadık dostumuz',
            image: dogSpeciesImage,
            ariaLabel: 'Köpek seç',
            border: 'hover:border-amber-400 focus:border-amber-500',
            badgeBg: 'bg-amber-100 text-amber-800',
          },
        ]).map(({ species, title, subtitle, image, ariaLabel, border, badgeBg }) => (
          <button
            key={species}
            type="button"
            onClick={() => onSelect(species)}
            aria-label={ariaLabel}
            data-testid={species === 'cat' ? 'pet-species-cat-button' : 'pet-species-dog-button'}
            className={`group relative flex flex-col items-center p-4 rounded-3xl border-2 border-border-main bg-white shadow-2xs ${border} hover:shadow-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-left`}
          >
            <div className="relative w-full aspect-square overflow-hidden rounded-2xl bg-surface-2 mb-3">
              <Image
                src={image}
                alt={title}
                fill
                sizes="(max-width: 640px) 45vw, 240px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="w-full flex items-center justify-between pt-1">
              <div>
                <span className="text-base font-extrabold text-text-primary block">{title}</span>
                <span className="text-xs text-text-secondary font-medium hidden sm:block">
                  {subtitle}
                </span>
              </div>
              <span
                className={`text-2xs font-extrabold px-2.5 py-1 rounded-full ${badgeBg} uppercase tracking-wider`}
              >
                Seç
              </span>
            </div>
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
  isNeutered,
  setIsNeutered,
  weight,
  setWeight,
  height,
  setHeight,
  onSubmit,
  submitError,
}: PetFormProps) {
  const [activeMeasureTab, setActiveMeasureTab] = useState<'weight' | 'height'>('weight')
  const [showValidation, setShowValidation] = useState(false)

  const handleApproxChange = (yStr: string) => {
    setApproxYears(yStr)

    const years = parseInt(yStr)
    if (isNaN(years)) {
      setBirthDate('')
      return
    }

    const now = new Date()
    const todayDay = now.getDate()

    // 0 yaş seçildiğinde yavru (~6 aylık) olarak hesaplanır
    const effectiveMonths = years === 0 ? 6 : 0
    let targetYear = now.getFullYear() - (years > 0 ? years : 0)
    let targetMonth = now.getMonth() - effectiveMonths

    while (targetMonth < 0) {
      targetMonth += 12
      targetYear -= 1
    }

    const maxDaysInTarget = new Date(targetYear, targetMonth + 1, 0).getDate()
    const targetDay = Math.min(todayDay, maxDaysInTarget)

    const targetDate = new Date(targetYear, targetMonth, targetDay)
    setBirthDate(targetDate.toISOString().split('T')[0])
  }

  const breeds = species === 'cat' ? CAT_BREEDS : DOG_BREEDS
  const popularBreeds = species === 'cat' ? POPULAR_CAT_BREEDS : POPULAR_DOG_BREEDS
  const AvatarHeader =
    species === 'cat' ? (
      <DefaultCatAvatar width={36} height={36} />
    ) : (
      <DefaultDogAvatar width={36} height={36} />
    )

  const isNameInvalid = showValidation && !petName.trim()
  const isBreedInvalid = showValidation && !selectedBreed
  const isGenderInvalid = showValidation && !gender
  const isBirthDateInvalid = showValidation && !birthDate
  const isWeightInvalid = showValidation && !weight

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setShowValidation(true)

    if (!petName.trim()) {
      document.getElementById('name')?.focus()
      onSubmit(e)
      return
    }
    if (!selectedBreed) {
      document.getElementById('pet-breed-combobox')?.focus()
      onSubmit(e)
      return
    }
    if (!gender) {
      const genderEl = document.getElementById('gender-group')
      genderEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      genderEl?.focus()
      onSubmit(e)
      return
    }
    if (!birthDate) {
      if (birthDateMode === 'exact') {
        document.getElementById('pet-birthdate-input')?.focus()
      }
      onSubmit(e)
      return
    }
    if (!weight) {
      document.getElementById('pet-weight-ruler')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      onSubmit(e)
      return
    }

    onSubmit(e)
  }

  return (
    <div className="flex flex-col w-full mx-auto pb-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-6 border-b border-border-main pb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Geri"
          className="w-10 h-10 rounded-full border border-border-main bg-surface flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/30 transition-all duration-200 active:scale-[0.95] cursor-pointer shrink-0"
        >
          <ArrowLeft size={18} className="w-4.5 h-4.5" aria-hidden="true" />
        </button>
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8">{AvatarHeader}</span>
            <h1 className="text-xl font-extrabold text-text-primary tracking-tight">
              Temel Kimlik Bilgileri
            </h1>
          </div>
          <p className="text-xs text-text-secondary font-medium">
            Bu temel bilgilerle can dostunun sağlık profili anında oluşturulur.
          </p>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} noValidate className="card-base p-6 sm:p-8 flex flex-col gap-6 rounded-3xl">
        {submitError && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3.5 bg-error/10 text-error text-xs font-bold rounded-2xl border border-error/20 flex items-center gap-2 animate-fadeIn"
          >
            <AlertTriangle size={16} className="w-4 h-4 text-error shrink-0" aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* İsim */}
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-xs font-extrabold text-text-primary">
              İsim *
            </label>
            <input
              id="name"
              type="text"
              autoFocus
              value={petName}
              onChange={(e) => setPetName(e.target.value.toLocaleUpperCase('tr-TR'))}
              placeholder={species === 'cat' ? 'ÖRN: MİA, BONCUK' : 'ÖRN: MAX, KARAMEL'}
              data-testid="pet-name-input"
              aria-invalid={isNameInvalid}
              aria-describedby={isNameInvalid ? 'pet-name-error' : undefined}
              className={`input-base uppercase text-sm font-semibold rounded-2xl transition-all ${
                isNameInvalid ? 'border-error focus:border-error focus:ring-error/20 bg-rose-50/20' : ''
              }`}
              required
            />
            {isNameInvalid && (
              <p id="pet-name-error" role="alert" className="text-2xs font-bold text-error animate-fadeIn">
                Lütfen can dostunuzun ismini girin.
              </p>
            )}
          </div>

          {/* Irk Combobox */}
          <div className="flex flex-col gap-2">
            <label htmlFor="pet-breed-combobox" className="text-xs font-extrabold text-text-primary">
              Irk *
            </label>
            <div className={isBreedInvalid ? 'ring-2 ring-error/40 rounded-2xl' : ''}>
              <BreedCombobox
                id="pet-breed-combobox"
                value={selectedBreed}
                onChange={(b) => setSelectedBreed(b)}
                species={species}
                breeds={breeds}
                popularBreeds={popularBreeds}
                placeholder="Irk yazın veya listeden seçin..."
                required
                data-testid="pet-breed-select"
              />
            </div>
            {isBreedInvalid && (
              <p id="pet-breed-error" role="alert" className="text-2xs font-bold text-error animate-fadeIn">
                Lütfen can dostunuzun ırkını seçin.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Cinsiyet */}
          <div id="gender-group" tabIndex={-1} className="flex flex-col gap-2 outline-none">
            <label className="text-xs font-extrabold text-text-primary">Cinsiyet *</label>
            <div
              className={`flex gap-3 p-1 rounded-2xl transition-all ${
                isGenderInvalid ? 'border-2 border-error bg-rose-50/30' : ''
              }`}
              role="radiogroup"
              aria-label="Cinsiyet seçimi"
            >
              {(
                [
                  ['male', 'Erkek', 'sky'],
                  ['female', 'Dişi', 'pink'],
                ] as const
              ).map(([v, l, theme]) => {
                const isSelected = gender === v
                const themeClasses =
                  theme === 'sky'
                    ? isSelected
                      ? 'border-sky-500 bg-sky-50/80 text-sky-700 shadow-xs scale-[1.01]'
                      : isGenderInvalid
                        ? 'border-error/40 hover:border-sky-300 text-text-secondary'
                        : 'hover:border-sky-300 text-text-secondary'
                    : isSelected
                      ? 'border-pink-500 bg-pink-50/80 text-pink-700 shadow-xs scale-[1.01]'
                      : isGenderInvalid
                        ? 'border-error/40 hover:border-pink-300 text-text-secondary'
                        : 'hover:border-pink-300 text-text-secondary'

                return (
                  <label
                    key={v}
                    className={`flex-1 flex items-center justify-center gap-2 p-3.5 border-2 border-border-main rounded-2xl cursor-pointer transition-all duration-200 text-xs font-extrabold active:scale-[0.98] ${themeClasses}`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={v}
                      checked={gender === v}
                      aria-invalid={isGenderInvalid}
                      aria-describedby={isGenderInvalid ? 'pet-gender-error' : undefined}
                      onChange={() => setGender(v)}
                      className="sr-only"
                    />
                    {l}
                  </label>
                )
              })}
            </div>
            {isGenderInvalid && (
              <p id="pet-gender-error" role="alert" className="text-2xs font-bold text-error animate-fadeIn">
                Lütfen can dostunuzun cinsiyetini seçin.
              </p>
            )}
          </div>

          {/* Doğum Tarihi / Yaş */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-0.5">
              <label className="text-xs font-extrabold text-text-primary">Doğum Tarihi / Yaş *</label>
              <p className="text-2xs text-text-secondary">
                Tam doğum tarihini seçebilir veya yaklaşık yaşını girebilirsiniz.
              </p>
            </div>

            {/* Sekme Seçici (Exact vs Approximate) */}
            <div className="flex border-b border-border-main mb-1">
              <button
                type="button"
                onClick={() => {
                  setBirthDateMode('exact')
                  setBirthDate('')
                  setApproxYears('')
                }}
                className={`flex-1 pb-2 text-center text-xs font-bold transition-all relative cursor-pointer ${
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
                }}
                className={`flex-1 pb-2 text-center text-xs font-bold transition-all relative cursor-pointer ${
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
                  id="pet-birthdate-input"
                  type="date"
                  value={birthDate}
                  max={new Date().toISOString().split('T')[0]}
                  data-testid="pet-birthdate-input"
                  aria-invalid={isBirthDateInvalid}
                  aria-describedby={isBirthDateInvalid ? 'pet-birthdate-error' : undefined}
                  className={`input-base w-full animate-scaleIn text-sm font-semibold rounded-2xl transition-all ${
                    isBirthDateInvalid ? 'border-error focus:border-error focus:ring-error/20 bg-rose-50/20' : ''
                  }`}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2 animate-scaleIn">
                <StepperInput
                  min={0}
                  max={30}
                  step={1}
                  unit="Yaş"
                  placeholder="Yaş (Örn: 1)"
                  value={approxYears}
                  onChange={(e) => handleApproxChange(e.target.value)}
                  className={`w-full h-12 !rounded-2xl bg-surface ${
                    isBirthDateInvalid ? 'border-2 border-error' : 'border-primary/20'
                  }`}
                />
                {approxYears === '0' && (
                  <p className="text-2xs text-text-secondary font-medium">
                    0 yaş seçildiğinde yavru (yaklaşık 6 aylık) olarak kabul edilir.
                  </p>
                )}
              </div>
            )}

            {isBirthDateInvalid && (
              <p id="pet-birthdate-error" role="alert" className="text-2xs font-bold text-error animate-fadeIn">
                Lütfen can dostunuzun doğum tarihini veya yaklaşık yaşını belirtin.
              </p>
            )}

            {birthDate && (
              <div className="text-xs font-bold text-primary bg-primary-soft/40 px-3.5 py-2 rounded-xl border border-primary/20 mt-0.5 animate-scaleIn flex items-center gap-2">
                <Sparkles size={15} className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>
                  Hesaplanan Yaş: <strong>{calcAge(birthDate).text}</strong> (
                  {calcAge(birthDate).label})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Kısırlaştırılma Durumu */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-extrabold text-text-primary">Kısırlaştırılma Durumu</label>
          <label className="flex items-center justify-between gap-2 p-3.5 border-2 border-border-main rounded-2xl cursor-pointer hover:border-primary/50 transition-all text-xs font-bold text-text-secondary has-[:checked]:border-primary has-[:checked]:bg-primary-soft/30 group active:scale-[0.99]">
            <div className="flex items-center gap-2">
              <Scissors size={16} className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              <span className="group-has-[:checked]:text-primary font-bold">Kısırlaştırıldı</span>
            </div>
            <input
              type="checkbox"
              checked={isNeutered}
              onChange={(e) => setIsNeutered(e.target.checked)}
              className="w-5 h-5 text-primary focus:ring-primary rounded-md border-border-main bg-white cursor-pointer"
            />
          </label>
        </div>

        {/* Fiziksel Mezüra / Ruler Picker (Kilo & Boy) */}
        <div className="flex flex-col gap-3.5 mt-1">
          {/* Tab Seçimi (Kilo vs Boy) */}
          <div className="flex items-center justify-between gap-2 border-b border-border-main pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveMeasureTab('weight')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMeasureTab === 'weight'
                    ? 'bg-primary text-white shadow-xs scale-[1.01]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Scale size={15} className="w-4 h-4 text-inherit" aria-hidden="true" />
                <span>Kilo (kg) *</span>
                {weight && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-2xs font-medium">
                    {weight} kg
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveMeasureTab('height')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMeasureTab === 'height'
                    ? 'bg-primary text-white shadow-xs scale-[1.01]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <RulerIcon width={15} height={15} className="w-4 h-4 text-inherit" aria-hidden="true" />
                <span>Boy (cm)</span>
                <span className="text-2xs opacity-80">(Opsiyonel)</span>
                {height && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-2xs font-medium">
                    {height} cm
                  </span>
                )}
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
              value={weight ? parseFloat(weight) : species === 'cat' ? 4.0 : 10.0}
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
              value={height ? parseFloat(height) : species === 'cat' ? 25 : 45}
              onChange={(val) => setHeight(String(val))}
              presets={species === 'cat' ? [20, 25, 30, 35] : [30, 45, 60, 80]}
            />
          )}

          {isWeightInvalid && (
            <p id="pet-weight-error" role="alert" className="text-2xs font-bold text-error animate-fadeIn">
              Lütfen can dostunuzun kilosunu girin.
            </p>
          )}
        </div>

        <div className="flex justify-end mt-2 pt-5 border-t border-border-main">
          <button
            type="submit"
            data-testid="pet-save-button"
            className="btn-primary min-w-[180px] w-full sm:w-auto py-3.5 text-sm sm:text-base shadow-md shadow-primary/20 hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-bold cursor-pointer rounded-2xl"
          >
            <span>Devam Et</span>
            <ChevronRight size={18} className="w-4.5 h-4.5" aria-hidden="true" />
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Live Camera Modal ──────────────────────────────────────────────
function CameraModal({
  onCapture,
  onClose,
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
          video: { facingMode: 'environment' },
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
        stream.getTracks().forEach((track) => track.stop())
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
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
            onCapture(file)
            if (stream) {
              stream.getTracks().forEach((track) => track.stop())
            }
            onClose()
          }
        },
        'image/jpeg',
        0.9
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl p-5 max-w-md w-full flex flex-col gap-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Camera size={20} className="w-5 h-5 text-primary" aria-hidden="true" />
            <h3 className="text-base font-extrabold text-text-primary">Fotoğraf Çek</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              if (stream) stream.getTracks().forEach((t) => t.stop())
              onClose()
            }}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
          >
            <X size={16} className="w-4 h-4 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        {error ? (
          <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs text-center font-bold">
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
              if (stream) stream.getTracks().forEach((t) => t.stop())
              onClose()
            }}
            className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-colors cursor-pointer"
          >
            İptal
          </button>
          {!error && (
            <button
              type="button"
              onClick={takePhoto}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-extrabold text-xs shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Camera size={16} className="w-4 h-4 text-white" aria-hidden="true" />
              Fotoğrafı Çek
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
  submitError,
}: PetPhotoStepProps) {
  const [activeCameraTarget, setActiveCameraTarget] = useState<'profile' | 'cover' | null>(null)

  const defaultAvatar =
    species === 'cat' ? (
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
    <div className="flex flex-col w-full mx-auto pb-8 animate-fadeIn">
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
      <div className="flex items-center gap-3.5 mb-6 border-b border-border-main pb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Geri"
          className="w-10 h-10 rounded-full border border-border-main bg-surface flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/30 transition-all duration-200 active:scale-[0.95] cursor-pointer shrink-0"
        >
          <ArrowLeft size={18} className="w-4.5 h-4.5" aria-hidden="true" />
        </button>
        <div className="flex flex-col flex-1">
          <h1 className="text-xl font-extrabold text-text-primary tracking-tight">Fotoğraf Ekle</h1>
          <p className="text-xs text-text-secondary font-medium">
            {petName} dostumuz için profil ve kapak fotoğrafı seçebilir veya varsayılan avatarla devam edebilirsiniz.
          </p>
        </div>
      </div>

      <div className="card-base p-6 sm:p-8 flex flex-col gap-7 rounded-3xl">
        {submitError && (
          <div
            role="alert"
            aria-live="assertive"
            className="w-full p-3.5 bg-error/10 text-error text-xs font-bold rounded-2xl border border-error/20 flex items-center gap-2"
          >
            <AlertTriangle size={16} className="w-4 h-4 text-error shrink-0" aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        )}

        {/* SECTION 1: PROFIL FOTOĞRAFI */}
        <div className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-slate-50/60 border border-slate-200/80 w-full text-center">
          <div className="flex items-center justify-between w-full border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <Camera size={16} className="w-4 h-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-extrabold text-text-primary">Profil Fotoğrafı</span>
            </div>
            {hasPhoto ? (
              <span className="text-2xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                <Check size={13} className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" /> Seçildi
              </span>
            ) : (
              <span className="text-2xs font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-700">
                Önerilen
              </span>
            )}
          </div>

          <div
            className={`relative w-[140px] h-[140px] rounded-3xl bg-gradient-to-br ${gradientClass} border-2 border-dashed flex items-center justify-center overflow-hidden shadow-xs group transition-all duration-300 hover:scale-[1.02]`}
          >
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Profil Önizleme"
                className="w-full h-full object-cover animate-scaleIn"
              />
            ) : (
              <div className="w-[95px] h-[95px] flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                {defaultAvatar}
              </div>
            )}

            {!photoPreview && (
              <div className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-text-secondary group-hover:text-primary transition-all">
                <Camera size={15} className="w-4 h-4" aria-hidden="true" />
              </div>
            )}
          </div>

          {/* DUAL ACTION BUTTONS: FOTOĞRAF SEÇ & FOTOĞRAF ÇEK */}
          <div className="flex flex-wrap gap-2.5 justify-center items-center">
            {/* Galeriden Seç */}
            <label
              className={`text-xs font-bold px-4 py-2.5 rounded-full cursor-pointer transition-all duration-200 ${bgSoftClass} active:scale-[0.97] inline-flex items-center gap-1.5 shadow-2xs`}
            >
              <Upload size={15} className="w-4 h-4" aria-hidden="true" />
              <span>{photoPreview ? 'Galeriden Değiştir' : 'Fotoğraf Seç'}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                data-testid="pet-photo-input"
                onChange={(e) => {
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
              className="text-xs font-bold px-4 py-2.5 rounded-full cursor-pointer transition-all duration-200 bg-primary/10 hover:bg-primary/20 text-primary active:scale-[0.97] inline-flex items-center gap-1.5 shadow-2xs"
              data-testid="pet-photo-camera-button"
            >
              <Camera size={15} className="w-4 h-4 text-primary" aria-hidden="true" />
              <span>Fotoğraf Çek</span>
            </button>

            {photoPreview && (
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null)
                  setPhotoPreview('')
                }}
                className="text-xs font-bold px-3.5 py-2.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 transition-all active:scale-[0.97] inline-flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={13} className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Kaldır</span>
              </button>
            )}
          </div>

          {!hasPhoto && (
            <p className="text-2xs text-text-secondary font-medium mt-0.5">
              Fotoğraf eklemezseniz sevimli varsayılan avatarımız kullanılacaktır.
            </p>
          )}
        </div>

        {/* SECTION 2: KAPAK FOTOĞRAFI (OPSİYONEL) */}
        <div className="flex flex-col gap-4 p-5 rounded-3xl bg-slate-50/60 border border-slate-200/80 w-full">
          <div className="flex items-center justify-between w-full border-b border-slate-200/60 pb-3">
            <div className="flex items-center gap-2">
              <ImageIcon size={16} className="w-4 h-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-extrabold text-text-primary">Kapak Fotoğrafı</span>
            </div>
            <span className="text-2xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
              Opsiyonel
            </span>
          </div>

          <div className="relative w-full h-[140px] sm:h-[160px] rounded-2xl border-2 border-dashed border-slate-300 bg-white overflow-hidden flex items-center justify-center transition-all hover:border-primary/50 group">
            {coverPreview ? (
              <img src={coverPreview} alt="Kapak Önizleme" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center p-4 text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary-soft/40 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <ImageIcon size={20} className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <p className="text-xs font-bold text-text-primary">Kapak Fotoğrafı Yükle</p>
                <p className="text-2xs text-text-secondary">
                  Göz alıcı bir arka plan görseli ekleyebilirsiniz.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5 items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              {/* Galeriden Kapak Seç */}
              <label className="text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 cursor-pointer transition-all active:scale-[0.97] inline-flex items-center gap-1.5">
                <Upload size={14} className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{coverPreview ? 'Galeriden Değiştir' : 'Fotoğraf Seç'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  data-testid="pet-cover-input"
                  onChange={(e) => {
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
                className="text-xs font-bold px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary cursor-pointer transition-all active:scale-[0.97] inline-flex items-center gap-1.5"
                data-testid="pet-cover-camera-button"
              >
                <Camera size={14} className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
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
                className="text-xs font-bold px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-all cursor-pointer"
              >
                Kaldır
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Tip Card */}
        <div className="w-full border border-primary/10 bg-primary-soft/20 rounded-2xl p-4 flex gap-3 text-left items-center">
          <Info size={18} className="w-4.5 h-4.5 text-primary shrink-0" aria-hidden="true" />
          <p className="text-xs text-text-secondary leading-relaxed">
            Fotoğraf yükleyebilir veya varsayılan avatar ile kaydınızı anında tamamlayabilirsiniz.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-3.5 pt-4 border-t border-border-main">
          <button
            type="button"
            onClick={onBack}
            className="text-xs sm:text-sm font-bold text-text-secondary hover:text-text-primary px-4 py-2 transition-colors order-2 sm:order-1 cursor-pointer"
          >
            ← Geri
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            data-testid="pet-profile-create-button"
            className="btn-primary min-w-[200px] py-3.5 text-sm sm:text-base shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none hover:-translate-y-0.5 active:scale-[0.98] transition-transform w-full sm:w-auto order-1 sm:order-2 cursor-pointer font-bold rounded-2xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 size={18} className="w-4.5 h-4.5 animate-spin" aria-hidden="true" />
                Oluşturuluyor...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <span>{hasPhoto ? 'Kaydet ve Devam Et' : 'Varsayılan Avatarla Devam Et'}</span>
                <ChevronRight size={18} className="w-4.5 h-4.5" aria-hidden="true" />
              </span>
            )}
          </button>
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
  submitError,
}: PetSOSStepProps) {
  const [availableContacts, setAvailableContacts] = useState<
    { name: string; phone: string; relation: string }[]
  >([])
  const [touchedPhones, setTouchedPhones] = useState([false, false])
  const [showValidation, setShowValidation] = useState(false)
  const [isCustomizing, setIsCustomizing] = useState(false)

  useEffect(() => {
    async function loadContacts() {
      try {
        const res = await fetch('/api/owner/emergency-contacts')
        if (res.ok) {
          const data = await res.json()
          if (data.c1?.name || data.c1?.phone || data.c2?.name) {
            const loaded = [
              { name: data.c1?.name || '', phone: data.c1?.phone || '', relation: 'Sahibi' },
              {
                name: data.c2?.name || '',
                phone: data.c2?.phone || '',
                relation: data.c2?.relation || '',
              },
            ]
            setSosContacts(loaded)
            setAvailableContacts(loaded.filter((c) => c.name && c.phone))
          }
        }
      } catch (err) {
        console.error('Kişileri yükleme hatası:', err)
      }
    }
    if (!sosContacts[0]?.name || !sosContacts[0]?.phone) {
      loadContacts()
    }
  }, [])

  const c1HasPhone = isTurkishMobilePhone(sosContacts[0]?.phone || '')
  const c1HasName = !!sosContacts[0]?.name?.trim()
  const c2HasPhone = isTurkishMobilePhone(sosContacts[1]?.phone || '')
  const c2HasName = !!sosContacts[1]?.name?.trim()
  const c2HasRelation = !!sosContacts[1]?.relation?.trim()

  const hasBothContacts = c1HasName && c1HasPhone && c2HasName && c2HasPhone && c2HasRelation

  const primaryNameMissing = !sosContacts[0]?.name?.trim()
  const primaryRelationMissing = !sosContacts[0]?.relation?.trim()
  const primaryPhoneInvalid = !isTurkishMobilePhone(sosContacts[0]?.phone || '')
  const secondaryHasData = !!(
    sosContacts[1]?.name?.trim() ||
    sosContacts[1]?.phone?.trim() ||
    sosContacts[1]?.relation?.trim()
  )
  const secondaryNameMissing = secondaryHasData && !sosContacts[1]?.name?.trim()
  const secondaryRelationMissing = secondaryHasData && !sosContacts[1]?.relation?.trim()
  const secondaryPhoneInvalid =
    secondaryHasData && !isTurkishMobilePhone(sosContacts[1]?.phone || '')

  const isSameContact =
    secondaryHasData &&
    sosContacts[0]?.phone &&
    sosContacts[1]?.phone &&
    sosContacts[0].phone.replace(/\D/g, '') === sosContacts[1].phone.replace(/\D/g, '') &&
    sosContacts[0]?.name &&
    sosContacts[1]?.name &&
    sosContacts[0].name.trim().toLowerCase() === sosContacts[1].name.trim().toLowerCase()

  const handleSave = () => {
    setShowValidation(true)

    if (
      primaryNameMissing ||
      primaryPhoneInvalid ||
      primaryRelationMissing ||
      secondaryNameMissing ||
      secondaryPhoneInvalid ||
      secondaryRelationMissing ||
      isSameContact
    ) {
      return
    }

    onSubmit()
  }

  if (hasBothContacts && !isCustomizing) {
    return (
      <div className="flex flex-col w-full mx-auto pb-8 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6 border-b border-border-main pb-4">
          <div className="flex flex-col flex-1">
            <h1 className="text-xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
              <span>Acil Durum Ağı</span>
              <Siren size={20} className="w-5 h-5 text-error shrink-0" aria-hidden="true" />
            </h1>
            <p className="text-xs text-text-secondary font-medium">
              Profilinizdeki kayıtlı acil iletişim ağı otomatik algılandı.
            </p>
          </div>
        </div>

        <div className="card-base p-6 sm:p-8 flex flex-col gap-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-violet-50/40 via-white to-amber-50/30 shadow-md">
          {submitError && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-3.5 bg-error/10 text-error text-xs font-bold rounded-2xl border border-error/20 flex items-center gap-2"
            >
              <AlertTriangle size={16} className="w-4 h-4 text-error shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex items-center gap-3.5 p-4.5 bg-white/90 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
              <Check size={20} className="w-5 h-5 text-emerald-700" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-text-primary">
                Kayıtlı Acil Durum İletişim Ağınız Yüklendi
              </h2>
              <p className="text-xs text-text-secondary font-medium">
                Profilinizdeki rehber {petName} dostunuz için hazır.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/80 flex flex-col gap-1 shadow-2xs">
              <span className="text-2xs font-extrabold text-error uppercase tracking-wider">
                1. Birincil Bağlantı
              </span>
              <p className="text-sm font-bold text-text-primary">{sosContacts[0].name}</p>
              <p className="text-xs font-medium text-text-secondary">
                {sosContacts[0].phone} •{' '}
                <span className="font-semibold text-error">Sahibi</span>
              </p>
            </div>

            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/80 flex flex-col gap-1 shadow-2xs">
              <span className="text-2xs font-extrabold text-primary uppercase tracking-wider">
                2. Yedek Bağlantı
              </span>
              <p className="text-sm font-bold text-text-primary">{sosContacts[1].name}</p>
              <p className="text-xs font-medium text-text-secondary">
                {sosContacts[1].phone} •{' '}
                <span className="font-semibold text-primary">
                  {sosContacts[1].relation || 'Yedek'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center w-full gap-3 pt-2">
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              data-testid="emergency-contact-one-click-confirm-button"
              className="btn-primary w-full py-4 text-base shadow-md shadow-primary/20 flex items-center justify-center gap-2 font-extrabold rounded-2xl active:scale-[0.98] cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <Loader2 size={18} className="w-4.5 h-4.5 animate-spin" aria-hidden="true" />
                  Kaydediliyor...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>Bu Bilgilerle Devam Et</span>
                  <Check size={18} className="w-5 h-5 text-white" aria-hidden="true" />
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsCustomizing(true)}
              className="text-xs font-bold text-text-secondary hover:text-primary transition-colors underline underline-offset-4 py-1 cursor-pointer"
            >
              Kişileri Bu Pet İçin Düzenle / Değiştir
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full mx-auto pb-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-6 border-b border-border-main pb-4">
        <div className="flex flex-col flex-1">
          <h1 className="text-xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
            <span>Acil Durum Ağı</span>
            <Siren size={20} className="w-5 h-5 text-error shrink-0" aria-hidden="true" />
          </h1>
          <p className="text-xs text-text-secondary font-medium">
            Evcil dostunuza bir şey olursa kiminle iletişime geçelim? (Birincil kişi zorunludur)
          </p>
        </div>
      </div>

      <div className="card-base p-6 sm:p-8 flex flex-col gap-6 rounded-3xl">
        <p className="text-xs sm:text-sm text-text-secondary mb-1">
          Acil durumda aranacak kişiyi şimdi eklemek zorunda değilsiniz. Bu bilgiyi daha sonra sağlık güvenliği kartından da tamamlayabilirsiniz.
        </p>

        {submitError && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3.5 bg-error/10 text-error text-xs font-bold rounded-2xl border border-error/20 flex items-center gap-2"
          >
            <AlertTriangle size={16} className="w-4 h-4 text-error shrink-0" aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 p-5 bg-error/[0.02] rounded-2xl border border-error/15 hover:border-error/30 transition-colors">
            <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
              <p className="text-2xs font-extrabold text-error uppercase tracking-widest">
                Kişi 1 (Birincil) *
              </p>

              <div className="flex items-center gap-1.5">
                <span className="text-2xs font-bold text-primary">Kişilerimden Seç:</span>
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
                  className="text-2xs font-bold py-1 px-2 border border-primary/20 rounded-lg bg-primary-soft/30 text-primary focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  defaultValue=""
                  disabled={availableContacts.length === 0}
                >
                  {availableContacts.length === 0 ? (
                    <option value="" disabled>
                      Kayıtlı kişi yok
                    </option>
                  ) : (
                    <>
                      <option value="" disabled>
                        Seçiniz
                      </option>
                      {availableContacts.map((c, i) => (
                        <option key={i} value={i}>
                          {c.name} ({c.relation})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary">Ad Soyad *</label>
              <input
                type="text"
                className={`input-base text-sm py-3 px-4 bg-white rounded-xl ${
                  showValidation && primaryNameMissing
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : ''
                }`}
                placeholder="Örn: Ali Yılmaz"
                value={sosContacts[0]?.name || ''}
                data-testid="emergency-contact-name-input"
                aria-invalid={showValidation && primaryNameMissing}
                onChange={(e) => {
                  const nc = [...sosContacts]
                  nc[0] = { ...nc[0], name: e.target.value }
                  setSosContacts(nc)
                }}
                required
              />
              {showValidation && primaryNameMissing && (
                <p role="alert" className="text-2xs font-bold text-error">
                  Ad soyad zorunludur.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary">Telefon *</label>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={14}
                className={`input-base text-sm py-3 px-4 bg-white rounded-xl ${
                  (touchedPhones[0] || showValidation) && primaryPhoneInvalid
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : ''
                }`}
                placeholder="05XX XXX XX XX"
                value={sosContacts[0]?.phone || ''}
                data-testid="emergency-contact-phone-input"
                aria-invalid={(touchedPhones[0] || showValidation) && primaryPhoneInvalid}
                aria-describedby="primary-phone-hint primary-phone-error"
                onBlur={() => setTouchedPhones((current) => [true, current[1]])}
                onChange={(e) => {
                  const nc = [...sosContacts]
                  nc[0] = {
                    ...nc[0],
                    phone: formatTurkishMobileInput(e.target.value),
                    relation: 'Sahibi',
                  }
                  setSosContacts(nc)
                }}
                required
              />
              <p id="primary-phone-hint" className="text-2xs text-text-secondary">
                Türkiye cep telefonu numarası girin.
              </p>
              {(touchedPhones[0] || showValidation) && primaryPhoneInvalid && (
                <p id="primary-phone-error" role="alert" className="text-2xs font-bold text-error">
                  Geçerli bir cep telefonu numarası girin: 05XX XXX XX XX
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary">Yakınlık *</label>
              <input
                type="text"
                readOnly
                disabled
                className="input-base text-sm py-3 px-4 bg-gray-100/80 text-text-secondary font-semibold cursor-not-allowed border-border-main rounded-xl"
                value="Sahibi"
                data-testid="emergency-contact-relation-input"
              />
            </div>
          </div>

          {showValidation && isSameContact && (
            <div
              role="alert"
              className="p-3 bg-error/10 text-error text-xs font-bold rounded-2xl border border-error/20 flex items-center gap-1.5"
            >
              <AlertTriangle size={16} className="w-4 h-4 text-error shrink-0" aria-hidden="true" />
              <span>Birincil kişi ile Yedek bağlantı kişisi aynı kişi olamaz. Lütfen farklı bir yedek kişi girin.</span>
            </div>
          )}

          <div className="flex flex-col gap-3 p-5 bg-bg-main rounded-2xl border border-border-main hover:border-text-secondary/30 transition-colors">
            <div className="flex justify-between items-center flex-wrap gap-2 mb-1">
              <p className="text-2xs font-extrabold text-text-secondary uppercase tracking-widest">
                Kişi 2 (Yedek Bağlantı)
              </p>

              <div className="flex items-center gap-1.5">
                <span className="text-2xs font-bold text-primary">Kişilerimden Seç:</span>
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
                  className="text-2xs font-bold py-1 px-2 border border-primary/20 rounded-lg bg-primary-soft/30 text-primary focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  defaultValue=""
                  disabled={availableContacts.length === 0}
                >
                  {availableContacts.length === 0 ? (
                    <option value="" disabled>
                      Kayıtlı kişi yok
                    </option>
                  ) : (
                    <>
                      <option value="" disabled>
                        Seçiniz
                      </option>
                      {availableContacts.map((c, i) => (
                        <option key={i} value={i}>
                          {c.name} ({c.relation})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary">Ad Soyad</label>
              <input
                type="text"
                className={`input-base text-sm py-3 px-4 bg-white rounded-xl ${
                  showValidation && secondaryNameMissing
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : ''
                }`}
                placeholder="Örn: Ayşe Yılmaz"
                value={sosContacts[1]?.name || ''}
                aria-invalid={showValidation && secondaryNameMissing}
                onChange={(e) => {
                  const nc = [...sosContacts]
                  nc[1] = { ...nc[1], name: e.target.value }
                  setSosContacts(nc)
                }}
              />
              {showValidation && secondaryNameMissing && (
                <p role="alert" className="text-2xs font-bold text-error">
                  Yedek kişi için ad soyad girin.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary">Telefon</label>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={14}
                className={`input-base text-sm py-3 px-4 bg-white rounded-xl ${
                  (touchedPhones[1] || showValidation) && secondaryPhoneInvalid
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : ''
                }`}
                placeholder="05XX XXX XX XX"
                value={sosContacts[1]?.phone || ''}
                aria-invalid={(touchedPhones[1] || showValidation) && secondaryPhoneInvalid}
                aria-describedby="secondary-phone-hint secondary-phone-error"
                onBlur={() => setTouchedPhones((current) => [current[0], true])}
                onChange={(e) => {
                  const nc = [...sosContacts]
                  nc[1] = { ...nc[1], phone: formatTurkishMobileInput(e.target.value) }
                  setSosContacts(nc)
                }}
              />
              <p id="secondary-phone-hint" className="text-2xs text-text-secondary">
                İsteğe bağlı Türkiye cep telefonu numarası.
              </p>
              {(touchedPhones[1] || showValidation) && secondaryPhoneInvalid && (
                <p
                  id="secondary-phone-error"
                  role="alert"
                  className="text-2xs font-bold text-error"
                >
                  Geçerli bir cep telefonu numarası girin: 05XX XXX XX XX
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-secondary">Yakınlık</label>
              <select
                className={`input-base text-sm py-3 px-4 bg-white rounded-xl ${
                  showValidation && secondaryRelationMissing
                    ? 'border-error focus:border-error focus:ring-error/20'
                    : ''
                }`}
                value={sosContacts[1]?.relation || ''}
                aria-invalid={showValidation && secondaryRelationMissing}
                onChange={(e) => {
                  const nc = [...sosContacts]
                  nc[1] = { ...nc[1], relation: e.target.value }
                  setSosContacts(nc)
                }}
              >
                <option value="" disabled>
                  Seçiniz
                </option>
                <option value="Sahibi">Sahibi</option>
                <option value="Aile Üyesi">Aile Üyesi</option>
                <option value="Eşi / Partneri">Eşi / Partneri</option>
                <option value="Komşu">Komşu</option>
                <option value="Arkadaş / Yakın">Arkadaş / Yakın</option>
                <option value="Evcil Hayvan Bakıcısı">Evcil Hayvan Bakıcısı</option>
                <option value="Veteriner Hekim">Veteriner Hekim</option>
                <option value="Diğer">Diğer</option>
                {sosContacts[1]?.relation &&
                  ![
                    'Sahibi',
                    'Aile Üyesi',
                    'Eşi / Partneri',
                    'Komşu',
                    'Arkadaş / Yakın',
                    'Evcil Hayvan Bakıcısı',
                    'Veteriner Hekim',
                    'Diğer',
                  ].includes(sosContacts[1].relation) && (
                    <option value={sosContacts[1].relation}>{sosContacts[1].relation}</option>
                  )}
              </select>
              {showValidation && secondaryRelationMissing && (
                <p role="alert" className="text-2xs font-bold text-error">
                  Yedek kişi için yakınlık seçin.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center w-full gap-2 mt-4 pt-5 border-t border-border-main">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            data-testid="emergency-contact-save-button"
            className="btn-primary min-w-[200px] w-full sm:w-auto py-3.5 text-sm sm:text-base shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none rounded-2xl active:scale-[0.98] cursor-pointer font-bold"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 size={18} className="w-4.5 h-4.5 animate-spin" aria-hidden="true" />
                Kaydediliyor...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <span>Kaydet ve Tamamla</span>
                <Check size={16} className="w-4 h-4 text-white" aria-hidden="true" />
              </span>
            )}
          </button>

          <button
            type="button"
            data-testid="emergency-contact-skip-button"
            onClick={() => onSkip()}
            className="w-full mt-2 py-2 text-xs sm:text-sm text-text-secondary hover:text-text-primary underline underline-offset-4 cursor-pointer transition-colors"
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
  { id: 3, label: 'Fotoğraf' },
  { id: 4, label: 'Acil Durum Ağı' },
  { id: 5, label: 'Bildirim Onayı' },
  { id: 6, label: 'Sağlık Geçmişi' },
]

const WIZARD_TOTAL_STEPS = WIZARD_STEPS.length

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
  const [weight, setWeight] = useState('4')
  const [height, setHeight] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [createdPetId, setCreatedPetId] = useState<string | null>(null)
  const [sosContacts, setSosContacts] = useState([
    { name: '', phone: '', relation: 'Sahibi' },
    { name: '', phone: '', relation: '' },
  ])
  const [sosLoading, setSosLoading] = useState(false)

  useEffect(() => {
    async function loadOwnerProfile() {
      try {
        const res = await fetch('/api/owner/emergency-contacts')
        if (res.ok) {
          const data = await res.json()
          if (data.c1 || data.c2) {
            setSosContacts([
              { name: data.c1?.name || '', phone: data.c1?.phone || '', relation: 'Sahibi' },
              {
                name: data.c2?.name || '',
                phone: data.c2?.phone || '',
                relation: data.c2?.relation || '',
              },
            ])
          }
        }
      } catch (err) {
        console.error('Error fetching owner emergency contacts in AddPetPage:', err)
      }
    }
    loadOwnerProfile()
  }, [])

  const handleSpeciesSelect = (species: Species) => {
    setSelectedSpecies(species)
    if (!weight) {
      setWeight(species === 'cat' ? '4' : '10')
    }
    setStep(2)
  }

  const handleStep2Next = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')

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
        // HTTP HTML response
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
        .filter((c) => c.name || c.phone)
        .map((contact) => ({
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

  const handleSosSkip = () => {
    if (createdPetId) router.replace(getSuccessUrl(createdPetId))
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-8">
      {/* Wizard Header & Stepper Bar */}
      <div
        data-testid="wizard-step-indicator"
        className="w-full flex flex-col gap-2.5 mb-2 mt-2 px-1"
      >
        {/* Top Progress & Active Title Bar */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-primary uppercase tracking-wider">
            Adım {step} / {WIZARD_TOTAL_STEPS} •{' '}
            {WIZARD_STEPS.find((s) => s.id === step)?.label || ''}
          </span>
          <span className="text-2xs font-extrabold text-text-tertiary bg-surface-2 px-2.5 py-0.5 rounded-full border border-border/40">
            %{Math.round((step / WIZARD_TOTAL_STEPS) * 100)} Tamamlandı
          </span>
        </div>

        {/* Dynamic Gradient Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-border-main/50">
          <div
            className="bg-gradient-to-r from-primary via-indigo-600 to-primary h-full rounded-full transition-all duration-500 shadow-2xs"
            style={{ width: `${(step / WIZARD_TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Step Pills for Desktop / Larger Screens */}
        <div className="hidden sm:flex items-center justify-between gap-2 pt-1">
          {WIZARD_STEPS.slice(0, 4).map((s) => {
            const isCurrent = step === s.id
            const isCompleted = step > s.id
            return (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all duration-300 w-full justify-center ${
                    isCurrent
                      ? 'bg-primary-soft/50 border-primary text-primary scale-[1.02] shadow-2xs'
                      : isCompleted
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-surface border-border-main text-text-secondary'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-2xs font-extrabold ${
                      isCurrent
                        ? 'bg-primary text-white'
                        : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-text-secondary'
                    }`}
                  >
                    {isCompleted ? (
                      <Check size={12} className="w-3 h-3 text-white" aria-hidden="true" />
                    ) : (
                      s.id
                    )}
                  </div>
                  <span className="truncate">{s.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {step === 1 && (
        <SpeciesSelector onSelect={handleSpeciesSelect} onBack={() => router.back()} />
      )}

      {step === 2 && selectedSpecies && (
        <PetForm
          species={selectedSpecies}
          onBack={() => {
            setSelectedSpecies(null)
            setStep(1)
          }}
          petName={petName}
          setPetName={setPetName}
          selectedBreed={selectedBreed}
          setSelectedBreed={setSelectedBreed}
          gender={gender}
          setGender={setGender}
          birthDateMode={birthDateMode}
          setBirthDateMode={setBirthDateMode}
          birthDate={birthDate}
          setBirthDate={setBirthDate}
          approxYears={approxYears}
          setApproxYears={setApproxYears}
          approxMonths={approxMonths}
          setApproxMonths={setApproxMonths}
          isNeutered={isNeutered}
          setIsNeutered={setIsNeutered}
          weight={weight}
          setWeight={setWeight}
          height={height}
          setHeight={setHeight}
          onSubmit={handleStep2Next}
          submitError={submitError}
        />
      )}

      {step === 3 && selectedSpecies && (
        <PetPhotoStep
          species={selectedSpecies}
          petName={petName}
          photoPreview={photoPreview}
          setPhotoPreview={setPhotoPreview}
          photoFile={photoFile}
          setPhotoFile={setPhotoFile}
          coverPreview={coverPreview}
          setCoverPreview={setCoverPreview}
          coverFile={coverFile}
          setCoverFile={setCoverFile}
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

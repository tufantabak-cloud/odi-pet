'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { calcAge } from '@/lib/pets/utils'
import { DefaultCatAvatar, DefaultDogAvatar } from '@/components/icons/PetIcons'
import { StepperInput } from '@/components/ui/StepperInput'
// ── Irk Listeleri ──────────────────────────────────────────────
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
            avatar: <DefaultCatAvatar width={90} height={90} />,
            label: 'Kedi',
            desc: 'Bağımsız, zarif',
            gradient: 'from-violet-50 to-purple-50',
            border: 'hover:border-violet-400',
            badge: 'bg-violet-100 text-violet-700',
          },
          {
            species: 'dog' as Species,
            avatar: <DefaultDogAvatar width={90} height={90} />,
            label: 'Köpek',
            desc: 'Sadık, enerjik',
            gradient: 'from-amber-50 to-orange-50',
            border: 'hover:border-amber-400',
            badge: 'bg-amber-100 text-amber-700',
          },
        ]).map(({ species, avatar, label, desc, gradient, border, badge }) => (
          <button
            key={species}
            onClick={() => onSelect(species)}
            data-testid={species === 'cat' ? 'pet-species-cat-button' : 'pet-species-dog-button'}
            className={`flex flex-col items-center gap-4 p-6 sm:p-8 rounded-[24px] border-2 border-border-main bg-gradient-to-br ${gradient} ${border} hover:shadow-medium transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] group cursor-pointer`}
          >
            <div className="flex items-center justify-center w-[90px] h-[90px] filter drop-shadow-md group-hover:scale-105 transition-transform duration-300">
              {avatar}
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-[22px] font-extrabold text-text-primary">{label}</span>
              <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${badge}`}>{desc}</span>
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
  onSubmit,
  submitError
}: PetFormProps) {
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

          {/* Irk */}
          <div className="flex flex-col gap-2">
            <label htmlFor="breed" className="text-[13px] font-bold text-text-primary">Irk *</label>
            <div className="relative">
              <select id="breed" value={selectedBreed} onChange={e => setSelectedBreed(e.target.value)} data-testid="pet-breed-select" className="input-base w-full appearance-none cursor-pointer" required>
                <option value="" disabled>Yazmaya başlayın veya seçin</option>
                {breeds.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-text-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Cinsiyet */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-text-primary">Cinsiyet</label>
            <div className="flex gap-2">
              {([['male', '♂ Erkek'], ['female', '♀ Dişi']] as const).map(([v, l]) => (
                <label key={v} className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-border-main rounded-[14px] cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary-soft/30 transition-all text-[13px] font-bold text-text-secondary has-[:checked]:text-primary">
                  <input type="radio" name="gender" value={v} checked={gender === v} onChange={() => setGender(v)} className="sr-only"/>
                  {l}
                </label>
              ))}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-1">
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

          {/* Kilo */}
          <div className="flex flex-col gap-2">
            <label htmlFor="weight" className="text-[13px] font-bold text-text-primary">Kilo *</label>
            <StepperInput 
              id="weight" min={0} max={150} step={0.5} unit="kg"
              value={weight} onChange={e => setWeight(e.target.value)}
              placeholder="Örn: 4.5"
              className="w-full h-14"
              required
            />
          </div>
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

// ── Adım 3: Profil Fotoğrafı Ekleme ────────────────────────────
interface PetPhotoStepProps {
  species: Species
  petName: string
  photoPreview: string
  setPhotoPreview: (p: string) => void
  photoFile: File | null
  setPhotoFile: (f: File | null) => void
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
  onBack,
  onSubmit,
  loading,
  submitError
}: PetPhotoStepProps) {
  const defaultAvatar = species === 'cat' ? (
    <DefaultCatAvatar width={110} height={110} />
  ) : (
    <DefaultDogAvatar width={110} height={110} />
  )

  const isCat = species === 'cat'
  const gradientClass = isCat 
    ? 'from-violet-50 to-purple-50 border-violet-200 hover:border-violet-400' 
    : 'from-amber-50 to-orange-50 border-amber-200 hover:border-amber-400'
  const bgSoftClass = isCat 
    ? 'bg-violet-100 hover:bg-violet-200 text-violet-700' 
    : 'bg-amber-100 hover:bg-amber-200 text-amber-700'

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
          <h1 className="text-[20px] font-extrabold text-text-primary tracking-tight">Profil Fotoğrafı Ekle</h1>
          <p className="text-[12px] text-text-secondary font-medium">{petName} dostumuz için güzel bir fotoğraf seçebilirsiniz.</p>
        </div>
      </div>

      <div className="card-base p-6 sm:p-8 flex flex-col gap-6 items-center">
        {submitError && (
          <div role="alert" aria-live="assertive" className="w-full p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl border border-error/20">
            ⚠️ {submitError}
          </div>
        )}

        <div className="flex flex-col items-center gap-5 my-4 w-full">
          {/* Photo Frame Container */}
          <div className={`relative w-[160px] h-[160px] rounded-[36px] bg-gradient-to-br ${gradientClass} border-2 border-dashed flex items-center justify-center overflow-hidden shadow-md group transition-all duration-300 hover:scale-[1.03]`}>
            {photoPreview ? (
               
              <img src={photoPreview} alt="Önizleme" className="w-full h-full object-cover animate-scaleIn" />
            ) : (
              <div className="w-[110px] h-[110px] flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                {defaultAvatar}
              </div>
            )}
            
            {/* Camera Overlay when no photo */}
            {!photoPreview && (
              <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center text-text-secondary group-hover:text-primary group-hover:scale-110 transition-all">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            )}
          </div>

          {/* Action buttons for selection */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <label className={`text-[13px] font-bold px-5 py-2.5 rounded-full cursor-pointer transition-all duration-200 ${bgSoftClass} active:scale-[0.97] inline-block text-center`}>
              {photoPreview ? 'Fotoğrafı Değiştir' : 'Fotoğraf Seç'}
              <input 
                type="file" 
                accept="image/*" 
                className="sr-only" 
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setPhotoFile(file)
                    setPhotoPreview(URL.createObjectURL(file))
                  }
                }}
              />
            </label>

            {photoPreview && (
              <button 
                type="button"
                onClick={() => {
                  setPhotoFile(null)
                  setPhotoPreview('')
                }}
                className="text-[13px] font-bold px-5 py-2.5 rounded-full bg-gray-100 hover:bg-gray-250 text-text-secondary hover:text-text-primary transition-all active:scale-[0.97]"
              >
                Görseli Kaldır
              </button>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-4 mb-2">
            Fotoğrafı şimdi eklemek zorunda değilsin.
            İstersen varsayılan görselle devam edebilir,
            daha sonra değiştirebilirsin.
          </p>

          <button
            type="button"
            data-testid="pet-photo-default-avatar-button"
            onClick={() => {
              onSubmit();
            }}
            className="w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Varsayılan Görselle Devam Et
          </button>

          <button
            type="button"
            data-testid="pet-photo-skip-button"
            onClick={() => onSubmit()}
            className="w-full mt-1 py-2 text-sm text-gray-400 underline underline-offset-2"
          >
            Daha Sonra Ekle
          </button>
        </div>

        {/* Dynamic Tip Card for Premium Aesthetics */}
        <div className="w-full border border-primary/10 bg-primary-soft/20 rounded-2xl p-4 flex gap-3 text-left">
          <span className="text-[20px] shrink-0">✨</span>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            Dostunuzun fotoğrafı ana panelde, aşı bildirimlerinde ve raporlarda yer alacaktır. Profil kurulumuna devam etmek için lütfen bir fotoğraf seçin.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4 mt-6 pt-6 border-t border-border-main">
          <button 
            type="button" 
            onClick={onBack}
            className="text-[14px] font-bold text-text-secondary hover:text-text-primary px-4 py-2 transition-colors order-2 sm:order-1"
          >
            ← Geri
          </button>
          
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
                    const key = `${c.name.trim().toLowerCase()}-${c.phone.trim()}`
                    if (!seen.has(key)) {
                      seen.add(key)
                      list.push({
                        name: c.name,
                        phone: c.phone,
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

  const isPerson1Valid = !!sosContacts[0]?.name?.trim() && 
                         !!sosContacts[0]?.phone?.trim() && 
                         !!sosContacts[0]?.relation?.trim();

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
                      nc[0] = { name: selected.name, phone: selected.phone, relation: selected.relation }
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
                className="input-base text-[14px] py-3 px-4 bg-white" 
                placeholder="Örn: Ali Yılmaz" 
                value={sosContacts[0]?.name || ''} 
                data-testid="emergency-contact-name-input"
                onChange={e => { const nc = [...sosContacts]; nc[0] = { ...nc[0], name: e.target.value }; setSosContacts(nc); }} 
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">Telefon *</label>
              <input 
                type="tel" 
                className="input-base text-[14px] py-3 px-4 bg-white" 
                placeholder="Örn: 0555 123 4567" 
                value={sosContacts[0]?.phone || ''} 
                data-testid="emergency-contact-phone-input"
                onChange={e => { const nc = [...sosContacts]; nc[0] = { ...nc[0], phone: e.target.value }; setSosContacts(nc); }} 
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">Yakınlık *</label>
              <select 
                className="input-base text-[14px] py-3 px-4 bg-white" 
                value={sosContacts[0]?.relation || ''} 
                data-testid="emergency-contact-relation-select"
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
                      nc[1] = { name: selected.name, phone: selected.phone, relation: selected.relation }
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
                className="input-base text-[14px] py-3 px-4 bg-white" 
                placeholder="Örn: Ayşe Yılmaz" 
                value={sosContacts[1]?.name || ''} 
                onChange={e => { const nc = [...sosContacts]; nc[1] = { ...nc[1], name: e.target.value }; setSosContacts(nc); }} 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">Telefon</label>
              <input 
                type="tel" 
                className="input-base text-[14px] py-3 px-4 bg-white" 
                placeholder="Örn: 0555 987 6543" 
                value={sosContacts[1]?.phone || ''} 
                onChange={e => { const nc = [...sosContacts]; nc[1] = { ...nc[1], phone: e.target.value }; setSosContacts(nc); }} 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-text-secondary">Yakınlık</label>
              <select 
                className="input-base text-[14px] py-3 px-4 bg-white" 
                value={sosContacts[1]?.relation || ''} 
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
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center w-full gap-2 mt-6 pt-6 border-t border-border-main">
          <button
            type="button"
            onClick={onSubmit}
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
  const [isNeutered, setIsNeutered] = useState(false)
  const [weight, setWeight] = useState('')
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
    fd.set('is_neutered', isNeutered.toString())
    if (weight) fd.set('weight', weight)
    try {
      const res = await fetch('/api/pets', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error || 'Kayıt sırasında bir hata oluştu.'); return }
      setCreatedPetId(data.pet.id)
      setStep(4)
    } catch (err: any) {
      setSubmitError('Sunucu bağlantı hatası: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const getSuccessUrl = (id: string) =>
    `/owner/pets/add/success?id=${id}&name=${encodeURIComponent(petName.trim())}&species=${encodeURIComponent(selectedSpecies ?? '')}`

  const handleSosSubmit = async () => {
    if (!createdPetId) return
    setSosLoading(true)
    try {
      await fetch(`/api/pets/${createdPetId}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sos_contacts: sosContacts.filter(c => c.name || c.phone) }),
      })
    } finally {
      setSosLoading(false)
      router.replace(getSuccessUrl(createdPetId))
    }
  }

  const handleSosSkip = () => { if (createdPetId) router.replace(getSuccessUrl(createdPetId)) }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-8">
      <div data-testid="wizard-step-indicator" className="flex items-center justify-center gap-2 sm:gap-4 mb-2 mt-2 flex-wrap">
        {WIZARD_STEPS.map((s) => {
          const isCurrent = step === s.id
          const isCompleted = step > s.id
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] sm:text-[13px] font-bold transition-all duration-300 ${isCurrent ? 'bg-primary-soft/50 border-primary text-primary scale-105 shadow-sm' : isCompleted ? 'bg-green-50 border-green-200 text-green-600' : 'bg-surface border-border-main text-text-secondary'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold ${isCurrent ? 'bg-primary text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 text-text-secondary'}`}>
                  {isCompleted ? '✓' : s.id}
                </div>
                <span>{s.label}</span>
              </div>
              {s.id < 4 && <div className={`h-[2px] w-4 sm:w-8 rounded-full transition-colors duration-300 ${step > s.id ? 'bg-green-300' : 'bg-border-main'}`} />}
            </div>
          )
        })}
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

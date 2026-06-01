'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calcAge } from '@/lib/pets/utils'
import { DefaultCatAvatar, DefaultDogAvatar } from '@/components/icons/PetIcons'
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

type Species = 'Kedi' | 'Köpek'


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
            species: 'Kedi' as Species,
            avatar: <DefaultCatAvatar width={90} height={90} />,
            label: 'Kedi',
            desc: 'Bağımsız, zarif',
            gradient: 'from-violet-50 to-purple-50',
            border: 'hover:border-violet-400',
            badge: 'bg-violet-100 text-violet-700',
          },
          {
            species: 'Köpek' as Species,
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
function PetForm({ species, onBack }: { species: Species; onBack: () => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [petName, setPetName] = useState('')
  const [selectedBreed, setSelectedBreed] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')

  const [birthDateMode, setBirthDateMode] = useState<'exact' | 'approximate'>('exact')
  const [birthDate, setBirthDate] = useState('')
  const [approxYears, setApproxYears] = useState('')
  const [approxMonths, setApproxMonths] = useState('')

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
    now.setDate(1)
    
    let targetYear = now.getFullYear() - years
    let targetMonth = now.getMonth() - months
    
    while (targetMonth < 0) {
      targetMonth += 12
      targetYear -= 1
    }
    
    const targetDate = new Date(targetYear, targetMonth, 1)
    setBirthDate(targetDate.toISOString().split('T')[0])
  }

  const currentYear = new Date().getFullYear()
  const breeds = species === 'Kedi' ? CAT_BREEDS : DOG_BREEDS
  const AvatarHeader = species === 'Kedi' ? <DefaultCatAvatar width={36} height={36} /> : <DefaultDogAvatar width={36} height={36} />
  const [submitError, setSubmitError] = useState('')

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

    try {
      const res  = await fetch('/api/pets', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error || 'Kayıt sırasında bir hata oluştu.')
        return
      }

      // ✅ Başarı: inline state yerine ayrı bir route'a replace ile yönlendir
      // replace() kullanılıyor — böylece geri tuşu formu değil, önceki sayfayı açar
      const id   = data.pet.id
      const name = encodeURIComponent(petName.trim())
      const sp   = encodeURIComponent(species)
      router.replace(`/owner/pets/add/success?id=${id}&name=${name}&species=${sp}`)
    } catch (err: any) {
      setSubmitError('Sunucu bağlantı hatası: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col w-full mx-auto pb-10 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 border-b border-border-main pb-4">
        <button onClick={onBack}
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

      <form onSubmit={handleSubmit} className="card-base p-6 sm:p-8 flex flex-col gap-6">
        
        {submitError && (
          <div className="p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl border border-error/20">
            ⚠️ {submitError}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* İsim */}
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-[13px] font-bold text-text-primary">İsim *</label>
            <input id="name" type="text"
              value={petName} onChange={e => setPetName(e.target.value)}
              placeholder={species === 'Kedi' ? 'Örn: Mia, Boncuk' : 'Örn: Max, Karamel'}
              className="input-base" required/>
          </div>

          {/* Irk */}
          <div className="flex flex-col gap-2">
            <label htmlFor="breed" className="text-[13px] font-bold text-text-primary">Irk *</label>
            <div className="relative">
              <select id="breed" value={selectedBreed} onChange={e => setSelectedBreed(e.target.value)} className="input-base w-full appearance-none cursor-pointer" required>
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
                  className="input-base w-full animate-scaleIn"
                  onChange={e => setBirthDate(e.target.value)}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3.5 animate-scaleIn">
                {/* Yaş Girişi */}
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    placeholder="Yaş (Örn: 1)"
                    value={approxYears}
                    onChange={e => handleApproxChange(e.target.value, approxMonths)}
                    className="w-full px-5 py-4 bg-surface border border-primary/20 rounded-[16px] text-[15px] font-medium placeholder-text-secondary/60 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-text-primary"
                  />
                  {approxYears && (
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-text-secondary animate-scaleIn">Yaş</span>
                  )}
                </div>

                {/* Ay Girişi */}
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="11"
                    placeholder="Ay (Örn: 4)"
                    value={approxMonths}
                    onChange={e => handleApproxChange(approxYears, e.target.value)}
                    className="w-full px-5 py-4 bg-surface border border-primary/20 rounded-[16px] text-[15px] font-medium placeholder-text-secondary/60 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-text-primary"
                  />
                  {approxMonths && (
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-text-secondary animate-scaleIn">Ay</span>
                  )}
                </div>
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

        <div className="flex justify-end mt-4 pt-6 border-t border-border-main">
          <button type="submit" disabled={loading} className="btn-primary min-w-[200px] py-3.5 text-[15px] shadow-lg shadow-primary/20 disabled:opacity-50 hover:-translate-y-0.5 transition-transform">
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="15"/></svg>
                Kaydediliyor...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5">{species === 'Kedi' ? <DefaultCatAvatar width={20} height={20} /> : <DefaultDogAvatar width={20} height={20} />}</span>
                Profili Oluştur
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Ana Sayfa ───────────────────────────────────────────────────
export default function AddPetPage() {
  const router = useRouter()
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)

  return (
    <>
      {!selectedSpecies ? (
        <SpeciesSelector 
          onSelect={setSelectedSpecies} 
          onBack={() => router.back()} 
        />
      ) : (
        <PetForm 
          species={selectedSpecies} 
          onBack={() => setSelectedSpecies(null)} 
        />
      )}
    </>
  )
}

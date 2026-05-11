'use client'

import { useState } from 'react'

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
function SpeciesSelector({ onSelect }: { onSelect: (s: Species) => void }) {
  return (
    <div className="flex flex-col items-center w-full mx-auto pt-6 pb-10 gap-10 animate-fadeIn">
      <div className="text-center">
        <h1 className="text-[32px] font-extrabold text-text-primary tracking-tight">Patin Kim?</h1>
        <p className="text-text-secondary mt-2 text-[16px]">Devam etmek için önce tür seçin</p>
      </div>

      <div className="grid grid-cols-2 gap-5 w-full">
        {([
          {
            species: 'Kedi' as Species,
            emoji: '🐱',
            label: 'Kedi',
            desc: 'Bağımsız, zarif',
            gradient: 'from-violet-50 to-purple-50',
            border: 'hover:border-violet-400',
            badge: 'bg-violet-100 text-violet-700',
          },
          {
            species: 'Köpek' as Species,
            emoji: '🐶',
            label: 'Köpek',
            desc: 'Sadık, enerjik',
            gradient: 'from-amber-50 to-orange-50',
            border: 'hover:border-amber-400',
            badge: 'bg-amber-100 text-amber-700',
          },
        ]).map(({ species, emoji, label, desc, gradient, border, badge }) => (
          <button
            key={species}
            onClick={() => onSelect(species)}
            className={`flex flex-col items-center gap-4 p-6 sm:p-8 rounded-[24px] border-2 border-border-main bg-gradient-to-br ${gradient} ${border} hover:shadow-medium transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] group cursor-pointer`}
          >
            <div className="text-[72px] sm:text-[88px] leading-none filter drop-shadow-md group-hover:scale-105 transition-transform duration-300">
              {emoji}
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
  const [loading, setLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [createdPetId, setCreatedPetId] = useState<string | null>(null)
  
  const [petName, setPetName] = useState('')
  const [selectedBreed, setSelectedBreed] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  
  const [yearOnly, setYearOnly] = useState(false)
  const [birthDate, setBirthDate] = useState('')
  
  const currentYear = new Date().getFullYear()
  const breeds = species === 'Kedi' ? CAT_BREEDS : DOG_BREEDS
  const emoji = species === 'Kedi' ? '🐱' : '🐶'
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

      setCreatedPetId(data.pet.id)
      setIsSuccess(true)
    } catch (err: any) {
      setSubmitError('Sunucu bağlantı hatası: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Başarı ekranı (Forks)
  if (isSuccess && createdPetId) {
    return (
      <div className="card-base p-8 flex flex-col items-center gap-6 animate-fadeInUp mt-10">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-[32px] text-success shadow-inner">
          ✓
        </div>
        <div className="text-center">
          <h2 className="text-[26px] font-extrabold text-text-primary mb-2">Aramıza Hoş Geldin, {petName}! 🎉</h2>
          <p className="text-[14px] text-text-secondary">{species.toLowerCase()}inizin temel profili başarıyla oluşturuldu.</p>
        </div>

        <p className="text-[13px] font-bold text-text-secondary uppercase tracking-widest mt-4">İlk Kurulum Adımı</p>

        <div className="flex flex-col w-full gap-3">
          <button
            onClick={() => window.location.href = `/owner/pets/${createdPetId}/vaccines`}
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left group"
          >
            <span className="text-[28px] group-hover:scale-110 transition-transform">💉</span>
            <div>
              <p className="font-extrabold text-primary text-[15px]">Aşı OS Kurulumu</p>
              <p className="text-[12px] text-text-secondary mt-0.5">Geçmiş aşıları aktarın veya takvim oluşturun.</p>
            </div>
          </button>

          <button
            onClick={() => window.location.href = `/owner/pets/${createdPetId}/nutrition`}
            className="flex items-center gap-4 p-4 rounded-xl border-2 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors text-left group"
          >
            <span className="text-[28px] group-hover:scale-110 transition-transform">🍗</span>
            <div>
              <p className="font-extrabold text-blue-600 text-[15px]">Beslenme Planı</p>
              <p className="text-[12px] text-text-secondary mt-0.5">Öğün ve mama takibi için günlük plan oluşturun.</p>
            </div>
          </button>

          <button
            onClick={() => window.location.href = `/owner/pets/${createdPetId}`}
            className="btn-secondary w-full py-4 text-[14px] mt-2 font-bold"
          >
            Şimdi Değil, Profile Git →
          </button>
        </div>
      </div>
    )
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
            <span className="text-[22px]">{emoji}</span>
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
                <option value="" disabled>Irk seçin</option>
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
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-text-primary">Doğum Tarihi</label>
              <button
                type="button"
                onClick={() => {
                  setYearOnly(v => !v)
                  setBirthDate('')
                }}
                className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${
                  yearOnly ? 'bg-primary text-white border-primary' : 'bg-surface border-border-main text-text-secondary hover:border-primary/40'
                }`}
              >
                {yearOnly ? '✓ Sadece Yıl' : 'Sadece Yıl Gir'}
              </button>
            </div>

            {yearOnly ? (
              <div className="relative animate-scaleIn">
                <select
                  value={birthDate ? birthDate.slice(0, 4) : ''}
                  className="input-base w-full appearance-none cursor-pointer"
                  onChange={e => setBirthDate(e.target.value ? `${e.target.value}-01-01` : '')}
                >
                  <option value="">Yıl seçin</option>
                  {Array.from({ length: currentYear - 2000 + 1 }, (_, i) => currentYear - i).map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-text-secondary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            ) : (
              <div className="animate-fadeInUp">
                <input
                  type="date"
                  value={birthDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="input-base"
                  onChange={e => setBirthDate(e.target.value)}
                />
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
              `${emoji} Profili Oluştur`
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Ana Sayfa ───────────────────────────────────────────────────
export default function AddPetPage() {
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)

  return (
    <>
      {!selectedSpecies
        ? <SpeciesSelector onSelect={setSelectedSpecies}/>
        : <PetForm species={selectedSpecies} onBack={() => setSelectedSpecies(null)}/>
      }
    </>
  )
}

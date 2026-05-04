'use client'

import { useState } from 'react'
import citiesData from '@/lib/cities.json'

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

const CAT_COLORS = ['Siyah', 'Beyaz', 'Gri', 'Turuncu', 'Karamel', 'Tekir', 'Calico', 'Beyaz-Siyah', 'Diğer']
const DOG_COLORS = ['Siyah', 'Beyaz', 'Kahverengi', 'Altın Sarısı', 'Krem', 'Gri', 'Siyah-Beyaz', 'Üç Renkli', 'Diğer']

type Species = 'Kedi' | 'Köpek'

// ── Adım 1: Tür Seçimi ──────────────────────────────────────────
function SpeciesSelector({ onSelect }: { onSelect: (s: Species) => void }) {
  return (
    <div className="flex flex-col items-center w-full mx-auto pt-6 pb-10 gap-10">
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
            desc: 'Bağımsız, zarif, meraklı',
            gradient: 'from-violet-50 to-purple-50',
            border: 'hover:border-violet-400',
            badge: 'bg-violet-100 text-violet-700',
          },
          {
            species: 'Köpek' as Species,
            emoji: '🐶',
            label: 'Köpek',
            desc: 'Sadık, enerjik, sevecen',
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

// ── Adım 2: Forma Göre İçerik ──────────────────────────────────
function PetForm({ species, onBack }: { species: Species; onBack: () => void }) {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [createdPetId, setCreatedPetId] = useState<string | null>(null)
  const [yearOnly, setYearOnly] = useState(false)
  const [birthDate, setBirthDate] = useState('')    // her zaman 'YYYY-MM-DD' veya ''
  const [selectedCityCode, setSelectedCityCode] = useState('')
  const [petName, setPetName] = useState('')
  const [selectedBreed, setSelectedBreed] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const currentYear = new Date().getFullYear()
  const TOTAL_STEPS = 5 // Görünür adımlar (step 6 modal/overlay gibi davranacak veya ekranı kaplayacak)

  const breeds = species === 'Kedi' ? CAT_BREEDS : DOG_BREEDS
  const colors = species === 'Kedi' ? CAT_COLORS : DOG_COLORS
  const emoji = species === 'Kedi' ? '🐱' : '🐶'
  const [submitError, setSubmitError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitError('')

    // Kritik alanları doğrula
    if (!petName.trim()) {
      setStep(1)
      setTimeout(() => document.getElementById('step1-error')?.classList.remove('hidden'), 100)
      return
    }
    if (!selectedBreed) {
      setStep(1)
      setTimeout(() => document.getElementById('step1-error')?.classList.remove('hidden'), 100)
      return
    }

    setLoading(true)

    // FormData'yı state'den oluştur — hidden adımlardaki HTML input'lara güvenmiyoruz
    const fd = new FormData(e.currentTarget)
    fd.set('species', species)
    fd.set('name', petName)
    fd.set('breed', selectedBreed)
    if (birthDate) fd.set('birth_date', birthDate)
    if (photoFile) fd.set('avatar', photoFile)

    // Debug: hangi veriler gönderiliyor?
    console.log('[PetForm] Submitting:', {
      species, name: petName, breed: selectedBreed, birth_date: birthDate,
      city: fd.get('city'), district: fd.get('district'),
    })

    try {
      const res  = await fetch('/api/pets', { method: 'POST', body: fd })
      const data = await res.json()

      console.log('[PetForm] API response:', res.status, data)

      if (!res.ok) {
        setSubmitError(data.error || 'Kayıt sırasında bir hata oluştu.')
        return
      }

      // Başarı — Pet ID'yi kaydet ve Öneri Ekranı'na (Adım 6) geç
      setCreatedPetId(data.pet.id)
      setStep(6)
    } catch (err: any) {
      console.error('[PetForm] Fetch error:', err)
      setSubmitError('Sunucu bağlantı hatası: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const stepTitles: Record<number, { title: string; desc: string }> = {
    1: { title: 'Temel Bilgiler',    desc: `${emoji} ${species}inizin genel kimlik bilgileri` },
    2: { title: 'Evrak & Kimlik',    desc: 'Mikroçip, pasaport ve dövme numaraları' },
    3: { title: 'Soy Ağacı',         desc: `${species} soyuna ait anne/baba bilgileri (opsiyonel)` },
    4: { title: 'Veteriner Bilgisi', desc: 'Kayıtlı veterinerinizin iletişim bilgileri' },
    5: { title: 'Profil Fotoğrafı',  desc: `${emoji} ${species}inizin sevimli fotoğrafını ekleyin` },
  }

  const handleNextStep = (currentStep: number) => {
    // Step 1 Validation - state tabanlı kontrol
    if (currentStep === 1) {
      if (!petName.trim() || !selectedBreed) {
        document.getElementById('step1-error')?.classList.remove('hidden')
        return
      } else {
        document.getElementById('step1-error')?.classList.add('hidden')
      }
    }

    setStep(currentStep + 1)
  }

  return (
    <div className="flex flex-col w-full mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 border-b border-border-main pb-4">
        <button onClick={step === 1 ? onBack : () => setStep(s => s - 1)}
          aria-label="Geri"
          title="Geri"
          className="w-10 h-10 rounded-full border border-border-main flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/30 transition-all shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[22px]">{emoji}</span>
            <h1 className="text-[20px] font-extrabold text-text-primary tracking-tight">Yeni {species} Ekle</h1>
          </div>
          {step <= 5 && (
            <p className="text-[12px] text-text-secondary font-medium">Adım {step} / {TOTAL_STEPS} — {stepTitles[step].title}</p>
          )}
        </div>
        {/* Progress (Sadece 5 adıma kadar) */}
        {step <= 5 && (
          <div className="flex gap-1.5 shrink-0">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i}
                className={`h-1.5 transition-all duration-300 rounded-full ${i < step ? 'bg-primary' : 'bg-border-main'} ${i === step - 1 ? 'w-6' : 'w-3'}`}
              />
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} id="pet-form">
        {/* ─── STEP 1: Temel ─── */}
        <div className={step !== 1 ? 'hidden' : ''}>
          <div className="card-base p-6 sm:p-8 flex flex-col gap-5">
            <p className="text-[13px] text-text-secondary">{stepTitles[1].desc}</p>
            
            {/* HATA MESAJI */}
            <div id="step1-error" className="hidden p-3 bg-error/10 text-error text-[12px] font-bold rounded-lg border border-error/20">
              Lütfen zorunlu alanları (İsim, Irk) eksiksiz doldurun.
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-[13px] font-bold text-text-primary">İsim *</label>
              <input id="name" name="name" type="text"
                value={petName}
                onChange={e => setPetName(e.target.value)}
                placeholder={species === 'Kedi' ? 'Örn: Mia, Boncuk, Luna' : 'Örn: Max, Karamel, Duman'}
                className="input-base"/>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="breed" className="text-[13px] font-bold text-text-primary">Irk *</label>
              <div className="relative">
                <select id="breed" name="breed"
                  value={selectedBreed}
                  onChange={e => setSelectedBreed(e.target.value)}
                  className="input-base w-full appearance-none cursor-pointer">
                  <option value="" disabled>Irk seçin</option>
                  {breeds.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-text-secondary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Cinsiyet</label>
                <div className="flex gap-2">
                  {([['male', species === 'Kedi' ? '♂ Erkek' : '♂ Erkek'], ['female', species === 'Kedi' ? '♀ Dişi' : '♀ Dişi']] as const).map(([v, l]) => (
                    <label key={v} className="flex-1 flex items-center justify-center gap-2 p-3 border-2 border-border-main rounded-[14px] cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary-soft/30 transition-all text-[13px] font-bold text-text-secondary has-[:checked]:text-primary">
                      <input type="radio" name="gender" value={v} className="sr-only"/>
                      {l}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-bold text-text-primary">Doğum Tarihi</label>
                  <button
                    type="button"
                    onClick={() => {
                      setYearOnly(v => !v)
                      setBirthDate('')   // modu değiştirince değeri sıfırla
                    }}
                    className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${
                      yearOnly
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface border-border-main text-text-secondary hover:border-primary/40'
                    }`}
                  >
                    {yearOnly ? '✓ Sadece Yıl' : 'Sadece Yıl Gir'}
                  </button>
                </div>

                {/* Tek hidden field — her zaman state değerini taşır */}
                <input type="hidden" name="birth_date" value={birthDate || ''}/>

                {yearOnly ? (
                  <div key="year-mode" className="flex flex-col gap-1.5 animate-scaleIn">
                    <div className="relative">
                      <select
                        aria-label="Doğuş yılı"
                        title="Doğuş yılı"
                        value={birthDate ? birthDate.slice(0, 4) : ''}
                        className="input-base w-full appearance-none cursor-pointer"
                        onChange={e =>
                          setBirthDate(e.target.value ? `${e.target.value}-01-01` : '')
                        }
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
                    <p className="text-[11px] text-text-secondary/70 pl-1">Tam tarih bilinmiyorsa sadece doğum yılı yeterli.</p>
                  </div>
                ) : (
                  <div key="date-mode" className="flex flex-col gap-1.5 animate-fadeInUp">
                    <input
                      id="birth_date"
                      type="date"
                      aria-label="Doğuş tarihi"
                      title="Doğuş tarihi"
                      value={birthDate || ''}
                      max={new Date().toISOString().split('T')[0]}
                      className="input-base"
                      onChange={e => setBirthDate(e.target.value)}
                    />
                    <p className="text-[11px] text-text-secondary/70 pl-1">
                      Tarih bilinmiyorsa{' '}
                      <button type="button" onClick={() => { setYearOnly(true); setBirthDate('') }}
                        className="text-primary font-bold hover:underline">sadece yılı girebilirsiniz</button>.
                    </p>
                    <p className="text-[11px] text-primary font-bold mt-1">✨ Aşı takvimi bu tarihe göre otomatik oluşturulacaktır.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="color" className="text-[13px] font-bold text-text-primary">Renk / Desen</label>
              <div className="relative">
                <select id="color" name="color" defaultValue="" className="input-base w-full appearance-none cursor-pointer">
                  <option value="">Seçin (opsiyonel)</option>
                  {colors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-text-secondary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Şehir</label>
                <input type="hidden" name="city" value={citiesData.find(c => c.code === selectedCityCode)?.name || ''} />
                <div className="relative">
                  <select
                    aria-label="Şehir"
                    title="Şehir seçin"
                    value={selectedCityCode}
                    onChange={e => setSelectedCityCode(e.target.value)}
                    className="input-base w-full appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Şehir seçin</option>
                    {citiesData.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-text-secondary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="district" className="text-[13px] font-bold text-text-primary">İlçe</label>
                <div className="relative">
                  <select
                    id="district"
                    name="district"
                    defaultValue=""
                    disabled={!selectedCityCode}
                    className="input-base w-full appearance-none cursor-pointer disabled:opacity-50 disabled:bg-bg-main disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>İlçe seçin</option>
                    {(citiesData.find(c => c.code === selectedCityCode)?.districts || []).map((d: string) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-text-secondary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Kedi-özel: Kapalı/Dışarı giden */}
            {species === 'Kedi' && (
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Yaşam Alanı</label>
                <div className="grid grid-cols-2 gap-3">
                  {[['indoor', '🏠 Tamamen Kapalı'], ['outdoor', '🌳 Dışarı Çıkan']].map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 p-3 border-2 border-border-main rounded-[14px] cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary-soft/30 transition-all text-[13px] font-semibold text-text-secondary has-[:checked]:text-primary">
                      <input type="radio" name="lifestyle" value={v} className="accent-[#4F2DBA] w-4 h-4 shrink-0"/>
                      {l}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {species === 'Köpek' && (
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Beden Büyüklüğü</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { v: 'small',  emoji: '🐩', label: 'Küçük', kg: '1 – 10 kg',  example: 'Chihuahua, Maltese' },
                    { v: 'medium', emoji: '🐕', label: 'Orta',  kg: '10 – 25 kg', example: 'Beagle, Cocker' },
                    { v: 'large',  emoji: '🦮', label: 'Büyük', kg: '25+ kg',     example: 'Golden, Kangal' },
                  ].map(({ v, emoji, label, kg, example }) => (
                    <label key={v}
                      className="flex flex-col items-center gap-2 p-4 border-2 border-border-main rounded-[16px] cursor-pointer text-center has-[:checked]:border-primary has-[:checked]:bg-primary-soft/30 hover:border-primary/40 transition-all group">
                      <input type="radio" name="size" value={v} className="sr-only"/>
                      <span className="text-[30px] group-has-[:checked]:scale-110 transition-transform">{emoji}</span>
                      <span className="text-[13px] font-extrabold text-text-primary group-has-[:checked]:text-primary">{label}</span>
                      <span className="text-[12px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded-full">{kg}</span>
                      <span className="text-[10px] text-text-secondary leading-tight">{example}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end mt-5">
            <button type="button" onClick={() => handleNextStep(1)} className="btn-primary min-w-[140px] shadow-lg shadow-primary/20">
              Devam Et →
            </button>
          </div>
        </div>

        {/* ─── STEP 2: Evrak ─── */}
        <div className={step !== 2 ? 'hidden' : ''}>
          <div className="card-base p-6 sm:p-8 flex flex-col gap-5">
            <p className="text-[13px] text-text-secondary">{stepTitles[2].desc}</p>
            <div className="flex flex-col gap-2">
              <label htmlFor="microchip_no" className="text-[13px] font-bold text-text-primary">Mikroçip No</label>
              <input id="microchip_no" name="microchip_no" type="text" placeholder="15 haneli" className="input-base"/>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="passport_no" className="text-[13px] font-bold text-text-primary">Pasaport No</label>
              <input id="passport_no" name="passport_no" type="text" className="input-base"/>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="tattoo_no" className="text-[13px] font-bold text-text-primary">Dövme No</label>
              <input id="tattoo_no" name="tattoo_no" type="text" className="input-base"/>
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <button type="button" onClick={() => setStep(3)} className="btn-primary min-w-[140px] shadow-lg shadow-primary/20">
              Devam Et →
            </button>
          </div>
        </div>

        {/* ─── STEP 3: Soy Ağacı ─── */}
        <div className={step !== 3 ? 'hidden' : ''}>
          <div className="card-base p-6 sm:p-8 flex flex-col gap-5">
            <p className="text-[13px] text-text-secondary">{stepTitles[3].desc}</p>
            <div className="flex flex-col gap-2">
              <label htmlFor="pedigree_sire" className="text-[13px] font-bold text-text-primary">
                {species === 'Kedi' ? '🐱' : '🐶'} Baba Adı
              </label>
              <input id="pedigree_sire" name="pedigree_sire" type="text"
                placeholder={species === 'Kedi' ? 'Örn: Champion Silver Moon' : 'Örn: Champion Black Thunder'}
                className="input-base"/>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="pedigree_dam" className="text-[13px] font-bold text-text-primary">
                {species === 'Kedi' ? '🐱' : '🐶'} Anne Adı
              </label>
              <input id="pedigree_dam" name="pedigree_dam" type="text"
                placeholder={species === 'Kedi' ? 'Örn: Diamond Pearl' : 'Örn: Golden Lady'}
                className="input-base"/>
            </div>
          </div>
          <div className="flex justify-end mt-5">
            <button type="button" onClick={() => setStep(4)} className="btn-primary min-w-[140px] shadow-lg shadow-primary/20">
              Devam Et →
            </button>
          </div>
        </div>

        {/* ─── STEP 4: Veteriner ─── */}
        <div className={step !== 4 ? 'hidden' : ''}>
          <div className="card-base p-6 sm:p-8 flex flex-col gap-5">
            <p className="text-[13px] text-text-secondary">{stepTitles[4].desc}</p>
            <div className="flex flex-col gap-2">
              <label htmlFor="vet_name" className="text-[13px] font-bold text-text-primary">Veteriner Adı</label>
              <input id="vet_name" name="vet_name" type="text" placeholder="Dr. Ali Yılmaz" className="input-base"/>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="vet_phone" className="text-[13px] font-bold text-text-primary">Veteriner Telefonu</label>
              <input id="vet_phone" name="vet_phone" type="tel" placeholder="05xx xxx xx xx" className="input-base"/>
            </div>

            {/* Özet Önizleme */}
            <div className="mt-2 p-4 bg-primary-soft/40 border border-primary/10 rounded-[16px] flex items-center gap-3">
              <span className="text-[36px]">{emoji}</span>
              <div>
                <p className="font-bold text-primary text-[14px]">Kayıt neredeyse tamam!</p>
                <p className="text-[12px] text-text-secondary">Kaydet'e basarak {species.toLowerCase()}inizin profilini oluşturun.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-5">
            <button type="button" onClick={() => setStep(3)} className="btn-secondary px-6">Geri</button>
            <button type="button" onClick={() => handleNextStep(4)}
              className="btn-primary min-w-[140px] shadow-lg shadow-primary/20">
              Devam Et →
            </button>
          </div>
        </div>

        {/* ─── STEP 5: Fotoğraf ─── */}
        <div className={step !== 5 ? 'hidden' : ''}>
          <div className="card-base p-6 sm:p-8 flex flex-col gap-6">
            <p className="text-[13px] text-text-secondary">{stepTitles[5].desc}</p>

            {/* Önizleme */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-[140px] h-[140px] rounded-[28px] bg-gradient-to-br from-primary-soft to-white border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden shadow-sm">
                {photoPreview ? (
                  <img src={photoPreview} alt="Önizleme" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 select-none">
                    <span className="text-[52px]">{emoji}</span>
                    <span className="text-[11px] text-text-secondary font-semibold">Fotoğraf Ekle</span>
                  </div>
                )}
              </div>

              {/* Yükleme Butonları */}
              <div className="flex gap-3 w-full max-w-xs">
                {/* Fotoğraf Seç — mobilde kamera/galeri seçimi sistem tarafından sunulur */}
                <label className="flex-1 flex flex-col items-center gap-2 p-4 rounded-[16px] border-2 border-border-main bg-surface hover:border-primary/40 hover:bg-primary-soft/20 cursor-pointer transition-all group">
                  <input
                    type="file"
                    accept="image/*"
                    aria-label="Fotoğraf seç"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setPhotoFile(file)
                        setPhotoPreview(URL.createObjectURL(file))
                      }
                    }}
                  />
                  <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                  <span className="text-[12px] font-bold text-text-secondary group-hover:text-primary text-center transition-colors">Kamera / Galeri</span>
                </label>

                {/* Dosyadan Seç */}
                <label className="flex-1 flex flex-col items-center gap-2 p-4 rounded-[16px] border-2 border-border-main bg-surface hover:border-primary/40 hover:bg-primary-soft/20 cursor-pointer transition-all group">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Dosyadan fotoğraf seç"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setPhotoFile(file)
                        setPhotoPreview(URL.createObjectURL(file))
                      }
                    }}
                  />
                  <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                  <span className="text-[12px] font-bold text-text-secondary group-hover:text-primary text-center transition-colors">Galeriden Seç</span>
                </label>
              </div>

              {photoPreview && (
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview('') }}
                  className="text-[12px] font-bold text-error/70 hover:text-error transition-colors">
                  × Fotoğrafı Kaldır
                </button>
              )}

              <p className="text-[12px] text-text-secondary text-center max-w-[280px]">
                {photoPreview
                  ? '✓ Fotoğraf seçildi! Kaydetmek için aşağıdaki butona basın.'
                  : 'İsterseniz fotoğraf eklemeden de kaydedebilirsiniz.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-5">
            {submitError && (
              <div className="p-3 rounded-[12px] bg-error/10 border border-error/20 text-error text-[13px] font-semibold text-center">
                ⚠️ {submitError}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setStep(4)} className="btn-secondary px-6">Geri</button>
              <button type="submit" disabled={loading}
                className="btn-primary min-w-[160px] shadow-lg shadow-primary/20 disabled:opacity-50">
                {loading
                  ? <span className="flex items-center gap-2"><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="15"/></svg>Kaydediliyor...</span>
                  : `${emoji} Kaydı Tamamla`
                }
              </button>
            </div>
          </div>
        </div>

        {step === 6 && (
          <div className="card-base p-8 flex flex-col items-center gap-6 animate-fadeInUp">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-[32px] text-success">
              ✓
            </div>
            <div className="text-center">
              <h2 className="text-[24px] font-extrabold text-text-primary mb-2">Profil Oluşturuldu! 🎉</h2>
              <p className="text-[14px] text-text-secondary">Şimdi aşı takip sistemini kurarak {species.toLowerCase()}inizin sağlık planını başlatın.</p>
            </div>

            <div className="w-full bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-start gap-4">
              <span className="text-[32px]">💉</span>
              <div>
                <p className="font-extrabold text-primary text-[15px]">Aşı OS Kurulumu</p>
                <p className="text-[13px] text-text-secondary mt-1">Doğum tarihine göre otomatik aşı takvimi oluştur veya geçmiş kayıtlarını gir.</p>
              </div>
            </div>

            <div className="flex flex-col w-full gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/owner/pets/${createdPetId}/vaccines`
                }}
                className="btn-primary w-full py-4 text-[15px] font-extrabold"
              >
                💉 Aşı Takibini Başlat →
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/owner/pets/${createdPetId}`
                }}
                className="btn-secondary w-full py-3 text-[14px]"
              >
                Şimdi Değil, Profile Git
              </button>
            </div>
          </div>
        )}
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

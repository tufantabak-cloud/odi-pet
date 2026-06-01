'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { calcAge } from '@/lib/pets/utils'

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
  const [loading, setLoading] = useState(false)
  const [birthDateMode, setBirthDateMode] = useState<'exact' | 'approximate'>('exact')
  
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
  const [selectedBreed, setSelectedBreed] = useState(pet.breed || '')
  
  const [selectedCity, setSelectedCity] = useState(pet.city || '')
  const [selectedDistrict, setSelectedDistrict] = useState(pet.district || '')
  const [provinces, setProvinces] = useState<any[]>([])

  useEffect(() => {
    fetch('https://turkiyeapi.dev/api/v1/provinces')
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
  const [microchipNo, setMicrochipNo] = useState(pet.microchip_no || '')
  const [passportNo, setPassportNo] = useState(pet.passport_no || '')
  const [vetCompany, setVetCompany] = useState(pet.vet_company || '')
  const [vetName, setVetName] = useState(pet.vet_name || '')
  const [vetPhone, setVetPhone] = useState(pet.vet_phone || '')
  const [vetEmail, setVetEmail] = useState(pet.vet_email || '')

  const species = pet.species as 'Kedi' | 'Köpek'
  const breeds = species === 'Kedi' ? CAT_BREEDS : DOG_BREEDS
  const colors = species === 'Kedi' ? CAT_COLORS : DOG_COLORS
  const currentYear = new Date().getFullYear()

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

    try {
      const res = await fetch(`/api/pets/${pet.id}`, { method: 'PATCH', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setSubmitError(data.error || 'Güncelleme sırasında bir hata oluştu.')
        return
      }

      router.push(`/owner/pets/${pet.id}`)
      router.refresh()
    } catch (err: any) {
      setSubmitError('Sunucu bağlantı hatası: ' + err.message)
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="flex flex-col w-full mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 border-b border-border-main pb-4 sticky top-0 bg-surface/90 backdrop-blur z-10 pt-2">
        <button type="button" onClick={() => router.back()}
          className="w-10 h-10 rounded-full border border-border-main flex items-center justify-center text-text-secondary hover:text-primary transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div className="flex flex-col flex-1">
          <h1 className="text-[20px] font-extrabold text-text-primary tracking-tight">{pet.name} Profil Ayarları</h1>
          <p className="text-[12px] text-text-secondary font-medium">Bilgileri güncelleyip aşağıdan kaydedin.</p>
        </div>
      </div>

      {submitError && (
        <div className="mb-4 p-3 rounded-[12px] bg-error/10 border border-error/20 text-error text-[13px] font-semibold text-center">
          ⚠️ {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">

        {/* ─── BÖLÜM 1: Temel Kimlik ─── */}
        <section className="card-base p-6 sm:p-8 flex flex-col gap-6">
          <h2 className="text-[15px] font-black text-text-primary border-b border-border-main pb-3">1. Temel Kimlik ve Fotoğraf</h2>
          
          <div className="flex flex-col items-center gap-4 mb-2">
            <div className="relative w-[120px] h-[120px] rounded-[28px] bg-gradient-to-br from-primary-soft to-white border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden shadow-sm">
              {photoPreview ? (
                photoPreview.startsWith('http') ? (
                  <Image src={photoPreview} alt="Önizleme" fill={true} className="object-cover" sizes="120px" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Önizleme" className="w-full h-full object-cover" />
                )
              ) : (
                <span className="text-[40px]">{species === 'Kedi' ? '🐱' : '🐶'}</span>
              )}
            </div>
            <label className="text-[12px] font-bold text-primary bg-primary/10 px-4 py-2 rounded-full cursor-pointer hover:bg-primary/20 transition-colors">
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
              <input value={petName} onChange={e => setPetName(e.target.value)} className="input-base" required/>
            </div>
            <div className="flex flex-col gap-2">
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
        </section>

        {/* ─── BÖLÜM 2: Fiziksel Özellikler ─── */}
        <section className="card-base p-6 sm:p-8 flex flex-col gap-6">
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
          </div>

          {species === 'Kedi' && (
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

          {species === 'Köpek' && (
            <div className="flex flex-col gap-2 mt-2">
              <label className="text-[13px] font-bold text-text-primary">Beden Büyüklüğü</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: 'small',  emoji: '🐩', label: 'Küçük' },
                  { v: 'medium', emoji: '🐕', label: 'Orta' },
                  { v: 'large',  emoji: '🦮', label: 'Büyük' },
                ].map(({ v, emoji, label }) => (
                  <label key={v} className={`flex flex-col items-center gap-1 p-3 border-2 rounded-[16px] cursor-pointer text-center transition-all ${size === v ? 'border-primary bg-primary-soft/30 text-primary' : 'border-border-main text-text-secondary hover:border-primary/40'}`}>
                    <input type="radio" name="size" value={v} checked={size === v} onChange={() => setSize(v)} className="sr-only"/>
                    <span className="text-[24px]">{emoji}</span>
                    <span className="text-[13px] font-bold">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ─── BÖLÜM 3: Evrak ve Veteriner ─── */}
        <section className="card-base p-6 sm:p-8 flex flex-col gap-6">
          <h2 className="text-[15px] font-black text-text-primary border-b border-border-main pb-3">3. Evrak & Veteriner Bilgisi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Mikroçip No</label>
              <input value={microchipNo} onChange={e => setMicrochipNo(e.target.value)} placeholder="15 haneli no" className="input-base"/>
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

        {/* SAVE BUTTON */}
        <div className="sticky bottom-4 z-10 flex justify-end">
          <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto min-w-[200px] py-4 text-[15px] shadow-2xl shadow-primary/40 disabled:opacity-50">
            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>

        {/* ─── BÖLÜM 4: Bilgi Kartı ─── */}
        <section className="mt-8 border border-primary/20 bg-primary-soft/50 rounded-2xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 transition-all duration-300 hover:border-primary/30">
          <div className="w-12 h-12 bg-gradient-to-tr from-primary-soft to-indigo-100/50 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-primary/15">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="infoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4F2DBA" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
                <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#4F2DBA" floodOpacity="0.15" filterUnits="userSpaceOnUse" />
                </filter>
              </defs>
              <circle cx="12" cy="12" r="10" stroke="url(#infoGrad)" strokeWidth="2" filter="url(#shadowFilter)" />
              <path d="M12 11V16" stroke="url(#infoGrad)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="7.5" r="1.25" fill="url(#infoGrad)" />
            </svg>
          </div>
          <div className="flex-1 flex flex-col gap-1.5 text-center sm:text-left">
            <h3 className="font-bold text-text-primary text-[15px]">Profil Yönetimi</h3>
            <p className="text-[13px] text-text-secondary leading-relaxed">
              Dostunuzun profili üzerinde tam kontrol sahibi olmak ve silme/sağlık verisi temizleme işlemlerini gerçekleştirmek için <strong>Profil Ayarları</strong> sayfasını ziyaret edebilirsiniz.
            </p>
            <div className="mt-2.5 flex justify-center sm:justify-start">
              <Link href="/owner/profile" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-primary hover:text-primary-hover transition-colors group">
                Profil Ayarları'na Git
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

      </form>
    </div>
  )
}

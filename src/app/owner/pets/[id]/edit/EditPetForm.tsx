'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import citiesData from '@/lib/cities.json'
import Link from 'next/link'

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
  
  const [activeTab, setActiveTab] = useState<'Genel' | 'Acil Durum'>('Genel')
  
  useEffect(() => {
    if (searchParams.get('tab') === 'sos') {
      setActiveTab('Acil Durum')
    }
  }, [searchParams])

  // SOS State
  const [sosContacts, setSosContacts] = useState<any[]>(pet.sos_contacts && pet.sos_contacts.length > 0 ? pet.sos_contacts : [
    { name: '', phone: '', role: 'primary' },
    { name: '', phone: '', role: 'secondary' }
  ])
  const [savingSos, setSavingSos] = useState(false)
  const [sosStatus, setSosStatus] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function saveSos(e: React.FormEvent) {
    e.preventDefault()
    setSavingSos(true)
    setSosStatus(null)
    try {
      const res = await fetch(`/api/pets/${pet.id}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sos_contacts: sosContacts }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSosStatus({ type: 'err', text: data.error || 'Hata oluştu' })
        return
      }
      setSosStatus({ type: 'ok', text: 'Acil Durum Ağı başarıyla güncellendi.' })
      pet.sos_contacts = sosContacts
      setTimeout(() => {
        setSosStatus(null)
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setSosStatus({ type: 'err', text: err.message || 'Bağlantı hatası' })
    } finally {
      setSavingSos(false)
    }
  }
  
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
  const [selectedCityCode, setSelectedCityCode] = useState(() => {
    const city = citiesData.find(c => c.name === pet.city)
    return city?.code || ''
  })
  const [photoPreview, setPhotoPreview] = useState(pet.avatar_url || '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [submitError, setSubmitError] = useState('')

  const [gender, setGender] = useState(pet.gender || '')
  const [color, setColor] = useState(pet.color || '')
  const [lifestyle, setLifestyle] = useState(pet.lifestyle || '')
  const [size, setSize] = useState(pet.size || '')
  const [microchipNo, setMicrochipNo] = useState(pet.microchip_no || '')
  const [passportNo, setPassportNo] = useState(pet.passport_no || '')
  const [vetName, setVetName] = useState(pet.vet_name || '')
  const [vetPhone, setVetPhone] = useState(pet.vet_phone || '')

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
    if (vetName) fd.set('vet_name', vetName)
    if (vetPhone) fd.set('vet_phone', vetPhone)
    if (photoFile) fd.set('avatar', photoFile)
    
    const cityName = citiesData.find(c => c.code === selectedCityCode)?.name
    if (cityName) fd.set('city', cityName)

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

      {/* Tabs Navigation */}
      <div className="flex gap-2 bg-bg-main p-1.5 rounded-2xl border border-border-main overflow-x-auto mb-6">
        <button 
          onClick={() => { setActiveTab('Genel'); router.replace(`/owner/pets/${pet.id}/edit`) }}
          className={`flex-1 px-4 py-3 rounded-xl text-[14px] font-bold transition-all ${activeTab === 'Genel' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
        >
          Genel Bilgiler
        </button>
        <button 
          onClick={() => { setActiveTab('Acil Durum'); router.replace(`/owner/pets/${pet.id}/edit?tab=sos`) }}
          className={`flex-1 px-4 py-3 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'Acil Durum' ? 'bg-error text-white shadow-sm' : 'text-text-secondary hover:text-error'}`}
        >
          <span className="text-[16px]">🚨</span> Acil Durum (SOS)
        </button>
      </div>

      {activeTab === 'Genel' && (
        <>
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
            <div className="w-[120px] h-[120px] rounded-[28px] bg-gradient-to-br from-primary-soft to-white border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden shadow-sm">
              {photoPreview ? (
                <img src={photoPreview} alt="Önizleme" className="w-full h-full object-cover" />
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
               <label className="text-[13px] font-bold text-text-primary">Doğum Tarihi</label>
               
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
                   Yaklaşık
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
                   {/* Yıl Girişi */}
                   <div className="relative">
                     <input
                       type="number"
                       min="0"
                       max="30"
                       placeholder="Yıl"
                       value={approxYears}
                       onChange={e => handleApproxChange(e.target.value, approxMonths)}
                       className="w-full px-5 py-4 bg-surface border border-primary/20 rounded-[16px] text-[15px] font-medium placeholder-text-secondary/60 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-text-primary"
                     />
                     {approxYears && (
                       <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-text-secondary animate-scaleIn">Yıl</span>
                     )}
                   </div>

                   {/* Ay Girişi */}
                   <div className="relative">
                     <input
                       type="number"
                       min="0"
                       max="11"
                       placeholder="Ay"
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
              <select value={selectedCityCode} onChange={e => setSelectedCityCode(e.target.value)} className="input-base">
                <option value="">Şehir seçin (opsiyonel)</option>
                {citiesData.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
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
              <label className="text-[13px] font-bold text-text-primary">Veteriner Adı</label>
              <input value={vetName} onChange={e => setVetName(e.target.value)} placeholder="Örn: Dr. Ali Yılmaz" className="input-base"/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Veteriner Telefonu</label>
              <input value={vetPhone} onChange={e => setVetPhone(e.target.value)} type="tel" placeholder="05xx xxx xx xx" className="input-base"/>
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
        </>
      )}

      {activeTab === 'Acil Durum' && (
        <div className="flex flex-col gap-5 animate-fadeInUp">
          <div className="card-base p-6 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-error/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-start justify-between relative z-10 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gradient-to-tr from-red-100 to-rose-50 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-error/10">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="sirenGradProfile" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#EF4444" />
                        <stop offset="100%" stop-color="#F43F5E" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2V4M12 2L9 5M12 2L15 5" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                    <rect x="5" y="16" width="14" height="3" rx="1.5" fill="#94A3B8" />
                    <path d="M6 16C6 11.5817 9.58172 8 14 8C14.4183 8 14.75 8.3317 14.75 8.75V16H6Z" fill="url(#sirenGradProfile)" transform="translate(-2, 0)" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-text-primary text-[17px]">Acil Durum (SOS) Ağı</h3>
                  <p className="text-[13px] text-text-secondary mt-0.5 leading-relaxed">
                    Dostunuz kaybolduğunda veya acil bir sağlık durumunda ulaşılabilecek kişileri yönetin.
                  </p>
                </div>
              </div>
            </div>

            <form className="flex flex-col gap-4 relative z-10" onSubmit={saveSos}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-3 p-5 bg-error/[0.02] rounded-2xl border border-error/10 hover:border-error/30 transition-colors">
                  <p className="text-[11px] font-black text-error uppercase tracking-widest">Kişi 1 (Birincil)</p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-text-secondary">Ad Soyad (İsim)</label>
                    <input 
                      type="text" 
                      className="input-base text-[14px] py-3 px-4 bg-white" 
                      placeholder="Ad Soyad (İsim)" 
                      value={sosContacts[0]?.name || ''} 
                      onChange={e => { const nc = [...sosContacts]; nc[0] = { ...nc[0], name: e.target.value }; setSosContacts(nc); }} 
                      required 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-text-secondary">Telefon</label>
                    <input 
                      type="tel" 
                      className="input-base text-[14px] py-3 px-4 bg-white" 
                      placeholder="05XX XXX XX XX" 
                      value={sosContacts[0]?.phone || ''} 
                      onChange={e => { const nc = [...sosContacts]; nc[0] = { ...nc[0], phone: e.target.value }; setSosContacts(nc); }} 
                      required 
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-5 bg-bg-main rounded-2xl border border-border-main hover:border-text-secondary/30 transition-colors">
                  <p className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Kişi 2 (İsteğe Bağlı)</p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-text-secondary">Ad Soyad / İsim</label>
                    <input 
                      type="text" 
                      className="input-base text-[14px] py-3 px-4 bg-white" 
                      placeholder="Ad Soyad / İsim" 
                      value={sosContacts[1]?.name || ''} 
                      onChange={e => { const nc = [...sosContacts]; nc[1] = { ...nc[1], name: e.target.value }; setSosContacts(nc); }} 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] font-bold text-text-secondary">Telefon</label>
                    <input 
                      type="tel" 
                      className="input-base text-[14px] py-3 px-4 bg-white" 
                      placeholder="05XX XXX XX XX" 
                      value={sosContacts[1]?.phone || ''} 
                      onChange={e => { const nc = [...sosContacts]; nc[1] = { ...nc[1], phone: e.target.value }; setSosContacts(nc); }} 
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-border-main">
                {sosStatus ? (
                  <div className={`text-[13px] font-bold px-4 py-2 rounded-xl ${sosStatus.type === 'ok' ? 'text-success bg-success/10' : 'text-error bg-error/10'}`}>
                    {sosStatus.text}
                  </div>
                ) : <div/>}
                <button type="submit" disabled={savingSos} className="btn-primary bg-error hover:bg-error/90 border-none py-3.5 px-8 text-[14px] font-black shadow-sm cursor-pointer rounded-xl transition-transform active:scale-95">
                  {savingSos ? 'Kaydediliyor...' : 'Ağı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

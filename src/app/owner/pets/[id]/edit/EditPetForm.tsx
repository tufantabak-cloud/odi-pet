'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import citiesData from '@/lib/cities.json'

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
  const [loading, setLoading] = useState(false)
  const [yearOnly, setYearOnly] = useState(false)
  
  const [petName, setPetName] = useState(pet.name || '')
  const [birthDate, setBirthDate] = useState(pet.birth_date || '')
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

  const handleDelete = async () => {
    if (confirm(`DİKKAT: ${pet.name} profilini kalıcı olarak silmek istediğinizden emin misiniz?`)) {
      setLoading(true)
      try {
        const res = await fetch(`/api/pets/${pet.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Silinemedi')
        router.push('/owner/dashboard')
        router.refresh()
      } catch(e) {
        alert('Silme işlemi başarısız oldu. Sadece asıl sahip silebilir.')
        setLoading(false)
      }
    }
  }

  return (
    <div className="flex flex-col w-full mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 border-b border-border-main pb-4 sticky top-0 bg-surface/90 backdrop-blur z-10 pt-2">
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
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-text-primary">Doğum Tarihi</label>
                <button type="button" onClick={() => { setYearOnly(v => !v); setBirthDate('') }} className="text-[11px] font-bold text-primary hover:underline">
                  {yearOnly ? 'Tam Tarih Gir' : 'Sadece Yıl Gir'}
                </button>
              </div>
              {yearOnly ? (
                <select value={birthDate ? birthDate.slice(0, 4) : ''} className="input-base" onChange={e => setBirthDate(e.target.value ? `${e.target.value}-01-01` : '')}>
                  <option value="">Yıl seçin</option>
                  {Array.from({ length: currentYear - 2000 + 1 }, (_, i) => currentYear - i).map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              ) : (
                <input type="date" value={birthDate} max={new Date().toISOString().split('T')[0]} className="input-base" onChange={e => setBirthDate(e.target.value)}/>
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

        {/* ─── BÖLÜM 4: Tehlikeli Alan ─── */}
        <section className="mt-8 border-2 border-error/20 bg-error/5 rounded-2xl p-6 flex flex-col items-center text-center gap-3">
          <span className="text-[32px]">🗑️</span>
          <p className="font-bold text-text-primary text-[15px]">Profili Kalıcı Olarak Sil</p>
          <p className="text-[13px] text-text-secondary max-w-sm">Bu işlem geri alınamaz. {pet.name} profili, aşı kayıtları ve sağlık geçmişi silinecektir.</p>
          <button type="button" onClick={handleDelete} disabled={loading} className="mt-2 w-full max-w-[200px] py-3 rounded-xl border-2 border-error/40 text-error font-bold text-[13px] hover:bg-error/10 hover:-translate-y-0.5 transition-all shadow-sm">
            Kalıcı Olarak Sil
          </button>
        </section>

      </form>
    </div>
  )
}

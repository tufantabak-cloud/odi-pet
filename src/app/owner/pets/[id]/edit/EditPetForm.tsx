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
  const [step, setStep] = useState(1)
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

  // Step state
  const [microchipNo, setMicrochipNo] = useState(pet.microchip_no || '')
  const [passportNo, setPassportNo] = useState(pet.passport_no || '')
  const [tattooNo, setTattooNo] = useState(pet.tattoo_no || '')
  const [pedigreeSire, setPedigreeSire] = useState(pet.pedigree_sire || '')
  const [pedigreeDam, setPedigreeDam] = useState(pet.pedigree_dam || '')
  const [vetName, setVetName] = useState(pet.vet_name || '')
  const [vetPhone, setVetPhone] = useState(pet.vet_phone || '')
  const [selectedDistrict, setSelectedDistrict] = useState(pet.district || '')

  const species = pet.species as 'Kedi' | 'Köpek'
  const breeds = species === 'Kedi' ? CAT_BREEDS : DOG_BREEDS
  const colors = species === 'Kedi' ? CAT_COLORS : DOG_COLORS
  const emoji = species === 'Kedi' ? '🐱' : '🐶'
  const currentYear = new Date().getFullYear()
  const TOTAL_STEPS = 7

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitError('')

    if (!petName.trim() || !selectedBreed) {
      setStep(1)
      return
    }

    setLoading(true)

    const fd = new FormData(e.currentTarget)
    fd.set('species', species)
    fd.set('name', petName)
    fd.set('breed', selectedBreed)
    if (birthDate) fd.set('birth_date', birthDate)
    if (photoFile) fd.set('avatar', photoFile)
    
    // Hidden fields or state-based overrides
    fd.set('city', citiesData.find(c => c.code === selectedCityCode)?.name || '')
    fd.set('district', selectedDistrict)

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

  const stepTitles: Record<number, { title: string; desc: string }> = {
    1: { title: 'Temel Bilgiler',    desc: `${emoji} ${species}inizin genel kimlik bilgileri` },
    2: { title: 'Evrak & Kimlik',    desc: 'Mikroçip, pasaport ve dövme numaraları' },
    3: { title: 'Soy Ağacı',         desc: `${species} soyuna ait anne/baba bilgileri (opsiyonel)` },
    4: { title: 'Veteriner Bilgisi', desc: 'Kayıtlı veterinerinizin iletişim bilgileri' },
    5: { title: 'Fotoğraf',          desc: `${emoji} ${species}inizin sevimli fotoğrafını ekleyin` },
    6: { title: 'Sahipler',          desc: 'Bu patiye kimler bakıyor? Ortak sahip ekleyin.' },
    7: { title: 'Gelişmiş Ayarlar',  desc: 'Tehlikeli alan ve sistem ayarları' },
  }

  return (
    <div className="flex flex-col w-full mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 border-b border-border-main pb-4">
        <button type="button" onClick={() => step === 1 ? router.back() : setStep(s => s - 1)}
          className="w-10 h-10 rounded-full border border-border-main flex items-center justify-center text-text-secondary hover:text-primary transition-all">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div className="flex flex-col flex-1">
          <h1 className="text-[20px] font-extrabold text-text-primary tracking-tight">{pet.name} Düzenle</h1>
          <p className="text-[12px] text-text-secondary font-medium">Adım {step} / {TOTAL_STEPS} — {stepTitles[step].title}</p>
        </div>
        {/* Progress */}
        <div className="flex gap-1.5 shrink-0">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i}
              className={`h-1.5 transition-all duration-300 rounded-full ${i < step ? 'bg-primary' : 'bg-border-main'} ${i === step - 1 ? 'w-6' : 'w-3'}`}
            />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} id="pet-form">
        {/* ─── STEP 1: Temel ─── */}
        {step === 1 && (
          <div className="card-base p-6 sm:p-8 flex flex-col gap-5 animate-fadeIn">
            <p className="text-[13px] text-text-secondary">{stepTitles[1].desc}</p>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">İsim *</label>
              <input value={petName} onChange={e => setPetName(e.target.value)} className="input-base" placeholder="İsim" required/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Irk *</label>
              <select value={selectedBreed} onChange={e => setSelectedBreed(e.target.value)} className="input-base" required>
                <option value="" disabled>Irk seçin</option>
                {breeds.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Cinsiyet</label>
                <div className="flex gap-2">
                  {[['male', '♂ Erkek'], ['female', '♀ Dişi']].map(([v, l]) => (
                    <label key={v} className={`flex-1 flex items-center justify-center p-3 border-2 rounded-[14px] cursor-pointer text-[13px] font-bold transition-all ${pet.gender === v ? 'border-primary bg-primary-soft/30 text-primary' : 'border-border-main text-text-secondary'}`}>
                      <input type="radio" name="gender" value={v} defaultChecked={pet.gender === v} className="sr-only"/>
                      {l}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Doğum Tarihi</label>
                <input type="date" name="birth_date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="input-base"/>
                <p className="text-[11px] text-primary font-bold">✨ Aşı takvimi bu tarihe göre otomatik oluşturulacaktır.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Renk / Desen</label>
              <select name="color" defaultValue={pet.color || ''} className="input-base">
                <option value="">Seçin (opsiyonel)</option>
                {colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">Şehir</label>
                <select value={selectedCityCode} onChange={e => setSelectedCityCode(e.target.value)} className="input-base">
                  <option value="" disabled>Şehir seçin</option>
                  {citiesData.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-bold text-text-primary">İlçe</label>
                <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} className="input-base" disabled={!selectedCityCode}>
                  <option value="" disabled>İlçe seçin</option>
                  {(citiesData.find(c => c.code === selectedCityCode)?.districts || []).map((d: string) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button type="button" onClick={() => setStep(2)} className="btn-primary min-w-[140px]">Devam Et →</button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: Evrak ─── */}
        {step === 2 && (
          <div className="card-base p-6 sm:p-8 flex flex-col gap-5 animate-fadeIn">
            <p className="text-[13px] text-text-secondary">{stepTitles[2].desc}</p>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Mikroçip No</label>
              <input name="microchip_no" value={microchipNo} onChange={e => setMicrochipNo(e.target.value)} placeholder="15 haneli" className="input-base"/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Pasaport No</label>
              <input name="passport_no" value={passportNo} onChange={e => setPassportNo(e.target.value)} className="input-base"/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Dövme No</label>
              <input name="tattoo_no" value={tattooNo} onChange={e => setTattooNo(e.target.value)} className="input-base"/>
            </div>
            <div className="flex justify-end mt-5">
              <button type="button" onClick={() => setStep(3)} className="btn-primary min-w-[140px]">Devam Et →</button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Soy Ağacı ─── */}
        {step === 3 && (
          <div className="card-base p-6 sm:p-8 flex flex-col gap-5 animate-fadeIn">
            <p className="text-[13px] text-text-secondary">{stepTitles[3].desc}</p>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">{emoji} Baba Adı</label>
              <input name="pedigree_sire" value={pedigreeSire} onChange={e => setPedigreeSire(e.target.value)} className="input-base"/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">{emoji} Anne Adı</label>
              <input name="pedigree_dam" value={pedigreeDam} onChange={e => setPedigreeDam(e.target.value)} className="input-base"/>
            </div>
            <div className="flex justify-end mt-5">
              <button type="button" onClick={() => setStep(4)} className="btn-primary min-w-[140px]">Devam Et →</button>
            </div>
          </div>
        )}

        {/* ─── STEP 4: Veteriner ─── */}
        {step === 4 && (
          <div className="card-base p-6 sm:p-8 flex flex-col gap-5 animate-fadeIn">
            <p className="text-[13px] text-text-secondary">{stepTitles[4].desc}</p>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Veteriner Adı</label>
              <input name="vet_name" value={vetName} onChange={e => setVetName(e.target.value)} className="input-base"/>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-bold text-text-primary">Veteriner Telefonu</label>
              <input name="vet_phone" value={vetPhone} onChange={e => setVetPhone(e.target.value)} className="input-base"/>
            </div>
            <div className="flex justify-end mt-5">
              <button type="button" onClick={() => setStep(5)} className="btn-primary min-w-[140px]">Devam Et →</button>
            </div>
          </div>
        )}

        {/* ─── STEP 5: Fotoğraf ─── */}
        {step === 5 && (
          <div className="card-base p-6 sm:p-8 flex flex-col gap-6 animate-fadeIn">
            <p className="text-[13px] text-text-secondary">{stepTitles[5].desc}</p>
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
              <div className="flex gap-3 w-full max-w-xs">
                <label className="flex-1 flex flex-col items-center gap-2 p-4 rounded-[16px] border-2 border-border-main bg-surface hover:border-primary/40 cursor-pointer transition-all">
                  <input type="file" accept="image/*" className="sr-only" onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) { setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file)) }
                  }}/>
                  <span className="text-[12px] font-bold text-text-secondary">Galeriden Seç</span>
                </label>
              </div>
              {photoPreview && photoFile && (
                <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(pet.avatar_url || '') }} className="text-[12px] font-bold text-error/70">× Değişikliği Geri Al</button>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setStep(6)} className="btn-primary min-w-[140px]">Devam Et →</button>
            </div>
          </div>
        )}

        {/* ─── STEP 6: Sahipler ─── */}
        {step === 6 && (
          <div className="card-base p-6 sm:p-8 flex flex-col gap-6 animate-fadeIn">
            <p className="text-[13px] text-text-secondary">{stepTitles[6].desc}</p>
            
            <div className="flex flex-col gap-4">
              <label className="text-[13px] font-bold text-text-primary">Mevcut Sahipler</label>
              <div className="flex flex-col gap-2">
                {(pet.pet_owners || []).map((po: any) => (
                  <div key={po.profile_id} className="flex items-center justify-between p-3 bg-surface border border-border-main rounded-[12px]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center text-[12px] font-bold text-primary">
                        {po.profiles?.first_name?.[0] || 'U'}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-text-primary">
                          {po.profiles?.first_name} {po.profiles?.last_name}
                        </p>
                        <p className="text-[11px] text-text-secondary capitalize">{po.role}</p>
                      </div>
                    </div>
                    {po.role === 'owner' && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Asıl Sahip</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-primary-soft/30 border border-primary/20 rounded-[16px]">
              <p className="text-[12px] font-bold text-primary mb-1">💡 Ortak Sahip Ekleme</p>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Yakında: Diğer sahipleri e-posta adresiyle davet edebileceksiniz. Şu an sadece siz yetkilisiniz.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={() => setStep(7)} className="btn-primary min-w-[140px]">Devam Et →</button>
            </div>
          </div>
        )}

        {/* ─── STEP 7: Gelişmiş Ayarlar ─── */}
        {step === 7 && (
          <div className="card-base p-6 sm:p-8 flex flex-col gap-6 animate-fadeIn">
            <p className="text-[13px] text-text-secondary">{stepTitles[7].desc}</p>
            
            <div className="flex justify-end gap-3 mt-5 mb-8 border-b border-border-main pb-8">
              <button type="submit" disabled={loading} className="btn-primary min-w-[160px]">
                {loading ? 'Kaydediliyor...' : 'Kaydı Güncelle'}
              </button>
            </div>

            {/* Danger Zone */}
            <div>
              <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest mb-4">Tehlikeli Alan</h3>
              <div className="p-5 border-2 border-error/20 bg-error/5 rounded-2xl flex flex-col items-center text-center gap-3">
                <span className="text-[32px]">🗑️</span>
                <p className="font-bold text-text-primary text-[15px]">Evcil Hayvanı Sil</p>
                <p className="text-[13px] text-text-secondary">Bu işlem geri alınamaz. {pet.name} profili, aşı kayıtları, fotoğrafları ve tüm sağlık geçmişi kalıcı olarak silinecektir.</p>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`DİKKAT: ${pet.name} profilini kalıcı olarak silmek istediğinizden emin misiniz?`)) {
                      setLoading(true)
                      try {
                        const res = await fetch(`/api/pets/${pet.id}`, { method: 'DELETE' })
                        if (!res.ok) throw new Error('Silinemedi')
                        router.push('/owner/pets')
                        router.refresh()
                      } catch(e) {
                        alert('Silme işlemi başarısız oldu. Sadece asıl sahip silebilir.')
                        setLoading(false)
                      }
                    }
                  }}
                  disabled={loading}
                  className="mt-2 w-full max-w-[200px] py-3 rounded-xl border-2 border-error/40 text-error font-bold text-[13px] hover:bg-error/10 hover:-translate-y-0.5 transition-all shadow-sm"
                >
                  Kalıcı Olarak Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {submitError && <p className="text-error text-center mt-4 font-bold">⚠️ {submitError}</p>}
      </form>
    </div>
  )
}


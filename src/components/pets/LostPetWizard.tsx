'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { DefaultCatAvatar, DefaultDogAvatar } from '@/components/icons/PetIcons'

interface LostPetWizardProps {
  pet: any;
  ownerPhone?: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

export default function LostPetWizard({ pet, ownerPhone, onComplete, onCancel }: LostPetWizardProps) {
  const [step, setStep] = useState(1)
  const [contactPhone, setContactPhone] = useState(ownerPhone || pet.sos_contacts?.[0]?.phone || '')
  const [location, setLocation] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedDistrict, setSelectedDistrict] = useState('')
  const [latLon, setLatLon] = useState<{lat: number, lon: number} | null>(null)
  const [provinces, setProvinces] = useState<any[]>([])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/provinces')
      .then(res => res.json())
      .then(res => {
        if (res.status === 'OK' && res.data) {
          // Sort alphabetically
          const sorted = res.data.sort((a: any, b: any) => a.name.localeCompare(b.name, 'tr'))
          setProvinces(sorted)
        }
      })
      .catch(err => console.error("Provinces fetch error:", err))
  }, [])

  const handleNext = () => {
    const phone = contactPhone.replace(/[\s-()]/g, '')
    if (!/^\+?[0-9]{10,15}$/.test(phone)) {
      setError('Lütfen geçerli bir telefon numarası giriniz (örn: 05554443322).')
      return
    }
    setError('')
    setStep(2)
  }

  const handleSubmit = async () => {
    const trimmedLoc = location.trim()
    if (!selectedCity) {
      setError('Lütfen bir il seçiniz.')
      return
    }
    if (!selectedDistrict) {
      setError('Lütfen bir ilçe seçiniz.')
      return
    }
    if (!trimmedLoc || trimmedLoc.length < 5) {
      setError('Lütfen son görüldüğü yeri detaylı giriniz (en az 5 karakter).')
      return
    }
    if (trimmedLoc.length > 500) {
      setError('Konum bilgisi çok uzun, lütfen kısaltınız (en fazla 500 karakter).')
      return
    }

    setLoading(true)
    setError('')

    try {
      const fullLocation = `${selectedCity} / ${selectedDistrict} - ${trimmedLoc}`

      const res = await fetch(`/api/pets/${pet.id}/lost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_phone: contactPhone,
          last_seen_location: fullLocation,
          city: selectedCity,
          district: selectedDistrict,
          latitude: latLon?.lat,
          longitude: latLon?.lon
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'İlan oluşturulamadı')

      if (onComplete) onComplete()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setLoading(true)
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude
          const lon = pos.coords.longitude
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=tr`)
            const data = await res.json()
            setLatLon({ lat, lon })
            if (data && data.address) {
              const addr = data.address
              const provinceName = addr.province || addr.city || addr.state
              let districtName = addr.town || addr.county || addr.city_district || addr.district || addr.suburb

              if (provinceName) {
                const matchedProv = provinces.find(p => p.name.localeCompare(provinceName, 'tr', { sensitivity: 'base' }) === 0 || provinceName.includes(p.name))
                if (matchedProv) {
                  setSelectedCity(matchedProv.name)
                  
                  if (districtName) {
                    let cleanDist = districtName.replace(' İlçesi', '').replace(' Belediyesi', '').trim()
                    let matchedDist = matchedProv.districts?.find((d: any) => d.name.localeCompare(cleanDist, 'tr', { sensitivity: 'base' }) === 0 || cleanDist.includes(d.name))
                    
                    if (matchedDist) {
                      setSelectedDistrict(matchedDist.name)
                    } else {
                      setSelectedDistrict('')
                    }
                  }
                }
              }

              const road = addr.road || ''
              const suburb = addr.suburb || addr.neighbourhood || ''
              const parts = [suburb, road].filter(Boolean)
              if (parts.length > 0) {
                setLocation(parts.join(', '))
              } else {
                setLocation(`${lat.toFixed(6)}, ${lon.toFixed(6)}`)
              }
            } else {
              setLocation(`${lat.toFixed(6)}, ${lon.toFixed(6)}`)
            }
          } catch (err) {
            setLocation(`${lat.toFixed(6)}, ${lon.toFixed(6)}`)
          } finally {
            setLoading(false)
          }
        },
        () => {
          setError('Konum alınamadı, lütfen izin verin veya adresi manuel yazın.')
          setLoading(false)
        }
      )
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="w-full max-w-md mx-auto bg-surface rounded-[28px] border border-border-main/60 p-6 shadow-2xl flex flex-col justify-between min-h-[480px] transition-all duration-300 relative overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-error/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-6 relative z-10">
          <span className="text-[12px] font-black text-error uppercase tracking-wider">
            Adım {step}/2: {step === 1 ? 'İletişim' : 'Konum'}
          </span>

          <div className="flex flex-col gap-2">
            <h2 className="text-[24px] font-extrabold text-text-primary tracking-tight leading-tight">
              Kayıp İlanı Oluştur
            </h2>
            <p className="text-[14px] text-text-secondary font-medium leading-relaxed">
              {step === 1 ? 'Dostunuz bulunduğunda size ulaşılacak numarayı teyit edin.' : 'Lütfen son görüldüğü yeri haritadan seçin veya adres olarak girin.'}
            </p>
          </div>

          {error && <div className="p-3 bg-error/10 text-error text-[13px] font-bold rounded-xl">{error}</div>}

          {step === 1 ? (
            <div className="flex flex-col gap-5 mt-2">
              {/* Pet Info ReadOnly */}
              <div className="flex items-center gap-4 p-4 border border-border-main rounded-[16px] bg-bg-main">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-soft to-white rounded-[14px] flex items-center justify-center text-[24px] overflow-hidden relative shadow-sm">
                  {pet.avatar_url ? <Image src={pet.avatar_url} fill={true} className="object-cover" alt={pet.name} /> : (pet.species === 'Kedi' ? <DefaultCatAvatar width={36} height={36} /> : <DefaultDogAvatar width={36} height={36} />)}
                </div>
                <div>
                  <p className="font-extrabold text-text-primary text-[15px]">{pet.name}</p>
                  <p className="text-text-secondary text-[12px] font-medium">{pet.species} • {pet.breed || 'Bilinmiyor'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">İletişim Numarası</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="05XX XXX XX XX"
                  className="w-full input-base py-3.5 px-4 text-[14px] bg-white border border-border-main rounded-xl focus:outline-none focus:border-error transition-all"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5 mt-2">
              <button onClick={handleGetLocation} disabled={loading} type="button" className="flex justify-center items-center gap-2 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-[13px] border border-blue-100 hover:bg-blue-100 transition-colors disabled:opacity-50">
                {loading ? (
                  <span className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                )}
                {loading ? 'Konum Çözümleniyor...' : 'Mevcut Konumumu Al'}
              </button>

              <div className="flex gap-3">
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">İl *</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => {
                      setSelectedCity(e.target.value)
                      setSelectedDistrict('')
                    }}
                    className="w-full input-base py-3.5 px-4 text-[14px] bg-white border border-border-main rounded-xl focus:outline-none focus:border-error transition-all"
                  >
                    <option value="">Seçiniz</option>
                    {provinces.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">İlçe *</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    disabled={!selectedCity}
                    className="w-full input-base py-3.5 px-4 text-[14px] bg-white border border-border-main rounded-xl focus:outline-none focus:border-error transition-all disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">Seçiniz</option>
                    {selectedCity && provinces.find(p => p.name === selectedCity)?.districts?.sort((a:any, b:any) => a.name.localeCompare(b.name, 'tr')).map((d: any) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Detaylı Adres / Not</label>
                <textarea
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Mahalle, sokak veya belirgin bir adres..."
                  rows={2}
                  className="w-full input-base py-3.5 px-4 text-[14px] bg-white border border-border-main rounded-xl focus:outline-none focus:border-error transition-all resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 relative z-10">
          {step === 1 ? (
            <button onClick={handleNext} disabled={!contactPhone.trim()} className="w-full bg-text-primary text-white font-bold rounded-xl py-3.5 px-4 active:scale-[0.98] transition-all text-[15px] text-center shadow-md disabled:opacity-50">
              Devam Et
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading || !location.trim() || !selectedCity || !selectedDistrict} className="w-full bg-error text-white font-bold rounded-xl py-3.5 px-4 active:scale-[0.98] transition-all text-[15px] text-center shadow-md disabled:opacity-50">
              {loading ? 'Yayınlanıyor...' : 'İlanı Yayınla'}
            </button>
          )}
          {onCancel && (
            <button onClick={onCancel} type="button" className="w-full text-text-secondary hover:text-text-primary text-[13px] font-bold py-2 transition-all text-center">
              Vazgeç
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

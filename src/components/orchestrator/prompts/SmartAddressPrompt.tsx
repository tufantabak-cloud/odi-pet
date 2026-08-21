'use client'

import React, { useState, useEffect } from 'react'
import FormModal from '@/components/ui/FormModal'
import Input from '@/components/ui/primitives/Input'
import Button from '@/components/ui/primitives/Button'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { ShieldAlert, MapPin, CheckCircle2, Edit2 } from 'lucide-react'
import { useGeolocation } from '@/contexts/GeolocationContext'

interface SmartAddressPromptProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
  uiConfig?: Record<string, unknown>
  displayType?: string
}

export default function SmartAddressPrompt({
  open,
  onClose,
  onSubmit,
  uiConfig,
  displayType,
}: SmartAddressPromptProps) {
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [contactName, setContactName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  const [geolocating, setGeolocating] = useState(false)
  const [resolvingPostalCode, setResolvingPostalCode] = useState(false)
  const [locationMessage, setLocationMessage] = useState<string | null>(null)
  const [showManualInputs, setShowManualInputs] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal açıldığında kullanıcının mevcut profil ve SOS kişisi verilerini otomatik yükle
  useEffect(() => {
    if (!open) return

    async function loadExistingData() {
      try {
        const supabase = createBrowserSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. Profil verilerini getir (İl, İlçe, Mahalle, Posta Kodu, Telefon)
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone, city, district, neighborhood, postal_code')
          .eq('id', user.id)
          .single()

        // 2. Pet SOS Kişisi verilerini getir
        const { data: pets } = await supabase
          .from('pets')
          .select('sos_contacts')
          .eq('owner_id', user.id)
          .limit(1)

        const petSos = pets?.[0]?.sos_contacts as any[] | null
        const firstSos = Array.isArray(petSos) && petSos.length > 0 ? petSos[0] : null

        if (profile) {
          if (profile.city) setCity(profile.city)
          if (profile.district) setDistrict(profile.district)
          if (profile.neighborhood) setNeighborhood(profile.neighborhood)
          if (profile.postal_code) setPostalCode(profile.postal_code)
        }

        // İsim ön-doldurma (Öncelik: SOS kişisi adı -> Profil Adı Soyadı)
        const defaultName = firstSos?.name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || ''
        if (defaultName) setContactName(defaultName)

        // Telefon ön-doldurma (Öncelik: SOS kişisi telefonu -> Profil telefonu)
        const defaultPhone = firstSos?.phone || profile?.phone || ''
        if (defaultPhone) setEmergencyPhone(defaultPhone)

      } catch (e) {
        console.warn('[SmartAddressPrompt] Ön veri yükleme uyarısı:', e)
      }
    }

    loadExistingData()
  }, [open])

  const { requestLocation } = useGeolocation()

  // 📍 1. Adım: GPS Konumundan Posta Kodu ve Adres Bulma
  const handleGetLocation = async () => {
    setGeolocating(true)
    setError(null)
    setLocationMessage(null)

    const coords = await requestLocation()
    if (!coords) {
      setGeolocating(false)
      // The context mapped the error already. We can just fallback to a generic message.
      setError('GPS konumu alınamadı veya izin reddedildi. Lütfen Posta Kodunuzu girin.')
      return
    }

    const lat = coords.latitude
    const lng = coords.longitude
    setLatitude(lat)
    setLongitude(lng)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=tr`
      )
      const data = await response.json()

      if (data && data.address) {
        const addr = data.address
        const detectedCity = addr.city || addr.province || addr.state || addr.region || ''
        const detectedDistrict = addr.district || addr.town || addr.county || addr.borough || addr.suburb || ''
        const detectedNeighborhood = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || addr.residential || ''
        const detectedPostcode = addr.postcode || ''

        if (detectedCity) setCity(detectedCity)
        if (detectedDistrict) setDistrict(detectedDistrict)
        if (detectedNeighborhood) setNeighborhood(detectedNeighborhood)
        if (detectedPostcode) setPostalCode(detectedPostcode)

        const summaryParts = [detectedCity, detectedDistrict, detectedNeighborhood].filter(Boolean)
        setLocationMessage(`📍 Konumunuz GPS ile otomatik bulundu: ${summaryParts.join(', ')}`)
      } else {
        setLocationMessage('📍 GPS koordinatları alındı.')
      }
    } catch {
      setLocationMessage('📍 GPS koordinatları alındı.')
    } finally {
      setGeolocating(false)
    }
  }

  // 📮 2. Adım: Posta Kodundan İl / İlçe / Mahalle Otomatik Çözümleme
  const resolveAddressFromPostalCode = async (code: string) => {
    const cleanCode = code.trim()
    if (cleanCode.length !== 5 || !/^\d{5}$/.test(cleanCode)) return

    setResolvingPostalCode(true)
    setError(null)

    try {
      const response = await fetch(`/api/location/postcode?code=${encodeURIComponent(cleanCode)}`)
      const data = await response.json()

      if (data.success) {
        if (data.city) setCity(data.city)
        if (data.district) setDistrict(data.district)
        if (data.neighborhood) setNeighborhood(data.neighborhood)

        const summaryParts = [data.city, data.district, data.neighborhood].filter(Boolean)
        setLocationMessage(`📮 Posta Kodundan (${cleanCode}) adresiniz otomatik çözümlendi: ${summaryParts.join(', ')}`)
      } else {
        setLocationMessage(`📮 Posta Kodu (${cleanCode}) girildi. Konum butonunu veya manuel düzenlemeyi kullanabilirsiniz.`)
      }
    } catch (e) {
      console.warn('[SmartAddressPrompt] Posta Kodu sorgu uyarısı:', e)
    } finally {
      setResolvingPostalCode(false)
    }
  }

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 5)
    setPostalCode(val)
    setError(null)
    if (val.length === 5) {
      resolveAddressFromPostalCode(val)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!postalCode.trim() && (!city.trim() || !district.trim())) {
      setError('Lütfen Posta Kodunuzu girin veya konumu otomatik bulun.')
      return
    }
    if (!contactName.trim()) {
      setError('Lütfen Acil Durum Kişisi Adı Soyadı alanını doldurun.')
      return
    }
    if (!emergencyPhone.trim()) {
      setError('Lütfen Acil Durum Telefonu alanını doldurun.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await onSubmit({
        postal_code: postalCode.trim(),
        city: city.trim(),
        district: district.trim(),
        neighborhood: neighborhood.trim(),
        latitude,
        longitude,
        contact_name: contactName.trim(),
        emergency_phone: emergencyPhone.trim(),
      })
      // Reset state
      setPostalCode('')
      setCity('')
      setDistrict('')
      setNeighborhood('')
      setContactName('')
      setEmergencyPhone('')
      setLatitude(null)
      setLongitude(null)
      setLocationMessage(null)
    } catch {
      setError('Kayıt sırasında bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormModal
      open={open}
      title={(uiConfig?.title as string) || 'Acil Durum Konum & İletişim'}
      description=""
      icon="🚨"
      iconBg="bg-red-100"
      displayType={displayType}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* OPOS Uyumlu Bilgilendirme Uyarısı (Açık Adres Alınmaz Açıklaması) */}
        <div className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-amber-950 shadow-sm">
          <div className="p-2 bg-amber-100/90 rounded-xl text-amber-800 shrink-0 mt-0.5">
            <ShieldAlert size={18} className="w-4.5 h-4.5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-950 tracking-tight">Acil Durum Konum Doğrulama</h4>
            <p className="text-[13px] leading-relaxed text-amber-900 font-normal">
              Bu alanda açık/tam adres kaydı <strong>alınmaz</strong>. Yalnızca GPS veya Posta Kodu ile eşleşen <strong>İl, İlçe ve Mahalle</strong> bilgileri kaydedilir.
            </p>
          </div>
        </div>

        {/* 📍 1. ADIM: GPS Konumu İle Otomatik Bul */}
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={geolocating}
          className="w-full py-3.5 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-2xl flex items-center justify-center gap-2 text-primary font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {geolocating ? (
            <>
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>GPS Konumu Alınıyor...</span>
            </>
          ) : (
            <>
              <span className="text-base">📍</span>
              <span>1. Adım: Konumumu Otomatik Bul (GPS)</span>
            </>
          )}
        </button>

        {/* 📮 2. ADIM: Posta Kodu Girişi */}
        <div className="relative">
          <Input
            label="Posta Kodu * (Veya Konum Butonuna Basın)"
            placeholder="Örn: 35220"
            value={postalCode}
            onChange={handlePostalCodeChange}
            maxLength={5}
            required
          />
          {resolvingPostalCode && (
            <div className="absolute right-3 bottom-3 text-xs text-primary font-medium flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md">
              <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Sorgulanıyor...
            </div>
          )}
        </div>

        {/* 📍 HER ZAMAN GÖRÜNÜR: Otomatik İl / İlçe / Mahalle Gösterim Kartı */}
        <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5">
              📍 Çözümlenen Konum Bilgisi
            </span>
            <button
              type="button"
              onClick={() => setShowManualInputs(!showManualInputs)}
              className="text-[11px] font-bold text-primary hover:underline"
            >
              {showManualInputs ? 'Gizle' : '✏️ Manuel Düzenle'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 bg-white border border-purple-200/60 rounded-xl flex flex-col items-center">
              <span className="text-[10px] font-semibold text-text-secondary">İl (Şehir)</span>
              <span className="text-xs font-bold text-purple-950 truncate max-w-full">{city || '—'}</span>
            </div>
            <div className="p-2 bg-white border border-purple-200/60 rounded-xl flex flex-col items-center">
              <span className="text-[10px] font-semibold text-text-secondary">İlçe</span>
              <span className="text-xs font-bold text-purple-950 truncate max-w-full">{district || '—'}</span>
            </div>
            <div className="p-2 bg-white border border-purple-200/60 rounded-xl flex flex-col items-center">
              <span className="text-[10px] font-semibold text-text-secondary">Mahalle</span>
              <span className="text-xs font-bold text-purple-950 truncate max-w-full">{neighborhood || '—'}</span>
            </div>
          </div>
        </div>

        {/* Konum Başarı Bildirimi */}
        {locationMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <span>✅</span>
            <span>{locationMessage}</span>
          </div>
        )}

        {/* İsteğe Bağlı Manuel Alanlar (Düzenle butonuna basılınca açılır) */}
        {showManualInputs && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <p className="text-xs font-bold text-slate-700">Manuel Adres Düzeltme</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="İl"
                placeholder="Örn: İzmir"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="İlçe"
                placeholder="Örn: Konak"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </div>
            <Input
              label="Mahalle"
              placeholder="Örn: Alsancak"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
            />
          </div>
        )}

        {/* Acil Durum İletişim Kişisi Adı Soyadı */}
        <Input
          label="Acil Durum Kişisi Adı Soyadı *"
          placeholder="Örn: Tufan Tabak"
          value={contactName}
          onChange={(e) => { setContactName(e.target.value); setError(null) }}
          required
        />

        {/* Acil Durum Telefonu */}
        <Input
          label="Acil Durum Telefonu *"
          type="tel"
          placeholder="05XX XXX XX XX"
          value={emergencyPhone}
          onChange={(e) => { setEmergencyPhone(e.target.value); setError(null) }}
          required
        />

        {error && (
          <div className="p-3 bg-danger-soft text-danger text-sm font-medium rounded-xl">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" type="button" onClick={onClose} fullWidth>İptal</Button>
          <Button variant="danger" type="submit" isLoading={loading} fullWidth>Konumu Kaydet ve İlerle</Button>
        </div>
      </form>
    </FormModal>
  )
}

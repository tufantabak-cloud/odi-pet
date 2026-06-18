'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import citiesData from '@/lib/cities.json';
import CoachMark from '@/components/ui/CoachMark';

interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  dist_km: number;
  tags: string[];
  is_verified: boolean;
  rating?: number;
  user_ratings_total?: number;
  open_now?: boolean;
  photo_reference?: string;
}

// Haversine formula for distance calculation
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export default function VetsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  // New States
  const [gpsDenied, setGpsDenied] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [selectedClinicDetails, setSelectedClinicDetails] = useState<{
    phone?: string;
    weekday_text?: string[] | null;
    open_now?: boolean | null;
  } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Restore state from sessionStorage on mount (protects against mobile tab discarding)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedClinic = sessionStorage.getItem('vets_selectedClinic');
      const savedClinics = sessionStorage.getItem('vets_clinicsList');
      const savedHasSearched = sessionStorage.getItem('vets_hasSearched');
      if (savedClinics) {
        setClinics(JSON.parse(savedClinics));
      }
      if (savedHasSearched === 'true') {
        setHasSearched(true);
      }
      if (savedClinic) {
        const clinic = JSON.parse(savedClinic) as Clinic;
        setSelectedClinic(clinic);
        fetchClinicDetails(clinic.id);
      }
    } catch (e) {
      // sessionStorage erişim hatası — sessizce devam et
    }
   
  }, []);

  // Monitor online status
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const districts = citiesData.find(c => c.name === selectedCity)?.districts || [];

  const handleCityChange = (val: string) => {
    setSelectedCity(val);
    setSelectedDistrict('');
    setGpsDenied(false); // Hide GPS card when manually searching
  };

  const searchClinics = async (lat?: number, lng?: number) => {
    if (isOffline) return;
    setLoading(true);
    setError(null);
    setHasSearched(false);
    try {
      let url = '/api/vets/search?';
      if (lat && lng) {
        url += `lat=${lat}&lng=${lng}`;
      } else if (selectedCity) {
        url += `city=${encodeURIComponent(selectedCity)}`;
        if (selectedDistrict) {
          url += `&district=${encodeURIComponent(selectedDistrict)}`;
        }
      } else {
        setLoading(false);
        return;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Klinik araması başarısız oldu. Lütfen tekrar deneyin.');
      }

      let fetchedClinics: Clinic[] = data.clinics || [];

      // Calculate distance if user location is available
      if (lat && lng) {
        fetchedClinics = fetchedClinics.map(clinic => ({
          ...clinic,
          dist_km: clinic.latitude && clinic.longitude 
            ? getDistanceFromLatLonInKm(lat, lng, clinic.latitude, clinic.longitude) 
            : 0
        })).sort((a, b) => a.dist_km - b.dist_km);
      } else if (userLocation) {
         fetchedClinics = fetchedClinics.map(clinic => ({
          ...clinic,
          dist_km: clinic.latitude && clinic.longitude 
            ? getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, clinic.latitude, clinic.longitude) 
            : 0
        })).sort((a, b) => a.dist_km - b.dist_km);
      }

      setClinics(fetchedClinics);
      setHasSearched(true);
      // Persist to sessionStorage for tab-discard recovery
      try {
        sessionStorage.setItem('vets_clinicsList', JSON.stringify(fetchedClinics));
        sessionStorage.setItem('vets_hasSearched', 'true');
      } catch (e) { /* quota exceeded — ignore */ }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Klinikler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = () => {
    searchClinics();
  };

  const requestLocation = () => {
    if (isOffline) return;
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Tarayıcınız konum özelliğini desteklemiyor.');
      return;
    }

    setLoading(true);
    setError(null);
    setGpsDenied(false);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        searchClinics(latitude, longitude);
      },
      (err) => {
        console.error('Geolocation error:', err);
        if (err.code === 1) {
          // GPS Permission Denied
          setGpsDenied(true);
        } else if (err.code === 3) {
          // GPS Timeout
          setError('Konum sinyali zaman aşımına uğradı. Lütfen cihaz konumunu kontrol edin veya şehri manuel seçin.');
        } else {
          setError('Konum alınırken bir sorun oluştu. Lütfen cihazınızın konum servislerini kontrol edin.');
        }
        setLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: false, maximumAge: 60000 }
    );
  };

  // Detail functions
  const openClinicDetail = (clinic: Clinic) => {
    setScrollPosition(window.scrollY);
    setSelectedClinic(clinic);
    // Persist for tab-discard recovery (mobile tel: link)
    try {
      sessionStorage.setItem('vets_selectedClinic', JSON.stringify(clinic));
    } catch (e) { /* quota exceeded — ignore */ }
    // Reset details and load new ones
    setSelectedClinicDetails(null);
    fetchClinicDetails(clinic.id);
    window.scrollTo(0, 0);
  };

  const closeClinicDetail = () => {
    setSelectedClinic(null);
    try {
      sessionStorage.removeItem('vets_selectedClinic');
    } catch (e) { /* ignore */ }
    setTimeout(() => {
      window.scrollTo(0, scrollPosition);
    }, 0);
  };

  const fetchClinicDetails = async (placeId: string) => {
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/vets/details?placeId=${placeId}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedClinicDetails(data.details);
      }
    } catch (err) {
      console.error('Error fetching clinic details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const isOpenNow = selectedClinicDetails !== null ? selectedClinicDetails.open_now : selectedClinic?.open_now;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 min-h-dvh pb-32 pb-safe">
      {/* Navigation */}
      <div className="mb-8 animate-fadeInUp">
        {selectedClinic ? (
          <button 
            onClick={closeClinicDetail} 
            className="inline-flex items-center gap-2 min-h-[44px] text-text-secondary hover:text-primary font-bold text-sm transition-colors group cursor-pointer"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Listeye Geri Dön
          </button>
        ) : (
          <Link href="/owner/dashboard" className="inline-flex items-center gap-2 min-h-[44px] text-text-secondary hover:text-primary font-bold text-sm transition-colors group">
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Ana Sayfa'ya Dön
          </Link>
        )}
      </div>

      {/* Header */}
      {!selectedClinic && (
        <div className="text-center mb-[48px] animate-fadeInUp relative">
          <div className="inline-block relative">
            <CoachMark
              hintKey="vets_gps_intro"
              title="Yakınındaki Klinikleri Bul"
              message="Acil bir durumda konumunu kullanarak en yakın, açık ve yüksek puanlı veteriner kliniklerini anında bulabilirsin."
              icon="📍"
              position="bottom"
            />
            <h1 className="text-4xl font-extrabold text-text-primary mb-4 tracking-tight">
              Odi <span className="text-primary">Yanında</span>
            </h1>
          </div>
          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            En yakın dostuna en yakın ve en iyi değerlendirilen veteriner kliniğini bul.
          </p>
        </div>
      )}

      {/* DETAIL VIEW */}
      {selectedClinic && (
        <div className="animate-fadeInUp max-w-xl mx-auto bg-white rounded-card border border-border-main p-8 shadow-soft">
          {/* Back button */}
          <button 
            onClick={closeClinicDetail}
            className="inline-flex items-center gap-2 min-h-[44px] text-text-secondary hover:text-[#34495E] font-bold text-[14px] transition-colors group mb-8 self-start cursor-pointer"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            Geri Dön
          </button>

          {/* Klinik Adı */}
          <h1 className="text-[32px] font-bold text-text-primary mb-[32px] leading-tight">
            {selectedClinic.name}
          </h1>

          {/* Adres + Çalışma Saatleri Stack */}
          <div className="flex flex-col space-y-[12px] mb-[24px]">
            <div className="text-[16px] font-semibold text-text-secondary leading-snug">
              {selectedClinic.address}
            </div>

            {/* Açık/Kapalı durumu */}
            <div className="flex items-center">
              {isOpenNow === true ? (
                <span className="bg-[#EAF2EC] text-[#556B5D] px-[12px] py-[6px] text-[14px] font-semibold rounded-[6px] inline-flex items-center select-none border border-[#EAF2EC]">
                  Açık
                </span>
              ) : isOpenNow === false ? (
                <span className="bg-[#F8EAEB] text-[#8C5D61] px-[12px] py-[6px] text-[14px] font-semibold rounded-[6px] inline-flex items-center select-none border border-[#F8EAEB]">
                  Kapalı
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-600 px-[12px] py-[6px] text-[14px] font-semibold rounded-[6px] inline-flex items-center select-none border border-slate-200">
                  Durum Bilgisi Yok
                </span>
              )}
            </div>

            {/* Çalışma Saatleri Listesi */}
            {detailsLoading ? (
              <div className="space-y-2 py-2">
                <div className="h-4 w-32 bg-border-main rounded animate-pulse" />
                <div className="h-4 w-40 bg-border-main rounded animate-pulse" />
              </div>
            ) : selectedClinicDetails?.weekday_text ? (
              <div className="flex flex-col space-y-[12px] mt-2 border-l-2 border-border-main pl-[16px] py-1">
                {selectedClinicDetails.weekday_text.map((dayText, index) => (
                  <p key={index} className="text-[14px] text-text-secondary leading-none">
                    {dayText}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-text-secondary/60 italic leading-none">
                Çalışma saatleri bilgisi bulunmamaktadır.
              </p>
            )}
          </div>

          {/* Diğer İletişim Bilgileri Stack */}
          <div className="flex flex-col space-y-[12px] border-t border-border-main pt-[24px]">
            <h3 className="text-[14px] font-bold text-text-primary uppercase tracking-wider">
              İletişim Bilgileri
            </h3>
            {detailsLoading ? (
              <div className="h-4 w-48 bg-border-main rounded animate-pulse" />
            ) : selectedClinicDetails?.phone ? (
              <p className="text-[14px] text-text-secondary leading-none flex items-center gap-2">
                <svg className="w-4 h-4 text-text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {selectedClinicDetails.phone}
              </p>
            ) : (
              <p className="text-[14px] text-text-secondary/60 italic leading-none">
                Telefon bilgisi bulunmamaktadır.
              </p>
            )}
            
            {selectedClinic.dist_km > 0 && (
              <p className="text-[14px] text-text-secondary leading-none flex items-center gap-2">
                <svg className="w-4 h-4 text-text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Mevcut konumunuza {selectedClinic.dist_km.toFixed(1)} km uzaklıkta
              </p>
            )}
          </div>

          {/* Sticky Footer */}
          <div className="fixed bottom-0 left-0 right-0 z-45 px-[16px] pb-[16px] pb-safe bg-gradient-to-t from-bg-main via-bg-main/90 to-transparent pt-8">
            <div className="max-w-xl mx-auto flex gap-[16px]">
              {/* Ara Button */}
              {selectedClinicDetails?.phone ? (
                <a 
                  href={`tel:${selectedClinicDetails.phone.replace(/\s+/g, '')}`}
                  className="flex-1 text-center bg-[#34495E] hover:bg-[#2C3E50] text-white text-[16px] font-bold py-[16px] px-[20px] rounded-btn transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27 11.72 11.72 0 003.79.6 1 1 0 011 1v3.5a1 1 0 01-1 1A16 16 0 013 5a1 1 0 011-1h3.5a1 1 0 011 1 11.72 11.72 0 00.6 3.79 1 1 0 01-.27 1.11l-2.2 2.2z" />
                  </svg>
                  Ara
                </a>
              ) : (
                <button 
                  disabled
                  className="flex-1 text-center bg-[#34495E] text-white/50 text-[16px] font-bold py-[16px] px-[20px] rounded-btn flex items-center justify-center gap-2 opacity-50 cursor-not-allowed shadow-sm"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M6.62 10.79a15.15 15.15 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27 11.72 11.72 0 003.79.6 1 1 0 011 1v3.5a1 1 0 01-1 1A16 16 0 013 5a1 1 0 011-1h3.5a1 1 0 011 1 11.72 11.72 0 00.6 3.79 1 1 0 01-.27 1.11l-2.2 2.2z" />
                  </svg>
                  Ara
                </button>
              )}
              {/* Yol Tarifi Al Button */}
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedClinic.latitude},${selectedClinic.longitude}&destination_place_id=${selectedClinic.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center bg-[#34495E] hover:bg-[#2C3E50] text-white text-[16px] font-bold py-[16px] px-[20px] rounded-btn transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <svg className="w-5 h-5 fill-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Yol Tarifi Al
              </a>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH LIST CONTAINER */}
      <div className={selectedClinic ? 'hidden' : 'block'}>
        {/* GPS Denied Smart Card */}
        {gpsDenied && (
          <div className="bg-white rounded-card shadow-soft border border-border-main p-[20px] mb-[24px] mx-[16px] md:mx-0 animate-scaleIn">
            <p className="text-[18px] font-semibold text-text-primary mb-[24px] leading-snug">
              Yakınınızdaki veterinerleri görebilmek için konum izninize ihtiyacımız var. İsterseniz şehrinizi manuel olarak seçin.
            </p>
            <button 
              onClick={() => {
                const citySelect = document.getElementById('city-select');
                if (citySelect) {
                  citySelect.focus();
                  citySelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="w-full sm:w-auto bg-[#34495E] hover:bg-[#2C3E50] text-white text-[16px] min-h-[50px] flex items-center justify-center font-bold px-[24px] rounded-btn transition-all duration-300 active:scale-[0.98] cursor-pointer"
            >
              Şehir Seç
            </button>
          </div>
        )}

        {/* Search Controls */}
        <div className="card-base p-[24px] mb-[48px] flex flex-col md:flex-row gap-[16px] items-end animate-scaleIn">
          <div className="flex-1 w-full space-y-2">
            <label htmlFor="city-select" className="text-sm font-bold text-text-secondary ml-1">Şehir</label>
            <select 
              id="city-select"
              className="input-base w-full"
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
            >
              <option value="">Şehir Seçin</option>
              {citiesData.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          
          <div className="flex-1 w-full space-y-2">
            <label className="text-sm font-bold text-text-secondary ml-1">İlçe</label>
            <select 
              className="input-base w-full"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedCity}
            >
              <option value="">İlçe Seçin (Tümü)</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button 
              onClick={handleManualSearch} 
              disabled={!selectedCity || loading} 
              className="bg-[#34495E] hover:bg-[#2C3E50] text-white min-h-[50px] flex items-center justify-center font-bold px-[32px] rounded-btn transition-all duration-300 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ara
            </button>
            <button 
              onClick={requestLocation} 
              disabled={loading} 
              className="border border-border-main text-text-primary min-h-[50px] flex items-center justify-center bg-surface hover:border-[#34495E]/30 hover:bg-slate-50 transition-all duration-300 rounded-btn px-[24px] cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed" 
              title="Konumumu Kullan"
            >
              <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Offline Error Screen */}
        {isOffline ? (
          <div className="text-center py-20 px-[32px] card-base bg-surface/30 border-dashed animate-scaleIn max-w-xl mx-auto my-8">
            <div className="mb-[32px] text-slate-400">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto select-none">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5" />
              </svg>
            </div>
            <p className="text-[16px] font-semibold text-text-secondary leading-relaxed max-w-md mx-auto">
              İnternet bağlantınız yok. Veterinerleri görebilmek için lütfen bağlantınızı kontrol edin.
            </p>
          </div>
        ) : (
          <>
            {/* Results Section */}
            <div className="space-y-6">
              {(clinics.length > 0 || loading) && (
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-text-primary">
                    {loading ? 'Aranıyor...' : clinics.length > 0 ? `Sonuçlar (${clinics.length})` : 'Sonuç bulunamadı'}
                  </h3>
                </div>
              )}

              {loading ? (
                <div className="grid gap-6">
                  {[1, 2, 3].map(i => <div key={i} className="card-base p-8 h-32 animate-pulse" />)}
                </div>
              ) : clinics.length > 0 ? (
                <div className="grid gap-6 stagger-children">
                  {clinics.map((clinic) => (
                    <div 
                      key={clinic.id} 
                      onClick={() => openClinicDetail(clinic)}
                      className="card-base p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:-translate-y-1 cursor-pointer"
                    >
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h4 className="text-xl font-bold group-hover:text-[#34495E] transition-colors">{clinic.name}</h4>
                          {clinic.rating && (
                            <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-xs font-bold border border-amber-200">
                              <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {clinic.rating} ({clinic.user_ratings_total})
                            </div>
                          )}
                          {clinic.open_now === true && (
                            <span className="bg-[#EAF2EC] text-[#556B5D] px-2.5 py-1 rounded text-xs font-bold border border-[#EAF2EC] scale-90">
                              Açık
                            </span>
                          )}
                          {clinic.open_now === false && (
                            <span className="bg-[#F8EAEB] text-[#8C5D61] px-2.5 py-1 rounded text-xs font-bold border border-[#F8EAEB] scale-90">
                              Kapalı
                            </span>
                          )}
                        </div>
                        
                        <p className="text-text-secondary text-sm mb-3">
                          {clinic.address}
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                          {clinic.dist_km > 0 && <span className="badge-primary">{clinic.dist_km.toFixed(1)} km</span>}
                          {clinic.tags?.map((tag) => (
                            <span key={tag} className="bg-primary/5 text-primary/70 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider">
                              {tag.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Detaylar Butonu/Link */}
                      <div className="flex items-center gap-[8px] text-text-secondary group-hover:text-[#34495E] transition-colors font-bold text-[14px]">
                        <span>Detaylar</span>
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                hasSearched && (
                  <div className="text-center py-20 px-[32px] card-base bg-surface/30 border-dashed animate-scaleIn max-w-xl mx-auto my-8">
                    <div className="mb-[32px] text-slate-400">
                      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto select-none">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 10.125l3.75 3.75m0-3.75l-3.75 3.75" />
                      </svg>
                    </div>
                    <p className="text-[16px] font-semibold text-text-secondary leading-relaxed max-w-md mx-auto">
                      Üzgünüz, bu bölgede veteriner bulamadık. Başka bir bölge aramayı deneyin veya şehrinizi manuel olarak seçin.
                    </p>
                    <button 
                      onClick={() => {
                        const citySelect = document.getElementById('city-select');
                        if (citySelect) {
                          citySelect.focus();
                          citySelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }}
                      className="mt-[24px] bg-[#34495E] hover:bg-[#2C3E50] text-white text-[14px] min-h-[50px] flex items-center justify-center font-bold px-[24px] rounded-btn transition-all duration-300 active:scale-[0.98] cursor-pointer"
                    >
                      Şehir Seç
                    </button>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>

      {error && !gpsDenied && (
        <div className="mt-8 p-4 bg-error/10 text-error rounded-input text-center text-sm font-bold animate-fadeInUp">
          {error}
        </div>
      )}
    </div>
  );
}


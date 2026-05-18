'use client';

import { useState } from 'react';
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

  const districts = citiesData.find(c => c.name === selectedCity)?.districts || [];

  const searchClinics = async (lat?: number, lng?: number) => {
    setLoading(true);
    setError(null);
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
        throw new Error(data.error || 'Arama sırasında bir hata oluştu.');
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
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Tarayıcınız konum özelliğini desteklemiyor.');
      return;
    }

    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        searchClinics(latitude, longitude);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError('Konum izni verilmedi. Lütfen ayarlarınızı kontrol edin.');
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 min-h-screen pb-28">
      {/* Navigation */}
      <div className="mb-8 animate-fadeInUp">
        <Link href="/owner/dashboard" className="inline-flex items-center gap-2 text-text-secondary hover:text-primary font-bold text-sm transition-colors group">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Ana Sayfa'ya Dön
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-12 animate-fadeInUp relative">
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

      {/* Search Controls */}
      <div className="card-base p-6 mb-12 flex flex-col md:flex-row gap-4 items-end animate-scaleIn">
        <div className="flex-1 w-full space-y-2">
          <label className="text-sm font-bold text-text-secondary ml-1">Şehir</label>
          <select 
            className="input-base w-full"
            value={selectedCity}
            onChange={(e) => { setSelectedCity(e.target.value); setSelectedDistrict(''); }}
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
          <button onClick={handleManualSearch} disabled={!selectedCity || loading} className="btn-primary py-3.5 px-8">
            Ara
          </button>
          <button onClick={requestLocation} disabled={loading} className="btn-secondary py-3.5 px-6" title="Konumumu Kullan">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-text-primary">
            {loading ? 'Aranıyor...' : clinics.length > 0 ? `Sonuçlar (${clinics.length})` : 'Sonuç bulunamadı'}
          </h3>
        </div>

        {loading ? (
          <div className="grid gap-6">
            {[1, 2, 3].map(i => <div key={i} className="card-base p-8 h-32 animate-pulse" />)}
          </div>
        ) : clinics.length > 0 ? (
          <div className="grid gap-6 stagger-children">
            {clinics.map((clinic) => (
              <div key={clinic.id} className="card-base p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:-translate-y-1">
                {/* Sol Taraf - Fotoğraf ve Bilgiler (Eğer fotoğraf API entegre edilirse eklenebilir) */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h4 className="text-xl font-bold group-hover:text-primary transition-colors">{clinic.name}</h4>
                    {clinic.rating && (
                      <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-xs font-bold border border-amber-200">
                        <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        {clinic.rating} ({clinic.user_ratings_total})
                      </div>
                    )}
                    {clinic.open_now === true && <span className="badge-success scale-90">Açık</span>}
                    {clinic.open_now === false && <span className="bg-error/10 text-error px-2 py-0.5 rounded text-xs font-bold border border-error/20 scale-90">Kapalı</span>}
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
                
                {/* Sağ Taraf - Aksiyonlar */}
                <div className="flex gap-3">
                  {clinic.latitude && clinic.longitude && (
                    <Link 
                      href={`https://www.google.com/maps/dir/?api=1&destination=${clinic.latitude},${clinic.longitude}`}
                      target="_blank"
                      className="btn-secondary px-5 py-2.5 text-sm"
                    >
                      Yol Tarifi
                    </Link>
                  )}
                  <button className="btn-primary px-5 py-2.5 text-sm shadow-sm">
                    Kaydet
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 card-base bg-surface/30 border-dashed">
            <p className="text-text-secondary">Arama kriterlerine uygun bir klinik bulamadık.</p>
            <p className="text-sm text-text-secondary/60 mt-1">Farklı bir ilçe veya "Yakınımdaki Klinikler" butonunu deneyin.</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-8 p-4 bg-error/10 text-error rounded-input text-center text-sm font-bold animate-fadeInUp">
          {error}
        </div>
      )}
    </div>
  );
}


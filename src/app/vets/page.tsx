'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import Link from 'next/link';
import citiesData from '@/lib/cities.json';

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
}

export default function VetsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  
  const supabase = createBrowserSupabaseClient();


  const districts = citiesData.find(c => c.name === selectedCity)?.districts || [];

  const getNearbyClinics = async (lat: number, lng: number) => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_nearby_clinics', {
      user_lat: lat,
      user_long: lng,
      max_dist_km: 50
    });

    if (error) {
      console.error('Error fetching clinics:', error);
      setError('Klinikler yüklenirken bir hata oluştu.');
    } else {
      setClinics(data || []);
    }
    setLoading(false);
  };

  const handleManualSearch = async () => {
    if (!selectedCity) return;
    
    setLoading(true);
    setError(null);
    setUserLocation(null);

    let query = supabase.from('clinics').select('*').eq('is_public', true).eq('city', selectedCity);
    if (selectedDistrict) query = query.eq('district', selectedDistrict);
    
    const { data, error } = await query.order('is_verified', { ascending: false });

    if (error) {
      console.error('Manual search error:', error);
      setError('Arama yapılırken bir hata oluştu.');
    } else {
      setClinics(data?.map(c => ({ ...c, dist_km: 0 })) || []);
    }
    setLoading(false);
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
        getNearbyClinics(latitude, longitude);
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
    <div className="max-w-4xl mx-auto px-6 py-12 min-h-screen">
      {/* Navigation */}
      <div className="mb-8 animate-fadeInUp">
        <Link href="/owner/health" className="inline-flex items-center gap-2 text-text-secondary hover:text-primary font-bold text-sm transition-colors group">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Sağlık Merkezi'ne Dön
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-12 animate-fadeInUp">
        <h1 className="text-4xl font-extrabold text-text-primary mb-4 tracking-tight">
          Odi <span className="text-primary">Yanında</span>
        </h1>
        <p className="text-text-secondary text-lg max-w-xl mx-auto">
          En yakın dostuna en yakın veteriner kliniğini bul.
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
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-xl font-bold group-hover:text-primary transition-colors">{clinic.name}</h4>
                    {clinic.is_verified && <span className="badge-success scale-90">Doğrulanmış</span>}
                  </div>
                  <p className="text-text-secondary text-sm mb-3">
                    {clinic.district}, {clinic.city} • {clinic.address}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {clinic.dist_km > 0 && <span className="badge-primary">{clinic.dist_km.toFixed(1)} km</span>}
                    {clinic.tags?.map((tag) => (
                      <span key={tag} className="bg-primary/5 text-primary/70 px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {clinic.latitude && (
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


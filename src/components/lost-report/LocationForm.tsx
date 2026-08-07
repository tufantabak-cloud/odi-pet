'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Edit3 } from 'lucide-react';

if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/vendor/leaflet/marker-icon-2x.png',
    iconUrl: '/vendor/leaflet/marker-icon.png',
    shadowUrl: '/vendor/leaflet/marker-shadow.png',
  });
}

const getLostPinIcon = () => {
  return new L.Icon({
    iconUrl: '/vendor/leaflet/lost-pet-marker.svg',
    iconSize: [32, 48],
    iconAnchor: [16, 48],
    popupAnchor: [0, -40],
  });
};

export const LocationForm = ({ onNext }: { onNext: (data: any) => void }) => {
  const [manualMode, setManualMode] = useState(false);
  const [address, setAddress] = useState('');
  const [selectedPos, setSelectedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedAddressName, setSelectedAddressName] = useState<string | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [geoLocating, setGeoLocating] = useState(false);
  const [error, setError] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Default initial position (Istanbul / Turkey default center)
  const defaultLat = 41.0082;
  const defaultLng = 28.9784;

  useEffect(() => {
    if (manualMode || !mapContainerRef.current) return;

    if (!mapRef.current) {
      const initialLat = selectedPos?.lat || defaultLat;
      const initialLng = selectedPos?.lng || defaultLng;

      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      mapRef.current = map;

      // Click listener to set position
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        updateMarker(lat, lng);
      });
    }

    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [manualMode]);

  const fetchLocationName = async (lat: number, lng: number) => {
    setLoadingGeo(true);
    setSelectedAddressName(null);
    try {
      const res = await fetch(
        `/api/v1/reports/lost/reverse-geocode?lat=${lat}&lng=${lng}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.name) {
          setSelectedAddressName(data.name);
        }
      }
    } catch (e) {
      console.warn('Server geo fetch failed:', e);
    } finally {
      setLoadingGeo(false);
    }
  };

  const updateMarker = (lat: number, lng: number) => {
    setSelectedPos({ lat, lng });
    fetchLocationName(lat, lng);

    if (mapRef.current) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: getLostPinIcon(), draggable: true }).addTo(mapRef.current);
        markerRef.current.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          setSelectedPos({ lat: newPos.lat, lng: newPos.lng });
          fetchLocationName(newPos.lat, newPos.lng);
        });
      }
      mapRef.current.panTo([lat, lng]);
    }
  };

  const handleGetCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Cihazınız konum servislerini desteklemiyor.');
      return;
    }
    setGeoLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        updateMarker(lat, lng);
      },
      () => {
        setGeoLocating(false);
        setError('Mevcut konum alınamadı. Lütfen harita üzerinden tıklayarak seçin.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleVerify = async () => {
    setError('');

    if (manualMode) {
      if (!address || address.trim().length < 5) {
        setError('Lütfen adresi detaylı yazın (en az 5 karakter).');
        return;
      }
    } else {
      if (!selectedPos) {
        setError('Lütfen haritaya dokunarak kayıp konumunu işaretleyin.');
        return;
      }
    }

    try {
      const res = await fetch('/api/v1/reports/lost/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          manualMode
            ? { manualAddress: address }
            : {
                lat: selectedPos!.lat,
                lng: selectedPos!.lng,
                ...(selectedAddressName ? { address: selectedAddressName } : {}),
              }
        )
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Konum doğrulanamadı.');
        if (data.error?.includes('outside of Turkey')) {
          setManualMode(true);
        }
      } else {
        onNext(data);
      }
    } catch (err) {
      setError('Bir hata oluştu.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Nerede Kayboldu?</h2>
        <p className="text-sm text-slate-500 mt-1">
          {manualMode
            ? 'Adres bilgilerini detaylı olarak girin.'
            : 'Haritaya dokunarak veya GPS butonunu kullanarak kayıp noktasını işaretleyin.'}
        </p>
      </div>

      {!manualMode ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={geoLocating}
            className="w-full flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold py-2.5 px-4 rounded-xl text-sm transition-all active:scale-[0.98] border border-purple-200 disabled:opacity-50"
          >
            <Navigation className={`w-4 h-4 ${geoLocating ? 'animate-spin' : ''}`} />
            {geoLocating ? 'Konum Alınıyor...' : 'Mevcut Konumumu Kullan'}
          </button>

          <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative z-0">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>

          {selectedPos ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>
                {loadingGeo ? (
                  <span className="text-slate-500 animate-pulse">İl / İlçe tespit ediliyor...</span>
                ) : selectedAddressName ? (
                  <span className="font-bold text-emerald-900">{selectedAddressName}</span>
                ) : (
                  <span className="font-semibold text-emerald-800">Haritada Konum Seçildi</span>
                )}
              </span>
            </div>
          ) : (
            <p className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-center">
              📍 Lütfen haritadan kaybolduğu noktaya dokunun.
            </p>
          )}

          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="inline-flex items-center justify-center gap-1.5 text-xs text-purple-600 font-semibold hover:underline mt-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Adresi metin olarak girmek istiyorum
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            placeholder="Mahalle, Cadde, Sokak, İlçe, İl detaylarını yazın..."
            className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none h-28"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setManualMode(false)}
            className="inline-flex items-center justify-center gap-1.5 text-xs text-purple-600 font-semibold hover:underline"
          >
            <MapPin className="w-3.5 h-3.5" />
            Haritadan konum seçimine dön
          </button>
        </div>
      )}

      {error && <div className="text-red-500 text-xs font-medium bg-red-50 p-2.5 rounded-xl border border-red-100">{error}</div>}

      <button
        onClick={handleVerify}
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] shadow-sm mt-2"
      >
        Devam Et
      </button>
    </div>
  );
};

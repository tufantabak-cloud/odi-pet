'use client';
import React, { useState } from 'react';

export const LocationForm = ({ onNext }: { onNext: (data: any) => void }) => {
  const [manualMode, setManualMode] = useState(false);
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [error, setError] = useState('');

  const handleVerify = async () => {
    setError('');
    try {
      const res = await fetch('/api/v1/reports/lost/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualMode ? { manualAddress: address } : { lat: parseFloat(lat), lng: parseFloat(lng) })
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
      <h2 className="text-xl font-bold">Nerede Kayboldu?</h2>
      
      {!manualMode ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500">Haritadan konum seçin veya koordinat girin</p>
          <input type="text" placeholder="Enlem (Örn: 41.0082)" className="border p-2 rounded" value={lat} onChange={e => setLat(e.target.value)} />
          <input type="text" placeholder="Boylam (Örn: 28.9784)" className="border p-2 rounded" value={lng} onChange={e => setLng(e.target.value)} />
          <button type="button" onClick={() => setManualMode(true)} className="text-sm text-blue-500 text-left">Konumu bulamıyorum, adresi manuel gireceğim</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-500">Adresi açıkça yazın</p>
          <textarea placeholder="Mahalle, Sokak, İlçe, İl..." className="border p-2 rounded h-24" value={address} onChange={e => setAddress(e.target.value)} />
          <button type="button" onClick={() => setManualMode(false)} className="text-sm text-blue-500 text-left">Koordinat girmeye dön</button>
        </div>
      )}

      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button onClick={handleVerify} className="bg-black text-white p-2 rounded font-medium mt-2">Devam Et</button>
    </div>
  );
};

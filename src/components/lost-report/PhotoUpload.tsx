'use client';
import React, { useState } from 'react';

export const PhotoUpload = ({ sessionId, onNext }: { sessionId: string, onNext: (data: any) => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      if (file) formData.append('photo', file);
      formData.append('sessionId', sessionId);

      const res = await fetch('/api/v1/reports/lost/photo', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.skipped) {
          onNext({ skipped: true });
        } else {
          setError(data.error || 'Yükleme başarısız');
        }
      } else {
        onNext(data);
      }
    } catch (err) {
      setError('Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Fotoğraf Yükle</h2>
      <p className="text-sm text-gray-500">Kayıp evcil hayvanınızın fotoğrafını yükleyin (Max 2MB). Yükleme başarısız olursa atlayabilirsiniz.</p>
      
      <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="border p-2 rounded" />
      
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button onClick={handleUpload} disabled={loading} className="bg-black text-white p-2 rounded font-medium mt-2 disabled:opacity-50">
        {loading ? 'Yükleniyor...' : 'Devam Et'}
      </button>
      <button
        type="button"
        onClick={() => onNext({ skipped: true })}
        disabled={loading}
        className="rounded p-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
      >
        Fotoğrafsız devam et
      </button>
    </div>
  );
};

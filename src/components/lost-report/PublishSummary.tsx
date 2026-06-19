'use client';
import React, { useState } from 'react';

export const PublishSummary = ({ sessionId, payload, onPublish }: { sessionId: string, payload: any, onPublish: (reportId: string) => void }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePublish = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/reports/lost/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, payload, action: 'publish' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onPublish(data.reportId);
    } catch (err: any) {
      setError(err.message || 'Yayınlama başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold text-green-600">Özet ve Yayınla</h2>
      <div className="bg-gray-50 p-4 rounded border">
        <h3 className="font-medium border-b pb-2 mb-2">İlan Bilgileri</h3>
        <p className="text-sm"><strong>Konum:</strong> {payload.location?.isManual ? payload.location.address : `${payload.location?.lat}, ${payload.location?.lng}`}</p>
        <p className="text-sm"><strong>Fotoğraf:</strong> {payload.photo?.skipped ? 'Atlandı' : 'Yüklendi'}</p>
        <p className="text-sm"><strong>İletişim:</strong> Doğrulandı</p>
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}
      
      <button onClick={handlePublish} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white p-3 rounded font-bold mt-4 shadow-lg disabled:opacity-50 transition-all">
        {loading ? 'Yayınlanıyor...' : 'Kayıp İlanını Yayınla'}
      </button>
    </div>
  );
};

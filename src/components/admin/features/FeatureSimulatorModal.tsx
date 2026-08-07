'use client';

import React, { useState } from 'react';

interface FeatureSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  allFeatures: Array<{ key: string; name: string; category: string }>;
}

export function FeatureSimulatorModal({ isOpen, onClose, allFeatures }: FeatureSimulatorModalProps) {
  const [userId, setUserId] = useState('');
  const [selectedFeature, setSelectedFeature] = useState('all');
  const [loading, setLoading] = useState(false);
  const [singleResult, setSingleResult] = useState<any>(null);
  const [batchResults, setBatchResults] = useState<Array<any>>([]);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    if (!userId) return alert('Lütfen geçerli bir User ID girin');

    setLoading(true);
    setSingleResult(null);
    setBatchResults([]);

    try {
      if (selectedFeature !== 'all') {
        // Single Feature evaluation
        const res = await fetch('/api/admin/features/debug-evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, featureKey: selectedFeature })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Simülasyon başarısız');
        setSingleResult(data);
      } else {
        // Evaluate ALL FEATURES
        const results = await Promise.all(
          allFeatures.map(async f => {
            const res = await fetch('/api/admin/features/debug-evaluate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, featureKey: f.key })
            });
            const data = await res.json();
            return { feature: f, result: data };
          })
        );
        setBatchResults(results);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Feature Simulator (Karar Motoru Simülatörü)</h3>
            <p className="text-xs text-slate-500">Herhangi bir kullanıcının yetki karar zincirini canlı simüle edin.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full">✕</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">User ID / Profile UUID:</label>
            <input 
              type="text" 
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="w-full p-2 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Özellik Seçimi:</label>
            <select
              value={selectedFeature}
              onChange={e => setSelectedFeature(e.target.value)}
              className="w-full p-2 text-xs border border-slate-200 rounded-xl outline-none font-medium"
            >
              <option value="all">⚡ TÜM ÖZELLİKLERİ SİMÜLE ET (Evaluate ALL)</option>
              {allFeatures.map(f => (
                <option key={f.key} value={f.key}>{f.name} ({f.key})</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleSimulate}
          disabled={loading}
          className="w-full py-2.5 bg-primary text-white font-bold rounded-xl text-xs active:scale-98 shadow-md"
        >
          {loading ? 'Karar Zinciri Simüle Ediliyor...' : 'Simülasyonu Çalıştır'}
        </button>

        {/* Single Feature Result */}
        {singleResult && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${singleResult.allowed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {singleResult.allowed ? 'PASS (Erişim Var)' : 'DENIED (Erişim Engellendi)'}
              </span>
              <span className="text-2xs font-mono text-slate-400">Süre: {singleResult.total_duration_ms} ms</span>
            </div>

            <div className="space-y-1">
              <span className="text-2xs font-bold text-slate-500 uppercase">Karar Adımları (Execution Trace):</span>
              {singleResult.trace.map((t: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span>{t.passed ? '✅' : '❌'}</span>
                    <span className="font-semibold text-slate-800">{t.step}</span>
                  </div>
                  <span className="text-2xs text-slate-500 font-mono">{t.details} ({t.duration_ms}ms)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Batch Results */}
        {batchResults.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700">Toplu Simülasyon Sonuçları ({batchResults.length} Özellik):</span>
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y">
              {batchResults.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-white flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{item.feature.name}</span>
                    <span className="text-2xs text-slate-400 font-mono ml-2">({item.feature.key})</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-2xs font-bold ${item.result.allowed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.result.allowed ? 'PASS' : `FAIL (${item.result.reason})`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

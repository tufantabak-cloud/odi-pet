'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Since this is admin component, we should use a proper client, but we'll fetch via API or use supabase-js directly
// Assuming we fetch from an API route or pass data as props.
// For now, let's build the UI expecting props.

interface FeatureLimit {
  feature_key: string;
  plan: string;
  is_enabled: boolean;
  limit_type: 'boolean' | 'quota' | 'unlimited';
  limit_value: number | null;
  window_value: number | null;
  window_unit: string | null;
}

interface Feature {
  key: string;
  name: string;
  category: string;
}

export interface AdminFeatureMatrixProps {
  features: Feature[];
  plans: string[];
  initialLimits: FeatureLimit[];
}

export function AdminFeatureMatrix({ features, plans, initialLimits }: AdminFeatureMatrixProps) {
  const [limits, setLimits] = useState<FeatureLimit[]>(initialLimits);
  const [saving, setSaving] = useState(false);
  
  // Filters & Virtual Pagination
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Computed Features
  const filteredFeatures = features.filter(f => {
    if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.key.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredFeatures.length / pageSize) || 1;
  const paginatedFeatures = filteredFeatures.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const categories = Array.from(new Set(features.map(f => f.category)));

  const getLimit = (featureKey: string, plan: string) => {
    return limits.find(l => l.feature_key === featureKey && l.plan === plan);
  };

  const handleUpdate = (featureKey: string, plan: string, updates: Partial<FeatureLimit>) => {
    setLimits(prev => {
      const existing = prev.find(l => l.feature_key === featureKey && l.plan === plan);
      if (existing) {
        return prev.map(l => l.feature_key === featureKey && l.plan === plan ? { ...l, ...updates } : l);
      } else {
        return [...prev, {
          feature_key: featureKey,
          plan,
          is_enabled: true,
          limit_type: 'unlimited',
          limit_value: null,
          window_value: null,
          window_unit: null,
          ...updates
        }];
      }
    });
  };

  const setAllUnlimited = () => {
    if (!confirm('Filtrelenen tüm özellikleri sınırsız yapmak istediğinize emin misiniz?')) return;
    const updates: FeatureLimit[] = [...limits];
    filteredFeatures.forEach(f => {
      plans.forEach(p => {
        const existingIdx = updates.findIndex(l => l.feature_key === f.key && l.plan === p);
        if (existingIdx >= 0) {
          updates[existingIdx] = { ...updates[existingIdx], limit_type: 'unlimited', limit_value: null, window_value: null, window_unit: null, is_enabled: true };
        } else {
          updates.push({
            feature_key: f.key,
            plan: p,
            limit_type: 'unlimited',
            is_enabled: true,
            limit_value: null,
            window_value: null,
            window_unit: null
          });
        }
      });
    });
    setLimits(updates);
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/features/limits/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limits })
      });
      if (!res.ok) throw new Error('Taslak kaydedilemedi');
      alert('Taslak başarıyla kaydedildi! Yayına almak için "Test Et" veya "Yayınla" butonlarını kullanın.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [versionIdToRestore, setVersionIdToRestore] = useState('');

  const dryRun = async () => {
    setSaving(true);
    setDryRunResult(null);
    try {
      const res = await fetch('/api/admin/features/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limits })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dry run başarısız');
      setDryRunResult(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const publishChanges = async () => {
    if (!confirm('Taslakları canlıya almak istediğinize emin misiniz? (Tüm guard kuralları etkilenecek)')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/features/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Published via Admin UI' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yayınlanamadı');
      alert('Değişiklikler başarıyla canlıya alındı!');
      setDryRunResult(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const exportConfig = () => {
    window.location.href = '/api/admin/features/export';
  };

  const importConfig = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setSaving(true);
        const res = await fetch('/api/admin/features/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'İçe aktarma başarısız');
        alert('Yapılandırma başarıyla taslaklara aktarıldı. Lütfen sayfayı yenileyin.');
        window.location.reload();
      } catch (err: any) {
        alert('Hata: ' + err.message);
      } finally {
        setSaving(false);
      }
    };
    reader.readAsText(file);
  };

  const rollbackVersion = async () => {
    if (!versionIdToRestore) return alert('Lütfen bir Version ID girin');
    if (!confirm('Geçmiş versiyona dönülecek. Onaylıyor musunuz?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/features/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_id: versionIdToRestore })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rollback başarısız');
      alert('Başarıyla eski versiyona dönüldü!');
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Kota ve Erişim Matrisi</h3>
          <p className="text-xs text-slate-500">Değişikliklerinizi önce taslak olarak kaydedin, test edin ve yayınlayın.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import/Export */}
          <button onClick={exportConfig} className="px-3 py-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold">
            Dışa Aktar (JSON)
          </button>
          <label className="px-3 py-2 text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer">
            İçe Aktar
            <input type="file" accept=".json" className="hidden" onChange={importConfig} />
          </label>
          <button onClick={() => setShowVersions(!showVersions)} className="px-3 py-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-semibold">
            Geri Yükle (Rollback)
          </button>
          
          <div className="w-px h-6 bg-slate-200 mx-2"></div>

          <button onClick={dryRun} disabled={saving} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs active:scale-95 transition-all">
            Test Et (Dry Run)
          </button>
          <button onClick={saveDraft} disabled={saving} className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs active:scale-95 transition-all">
            {saving ? 'Kaydediliyor...' : 'Taslak Kaydet'}
          </button>
          <button onClick={publishChanges} disabled={saving} className="px-4 py-2 bg-primary hover:opacity-90 text-white font-bold rounded-xl text-xs active:scale-95 transition-all shadow-md shadow-primary/20">
            Yayınla (Publish)
          </button>
        </div>
      </div>

      {showVersions && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-4">
          <p className="text-sm text-amber-800 font-medium">Geri Yüklemek istediğiniz Versiyon ID'sini girin:</p>
          <input 
            type="text" 
            value={versionIdToRestore} 
            onChange={(e) => setVersionIdToRestore(e.target.value)}
            placeholder="UUID..." 
            className="px-3 py-2 rounded-lg border border-amber-300 text-sm flex-1 outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          <button onClick={rollbackVersion} disabled={saving} className="px-4 py-2 bg-amber-600 text-white font-bold rounded-xl text-xs shadow-md">
            Geri Yükle
          </button>
        </div>
      )}

      {dryRunResult && (
        <div className={`p-4 rounded-xl border ${dryRunResult.summary.is_safe ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <h4 className={`font-bold text-sm ${dryRunResult.summary.is_safe ? 'text-green-800' : 'text-red-800'}`}>
            Dry Run Sonucu: {dryRunResult.summary.is_safe ? 'Güvenli' : 'Kritik Etki Tespit Edildi'}
          </h4>
          <div className="flex gap-6 mt-2 text-xs text-slate-700">
            <div><span className="font-semibold">Erişim Kaybeden Kullanıcılar:</span> <span className="text-red-600 font-bold">{dryRunResult.summary.total_access_lost}</span></div>
            <div><span className="font-semibold">Sınırsız Olan Kullanıcılar:</span> <span className="text-green-600 font-bold">{dryRunResult.summary.total_got_unlimited}</span></div>
            <div><span className="font-semibold">Kotası Artan Kullanıcılar:</span> <span className="text-indigo-600 font-bold">{dryRunResult.summary.total_quota_increased}</span></div>
          </div>
          {dryRunResult.impacts.length > 0 && (
            <div className="mt-4 max-h-40 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-500 uppercase"><tr><th>Feature</th><th>Plan</th><th>Reason</th><th>Affected</th></tr></thead>
                <tbody>
                  {dryRunResult.impacts.map((imp: any, idx: number) => (
                    <tr key={idx} className="border-t border-slate-200/50">
                      <td className="py-1 font-mono text-slate-700">{imp.feature_key}</td>
                      <td className="py-1 uppercase font-semibold">{imp.plan}</td>
                      <td className="py-1">{imp.reason}</td>
                      <td className="py-1">{imp.affected_users_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
        <input 
          type="text" 
          placeholder="Özellik ara (isim veya key)..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        />
        <select 
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none"
        >
          <option value="all">Tüm Kategoriler</option>
          {categories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
        </select>
        <button 
          onClick={setAllUnlimited}
          className="px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 active:scale-95"
        >
          Listeyi Sınırsız Yap
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-3 font-bold text-slate-700 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 w-64">
                Özellik (Feature)
              </th>
              {plans.map(plan => (
                <th key={plan} className="p-3 font-bold text-slate-700 text-center uppercase min-w-[200px]">
                  {plan}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedFeatures.map(feature => (
              <tr key={feature.key} className="hover:bg-slate-50/50">
                <td className="p-3 border-r border-slate-200 sticky left-0 bg-white z-10">
                  <div className="font-bold text-slate-900">{feature.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                     <span className="text-2xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">{feature.category}</span>
                     <span className="text-2xs text-slate-400 font-mono">{feature.key}</span>
                  </div>
                </td>
                {plans.map(plan => {
                  const limit = getLimit(feature.key, plan);
                  
                  return (
                    <td key={plan} className="p-3 border-r border-slate-50 last:border-0 align-top">
                      <div className="space-y-2">
                        {/* Type Selector */}
                        <select
                          value={limit?.limit_type || 'unlimited'}
                          onChange={(e) => handleUpdate(feature.key, plan, { limit_type: e.target.value as any })}
                          className="w-full p-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 font-semibold text-slate-700 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        >
                          <option value="unlimited">Sınırsız (Unlimited)</option>
                          <option value="boolean">Açık/Kapalı (Boolean)</option>
                          <option value="quota">Kota (Quota)</option>
                        </select>

                        {/* Boolean Toggle */}
                        {limit?.limit_type === 'boolean' && (
                          <div className="flex items-center gap-2">
                            <label className="text-2xs font-bold text-slate-500 uppercase">Erişim:</label>
                            <input
                              type="checkbox"
                              checked={limit?.is_enabled ?? true}
                              onChange={(e) => handleUpdate(feature.key, plan, { is_enabled: e.target.checked })}
                              className="w-4 h-4 rounded text-primary accent-primary"
                            />
                          </div>
                        )}

                        {/* Quota Inputs */}
                        {limit?.limit_type === 'quota' && (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={limit?.limit_value || ''}
                              onChange={(e) => handleUpdate(feature.key, plan, { limit_value: parseInt(e.target.value) || 0 })}
                              className="w-16 p-1 text-xs rounded-md border border-slate-200 text-center font-mono"
                              placeholder="0"
                            />
                            <span className="text-slate-400">/</span>
                            <input
                              type="number"
                              min="1"
                              value={limit?.window_value || ''}
                              onChange={(e) => handleUpdate(feature.key, plan, { window_value: parseInt(e.target.value) || 1 })}
                              className="w-12 p-1 text-xs rounded-md border border-slate-200 text-center font-mono"
                              placeholder="1"
                            />
                            <select
                              value={limit?.window_unit || 'month'}
                              onChange={(e) => handleUpdate(feature.key, plan, { window_unit: e.target.value })}
                              className="w-20 p-1 text-xs rounded-md border border-slate-200"
                            >
                              <option value="minute">Dk</option>
                              <option value="hour">Saat</option>
                              <option value="day">Gün</option>
                              <option value="week">Hafta</option>
                              <option value="month">Ay</option>
                              <option value="year">Yıl</option>
                              <option value="lifetime">Ömür</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-3 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">
              Toplam {filteredFeatures.length} özellik gösteriliyor ({currentPage} / {totalPages} Sayfa)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white disabled:opacity-40 font-semibold"
              >
                Önceki
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded-lg border border-slate-300 bg-white disabled:opacity-40 font-semibold"
              >
                Sonraki
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

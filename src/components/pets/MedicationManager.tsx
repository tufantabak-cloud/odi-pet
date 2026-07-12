"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Medication {
  id: string; // plan_123 formatı veya db id
  _plan_id?: string;
  _source?: 'plans' | 'health_medications';
  medication_name: string;
  dose: string | null;
  usage_duration: string | null;
  is_active: boolean;
  photo_url?: string | null;
  purpose?: string | null;
  freq_type?: string | null;
  stock_enabled?: boolean;
  stock?: number | null;
  alert_threshold?: number | null;
  extra_data?: any;
}

interface MedicationManagerProps {
  petId: string;
  initialMedications: Medication[];
}

export default function MedicationManager({ petId, initialMedications }: MedicationManagerProps) {
  const router = useRouter();
  const [meds, setMeds] = useState<Medication[]>(initialMedications || []);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleDoseGive = async (med: Medication) => {
    if (!med._plan_id) return;
    setLoadingId(med.id);
    try {
      const currentStock = med.stock ?? 0;
      const nextStock = Math.max(0, currentStock - 1);
      
      const originalExtraData = med.extra_data || {};
      const updatedExtraData = {
        ...originalExtraData,
        medication: {
          ...(originalExtraData.medication || {}),
          stock: nextStock
        }
      };

      const res = await fetch(`/api/plans/${med._plan_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extra_data: updatedExtraData })
      });

      if (!res.ok) throw new Error("Stok güncellenemedi.");

      setMeds(prev => prev.map(m => {
        if (m.id === med.id) {
          return { ...m, stock: nextStock, extra_data: updatedExtraData };
        }
        return m;
      }));
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Bir hata oluştu");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (med: Medication) => {
    if (!confirm(`${med.medication_name} ilacını silmek istediğinize emin misiniz?`)) return;
    
    try {
      if (med._source === 'plans' && med._plan_id) {
        const res = await fetch(`/api/plans/${med._plan_id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("İlaç planı silinemedi.");
      } else {
        const res = await fetch(`/api/pets/${petId}/medications`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ medication_id: med.id })
        });
        if (!res.ok) throw new Error("İlaç silinemedi.");
      }

      setMeds(prev => prev.filter(m => m.id !== med.id));
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Bir hata oluştu");
    }
  };

  if (meds.length === 0) return null;

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-black text-text-secondary uppercase tracking-widest flex items-center gap-1.5">
          <span>💊 İlaçlar</span>
        </h3>
      </div>

      <div className="flex flex-col gap-3">
        {meds.map((med) => {
          const isLowStock = med.stock_enabled && med.stock !== null && med.stock !== undefined && med.stock <= (med.alert_threshold ?? 5);
          
          return (
            <div key={med.id} className="p-4 bg-slate-50/70 border border-border-main rounded-[20px] hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
              <div className="flex items-start gap-3">
                {med.photo_url ? (
                  <img src={med.photo_url} alt={med.medication_name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg shrink-0">
                    💊
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-[14px] font-extrabold text-text-primary">{med.medication_name}</h4>
                    {isLowStock && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-full animate-pulse">
                        ⚠️ Düşük Stok! ({med.stock} kaldı)
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-text-secondary font-medium">
                    {med.dose && <span>Doz: {med.dose}</span>}
                    {med.freq_type && (
                      <span className="ml-2 pl-2 border-l border-slate-200">
                        {med.freq_type === 'once_daily' ? 'Günde 1 kez' :
                         med.freq_type === 'twice_daily' ? 'Günde 2 kez' :
                         med.freq_type === 'thrice_daily' ? 'Günde 3 kez' :
                         med.freq_type === 'four_times_daily' ? 'Günde 4 kez' :
                         med.freq_type === 'as_needed' ? 'Sadece gerektiğinde' : med.freq_type}
                      </span>
                    )}
                  </p>
                  {med.purpose && <p className="text-[11px] text-text-tertiary mt-0.5">Amaç: {med.purpose}</p>}
                  {med.stock_enabled && med.stock !== null && !isLowStock && (
                    <p className="text-[11px] text-text-tertiary mt-0.5">Kalan Stok: {med.stock} adet</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {med.stock_enabled && med._plan_id && (
                  <button
                    disabled={loadingId === med.id}
                    onClick={() => handleDoseGive(med)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[12px] rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {loadingId === med.id ? '...' : '+ Doz Ver'}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(med)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Sil"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

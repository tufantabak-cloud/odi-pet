'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Calendar, Upload, Plus, Trash2, Loader2 } from 'lucide-react';
import { RulerIcon, FirstAidIcon } from '@/components/icons/PetIcons';

interface HealthTabProps {
  petId: string;
  petName: string;
}

interface Measurement {
  id: string;
  measurement_type: string;
  value: number;
  unit: string;
  measured_at: string;
}

export default function HealthTab({ petId, petName }: HealthTabProps) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);

  // Weight form states
  const [weightValue, setWeightValue] = useState('');
  const [weightDate, setWeightDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmittingWeight, setIsSubmittingWeight] = useState(false);

  const [hideVaultBanner, setHideVaultBanner] = useState(true);

  // Check localStorage for banner state on mount
  useEffect(() => {
    const isHidden = localStorage.getItem('hide_vault_banner') === 'true';
    setHideVaultBanner(isHidden);
  }, []);

  const handleCloseVaultBanner = () => {
    localStorage.setItem('hide_vault_banner', 'true');
    setHideVaultBanner(true);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pets/${petId}/measurements`);
      if (res.ok) {
        const data = await res.json();
        // filter for weight
        const weights = data.filter((m: Measurement) => m.measurement_type === 'weight');
        setMeasurements(weights);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [petId]);

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightValue) return;
    setIsSubmittingWeight(true);
    try {
      const res = await fetch(`/api/pets/${petId}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measurement_type: 'weight',
          value: parseFloat(weightValue),
          unit: 'kg',
          measured_at: new Date(weightDate).toISOString(),
        })
      });
      if (res.ok) {
        setWeightValue('');
        fetchData();
      } else {
        const errorData = await res.json();
        alert(`Kayıt hatası: ${errorData.error || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Bağlantı hatası oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmittingWeight(false);
    }
  };



  // Helper for simple line chart
  const renderWeightChart = () => {
    if (measurements.length === 0) {
      return <div className="text-sm text-text-secondary py-4 text-center">Henüz kilo ölçümü yok.</div>;
    }

    // Sort ascending for chart (left to right)
    const sorted = [...measurements].sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
    const minVal = Math.min(...sorted.map(m => m.value));
    const maxVal = Math.max(...sorted.map(m => m.value));
    const range = maxVal - minVal || 1; // avoid divide by 0

    return (
      <div className="mt-4 pt-4 border-t border-border-main">
        <div className="h-32 flex items-end justify-between gap-1 mt-2">
          {sorted.map((m, i) => {
            const heightPercent = sorted.length === 1 ? 50 : 20 + ((m.value - minVal) / range) * 80;
            const dateStr = new Date(m.measured_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
            return (
              <div key={m.id} className="group relative flex flex-col items-center flex-1 justify-end h-full">
                <div 
                  className="w-full max-w-[24px] bg-primary/20 rounded-t-xs group-hover:bg-primary transition-all duration-200 hover:scale-[1.05] cursor-pointer"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-[10px] text-text-secondary mt-1">{dateStr}</span>
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 bg-gray-800 text-white text-[11px] px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10 transition-opacity">
                  {m.value} kg
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      
      {/* ── Kilo Takibi (Weight Chart) ── */}
      <div className="card-base p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xs bg-orange-50 text-orange-500 flex items-center justify-center shrink-0 shadow-inner">
            <RulerIcon width={24} height={24} />
          </div>
          <div>
            <h3 className="font-extrabold text-text-primary text-[15px]">Kilo Takibi</h3>
            <p className="text-[12px] text-text-secondary">Gelişimi ve ideal kiloyu izleyin</p>
          </div>
        </div>

        <form onSubmit={handleAddWeight} className="flex gap-2 mb-4">
          <input 
            type="number"
            step="0.1"
            value={weightValue}
            onChange={(e) => setWeightValue(e.target.value)}
            placeholder="Kilo (kg)"
            className="flex-1 border border-border-main rounded-input px-3 py-2 text-sm outline-none focus:border-primary"
            required
          />
          <input 
            type="date"
            value={weightDate}
            onChange={(e) => setWeightDate(e.target.value)}
            className="w-36 border border-border-main rounded-input px-3 py-2 text-sm outline-none focus:border-primary"
            required
          />
          <button 
            type="submit"
            disabled={isSubmittingWeight}
            className="bg-primary text-white px-4 py-2 rounded-btn font-bold hover:bg-primary/90 flex items-center gap-1 disabled:opacity-50"
          >
            {isSubmittingWeight ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Ekle
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : (
          renderWeightChart()
        )}
      </div>

      {/* ── Dijital Belge Kasası Yönlendirme Bannerı ── */}
      {!hideVaultBanner && (
        <div className="card-base p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xs bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-inner">
              <FirstAidIcon width={24} height={24} />
            </div>
            <div className="flex-1 pr-6">
              <h3 className="font-extrabold text-text-primary text-[14px] mb-1">Dijital Belge Kasası Taşındı!</h3>
              <p className="text-[12px] text-text-secondary leading-relaxed mb-3">
                Evcil hayvanınızın sağlık raporları, pasaport, aşı kartı ve diğer tüm belgelerini artık 
                <span className="font-bold text-primary"> "Raporlar & Belgeler" </span> 
                sekmesi altındaki Dijital Belge Kasası'ndan yönetebilirsiniz. Hiçbir belgeniz kaybolmadı!
              </p>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('open-pet-section', { 
                    detail: { section: 'Raporlar & Belgeler', tab: 'vault' } 
                  }));
                }}
                className="text-[12px] font-bold text-primary hover:underline flex items-center gap-1 hover:scale-[1.02] transition-transform"
              >
                Belge Kasasına Git →
              </button>
            </div>
            <button 
              onClick={handleCloseVaultBanner}
              className="absolute top-3 right-3 text-text-secondary hover:text-text-primary p-1 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Kapat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

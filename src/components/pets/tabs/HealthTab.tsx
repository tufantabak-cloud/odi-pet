'use client';

import React, { useEffect, useState } from 'react';
import { FirstAidIcon } from '@/components/icons/PetIcons';

interface HealthTabProps {
  petId: string;
  petName: string;
}

export default function HealthTab({ petId, petName }: HealthTabProps) {
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

  return (
    <div className="flex flex-col gap-4 py-2">
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

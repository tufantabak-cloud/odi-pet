'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

export function PremiumPreviewToggle({ plans }: { plans: string[] }) {
  const [activePreview, setActivePreview] = useState<string | null>(null);

  useEffect(() => {
    // Check if cookie exists
    const match = document.cookie.match(/(?:^|; )odi_premium_preview=([^;]*)/);
    if (match) {
      setActivePreview(match[1]);
    }
  }, []);

  const handlePreview = (plan: string | null) => {
    if (plan) {
      document.cookie = `odi_premium_preview=${plan}; path=/; max-age=86400`; // 1 day
      setActivePreview(plan);
      alert(`${plan} yetkileriyle önizleme moduna geçildi. Uygulama bu planmışsınız gibi davranacak.`);
    } else {
      document.cookie = 'odi_premium_preview=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      setActivePreview(null);
      alert('Önizleme modu kapatıldı. Normal yetkilerinize dönüldü.');
    }
    // Force reload to apply new context and server component logic
    window.location.reload();
  };

  return (
    <div className="card-base p-6 bg-indigo-50 border border-indigo-100 rounded-3xl space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Premium Preview (Önizleme Modu)
          </h3>
          <p className="text-xs text-indigo-700/70 mt-1">
            Uygulamayı sıradan bir kullanıcı gibi veya farklı bir plandaymış gibi test edin. Bu sadece sizin tarayıcınızı etkiler.
          </p>
        </div>
        {activePreview && (
          <button 
            onClick={() => handlePreview(null)}
            className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-xl text-xs active:scale-95 flex items-center gap-1.5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Önizlemeyi Kapat
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {plans.map(plan => (
          <button
            key={plan}
            onClick={() => handlePreview(plan)}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all uppercase ${
              activePreview === plan 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            {plan} Olarak İncele
          </button>
        ))}
      </div>
    </div>
  );
}

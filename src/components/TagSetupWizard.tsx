'use client'

import { useState, ReactNode } from 'react'

export type TagBrand = 'airtag' | 'smarttag' | 'tractive' | 'other'

interface TagSetupWizardProps {
  onComplete?: (brand: TagBrand) => void
  onCancel?: () => void
}

export default function TagSetupWizard({ onComplete, onCancel }: TagSetupWizardProps) {
  const [selectedBrand, setSelectedBrand] = useState<TagBrand | ''>('')
  const [isConnecting, setIsConnecting] = useState(false)

  const tagBrands: { id: TagBrand; name: string; desc: string; icon: ReactNode }[] = [
    { 
      id: 'airtag', 
      name: 'Apple AirTag', 
      desc: 'Find My ağı ile takip edin.', 
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-8 h-8">
          <circle cx="24" cy="24" r="22" fill="url(#airtag-grad)" stroke="#E5E7EB" strokeWidth="2" />
          <path d="M25.7 13.5c-.2-1.8 1.3-3.6 3.1-3.8 0 0 1.5 3.3-1.4 4.5-.4.1-1.4-.2-1.7-.7zM24 35c-4.4 0-6.1-3.1-6.1-3.1s-1.8 2.6-4.6 2.6c-2.4 0-4.6-2.1-4.6-4.9 0-3.3 2.9-4.8 5.6-5.4.1-.7.2-1.5.4-2.3-2.9 0-5.4-2.1-5.4-5.2 0-3.3 2.5-5.5 5.2-5.5 2.1 0 3.7 1.4 4.5 1.4.8 0 2.2-1.3 4.2-1.3 2.9 0 5 1.8 5 4.5 0 2.8-1.9 4-3.5 4.8.4 1.4.6 3 .6 4.6 0 .4 0 .9-.1 1.4 1.5-1 3.5-1.5 5.5-1.5.3 2.6-.5 5.1-2.2 7-.9.9-2.2 1.6-3.7 1.9-1.3 1-2.6 1-3.8 1z" fill="url(#apple-grad)"/>
          <defs>
            <linearGradient id="airtag-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stopColor="#ffffff" /><stop offset="1" stopColor="#f3f4f6" /></linearGradient>
            <linearGradient id="apple-grad" x1="14" y1="10" x2="34" y2="35" gradientUnits="userSpaceOnUse"><stop stopColor="#6B7280" /><stop offset="1" stopColor="#374151" /></linearGradient>
          </defs>
        </svg>
      ) 
    },
    { 
      id: 'smarttag', 
      name: 'Samsung SmartTag', 
      desc: 'SmartThings Find ile takip edin.', 
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-8 h-8 drop-shadow-sm">
          <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#smart-grad)" />
          <circle cx="24" cy="24" r="8" fill="#ffffff" />
          <defs>
            <linearGradient id="smart-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stopColor="#3B82F6" /><stop offset="1" stopColor="#1D4ED8" /></linearGradient>
          </defs>
        </svg>
      ) 
    },
    { 
      id: 'tractive', 
      name: 'Tractive GPS', 
      desc: 'Sınırsız menzilli GPS takibi.', 
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-8 h-8 drop-shadow-sm">
          <rect x="6" y="8" width="36" height="32" rx="8" fill="url(#tract-grad)" />
          <circle cx="16" cy="24" r="3" fill="#ffffff" />
          <circle cx="32" cy="24" r="3" fill="#ffffff" />
          <defs>
            <linearGradient id="tract-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stopColor="#F97316" /><stop offset="1" stopColor="#C2410C" /></linearGradient>
          </defs>
        </svg>
      ) 
    },
    { 
      id: 'other', 
      name: 'Diğer / Çevrimdışı', 
      desc: 'Farklı bir marka kullanıyorum.', 
      icon: (
        <svg viewBox="0 0 48 48" fill="none" className="w-8 h-8 drop-shadow-sm">
          <circle cx="24" cy="24" r="20" fill="url(#other-grad)" />
          <path d="M24 14v20M14 24h20" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <defs>
            <linearGradient id="other-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stopColor="#8B5CF6" /><stop offset="1" stopColor="#6D28D9" /></linearGradient>
          </defs>
        </svg>
      ) 
    },
  ]

  const handleConnect = () => {
    if (!selectedBrand) return
    setIsConnecting(true)
    setTimeout(() => {
      setIsConnecting(false)
      if (onComplete) {
        onComplete(selectedBrand as TagBrand)
      }
    }, 800)
  }

  return (
    <div className="w-full max-w-md mx-auto bg-surface rounded-[28px] border border-border-main/60 p-6 shadow-xl flex flex-col justify-between min-h-[480px] transition-all duration-300">
      <div className="flex flex-col gap-6">
        <span className="text-[12px] font-black text-text-secondary uppercase tracking-wider">
          Adım 1/1: Akıllı Künye Kurulumu
        </span>

        <div className="flex flex-col gap-2">
          <h2 className="text-[24px] font-extrabold text-text-primary tracking-tight leading-tight">
            Kullandığınız Akıllı Künye (TAG) markasını seçin.
          </h2>
          <p className="text-[14px] text-text-secondary font-medium leading-relaxed">
            Seçiminizden sonra petinizin profilinden cihazınızın takip uygulamasına tek tıkla ulaşabileceksiniz.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {tagBrands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => setSelectedBrand(brand.id)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] text-left ${
                selectedBrand === brand.id
                  ? 'border-primary bg-primary-soft/30 shadow-md ring-2 ring-primary/20'
                  : 'border-border-main bg-white hover:border-primary/40 hover:shadow-sm'
              }`}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-white/50">
                {brand.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-extrabold text-text-primary">{brand.name}</span>
                <span className="text-[12.5px] font-semibold text-text-secondary">{brand.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={handleConnect}
          disabled={!selectedBrand || isConnecting}
          className="w-full btn-primary font-bold rounded-xl py-3.5 px-4 active:scale-[0.98] transition-all text-[15px] text-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isConnecting ? 'Kaydediliyor...' : 'Kaydet ve Eşleştir'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            type="button"
            className="w-full text-text-secondary hover:text-text-primary text-[13px] font-bold py-2 transition-all text-center"
          >
            Vazgeç
          </button>
        )}
      </div>
    </div>
  )
}

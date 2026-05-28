'use client'

import { useState } from 'react'

export type TagBrand = 'airtag' | 'smarttag' | 'tractive' | 'other'

interface TagSetupWizardProps {
  onComplete?: (brand: TagBrand) => void
  onCancel?: () => void
}

export default function TagSetupWizard({ onComplete, onCancel }: TagSetupWizardProps) {
  const [selectedBrand, setSelectedBrand] = useState<TagBrand | ''>('')
  const [isConnecting, setIsConnecting] = useState(false)

  const tagBrands: { id: TagBrand; name: string; desc: string; icon: string }[] = [
    { id: 'airtag', name: 'Apple AirTag', desc: 'Find My ağı ile takip edin.', icon: '🍎' },
    { id: 'smarttag', name: 'Samsung SmartTag', desc: 'SmartThings Find ile takip edin.', icon: '🌌' },
    { id: 'tractive', name: 'Tractive GPS', desc: 'Sınırsız menzilli GPS takibi.', icon: '📍' },
    { id: 'other', name: 'Diğer / Çevrimdışı', desc: 'Farklı bir marka kullanıyorum.', icon: '🏷️' },
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
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                selectedBrand === brand.id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border-main bg-white hover:border-primary/40'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[20px] shrink-0">
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
          className="w-full text-white font-bold rounded-xl py-3.5 px-4 active:scale-[0.98] transition-all text-[15px] text-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          style={{ backgroundColor: '#2A4B7C' }}
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

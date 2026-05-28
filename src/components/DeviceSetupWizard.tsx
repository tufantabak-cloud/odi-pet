'use client'

import { useState } from 'react'

interface DeviceSetupWizardProps {
  type?: 'camera' | 'tag'
  onComplete?: (wifi: string) => void
  onCancel?: () => void
}

export default function DeviceSetupWizard({ type = 'tag', onComplete, onCancel }: DeviceSetupWizardProps) {
  const [selectedWifi, setSelectedWifi] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  const wifiNetworks = [
    { id: '1', name: 'OdiPet_Home_5G' },
    { id: '2', name: 'Superonline-WiFi-2.4G' },
    { id: '3', name: 'TürkTelekom_Evim' },
    { id: '4', name: 'Misafir_Agi' }
  ]

  const handleConnect = () => {
    if (!selectedWifi) return
    setIsConnecting(true)
    setTimeout(() => {
      setIsConnecting(false)
      if (onComplete) {
        onComplete(selectedWifi)
      } else {
        alert(`Başarıyla bağlandı: ${selectedWifi}`)
      }
    }, 1500)
  }

  const isCamera = type === 'camera'

  return (
    <div className="w-full max-w-md mx-auto bg-surface rounded-[28px] border border-border-main/60 p-6 shadow-xl flex flex-col justify-between min-h-[480px] transition-all duration-300">
      {/* Upper Stack (Content and Form with 24px spacing) */}
      <div className="flex flex-col gap-6">
        {/* Step Indicator */}
        <span className="text-[12px] font-black text-text-secondary uppercase tracking-wider">
          Adım 1/3: {isCamera ? 'Kamera Bağlantısı' : 'Cihaz Bağlantısı'}
        </span>

        {/* Header and Description */}
        <div className="flex flex-col gap-2">
          <h2 className="text-[24px] font-extrabold text-text-primary tracking-tight leading-tight">
            {isCamera ? 'Kameranızı Odi.Pet\'e bağlayın.' : 'Cihazınızı Odi.Pet\'e bağlayın.'}
          </h2>
          <p className="text-[14px] text-text-secondary font-medium leading-relaxed">
            {isCamera 
              ? 'Kamerayı prize takın ve açma tuşuna basın. Işık yanıp sönmeye başlayınca devam edin ve Wi-Fi ağınızı seçin.'
              : 'Cihazınızı eşleşmeye hazır hale getirin ve Wi-Fi ağınızı seçin.'
            }
          </p>
        </div>

        {/* Single Form Field (Wi-Fi dropdown select) */}
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">
            Wi-Fi Ağı Seçin
          </label>
          <select
            value={selectedWifi}
            onChange={(e) => setSelectedWifi(e.target.value)}
            className="w-full input-base py-3.5 px-4 text-[14px] bg-white border border-border-main rounded-xl cursor-pointer focus:outline-none focus:border-[#2A4B7C] transition-all"
          >
            <option value="" disabled>Ağ seçiniz...</option>
            {wifiNetworks.map((net) => (
              <option key={net.id} value={net.name}>
                {net.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Button at the bottom, spaced 32px from the content above */}
      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={handleConnect}
          disabled={!selectedWifi || isConnecting}
          className="w-full text-white font-bold rounded-xl py-3.5 px-4 active:scale-[0.98] transition-all text-[15px] text-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          style={{ backgroundColor: '#2A4B7C' }}
        >
          {isConnecting ? 'Bağlanıyor...' : 'Cihazı Bağla'}
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

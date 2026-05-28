'use client'

import { useState } from 'react'
import { SUPPORTED_CAMERA_BRANDS, CameraBrandConfig } from '@/lib/devices/camera/CameraProvider'

interface CameraSetupWizardProps {
  onComplete?: (brand: string, name: string, data: string) => void
  onCancel?: () => void
}

export default function CameraSetupWizard({ onComplete, onCancel }: CameraSetupWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedBrand, setSelectedBrand] = useState<CameraBrandConfig | null>(null)
  
  // Form state
  const [cameraName, setCameraName] = useState('Salon Kamerası')
  const [wifiName, setWifiName] = useState('')
  const [rtspUrl, setRtspUrl] = useState('')
  
  const [isConnecting, setIsConnecting] = useState(false)
  const [urlError, setUrlError] = useState('')

  const handleBrandSelect = (brand: CameraBrandConfig) => {
    setSelectedBrand(brand)
    setStep(2)
  }

  const validateRtsp = (url: string) => {
    if (!url.startsWith('rtsp://') && !url.startsWith('http://') && !url.startsWith('https://')) {
      setUrlError('URL rtsp://, http:// veya https:// ile başlamalıdır.')
      return false
    }
    setUrlError('')
    return true
  }

  const handleConnect = () => {
    if (selectedBrand?.requiresRtspUrl) {
      if (!validateRtsp(rtspUrl)) return
    }
    
    setIsConnecting(true)
    setTimeout(() => {
      setIsConnecting(false)
      setStep(3)
    }, 1500)
  }

  const handleFinalize = () => {
    if (onComplete && selectedBrand) {
      let dataString = ''
      if (selectedBrand.id === 'odipet') dataString = `brand:odipet|wifi:${wifiName}`
      else if (selectedBrand.id === 'rtsp') dataString = `brand:rtsp|url:${rtspUrl}`
      else dataString = `brand:${selectedBrand.id}|token:mock_token_123`

      onComplete(selectedBrand.id, cameraName, dataString)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-surface rounded-[28px] border border-border-main/60 p-6 shadow-xl flex flex-col justify-between min-h-[480px] transition-all duration-300">
      <div className="flex flex-col gap-6">
        <span className="text-[12px] font-black text-text-secondary uppercase tracking-wider">
          Adım {step}/3: {step === 1 ? 'Marka Seçimi' : step === 2 ? 'Bağlantı' : 'Son Ayarlar'}
        </span>

        {step === 1 && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <h2 className="text-[24px] font-extrabold text-text-primary tracking-tight leading-tight">
              Kamera Markası Seçin
            </h2>
            <div className="flex flex-col gap-3 mt-2">
              {SUPPORTED_CAMERA_BRANDS.map(brand => (
                <button
                  key={brand.id}
                  onClick={() => handleBrandSelect(brand)}
                  className="w-full p-4 border border-border-main rounded-[16px] text-left hover:border-primary/50 hover:bg-primary/5 transition-colors flex items-center justify-between group"
                >
                  <span className="font-bold text-text-primary group-hover:text-primary transition-colors">{brand.name}</span>
                  <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selectedBrand && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <h2 className="text-[24px] font-extrabold text-text-primary tracking-tight leading-tight">
              {selectedBrand.requiresOAuth ? 'Hesaba Bağlan' : selectedBrand.requiresRtspUrl ? 'Kamera URL\'sini Girin' : 'Wi-Fi\'a Bağlan'}
            </h2>
            
            <p className="text-[14px] text-text-secondary font-medium leading-relaxed">
              {selectedBrand.requiresOAuth 
                ? `${selectedBrand.name} hesabınıza giriş yaparak kameralarınızı güvenle Odi.Pet'e aktarabilirsiniz.` 
                : selectedBrand.requiresRtspUrl
                ? 'RTSP veya HLS protokolünü destekleyen kamera yayın URL\'nizi aşağıya girin.'
                : 'Kameranızı prize takın ve Wi-Fi ağınızı seçin.'}
            </p>

            <div className="mt-4">
              {selectedBrand.id === 'odipet' && (
                <select
                  value={wifiName}
                  onChange={(e) => setWifiName(e.target.value)}
                  className="w-full input-base py-3.5 px-4 text-[14px] bg-white border border-border-main rounded-xl cursor-pointer focus:outline-none focus:border-primary transition-all"
                >
                  <option value="" disabled>Ağ seçiniz...</option>
                  <option value="Home_5G">Home_5G</option>
                  <option value="Superonline-2.4G">Superonline-2.4G</option>
                </select>
              )}

              {selectedBrand.requiresRtspUrl && (
                <div className="flex flex-col gap-1">
                  <input
                    type="text"
                    value={rtspUrl}
                    onChange={(e) => { setRtspUrl(e.target.value); setUrlError(''); }}
                    placeholder="rtsp://192.168.1.100:554/stream1"
                    className={`w-full input-base py-3.5 px-4 text-[14px] bg-white border rounded-xl focus:outline-none transition-all ${urlError ? 'border-error focus:border-error' : 'border-border-main focus:border-primary'}`}
                  />
                  {urlError && <span className="text-error text-[11px] font-bold ml-1">{urlError}</span>}
                </div>
              )}

              {selectedBrand.requiresOAuth && (
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-center">
                  <span className="font-bold text-slate-500 text-[13px]">{selectedBrand.name} Auth Provider (Mock)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <h2 className="text-[24px] font-extrabold text-text-primary tracking-tight leading-tight">
              Kameranızı İsimlendirin
            </h2>
            <p className="text-[14px] text-text-secondary font-medium leading-relaxed">
              Bu kamerayı kolayca tanımak için bir isim verin.
            </p>
            <div className="mt-4">
              <input
                type="text"
                value={cameraName}
                onChange={(e) => setCameraName(e.target.value)}
                placeholder="Örn: Salon Kamerası"
                className="w-full input-base py-3.5 px-4 text-[14px] bg-white border border-border-main rounded-xl focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>
        )}

      </div>

      <div className="mt-8 flex flex-col gap-3">
        {step === 1 && onCancel && (
          <button onClick={onCancel} className="w-full text-text-secondary hover:text-text-primary text-[13px] font-bold py-2 transition-all">
            Vazgeç
          </button>
        )}
        
        {step === 2 && (
          <>
            <button
              onClick={handleConnect}
              disabled={isConnecting || (selectedBrand?.id === 'odipet' && !wifiName) || (selectedBrand?.requiresRtspUrl && !rtspUrl)}
              className="w-full btn-primary font-bold rounded-xl py-3.5 px-4 active:scale-[0.98] transition-all text-[15px] shadow-md disabled:opacity-50"
            >
              {isConnecting ? 'Bağlanıyor...' : selectedBrand?.requiresOAuth ? 'Hesaba Bağlan' : 'Devam Et'}
            </button>
            <button onClick={() => setStep(1)} className="w-full text-text-secondary hover:text-text-primary text-[13px] font-bold py-2 transition-all">
              Geri Dön
            </button>
          </>
        )}

        {step === 3 && (
          <button
            onClick={handleFinalize}
            disabled={!cameraName.trim()}
            className="w-full btn-primary font-bold rounded-xl py-3.5 px-4 active:scale-[0.98] transition-all text-[15px] shadow-md disabled:opacity-50"
          >
            Kurulumu Tamamla
          </button>
        )}
      </div>
    </div>
  )
}

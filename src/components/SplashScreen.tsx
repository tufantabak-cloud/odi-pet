'use client'

import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [show, setShow] = useState(true)
  const [isFading, setIsFading] = useState(false)

  const dismissSplash = () => {
    setIsFading(true)
    setTimeout(() => {
      setShow(false)
    }, 500) // 500ms fade-out animasyon süresi
  }

  useEffect(() => {
    // Sadece oturum başında 1 kez göster (sessionStorage kuralı aktif)
    const hasShown = sessionStorage.getItem('odi_splash_shown')
    if (hasShown) {
      setShow(false)
      return
    }

    // Uygulama açıldıktan 3.5 saniye sonra animasyonu tetikle
    const fadeTimer = setTimeout(() => {
      dismissSplash()
      sessionStorage.setItem('odi_splash_shown', 'true')
    }, 3500)

    return () => clearTimeout(fadeTimer)
  }, [])

  if (!show) return null

  return (
    <div 
      onClick={dismissSplash}
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#4F2DBA] transition-opacity duration-500 cursor-pointer
      ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{ height: '100dvh' }}
    >
      <div className="relative w-full h-full flex items-center justify-center p-6 md:p-12">
        <img 
          src="/splash.png" 
          alt="Odi Pet" 
          className="max-w-full max-h-full object-contain pointer-events-none select-none animate-in fade-in zoom-in duration-700"
        />
      </div>
    </div>
  )
}

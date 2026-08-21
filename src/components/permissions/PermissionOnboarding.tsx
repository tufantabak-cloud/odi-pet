'use client'

import React, { useState, useEffect } from 'react'
import { useGeolocation } from '@/contexts/GeolocationContext'
import { useWebPush } from '@/hooks/useWebPush'
import { GlassCard } from '@/components/ui/primitives'
import { MapPin, Bell, X } from 'lucide-react'

const ONBOARDING_KEY = 'odi_permission_onboarding_completed'

export default function PermissionOnboarding() {
  const [show, setShow] = useState(false)
  const { requestLocation } = useGeolocation()
  const { subscribe, permission: pushPermission } = useWebPush()

  useEffect(() => {
    // Check if we should show onboarding
    const isCompleted = localStorage.getItem(ONBOARDING_KEY)
    if (!isCompleted) {
      setShow(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setShow(false)
  }

  const handleLocation = async () => {
    await requestLocation()
  }

  const handleNotification = async () => {
    await subscribe()
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <GlassCard className="w-full max-w-sm overflow-hidden flex flex-col relative" padding="none">
        
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pb-2 border-b border-border-main/50 bg-primary/5">
          <div className="text-4xl mb-3">🐾</div>
          <h2 className="text-[20px] font-black tracking-tight text-text-primary">Odi Pet izinlerini yönet</h2>
          <p className="text-[13px] text-text-secondary mt-2 leading-relaxed">
            Odi Pet bazı özellikleri daha iyi çalıştırmak için cihaz izinlerine ihtiyaç duyabilir. İsterseniz bu özellikleri şimdi açabilirsiniz.
          </p>
        </div>

        <div className="p-6 flex flex-col gap-6">
          
          {/* Location */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-[15px]">Konum</h3>
                <p className="text-[12px] text-text-secondary mt-1">Yakınındaki veterinerleri, hizmetleri ve konum tabanlı özellikleri göstermek için.</p>
              </div>
            </div>
            <button 
              onClick={handleLocation}
              className="h-11 w-full bg-surface border border-border-main rounded-xl font-bold text-[14px] text-text-primary hover:bg-bg-main active:scale-[0.98] transition-all shadow-sm"
            >
              Konumumu Kullan
            </button>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-border-main/50" />

          {/* Notification */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-[15px]">Bildirimler</h3>
                <p className="text-[12px] text-text-secondary mt-1">Aşı, bakım, sağlık ve önemli hatırlatmaları zamanında göndermek için.</p>
              </div>
            </div>
            <button 
              onClick={handleNotification}
              className="h-11 w-full bg-surface border border-border-main rounded-xl font-bold text-[14px] text-text-primary hover:bg-bg-main active:scale-[0.98] transition-all shadow-sm"
            >
              Bildirimleri Aç
            </button>
          </div>

        </div>

        <div className="p-4 bg-bg-main border-t border-border-main/50">
          <button 
            onClick={handleDismiss}
            className="h-11 w-full bg-primary text-white rounded-xl font-extrabold text-[14px] active:scale-[0.98] transition-all shadow-md shadow-primary/20"
          >
            Şimdi Değil
          </button>
        </div>

      </GlassCard>
    </div>
  )
}

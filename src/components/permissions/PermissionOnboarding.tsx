'use client'

import React, { useState, useEffect } from 'react'
import { useGeolocation } from '@/contexts/GeolocationContext'
import { useWebPush } from '@/hooks/useWebPush'
import { GlassCard } from '@/components/ui/primitives'
import { MapPin, Bell, X, Check, Loader2, AlertCircle, ShieldAlert } from 'lucide-react'

const ONBOARDING_KEY = 'odi_permission_onboarding_completed'

export default function PermissionOnboarding() {
  const [show, setShow] = useState(false)
  const { requestLocation, status: geoStatus, coords } = useGeolocation()
  const { subscribe, permission: pushPermission, isSubscribed } = useWebPush()

  const [isLocLoading, setIsLocLoading] = useState(false)
  const [isNotifLoading, setIsNotifLoading] = useState(false)

  const [locSuccess, setLocSuccess] = useState(false)
  const [notifSuccess, setNotifSuccess] = useState(false)

  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'warning'
  } | null>(null)

  useEffect(() => {
    // Check if we should show onboarding
    const isCompleted = localStorage.getItem(ONBOARDING_KEY)
    if (!isCompleted) {
      setShow(true)
    }
  }, [])

  // Sync initial permission states if already granted
  useEffect(() => {
    if (geoStatus === 'granted' || coords !== null) {
      setLocSuccess(true)
    }
    if (pushPermission === 'granted' || isSubscribed) {
      setNotifSuccess(true)
    }
  }, [geoStatus, coords, pushPermission, isSubscribed])

  const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 4500)
  }

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setShow(false)
  }

  const handleLocation = async () => {
    if (locSuccess) return

    // Secure context check
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      showToast('Konum erişimi için HTTPS (güvenli bağlantı) gereklidir.', 'warning')
      return
    }

    setIsLocLoading(true)
    setToast(null)

    try {
      const locationCoords = await requestLocation()
      if (locationCoords || geoStatus === 'granted') {
        setLocSuccess(true)
        showToast('Konum izni başarıyla alındı! 📍', 'success')
      } else {
        if (geoStatus === 'denied') {
          const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone === true)
          showToast(
            isStandalone
              ? 'Konum izniniz engellenmiş. Lütfen Chrome tarayıcınızı açarak Site Ayarları (Site Settings) bölümünden Odi Pet için Konum iznini etkinleştirin.'
              : 'Konum izni tarayıcı ayarlarınızdan engellenmiş. Lütfen adres çubuğundaki kilit (🔒) ikonuna basıp konuma izin verin.',
            'warning'
          )
        } else if (geoStatus === 'unsupported') {
          showToast('Cihazınız veya tarayıcınız konum özelliğini desteklemiyor.', 'error')
        } else {
          showToast('Konumunuza erişilemedi. Lütfen cihazınızın GPS servisini açık tutun.', 'error')
        }
      }
    } catch {
      showToast('Konum alınırken bir hata oluştu. Lütfen tekrar deneyin.', 'error')
    } finally {
      setIsLocLoading(false)
    }
  }

  const handleNotification = async () => {
    if (notifSuccess) return

    // Secure context check
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      showToast('Bildirim izni için HTTPS (güvenli bağlantı) gereklidir.', 'warning')
      return
    }

    setIsNotifLoading(true)
    setToast(null)

    try {
      const res = await subscribe()
      if (res.success || pushPermission === 'granted' || isSubscribed) {
        setNotifSuccess(true)
        showToast('Bildirimler başarıyla etkinleştirildi! 🔔', 'success')
      } else if (res.error) {
        if (pushPermission === 'denied') {
          const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as any).standalone === true)
          showToast(
            isStandalone
              ? 'Bildirim izni cihaz ayarlarınızdan engellenmiş. Lütfen cihazınızın Ayarlar > Uygulamalar bölümünden Odi Pet için bildirimlere izin verin.'
              : 'Bildirim izni tarayıcı ayarlarınızda engellenmiş. Lütfen kilit (🔒) ikonuna basıp bildirimlere izin verin.',
            'warning'
          )
        } else {
          showToast(res.error, 'error')
        }
      }
    } catch {
      showToast('Bildirimler etkinleştirilirken bir hata oluştu.', 'error')
    } finally {
      setIsNotifLoading(false)
    }
  }

  if (!show) return null

  const isAllGranted = locSuccess && notifSuccess

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <GlassCard className="w-full max-w-sm overflow-hidden flex flex-col relative rounded-[24px]" padding="none">
        
        <button 
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors z-10"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pb-4 border-b border-border-main/50 bg-primary/5">
          <div className="text-4xl mb-2">🐾</div>
          <h2 className="text-[20px] font-black tracking-tight text-text-primary">Odi Pet izinlerini yönet</h2>
          <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed">
            Odi Pet bazı özellikleri daha iyi çalıştırmak için cihaz izinlerine ihtiyaç duyabilir. İsterseniz bu özellikleri şimdi açabilirsiniz.
          </p>
        </div>

        {/* Feedback Toast Banner inside Modal */}
        {toast && (
          <div
            className={`px-4 py-3 border-b flex items-start gap-2.5 text-xs font-semibold leading-snug animate-in fade-in duration-200 ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {toast.type === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
            <div className="flex-1">{toast.message}</div>
          </div>
        )}

        <div className="p-6 flex flex-col gap-5">
          
          {/* Location Section */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-[15px] text-text-primary">Konum</h3>
                  {locSuccess && (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" /> İzin Verildi
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-text-secondary mt-0.5">Yakınındaki veterinerleri, hizmetleri ve konum tabanlı özellikleri göstermek için.</p>
              </div>
            </div>

            {locSuccess ? (
              <div className="h-11 w-full bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm">
                <Check className="w-4 h-4 text-emerald-600" />
                Konum İzni Açık
              </div>
            ) : (
              <button 
                onClick={handleLocation}
                disabled={isLocLoading}
                className="h-11 w-full bg-surface border border-border-main rounded-xl font-bold text-[14px] text-text-primary hover:bg-bg-main active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLocLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Konum İsteniyor...</span>
                  </>
                ) : (
                  'Konumumu Kullan'
                )}
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-border-main/50" />

          {/* Notification Section */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-[15px] text-text-primary">Bildirimler</h3>
                  {notifSuccess && (
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Check className="w-3 h-3" /> İzin Verildi
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-text-secondary mt-0.5">Aşı, bakım, sağlık ve önemli hatırlatmaları zamanında göndermek için.</p>
              </div>
            </div>

            {notifSuccess ? (
              <div className="h-11 w-full bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 shadow-sm">
                <Check className="w-4 h-4 text-emerald-600" />
                Bildirim İzni Açık
              </div>
            ) : (
              <button 
                onClick={handleNotification}
                disabled={isNotifLoading}
                className="h-11 w-full bg-surface border border-border-main rounded-xl font-bold text-[14px] text-text-primary hover:bg-bg-main active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isNotifLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Bildirim İsteniyor...</span>
                  </>
                ) : (
                  'Bildirimleri Aç'
                )}
              </button>
            )}
          </div>

        </div>

        <div className="p-4 bg-bg-main border-t border-border-main/50">
          <button 
            onClick={handleDismiss}
            className={`h-11 w-full rounded-xl font-extrabold text-[14px] active:scale-[0.98] transition-all shadow-md ${
              isAllGranted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
            }`}
          >
            {isAllGranted ? 'Harika, Devam Et!' : 'Şimdi Değil'}
          </button>
        </div>

      </GlassCard>
    </div>
  )
}


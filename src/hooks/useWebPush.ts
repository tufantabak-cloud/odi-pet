'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export function useWebPush() {
  const [permission, setPermission] = useState<PushPermission>(() => {
    if (typeof window === 'undefined') return 'default';
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission as PushPermission;
  })
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null)

  // Register service worker and check current state
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    // Register service worker, then keep the registration reference
    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        swRegRef.current = reg
        // Wait for the SW to be fully active before checking subscriptions
        if (reg.installing) {
          await new Promise<void>((resolve) => {
            reg.installing!.addEventListener('statechange', function handler() {
              if (reg.active) {
                reg.installing?.removeEventListener('statechange', handler)
                resolve()
              }
            })
          })
        } else if (reg.waiting) {
          await new Promise<void>((resolve) => {
            reg.waiting!.addEventListener('statechange', function handler() {
              if (reg.active) {
                reg.waiting?.removeEventListener('statechange', handler)
                resolve()
              }
            })
          })
        }
        // Check if already subscribed
        const sub = await reg.pushManager.getSubscription()
        setIsSubscribed(!!sub)
      })
      .catch((err) => console.warn('[useWebPush] SW registration failed:', err))
  }, [])

  const subscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setError(null)

    if (!VAPID_PUBLIC_KEY) {
      const msg = 'VAPID anahtarı yapılandırılmamış. Lütfen yöneticinize başvurun.'
      console.warn('[useWebPush]', msg)
      setError(msg)
      return { success: false, error: msg }
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      const msg = 'Bu tarayıcı veya cihaz push bildirimlerini desteklemiyor.'
      console.warn('[useWebPush]', msg)
      setError(msg)
      return { success: false, error: msg }
    }

    try {
      setIsLoading(true)

      // 1. Request permission FIRST (Must be synchronous to user click for iOS Safari)
      const result = await Notification.requestPermission()
      setPermission(result as PushPermission)
      if (result !== 'granted') {
        setError(null) // User made a conscious choice, no error
        return { success: false } // no error field = user denied
      }

      // 2. Ensure service worker is registered and active
      let reg = swRegRef.current
      if (!reg) {
        try {
          reg = await navigator.serviceWorker.register('/sw.js')
          swRegRef.current = reg
        } catch (swErr) {
          const msg = 'Service worker kayıt hatası. Lütfen sayfayı yenileyip tekrar deneyin.'
          console.error('[useWebPush] SW register error:', swErr)
          setError(msg)
          return { success: false, error: msg }
        }
      }

      // 3. Wait for the service worker to become active
      // navigator.serviceWorker.ready is more reliable than checking reg.active directly
      const readyReg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SW_TIMEOUT')), 10000)
        ),
      ])

      // 4. Create push subscription
      const subscription = await readyReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = subscription.toJSON()

      // 5. Save to Supabase
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      })

      if (res.ok) {
        setIsSubscribed(true)
        setError(null)
        return { success: true }
      }

      // Parse error from server
      let serverMsg = 'Sunucu hatası. Lütfen tekrar deneyin.'
      try {
        const errBody = await res.json()
        if (errBody?.error) serverMsg = errBody.error
      } catch { /* ignore parse errors */ }
      
      console.error('[useWebPush] Subscribe API error:', res.status, serverMsg)
      setError(serverMsg)
      return { success: false, error: serverMsg }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      let userMsg: string
      
      if (errorMsg === 'SW_TIMEOUT') {
        userMsg = 'Service worker başlatılamadı. Lütfen sayfayı yenileyip tekrar deneyin.'
      } else if (errorMsg.includes('Registration failed')) {
        userMsg = 'Push bildirimi kaydı başarısız. Lütfen tarayıcı ayarlarınızı kontrol edin.'
      } else {
        userMsg = 'Bildirim etkinleştirme başarısız. Lütfen tekrar deneyin.'
      }
      
      setError(userMsg)
      console.error('[useWebPush] Subscribe error:', err)
      return { success: false, error: userMsg }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return true

      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })

      await sub.unsubscribe()
      setIsSubscribed(false)
      return true
    } catch (err) {
      console.error('[useWebPush] Unsubscribe error:', err)
      setError('Bildirim kapatılamadı. Lütfen tekrar deneyin.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { permission, isSubscribed, isLoading, error, subscribe, unsubscribe }
}

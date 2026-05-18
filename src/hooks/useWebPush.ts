'use client'

import { useState, useEffect, useCallback } from 'react'

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
  const [permission, setPermission] = useState<PushPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [swReady, setSwReady] = useState(false)

  // Register service worker and check current state
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      return
    }

    const currentPermission = Notification.permission as PushPermission
    setPermission(currentPermission)

    navigator.serviceWorker
      .register('/sw.js')
      .then(async (reg) => {
        setSwReady(true)
        // Check if already subscribed
        const sub = await reg.pushManager.getSubscription()
        setIsSubscribed(!!sub)
      })
      .catch((err) => console.warn('[useWebPush] SW registration failed:', err))
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!swReady || !VAPID_PUBLIC_KEY) return false

    setIsLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready

      // Request permission
      const result = await Notification.requestPermission()
      setPermission(result as PushPermission)
      if (result !== 'granted') return false

      // Create push subscription
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = subscription.toJSON()

      // Save to Supabase
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
        return true
      }
      return false
    } catch (err) {
      console.error('[useWebPush] Subscribe error:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [swReady])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
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
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe }
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getOrCreatePushSubscription,
  persistPushSubscription,
  pushSubscriptionMatchesApplicationServerKey,
  WebPushSetupError,
  withTimeout,
} from '@/lib/notifications/web-push-client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const PUSH_OPERATION_TIMEOUT_MS = 15_000

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

function isWebPushSupported() {
  return (
    typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
  )
}

function getUserMessage(error: unknown): string {
  if (error instanceof WebPushSetupError) {
    switch (error.code) {
      case 'SW_READY_TIMEOUT':
        return 'Bildirim servisi başlatılamadı. Sayfayı yenileyip tekrar deneyin.'
      case 'PUSH_SUBSCRIPTION_TIMEOUT':
        return 'Cihazın bildirim servisine ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'
      case 'PUSH_SYNC_TIMEOUT':
        return 'Bildirim izni verildi ancak cihaz kaydı sunucuya ulaşmadı. Lütfen tekrar deneyin.'
      case 'PUSH_SUBSCRIPTION_INVALID':
      case 'PUSH_SYNC_FAILED':
        return 'Bildirim izni verildi ancak cihaz kaydı tamamlanamadı. Lütfen tekrar deneyin.'
    }
  }

  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return 'Bildirim izni cihaz veya tarayıcı ayarları tarafından engellendi.'
    }
    if (error.name === 'InvalidStateError') {
      return 'Bildirim kaydı bu cihazda başlatılamadı. Uygulamayı kapatıp yeniden açarak tekrar deneyin.'
    }
  }

  return 'Bildirim etkinleştirme başarısız. Lütfen tekrar deneyin.'
}

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported'

export function useWebPush() {
  const [permission, setPermission] = useState<PushPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBatteryGuide, setShowBatteryGuide] = useState(false)
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!isWebPushSupported()) {
      setPermission('unsupported')
      setIsInitializing(false)
      return
    }

    setPermission(Notification.permission as PushPermission)

    async function initializePushState() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        swRegRef.current = registration

        const readyRegistration = await withTimeout(
          navigator.serviceWorker.ready,
          PUSH_OPERATION_TIMEOUT_MS,
          'SW_READY_TIMEOUT'
        )
        swRegRef.current = readyRegistration

        const existingSubscription = await withTimeout(
          readyRegistration.pushManager.getSubscription(),
          PUSH_OPERATION_TIMEOUT_MS,
          'PUSH_SUBSCRIPTION_TIMEOUT'
        )

        if (!existingSubscription) {
          if (!cancelled) setIsSubscribed(false)
          return
        }

        if (!VAPID_PUBLIC_KEY) {
          throw new WebPushSetupError(
            'PUSH_SUBSCRIPTION_INVALID',
            'MISSING_VAPID_PUBLIC_KEY'
          )
        }

        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        if (
          !pushSubscriptionMatchesApplicationServerKey(
            existingSubscription,
            applicationServerKey
          )
        ) {
          throw new WebPushSetupError(
            'PUSH_SUBSCRIPTION_INVALID',
            'VAPID_KEY_MISMATCH'
          )
        }

        await persistPushSubscription(
          existingSubscription,
          fetch,
          PUSH_OPERATION_TIMEOUT_MS
        )

        if (!cancelled) {
          setIsSubscribed(true)
          setError(null)
        }
      } catch (initializationError) {
        if (!cancelled) {
          setIsSubscribed(false)
          if (Notification.permission === 'granted') {
            setError(getUserMessage(initializationError))
          }
        }
        console.warn('[useWebPush] Push state initialization failed:', initializationError)
      } finally {
        if (!cancelled) setIsInitializing(false)
      }
    }

    void initializePushState()

    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setError(null)

    if (!VAPID_PUBLIC_KEY) {
      const message = 'Bildirim servisi yapılandırılmamış. Lütfen yöneticinize başvurun.'
      setError(message)
      console.error('[useWebPush] Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY')
      return { success: false, error: message }
    }

    if (!isWebPushSupported()) {
      const message = 'Bu tarayıcı veya cihaz push bildirimlerini desteklemiyor.'
      setPermission('unsupported')
      setError(message)
      return { success: false, error: message }
    }

    try {
      setIsLoading(true)

      const permissionResult = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission

      setPermission(permissionResult as PushPermission)
      if (permissionResult !== 'granted') {
        setIsSubscribed(false)
        return { success: false }
      }

      let registration = swRegRef.current
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js')
        swRegRef.current = registration
      }

      const readyRegistration = await withTimeout(
        navigator.serviceWorker.ready,
        PUSH_OPERATION_TIMEOUT_MS,
        'SW_READY_TIMEOUT'
      )
      swRegRef.current = readyRegistration

      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      const subscription = await getOrCreatePushSubscription(
        readyRegistration,
        applicationServerKey,
        PUSH_OPERATION_TIMEOUT_MS
      )

      await persistPushSubscription(
        subscription,
        fetch,
        PUSH_OPERATION_TIMEOUT_MS
      )

      setIsSubscribed(true)
      setError(null)

      if (!localStorage.getItem('notif_guide_shown')) {
        localStorage.setItem('notif_guide_shown', 'true')
        setShowBatteryGuide(true)
      }

      return { success: true }
    } catch (subscribeError) {
      const message = getUserMessage(subscribeError)
      setIsSubscribed(false)
      setError(message)
      console.error('[useWebPush] Subscribe failed:', subscribeError)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
      setIsInitializing(false)
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    try {
      const registration = await withTimeout(
        navigator.serviceWorker.ready,
        PUSH_OPERATION_TIMEOUT_MS,
        'SW_READY_TIMEOUT'
      )
      const subscription = await withTimeout(
        registration.pushManager.getSubscription(),
        PUSH_OPERATION_TIMEOUT_MS,
        'PUSH_SUBSCRIPTION_TIMEOUT'
      )
      if (!subscription) {
        setIsSubscribed(false)
        return true
      }

      const response = await withTimeout(
        fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }),
        PUSH_OPERATION_TIMEOUT_MS,
        'PUSH_SYNC_TIMEOUT'
      )

      if (!response.ok) {
        throw new WebPushSetupError('PUSH_SYNC_FAILED')
      }

      await withTimeout(
        subscription.unsubscribe(),
        PUSH_OPERATION_TIMEOUT_MS,
        'PUSH_SUBSCRIPTION_TIMEOUT'
      )
      setIsSubscribed(false)
      return true
    } catch (unsubscribeError) {
      const message = getUserMessage(unsubscribeError)
      console.error('[useWebPush] Unsubscribe failed:', unsubscribeError)
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const dismissBatteryGuide = useCallback(() => {
    setShowBatteryGuide(false)
  }, [])

  return {
    permission,
    isSubscribed,
    isInitializing,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    showBatteryGuide,
    dismissBatteryGuide,
  }
}

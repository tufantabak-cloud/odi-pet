'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  detectPlatformAndBrowser,
  getDeviceId,
  getOrCreatePushSubscription,
  NotificationState,
  persistPushSubscription,
  pushSubscriptionMatchesApplicationServerKey,
  WebPushSetupError,
  withTimeout,
} from '@/lib/notifications/web-push-client'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''
const PUSH_OPERATION_TIMEOUT_MS = 15_000
const INIT_CHECK_TIMEOUT_MS = 3_000
const SOFT_PROMPT_REMIND_DAYS = 14

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
      case 'IOS_PWA_REQUIRED':
        return 'iOS cihazlarda bildirim alabilmek için lütfen Odi.Pet web uygulamasını Safari menüsünden "Ana Ekrana Ekle" butonuna dokunarak yükleyin.'
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
  const [state, setState] = useState<NotificationState>('default')
  const [permission, setPermission] = useState<PushPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSoftPrompt, setShowSoftPrompt] = useState(false)
  const [showBatteryGuide, setShowBatteryGuide] = useState(false)
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null)

  // 1. Initial State & Auto-Sync
  useEffect(() => {
    let cancelled = false

    const { isIos, isStandalone } = detectPlatformAndBrowser()

    if (!isWebPushSupported()) {
      if (isIos && !isStandalone) {
        setState('ios_pwa_required')
      } else {
        setState('unsupported')
      }
      setPermission('unsupported')
      setIsInitializing(false)
      return
    }

    const currentPermission = Notification.permission as PushPermission
    setPermission(currentPermission)

    if (currentPermission === 'denied') {
      setState('blocked')
      setIsInitializing(false)
      return
    }

    async function initializePushState() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        swRegRef.current = registration

        const readyRegistration = await withTimeout(
          navigator.serviceWorker.ready,
          INIT_CHECK_TIMEOUT_MS,
          'SW_READY_TIMEOUT'
        )
        swRegRef.current = readyRegistration

        const existingSubscription = await withTimeout(
          readyRegistration.pushManager.getSubscription(),
          INIT_CHECK_TIMEOUT_MS,
          'PUSH_SUBSCRIPTION_TIMEOUT'
        )

        if (!existingSubscription) {
          if (!cancelled) {
            setIsSubscribed(false)
            setState(currentPermission === 'granted' ? 'sync_required' : 'default')
            checkSoftPromptEligibility(currentPermission)
          }
          return
        }

        if (!VAPID_PUBLIC_KEY) {
          if (!cancelled) setState('expired')
          return
        }

        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        
        // Helper to sync gracefully
        const trySync = async (sub: PushSubscription) => {
          const supabase = createBrowserSupabaseClient()
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) return false // Silent skip if logged out

          try {
            await persistPushSubscription(
              sub,
              fetch,
              PUSH_OPERATION_TIMEOUT_MS,
              session.access_token
            )
            return true
          } catch (err: any) {
            // Ignore 401s during auto-sync (e.g. race conditions)
            if (err?.message?.includes('401')) return false
            throw err
          }
        }

        if (
          !pushSubscriptionMatchesApplicationServerKey(
            existingSubscription,
            applicationServerKey
          )
        ) {
          if (!cancelled) setState('vapid_changed')
          const newSub = await getOrCreatePushSubscription(
            readyRegistration,
            applicationServerKey,
            PUSH_OPERATION_TIMEOUT_MS
          )
          await trySync(newSub)
        } else {
          await trySync(existingSubscription)
        }

        if (!cancelled) {
          setIsSubscribed(true)
          setState('subscribed')
          setError(null)
        }
      } catch (initializationError) {
        if (!cancelled) {
          setIsSubscribed(false)
          if (Notification.permission === 'granted') {
            setState('sync_required')
            setError(getUserMessage(initializationError))
          }
        }
        console.warn('[useWebPush] Initialization sync error:', initializationError)
      } finally {
        if (!cancelled) setIsInitializing(false)
      }
    }

    void initializePushState()

    return () => {
      cancelled = true
    }
  }, [])

  // 2. Contextual Soft Prompt Check
  const checkSoftPromptEligibility = (perm: PushPermission) => {
    if (perm !== 'default') return
    const dismissedAt = localStorage.getItem('odi_soft_prompt_dismissed_at')
    if (dismissedAt) {
      const daysPassed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24)
      if (daysPassed < SOFT_PROMPT_REMIND_DAYS) return
    }
    setShowSoftPrompt(true)
  }

  const dismissSoftPrompt = useCallback(() => {
    setShowSoftPrompt(false)
    localStorage.setItem('odi_soft_prompt_dismissed_at', Date.now().toString())
  }, [])

  const dismissBatteryGuide = useCallback(() => {
    setShowBatteryGuide(false)
  }, [])

  // 3. User Gesture Subscribe Pipeline
  const subscribe = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    setError(null)

    const { isIos, isStandalone } = detectPlatformAndBrowser()
    if (isIos && !isStandalone) {
      const message = getUserMessage(new WebPushSetupError('IOS_PWA_REQUIRED'))
      setState('ios_pwa_required')
      setError(message)
      return { success: false, error: message }
    }

    if (!VAPID_PUBLIC_KEY) {
      const message = 'Bildirim servisi yapılandırılmamış. Lütfen yöneticinize başvurun.'
      setError(message)
      return { success: false, error: message }
    }

    if (!isWebPushSupported()) {
      const message = 'Bu tarayıcı veya cihaz push bildirimlerini desteklemiyor.'
      setPermission('unsupported')
      setState('unsupported')
      setError(message)
      return { success: false, error: message }
    }

    try {
      setIsLoading(true)
      // If we are retrying a sync, visually update state
      if (Notification.permission === 'granted') {
        setState('syncing')
      }

      const permissionResult = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission

      setPermission(permissionResult as PushPermission)
      if (permissionResult !== 'granted') {
        setIsSubscribed(false)
        setState('blocked')
        return { success: false, error: 'Bildirim izni reddedildi.' }
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

      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      await persistPushSubscription(
        subscription,
        fetch,
        PUSH_OPERATION_TIMEOUT_MS,
        session?.access_token
      )

      setIsSubscribed(true)
      setState('subscribed')
      setShowSoftPrompt(false)
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
      if (Notification.permission === 'granted') {
        setState('sync_failed')
      } else {
        setState('default') // or leave it if there's another appropriate state
      }
      console.error('[useWebPush] Subscribe failed:', subscribeError)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
      setIsInitializing(false)
    }
  }, [])

  // 4. Session Cleanup Unsubscribe
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

      const deviceId = getDeviceId()

      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      await fetch('/api/notifications/subscribe', {
        method: 'DELETE',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({
          endpoint: subscription?.endpoint,
          device_id: deviceId
        }),
      })

      if (subscription) {
        await withTimeout(
          subscription.unsubscribe(),
          PUSH_OPERATION_TIMEOUT_MS,
          'PUSH_SUBSCRIPTION_TIMEOUT'
        )
      }

      setIsSubscribed(false)
      setState('default')
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

  return {
    state,
    permission,
    isSubscribed,
    isInitializing,
    isLoading,
    error,
    showSoftPrompt,
    dismissSoftPrompt,
    showBatteryGuide,
    dismissBatteryGuide,
    subscribe,
    unsubscribe,
  }
}

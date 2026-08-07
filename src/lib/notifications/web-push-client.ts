export type WebPushSetupErrorCode =
  | 'SW_READY_TIMEOUT'
  | 'PUSH_SUBSCRIPTION_TIMEOUT'
  | 'PUSH_SUBSCRIPTION_INVALID'
  | 'PUSH_SYNC_TIMEOUT'
  | 'PUSH_SYNC_FAILED'
  | 'PUSH_UNSUPPORTED'
  | 'IOS_PWA_REQUIRED'
  | 'UNAUTHORIZED'

export class WebPushSetupError extends Error {
  constructor(
    public readonly code: WebPushSetupErrorCode,
    message: string = code
  ) {
    super(message)
    this.name = 'WebPushSetupError'
  }
}

export type NotificationState =
  | 'unsupported'
  | 'ios_browser'
  | 'ios_pwa_required'
  | 'default'
  | 'granted'
  | 'subscribed'
  | 'expired'
  | 'vapid_changed'
  | 'blocked'
  | 'sync_required'

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server-side'
  let deviceId = localStorage.getItem('odi_device_id')
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!deviceId || !uuidRegex.test(deviceId)) {
    deviceId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).substring(2, 14).padEnd(12, '0');
    localStorage.setItem('odi_device_id', deviceId)
  }
  return deviceId
}

export function detectPlatformAndBrowser(): { platform: string; browser: string; isIos: boolean; isStandalone: boolean } {
  if (typeof window === 'undefined') {
    return { platform: 'unknown', browser: 'unknown', isIos: false, isStandalone: false }
  }

  const ua = navigator.userAgent || ''
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isStandalone = (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone === true)

  let platform = 'desktop'
  if (isIos) platform = 'ios'
  else if (/Android/.test(ua)) platform = 'android'
  else if (/Macintosh/.test(ua)) platform = 'macos'
  else if (/Windows/.test(ua)) platform = 'windows'
  else if (/Linux/.test(ua)) platform = 'linux'

  let browser = 'other'
  if (/Edg/.test(ua)) browser = 'edge'
  else if (/Chrome/.test(ua)) browser = 'chrome'
  else if (/Firefox/.test(ua)) browser = 'firefox'
  else if (/Safari/.test(ua)) browser = 'safari'

  return { platform, browser, isIos, isStandalone }
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  code: WebPushSetupErrorCode
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new WebPushSetupError(code)),
          timeoutMs
        )
      }),
    ])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

export function pushSubscriptionMatchesApplicationServerKey(
  subscription: PushSubscription,
  applicationServerKey: Uint8Array
): boolean {
  const currentKey = subscription.options.applicationServerKey
  if (!currentKey) return true

  const currentBytes = new Uint8Array(currentKey)
  if (currentBytes.length !== applicationServerKey.length) return false

  return currentBytes.every(
    (byte, index) => byte === applicationServerKey[index]
  )
}

export async function getOrCreatePushSubscription(
  registration: ServiceWorkerRegistration,
  applicationServerKey: Uint8Array,
  timeoutMs: number
): Promise<PushSubscription> {
  const applicationServerKeyBuffer = Uint8Array
    .from(applicationServerKey)
    .buffer
  const existingSubscription = await withTimeout(
    registration.pushManager.getSubscription(),
    timeoutMs,
    'PUSH_SUBSCRIPTION_TIMEOUT'
  )

  if (
    existingSubscription
    && pushSubscriptionMatchesApplicationServerKey(
      existingSubscription,
      applicationServerKey
    )
  ) {
    return existingSubscription
  }

  if (existingSubscription) {
    await withTimeout(
      existingSubscription.unsubscribe(),
      timeoutMs,
      'PUSH_SUBSCRIPTION_TIMEOUT'
    )
  }

  return withTimeout(
    registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKeyBuffer,
    }),
    timeoutMs,
    'PUSH_SUBSCRIPTION_TIMEOUT'
  )
}

export async function persistPushSubscription(
  subscription: PushSubscription,
  fetchImpl: typeof fetch,
  timeoutMs: number
): Promise<void> {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new WebPushSetupError('PUSH_SUBSCRIPTION_INVALID')
  }

  const deviceId = getDeviceId()
  const { platform, browser } = detectPlatformAndBrowser()
  const controller = new AbortController()

  try {
    const response = await withTimeout(
      fetchImpl('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          device_id: deviceId,
          platform,
          browser,
          app_version: '1.0.0'
        }),
        signal: controller.signal,
      }),
      timeoutMs,
      'PUSH_SYNC_TIMEOUT'
    )

    if (!response.ok) {
      let serverCode = 'UNKNOWN'
      try {
        const body = await response.json()
        if (typeof body?.error === 'string') serverCode = body.error
      } catch {
        // Status code is enough when response is not JSON
      }

      throw new WebPushSetupError(
        'PUSH_SYNC_FAILED',
        `PUSH_SYNC_FAILED:${response.status}:${serverCode}`
      )
    }
  } finally {
    controller.abort()
  }
}

export type WebPushSetupErrorCode =
  | 'SW_READY_TIMEOUT'
  | 'PUSH_SUBSCRIPTION_TIMEOUT'
  | 'PUSH_SUBSCRIPTION_INVALID'
  | 'PUSH_SYNC_TIMEOUT'
  | 'PUSH_SYNC_FAILED'

export class WebPushSetupError extends Error {
  constructor(
    public readonly code: WebPushSetupErrorCode,
    message: string = code
  ) {
    super(message)
    this.name = 'WebPushSetupError'
  }
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

  const controller = new AbortController()

  try {
    const response = await withTimeout(
      fetchImpl('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
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
        // The status code is enough when the response is not JSON.
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

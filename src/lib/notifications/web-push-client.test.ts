import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getOrCreatePushSubscription,
  persistPushSubscription,
  withTimeout,
} from './web-push-client'

function createSubscription(
  applicationServerKey: Uint8Array | null = null
): PushSubscription {
  return {
    endpoint: 'https://push.example/subscription',
    expirationTime: null,
    options: {
      applicationServerKey: applicationServerKey?.buffer ?? null,
      userVisibleOnly: true,
    },
    getKey: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn().mockResolvedValue(true),
    toJSON: vi.fn(() => ({
      endpoint: 'https://push.example/subscription',
      expirationTime: null,
      keys: {
        p256dh: 'p256dh-value',
        auth: 'auth-value',
      },
    })),
  } as unknown as PushSubscription
}

describe('web push client', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('sonuçlanmayan push işlemini zaman aşımıyla sonlandırır', async () => {
    vi.useFakeTimers()
    const operation = withTimeout(
      new Promise<never>(() => {}),
      1_000,
      'PUSH_SUBSCRIPTION_TIMEOUT'
    )
    const assertion = expect(operation).rejects.toMatchObject({
      code: 'PUSH_SUBSCRIPTION_TIMEOUT',
    })

    await vi.advanceTimersByTimeAsync(1_000)
    await assertion
  })

  it('aynı VAPID anahtarına ait mevcut aboneliği yeniden kullanır', async () => {
    const key = new Uint8Array([4, 1, 2, 3])
    const existing = createSubscription(key)
    const subscribe = vi.fn()
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(existing),
        subscribe,
      },
    } as unknown as ServiceWorkerRegistration

    const result = await getOrCreatePushSubscription(registration, key, 1_000)

    expect(result).toBe(existing)
    expect(subscribe).not.toHaveBeenCalled()
    expect(existing.unsubscribe).not.toHaveBeenCalled()
  })

  it('VAPID anahtarı değiştiyse eski aboneliği yeniler', async () => {
    const oldSubscription = createSubscription(new Uint8Array([4, 9, 9]))
    const newSubscription = createSubscription(new Uint8Array([4, 1, 2]))
    const subscribe = vi.fn().mockResolvedValue(newSubscription)
    const registration = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(oldSubscription),
        subscribe,
      },
    } as unknown as ServiceWorkerRegistration

    const result = await getOrCreatePushSubscription(
      registration,
      new Uint8Array([4, 1, 2]),
      1_000
    )

    expect(oldSubscription.unsubscribe).toHaveBeenCalledOnce()
    expect(subscribe).toHaveBeenCalledOnce()
    expect(result).toBe(newSubscription)
  })

  it('aboneliği sunucuya doğrulanmış payload ile kaydeder', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )

    await persistPushSubscription(
      createSubscription(),
      fetchMock as typeof fetch,
      1_000
    )

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/notifications/subscribe',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: 'https://push.example/subscription',
          keys: {
            p256dh: 'p256dh-value',
            auth: 'auth-value',
          },
        }),
      })
    )
  })

  it('sunucu aboneliği reddederse başarı durumu üretmez', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'PUSH_SUBSCRIPTION_SAVE_FAILED' }),
        { status: 500 }
      )
    )

    await expect(
      persistPushSubscription(
        createSubscription(),
        fetchMock as typeof fetch,
        1_000
      )
    ).rejects.toEqual(
      expect.objectContaining({
        code: 'PUSH_SYNC_FAILED',
      })
    )
  })
})

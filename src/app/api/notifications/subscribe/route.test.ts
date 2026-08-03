import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  getSessionUser: vi.fn(),
}))

vi.mock('@/lib/auth/get-current-profile', () => ({
  getSessionUser: mocks.getSessionUser,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

import { POST } from './route'

const validSubscription = {
  endpoint: 'https://push.example/subscription',
  keys: {
    p256dh: 'p256dh-value',
    auth: 'auth-value',
  },
}

function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/notifications/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Vitest Browser',
    },
    body: JSON.stringify(body),
  })
}

function mockSupabase(upsertError: unknown = null) {
  const upsert = vi.fn().mockResolvedValue({ error: upsertError })
  const insert = vi.fn().mockResolvedValue({ error: null })
  const from = vi.fn((table: string) => {
    if (table === 'notification_delivery_logs') {
      return { insert }
    }
    return { upsert }
  })
  mocks.createServerSupabaseClient.mockResolvedValue({ from })
  return { from, upsert, insert }
}

describe('POST /api/notifications/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'profile-1' })
  })

  it('oturumu olmayan isteği reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await POST(createRequest(validSubscription))

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'UNAUTHORIZED' })
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled()
  })

  it('bozuk veya eksik abonelik payloadını reddeder', async () => {
    const response = await POST(createRequest({
      endpoint: 'not-a-url',
      keys: { auth: 'auth-value' },
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'INVALID_PUSH_SUBSCRIPTION',
    })
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled()
  })

  it('cihaz aboneliğini kullanıcı profiline kaydeder', async () => {
    const { upsert } = mockSupabase()

    const response = await POST(createRequest(validSubscription))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(upsert).toHaveBeenCalledWith(
      {
        profile_id: 'profile-1',
        endpoint: validSubscription.endpoint,
        p256dh: validSubscription.keys.p256dh,
        auth_key: validSubscription.keys.auth,
        user_agent: 'Vitest Browser',
      },
      { onConflict: 'profile_id,endpoint' }
    )
  })

  it('veritabanı hatasını ham detay sızdırmadan döndürür', async () => {
    mockSupabase({
      code: '42501',
      message: 'sensitive database policy detail',
    })

    const response = await POST(createRequest(validSubscription))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'PUSH_SUBSCRIPTION_SAVE_FAILED' })
    expect(JSON.stringify(body)).not.toContain('sensitive database policy detail')
  })
})

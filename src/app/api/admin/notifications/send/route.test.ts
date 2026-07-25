import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAdminSupabaseClient: vi.fn(),
  getSessionUser: vi.fn(),
  requireRole: vi.fn(),
  sendWebPush: vi.fn(),
}))

vi.mock('@/lib/auth/get-current-profile', () => ({
  getSessionUser: mocks.getSessionUser,
  requireRole: mocks.requireRole,
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
}))

vi.mock('@/lib/agents/notificationAgent', () => ({
  sendWebPush: mocks.sendWebPush,
}))

import { POST } from './route'

const validPayload = {
  profile_id: '11111111-1111-4111-8111-111111111111',
  title: 'Kontrol zamanı',
  message: 'Dostunuzun kontrol zamanı geldi.',
}

function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/admin/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockAdminClient(
  subscriptions: unknown[] | null,
  subscriptionsError: unknown = null
) {
  const selectEq = vi.fn().mockResolvedValue({
    data: subscriptions,
    error: subscriptionsError,
  })
  const deleteEq = vi.fn().mockResolvedValue({ error: null })
  const from = vi.fn(() => ({
    select: vi.fn(() => ({ eq: selectEq })),
    delete: vi.fn(() => ({ eq: deleteEq })),
  }))

  mocks.createAdminSupabaseClient.mockReturnValue({ from })

  return { deleteEq, from, selectEq }
}

describe('POST /api/admin/notifications/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'admin-user' })
    mocks.requireRole.mockResolvedValue({ id: 'admin-user', role: 'admin' })
  })

  it('oturumu olmayan isteği reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await POST(createRequest(validPayload))

    expect(response.status).toBe(401)
    expect(mocks.requireRole).not.toHaveBeenCalled()
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
  })

  it('admin veya founder olmayan kullanıcıyı reddeder', async () => {
    mocks.requireRole.mockResolvedValue(null)

    const response = await POST(createRequest(validPayload))

    expect(response.status).toBe(403)
    expect(mocks.requireRole).toHaveBeenCalledWith(['admin', 'founder'])
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
  })

  it('bozuk JSON gövdesini reddeder', async () => {
    const request = new Request(
      'http://localhost/api/admin/notifications/send',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      }
    )

    const response = await POST(request)

    expect(response.status).toBe(400)
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
  })

  it('şemaya uymayan payloadı reddeder', async () => {
    const response = await POST(createRequest({
      ...validPayload,
      profile_id: 'not-a-uuid',
      unexpected: true,
    }))

    expect(response.status).toBe(400)
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
  })

  it('abonelik sorgu hatasını ham detay sızdırmadan döndürür', async () => {
    mockAdminClient(null, { message: 'sensitive database detail' })

    const response = await POST(createRequest(validPayload))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'PUSH_SUBSCRIPTIONS_QUERY_FAILED' })
    expect(JSON.stringify(body)).not.toContain('sensitive database detail')
  })

  it('aktif abonelik yoksa 404 döndürür', async () => {
    mockAdminClient([])

    const response = await POST(createRequest(validPayload))

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      error: 'PUSH_SUBSCRIPTION_NOT_FOUND',
    })
  })

  it('bildirimi gönderir ve geçersiz aboneliği güvenle temizler', async () => {
    const { deleteEq, selectEq } = mockAdminClient([
      {
        id: 'subscription-1',
        endpoint: 'https://push.example/1',
        p256dh: 'p256dh-1',
        auth_key: 'auth-1',
      },
      {
        id: 'subscription-2',
        endpoint: 'https://push.example/2',
        p256dh: 'p256dh-2',
        auth_key: 'auth-2',
      },
    ])
    mocks.sendWebPush
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({
        success: false,
        error: { statusCode: 410 },
      })

    const response = await POST(createRequest({
      ...validPayload,
      title: `  ${validPayload.title}  `,
      message: `  ${validPayload.message}  `,
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      success: true,
      sentCount: 1,
      message: '1 cihaza bildirim gönderildi.',
      payload: {
        title: validPayload.title,
        body: validPayload.message,
        url: '/',
      },
      errors: ['PUSH_DELIVERY_FAILED'],
    })
    expect(selectEq).toHaveBeenCalledWith(
      'profile_id',
      validPayload.profile_id
    )
    expect(deleteEq).toHaveBeenCalledWith('id', 'subscription-2')
  })
})

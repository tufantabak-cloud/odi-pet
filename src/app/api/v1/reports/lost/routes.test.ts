import { describe, expect, it, vi } from 'vitest'

import { POST as photoPost } from './photo/route'
import { POST as publishPost } from './publish/route'

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/auth/get-current-profile', () => ({
  getSessionUser: () => mocks.getSessionUser(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: () => mocks.createAdminSupabaseClient(),
  createServerSupabaseClient: () => mocks.createServerSupabaseClient(),
}))

function createQueryBuilder<T>(response: { data: T; error: any }) {
  const builder: any = {
    select: vi.fn().mockImplementation(() => builder),
    insert: vi.fn().mockImplementation(() => builder),
    update: vi.fn().mockImplementation(() => builder),
    delete: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation(() => builder),
    limit: vi.fn().mockImplementation(() => builder),
    maybeSingle: vi.fn().mockResolvedValue(response),
    single: vi.fn().mockResolvedValue(response),
  }
  return builder
}

function jsonRequest(payload: Record<string, unknown>): Request {
  return new Request('http://localhost/api/v1/reports/lost/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

describe('kayıp ilanı v1 rotaları', () => {
  it('OTP rotasında oturumsuz isteği reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)
    const { POST } = await import('./verify/route')

    const response = await POST(
      jsonRequest({
        action: 'send',
        sessionId: 'session_123456789',
        phone: '+905554443322',
      })
    )

    expect(response.status).toBe(401)
  })

  it('fotoğraf rotasında oturumsuz isteği reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await photoPost(new Request('http://localhost'))

    expect(response.status).toBe(401)
  })

  it('yayın rotasında oturumsuz isteği reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await publishPost(
      jsonRequest({
        action: 'save_draft',
        sessionId: 'session_123456789',
        payload: { petId: '00000000-0000-4000-8000-000000000001' },
      })
    )

    expect(response.status).toBe(401)
  })

  it('konum rotasında oturumsuz isteği reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)
    const { POST } = await import('./location/route')

    const response = await POST(
      jsonRequest({
        sessionId: 'session_123456789',
        address: 'Kadıköy, İstanbul',
      })
    )

    expect(response.status).toBe(401)
  })

  it('Türkiye içindeki koordinatı doğrular', async () => {
    mocks.getSessionUser.mockResolvedValue({ id: 'owner-user' })
    const { POST } = await import('./location/route')

    const response = await POST(
      jsonRequest({
        sessionId: 'session_123456789',
        lat: 41.0082,
        lng: 28.9784,
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
    })
  })

  it('Türkiye dışındaki koordinatı reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue({ id: 'owner-user' })
    const { POST } = await import('./location/route')

    const response = await POST(
      jsonRequest({
        sessionId: 'session_123456789',
        lat: 51.5074,
        lng: -0.1278,
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'INVALID_OR_OUTSIDE_TURKEY_LOCATION',
    })
  })

  it('Supabase phone_change OTP gönderimini başlatır', async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null })
    mocks.getSessionUser.mockResolvedValue({ id: 'owner-user' })
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { updateUser },
    })
    const { POST } = await import('./verify/route')

    const response = await POST(
      jsonRequest({
        action: 'send',
        phone: '+905554443322',
      })
    )

    expect(response.status).toBe(200)
    expect(updateUser).toHaveBeenCalledWith({
      phone: '+905554443322',
    })
  })

  it('OTP doğrulamasından sonra profil telefonunu eşitler', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({
      data: { user: { id: 'owner-user' } },
      error: null,
    })
    const profileQuery = createQueryBuilder({ data: null, error: null })
    mocks.getSessionUser.mockResolvedValue({ id: 'owner-user' })
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { verifyOtp },
      from: vi.fn(() => profileQuery),
    })
    const { POST } = await import('./verify/route')

    const response = await POST(
      jsonRequest({
        action: 'verify',
        phone: '+905554443322',
        code: '123456',
      })
    )

    expect(response.status).toBe(200)
    expect(verifyOtp).toHaveBeenCalledWith({
      phone: '+905554443322',
      token: '123456',
      type: 'phone_change',
    })
    expect(profileQuery.update).toHaveBeenCalledWith({
      phone: '+905554443322',
    })
  })

  it('doğrulanmış fotoğrafı kullanıcı klasörüne yükler', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const getPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'http://127.0.0.1:54321/storage/photo.jpg' },
    })
    mocks.getSessionUser.mockResolvedValue({ id: 'owner-user' })
    mocks.createAdminSupabaseClient.mockReturnValue({
      storage: {
        from: vi.fn(() => ({ upload, getPublicUrl })),
      },
    })
    const formData = new FormData()
    formData.set('sessionId', 'session_123456789')
    formData.set(
      'photo',
      new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    )

    const response = await photoPost({
      formData: async () => formData,
    } as Request)

    expect(response.status).toBe(200)
    expect(upload).toHaveBeenCalledOnce()
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      photoUrl: 'http://127.0.0.1:54321/storage/photo.jpg',
    })
  })

  it('başkasına ait taslak oturumunun üzerine yazmaz', async () => {
    const existingDraft = createQueryBuilder({
      data: { profile_id: 'other-user', payload: {} },
      error: null,
    })
    mocks.getSessionUser.mockResolvedValue({ id: 'owner-user' })
    mocks.createAdminSupabaseClient.mockReturnValue({
      from: vi.fn(() => existingDraft),
    })

    const response = await publishPost(
      jsonRequest({
        action: 'save_draft',
        sessionId: 'session_123456789',
        payload: { petId: '00000000-0000-4000-8000-000000000001' },
      })
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: 'DRAFT_SESSION_CONFLICT',
    })
  })

  it('doğrulanmış sahip için ilanı gerçek tabloya yazar', async () => {
    const draftLookup = createQueryBuilder({
      data: {
        profile_id: 'owner-user',
        payload: {
          petId: '00000000-0000-4000-8000-000000000001',
          location: {
            isManual: true,
            address: 'Moda Sahili, Kadıköy, İstanbul',
          },
          contactPhone: '+905554443322',
          photo: { skipped: true },
        },
      },
      error: null,
    })
    const insertReport = createQueryBuilder({
      data: { id: 'report-id' },
      error: null,
    })
    const draftDelete = createQueryBuilder({ data: null, error: null })
    const adminFrom = vi
      .fn()
      .mockReturnValueOnce(draftLookup)
      .mockReturnValueOnce(insertReport)
      .mockReturnValueOnce(draftDelete)
    mocks.createAdminSupabaseClient.mockReturnValue({ from: adminFrom })

    const previousPublish = createQueryBuilder({ data: null, error: null })
    const activeReport = createQueryBuilder({ data: null, error: null })
    const serverFrom = vi
      .fn()
      .mockReturnValueOnce(previousPublish)
      .mockReturnValueOnce(activeReport)
    mocks.createServerSupabaseClient.mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: 'owner', error: null }),
      from: serverFrom,
    })
    mocks.getSessionUser.mockResolvedValue({
      id: 'owner-user',
      phone: '+905554443322',
      phone_confirmed_at: '2026-07-24T20:00:00.000Z',
    })

    const response = await publishPost(
      jsonRequest({
        action: 'publish',
        sessionId: 'session_123456789',
      })
    )

    expect(response.status).toBe(201)
    expect(insertReport.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        pet_id: '00000000-0000-4000-8000-000000000001',
        contact_phone: '+905554443322',
        source_session_id: 'session_123456789',
        status: 'active',
      })
    )
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      reportId: 'report-id',
      idempotent: false,
    })
  })
})

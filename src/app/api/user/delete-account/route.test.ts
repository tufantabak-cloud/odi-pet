import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createAdminSupabaseClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  getSessionUser: vi.fn(),
}))

vi.mock('@/lib/auth/get-current-profile', () => ({
  getSessionUser: mocks.getSessionUser,
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

import { POST } from './route'

function createPostRequest(body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/user/delete-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('POST /api/user/delete-account Security Authorization & Lifecycle', () => {
  let mockAdminClient: any
  let mockServerClient: any

  beforeEach(() => {
    vi.clearAllMocks()

    const deleteIn = vi.fn().mockResolvedValue({ error: null })
    const deleteEq = vi.fn().mockResolvedValue({ error: null })
    const deleteFn = vi.fn(() => ({
      in: deleteIn,
      eq: deleteEq,
    }))

    const selectEq = vi.fn().mockResolvedValue({ data: [{ id: 'pet-1' }], error: null })
    const selectFn = vi.fn(() => ({
      eq: selectEq,
    }))

    mockAdminClient = {
      from: vi.fn((table: string) => ({
        select: selectFn,
        delete: deleteFn,
      })),
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    }

    mockServerClient = {
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    }

    mocks.createAdminSupabaseClient.mockReturnValue(mockAdminClient)
    mocks.createServerSupabaseClient.mockResolvedValue(mockServerClient)
  })

  it('1. Oturumu olmayan istek için 401 Unauthorized döner', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await POST(createPostRequest())

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
  })

  it('2. Kullanıcı başka bir kullanıcının ID sini hedeflerse 403 Forbidden ile reddedilir', async () => {
    mocks.getSessionUser.mockResolvedValue({ id: 'current-user-id' })

    const response = await POST(createPostRequest({ user_id: 'other-victim-id' }))

    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('Yalnızca kendi hesabınızı silebilirsiniz')
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
  })

  it('3. Oturum açmış kullanıcı yalnızca kendi hesabını silebilir ve oturumu sonlandırılır', async () => {
    const currentUserId = 'authenticated-self-user-id'
    mocks.getSessionUser.mockResolvedValue({ id: currentUserId })

    const response = await POST(createPostRequest({ user_id: currentUserId }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.success).toBe(true)

    // Admin client ile yalnızca bu kullanıcının petleri ve verileri sorgulandı/silindi
    expect(mockAdminClient.from).toHaveBeenCalledWith('pets')
    expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(currentUserId)

    // Oturum signOut ile sonlandırıldı
    expect(mockServerClient.auth.signOut).toHaveBeenCalled()
  })

  it('4. Body gönderilmediğinde de kimlik sessiondan alınarak güvenle çalışır', async () => {
    const currentUserId = 'session-only-user-id'
    mocks.getSessionUser.mockResolvedValue({ id: currentUserId })

    const response = await POST(createPostRequest())

    expect(response.status).toBe(200)
    expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(currentUserId)
    expect(mockServerClient.auth.signOut).toHaveBeenCalled()
  })
})

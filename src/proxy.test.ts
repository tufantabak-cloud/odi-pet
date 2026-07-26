import { beforeEach, describe, expect, it, vi } from 'vitest'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
  single: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}))

import { config, proxy } from './proxy'

function configureSession(
  user: { id: string } | null,
  role: string | null = null
) {
  mocks.getUser.mockResolvedValue({ data: { user } })
  mocks.single.mockResolvedValue({
    data: role ? { role } : null,
  })

  const profileQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    single: mocks.single,
  }
  profileQuery.select.mockReturnValue(profileQuery)
  profileQuery.eq.mockReturnValue(profileQuery)

  mocks.createServerClient.mockReturnValue({
    auth: { getUser: mocks.getUser },
    from: vi.fn(() => profileQuery),
  })
}

describe('proxy matcher', () => {
  it.each([
    ['/owner/dashboard', true],
    ['/clinic/dashboard', true],
    ['/admin/settings', true],
    ['/api', true],
    ['/api/pets', true],
    ['/login', true],
    ['/ownership', false],
  ])('%s eşleşmesi %s olur', (url, expected) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(expected)
  })
})

describe('proxy erişim sınırı', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    configureSession(null)
  })

  it.each([
    ['/api/auth/callback', 'GET'],
    ['/api/share/get/token', 'GET'],
    ['/api/calendar/feed/token', 'GET'],
    ['/api/cron/orchestrator', 'GET'],
    ['/api/payments/webhook', 'POST'],
  ])(
    '%s %s için Supabase oturumu sorgulamaz',
    async (url, method) => {
      const response = await proxy(
        new NextRequest(`http://localhost${url}`, { method })
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('x-middleware-next')).toBe('1')
      expect(mocks.createServerClient).not.toHaveBeenCalled()
    }
  )

  it('service isteğini tarayıcı CSRF kontrolüne sokmaz', async () => {
    const response = await proxy(
      new NextRequest('http://localhost/api/payments/webhook', {
        method: 'POST',
        headers: {
          host: 'localhost',
          origin: 'https://payment-provider.example',
        },
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it('session API için çapraz kaynaklı yazma isteğini reddeder', async () => {
    const response = await proxy(
      new NextRequest('http://localhost/api/pets', {
        method: 'POST',
        headers: {
          host: 'localhost',
          origin: 'https://evil.example',
        },
      })
    )

    expect(response.status).toBe(403)
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it('oturumsuz session API isteğini 401 ile reddeder', async () => {
    const response = await proxy(
      new NextRequest('http://localhost/api/v1/reports/lost', {
        method: 'POST',
        headers: {
          host: 'localhost',
          origin: 'http://localhost',
        },
      })
    )

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'Unauthorized' })
  })

  it('API kök yolunu da session sınırında tutar', async () => {
    const response = await proxy(
      new NextRequest('http://localhost/api')
    )

    expect(response.status).toBe(401)
  })

  it('oturumsuz korumalı sayfayı giriş ekranına yönlendirir', async () => {
    const response = await proxy(
      new NextRequest('http://localhost/owner/dashboard')
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost/login?reason=session_expired'
    )
  })

  it('oturumsuz kullanıcı için giriş ekranını geçirir', async () => {
    const response = await proxy(
      new NextRequest('http://localhost/login')
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('oturumlu kullanıcıyı giriş ekranından ana yönlendiriciye taşır', async () => {
    configureSession({ id: 'owner-1' }, 'owner')

    const response = await proxy(
      new NextRequest('http://localhost/login')
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost/')
  })

  it('admin olmayan oturumu /api/admin altında reddeder', async () => {
    configureSession({ id: 'owner-1' }, 'owner')

    const response = await proxy(
      new NextRequest('http://localhost/api/admin/notifications')
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: 'Forbidden: Admin access required',
    })
  })

  it('oturumlu standart API isteğini geçirir', async () => {
    configureSession({ id: 'owner-1' }, 'owner')

    const response = await proxy(
      new NextRequest('http://localhost/api/pets')
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('x-middleware-next')).toBe('1')
  })
})

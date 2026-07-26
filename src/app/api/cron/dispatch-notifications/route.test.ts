import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

function cronRequest(secret?: string) {
  return new Request(
    'http://localhost/api/cron/dispatch-notifications',
    {
      headers: secret
        ? { authorization: `Bearer ${secret}` }
        : undefined,
    }
  )
}

describe('notification dispatch cron route', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('eksik cron yetkisini Edge Function çağrısından önce reddeder', async () => {
    vi.stubEnv('CRON_SECRET', 'cron-secret')
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    const response = await GET(cronRequest())

    expect(response.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('yetkili çağrıyı service-role ile Edge Functiona iletir ve kimliği doğrular', async () => {
    vi.stubEnv('CRON_SECRET', 'cron-secret')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (_input, init) => {
        const requestId = new Headers(init?.headers).get('x-request-id')
        return Response.json({
          status: 'success',
          request_id: requestId,
          pushes_sent: 0,
        })
      })

    const response = await GET(cronRequest('cron-secret'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      status: 'success',
      edge_status: 200,
    })
    expect(body.request_id).toBe(body.result.request_id)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://project.supabase.co/functions/v1/dispatch-notifications',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'service-role-key',
          authorization: 'Bearer service-role-key',
          'x-request-id': body.request_id,
        }),
      })
    )
  })

  it('yanlış veya doğrulanamayan Edge Function cevabını başarı saymaz', async () => {
    vi.stubEnv('CRON_SECRET', 'cron-secret')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ status: 'success' })
    )

    const response = await GET(cronRequest('cron-secret'))

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toMatchObject({
      error: 'EDGE_DISPATCH_FAILED',
      edge_status: 200,
    })
  })
})

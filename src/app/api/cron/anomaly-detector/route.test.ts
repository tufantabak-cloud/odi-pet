import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from './route'

function createRequest(
  authorization?: string,
  query = ''
): Request {
  return new Request(
    `http://localhost/api/cron/anomaly-detector${query}`,
    {
      headers: authorization ? { authorization } : undefined,
    }
  )
}

describe('GET /api/cron/anomaly-detector', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'cron-secret')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('eksik sunucu yapılandırmasında çalışmaz', async () => {
    vi.stubEnv('CRON_SECRET', '')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await GET(createRequest())

    expect(response.status).toBe(503)
  })

  it('query token ile kimlik doğrulamayı kabul etmez', async () => {
    const response = await GET(
      createRequest(undefined, '?token=cron-secret')
    )

    expect(response.status).toBe(401)
  })

  it('doğru Bearer başlığıyla route handlera ulaşır', async () => {
    const response = await GET(createRequest('Bearer cron-secret'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      status: 'disabled',
      reason: 'use_orchestrator',
    })
  })
})

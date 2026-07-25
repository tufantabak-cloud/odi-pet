import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { authorizeCronRequest } from './cron-auth'

function createRequest(
  authorization?: string,
  query = ''
): Request {
  return new Request(`http://localhost/api/cron/orchestrator${query}`, {
    headers: authorization ? { authorization } : undefined,
  })
}

describe('authorizeCronRequest', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'expected-secret')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('sunucu sırrı yoksa güvenli biçimde kapalı kalır', async () => {
    vi.stubEnv('CRON_SECRET', '')
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = authorizeCronRequest(createRequest())

    expect(response?.status).toBe(503)
    expect(await response?.json()).toEqual({
      error: 'SERVER_MISCONFIGURATION',
    })
  })

  it('Authorization başlığı olmayan isteği reddeder', async () => {
    const response = authorizeCronRequest(createRequest())

    expect(response?.status).toBe(401)
    expect(await response?.json()).toEqual({ error: 'UNAUTHORIZED' })
  })

  it('yanlış Bearer sırrını reddeder', () => {
    const response = authorizeCronRequest(createRequest('Bearer wrong-secret'))

    expect(response?.status).toBe(401)
  })

  it('doğru sır yalnızca query parametresindeyse isteği reddeder', () => {
    const response = authorizeCronRequest(
      createRequest(undefined, '?token=expected-secret')
    )

    expect(response?.status).toBe(401)
  })

  it('tam eşleşen Bearer başlığını kabul eder', () => {
    const response = authorizeCronRequest(
      createRequest('Bearer expected-secret')
    )

    expect(response).toBeNull()
  })
})

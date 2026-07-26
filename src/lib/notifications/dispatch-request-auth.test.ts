import { describe, expect, it } from 'vitest'
import { isAuthorizedServiceRequest } from '../../../supabase/functions/dispatch-notifications/request-auth'

const SERVICE_ROLE_KEY = 'test-service-role-key'

function request(authorization?: string) {
  return new Request('http://127.0.0.1/functions/v1/dispatch-notifications', {
    method: 'POST',
    headers: authorization ? { authorization } : undefined,
  })
}

describe('dispatch notifications request authorization', () => {
  it('eksik Authorization başlığını reddeder', async () => {
    await expect(
      isAuthorizedServiceRequest(request(), SERVICE_ROLE_KEY),
    ).resolves.toBe(false)
  })

  it('yanlış veya anonim anahtarı reddeder', async () => {
    await expect(
      isAuthorizedServiceRequest(
        request('Bearer test-anon-key'),
        SERVICE_ROLE_KEY,
      ),
    ).resolves.toBe(false)
  })

  it('boş yapılandırmada hiçbir isteği kabul etmez', async () => {
    await expect(
      isAuthorizedServiceRequest(
        request(`Bearer ${SERVICE_ROLE_KEY}`),
        '',
      ),
    ).resolves.toBe(false)
  })

  it('yalnızca tam service role anahtarını kabul eder', async () => {
    await expect(
      isAuthorizedServiceRequest(
        request(`Bearer ${SERVICE_ROLE_KEY}`),
        SERVICE_ROLE_KEY,
      ),
    ).resolves.toBe(true)
  })
})

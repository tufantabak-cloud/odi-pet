import { expect, test } from '@playwright/test'

const CRON_SECRET = 'odi-pet-local-e2e-cron-secret'

test.describe('Cron güvenlik ve Edge Function zinciri', () => {
  test('dispatch rotası yetkisiz çağrıları reddeder ve doğru secret ile Edge Functiona ulaşır', async ({
    request,
  }) => {
    const missingAuthorization = await request.get(
      '/api/cron/dispatch-notifications',
    )
    expect(missingAuthorization.status()).toBe(401)

    const invalidAuthorization = await request.get(
      '/api/cron/dispatch-notifications',
      {
        headers: {
          authorization: 'Bearer invalid-cron-secret',
        },
      },
    )
    expect(invalidAuthorization.status()).toBe(401)

    const authorized = await request.get(
      '/api/cron/dispatch-notifications',
      {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      },
    )
    expect(authorized.status()).toBe(200)

    const body = await authorized.json()
    expect(body).toMatchObject({
      status: 'success',
      edge_status: 200,
    })
    expect(body.request_id).toBeTruthy()
    expect(body.result.request_id).toBe(body.request_id)
  })

  test('orchestrator doğru secret ile güvenli dry-run tamamlar', async ({
    request,
  }) => {
    const response = await request.get(
      '/api/cron/orchestrator?dry_run=true',
      {
        headers: {
          authorization: `Bearer ${CRON_SECRET}`,
        },
      },
    )

    expect(response.status()).toBeGreaterThanOrEqual(200)
    expect(response.status()).toBeLessThan(300)
    await expect(response.json()).resolves.toMatchObject({
      dry_run: true,
    })
  })
})

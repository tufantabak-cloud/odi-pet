import { expect, test } from '@playwright/test'

test.describe('PWA üretim doğrulaması', () => {
  test('servis işçisini etkinleştirir ve çevrimdışı sayfaya düşer', async ({
    context,
    page,
  }) => {
    const cdp = await context.newCDPSession(page)
    const serviceWorkerErrors: unknown[] = []
    const serviceWorkerVersions: unknown[] = []
    await cdp.send('ServiceWorker.enable')
    cdp.on('ServiceWorker.workerErrorReported', ({ errorMessage }) => {
      serviceWorkerErrors.push(errorMessage)
    })
    cdp.on('ServiceWorker.workerVersionUpdated', ({ versions }) => {
      serviceWorkerVersions.push(...versions)
    })

    const serviceWorkerResponse = await page.request.get('/sw.js')
    expect(serviceWorkerResponse.ok()).toBe(true)
    expect((await serviceWorkerResponse.body()).byteLength).toBeGreaterThan(10_000)

    await page.goto('/offline?test=true')

    try {
      await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.register('/sw.js')
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () =>
                reject(
                  new Error(
                    `SW_READY_TIMEOUT installing=${registration.installing?.state ?? 'none'} waiting=${registration.waiting?.state ?? 'none'} active=${registration.active?.state ?? 'none'}`,
                  ),
                ),
              10_000,
            )
          }),
        ])
      })
    } catch (error) {
      await page.waitForTimeout(250)
      throw new Error(
        `${String(error)}\nErrors: ${JSON.stringify(serviceWorkerErrors, null, 2)}\nVersions: ${JSON.stringify(serviceWorkerVersions, null, 2)}`,
      )
    }

    await page.reload()
    expect(
      await page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    ).toBe(true)

    // Verify private API responses are NOT cached in Cache Storage
    const isApiCached = await page.evaluate(async () => {
      const keys = await window.caches.keys()
      for (const key of keys) {
        const cache = await window.caches.open(key)
        const match = await cache.match('/api/pets')
        if (match) return true
      }
      return false
    })
    expect(isApiCached).toBe(false)

    await context.setOffline(true)
    try {
      await page.goto('/pwa-offline-verification', {
        waitUntil: 'domcontentloaded',
      })
      await expect(
        page.getByRole('heading', { name: 'İnternet bağlantısı yok' }),
      ).toBeVisible()
    } finally {
      await context.setOffline(false)
    }
  })
})


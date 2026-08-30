import { expect } from '@playwright/test';
import { test } from './fixtures';

const SENSITIVE_PATH_PREFIXES = [
  '/api/',
  '/owner',
  '/clinic',
  '/admin',
  '/caregiver',
]

const LEGACY_SENSITIVE_CACHE_MARKERS = [
  'apis',
  'pages',
  'pages-rsc',
  'pages-rsc-prefetch',
  'serwist-runtime',
]

function extractPrecacheUrls(serviceWorkerSource: string): string[] {
  return Array.from(
    serviceWorkerSource.matchAll(
      /\{revision:(?:null|"[^"]*"),url:"([^"]+)"\}/g,
    ),
    (match) => JSON.parse(`"${match[1]}"`) as string,
  )
}

test.describe('PWA Ã¼retim doÄŸrulamasÄ±', () => {
  test('servis iÅŸÃ§isini etkinleÅŸtirir, Ã¶zel veriyi Ã¶nbelleklemez ve Ã§evrimdÄ±ÅŸÄ± sayfaya dÃ¼ÅŸer', async ({
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

    const serviceWorkerResponse = await page.request.get('/sw.js', {
      maxRedirects: 0,
    })
    expect(serviceWorkerResponse.ok()).toBe(true)
    expect(serviceWorkerResponse.status()).toBe(200)
    expect(new URL(serviceWorkerResponse.url()).pathname).toBe('/sw.js')
    expect(serviceWorkerResponse.headers()['content-type']).toMatch(
      /(?:java|ecma)script/i,
    )
    const testOrigin = new URL(serviceWorkerResponse.url()).origin

    const serviceWorkerSource = await serviceWorkerResponse.text()
    expect(serviceWorkerSource.length).toBeGreaterThan(10_000)
    expect(serviceWorkerSource.trimStart().startsWith('<')).toBe(false)

    const precacheUrls = extractPrecacheUrls(serviceWorkerSource)
    expect(precacheUrls.length).toBeGreaterThan(0)
    expect(precacheUrls).toContain('/offline')
    expect(
      precacheUrls.filter((value) => {
        const pathname = new URL(value, testOrigin).pathname
        return SENSITIVE_PATH_PREFIXES.some((prefix) =>
          prefix.endsWith('/')
            ? pathname.startsWith(prefix)
            : pathname === prefix || pathname.startsWith(`${prefix}/`),
        )
      }),
    ).toEqual([])

    const failedPrecacheRequests: Array<{
      url: string
      status: number
      contentType: string
    }> = []
    for (const url of precacheUrls) {
      const absoluteUrl = new URL(url, testOrigin)
      expect(absoluteUrl.origin).toBe(testOrigin)

      const response = await page.request.get(absoluteUrl.href, {
        maxRedirects: 0,
      })
      if (response.status() !== 200) {
        failedPrecacheRequests.push({
          url: absoluteUrl.pathname,
          status: response.status(),
          contentType: response.headers()['content-type'] ?? '',
        })
      }
    }
    expect(failedPrecacheRequests).toEqual([])

    await page.goto('/manifest.json')
    await page.evaluate(async (legacyMarkers) => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.unregister()))
      const existingCaches = await caches.keys()
      await Promise.all(existingCaches.map((cacheName) => caches.delete(cacheName)))

      for (const marker of legacyMarkers) {
        const cache = await caches.open(`legacy-${marker}-test`)
        await cache.put(
          `/owner/legacy-${marker}`,
          new Response('sensitive test fixture'),
        )
      }
    }, LEGACY_SENSITIVE_CACHE_MARKERS)

    try {
      const registrationState = await page.evaluate(async () => {
        const states: ServiceWorkerState[] = []
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        const observedWorker =
          registration.installing
          ?? registration.waiting
          ?? registration.active
        if (!observedWorker) {
          throw new Error('SW_WORKER_MISSING')
        }
        states.push(observedWorker.state)
        observedWorker.addEventListener('statechange', () => {
          states.push(observedWorker.state)
        })

        const readyRegistration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () =>
                reject(
                  new Error(
                    `SW_READY_TIMEOUT installing=${registration.installing?.state ?? 'none'} waiting=${registration.waiting?.state ?? 'none'} active=${registration.active?.state ?? 'none'}`,
                  ),
                ),
              30_000,
            )
          }),
        ])

        const activeWorker =
          readyRegistration.active ?? registration.active

        if (!activeWorker) {
          throw new Error('SW_ACTIVE_WORKER_MISSING')
        }
        const worker = activeWorker

        if (worker.state !== 'activated') {
          await new Promise<void>((resolve, reject) => {
            const timeoutId = window.setTimeout(() => {
              worker.removeEventListener('statechange', handleStateChange)
              reject(new Error(`SW_ACTIVATION_TIMEOUT state=${worker.state}`))
            }, 10_000)

            function handleStateChange() {
              if (worker.state === 'activated') {
                window.clearTimeout(timeoutId)
                worker.removeEventListener('statechange', handleStateChange)
                resolve()
              }
            }

            worker.addEventListener('statechange', handleStateChange)
            handleStateChange()
          })
        }

        return {
          active: worker.state,
          scope: registration.scope,
          states,
        }
      })

      expect(registrationState.active).toBe('activated')
      expect(registrationState.scope).toBe(`${new URL(page.url()).origin}/`)
      const cdpStates = serviceWorkerVersions.flatMap((version) => {
        const status = (version as { status?: string }).status
        return status ? [status] : []
      })
      expect(
        [...registrationState.states, ...cdpStates],
      ).toContain('installed')
      expect(
        [...registrationState.states, ...cdpStates],
      ).toContain('activated')
    } catch (error) {
      await page.waitForTimeout(250)
      throw new Error(
        `${String(error)}\nErrors: ${JSON.stringify(serviceWorkerErrors, null, 2)}\nVersions: ${JSON.stringify(serviceWorkerVersions, null, 2)}`,
      )
    }

    await page.reload()
    await expect.poll(
      () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      { timeout: 10_000 },
    ).toBe(true)

    await page.evaluate(async () => {
      const requests = [
        fetch('/api/version'),
        fetch('/owner', { headers: { Accept: 'text/html' } }),
        fetch('/clinic', { headers: { Accept: 'text/html' } }),
        fetch('/admin', { headers: { Accept: 'text/html' } }),
        fetch('/caregiver', { headers: { Accept: 'text/html' } }),
      ]

      await Promise.allSettled(requests)
    })

    const cacheAudit = await page.evaluate((sensitivePrefixes) => {
      return window.caches.keys().then(async (cacheNames) => {
        const cachedUrls: string[] = []

        for (const cacheName of cacheNames) {
          const cache = await window.caches.open(cacheName)
          const requests = await cache.keys()
          cachedUrls.push(...requests.map((request) => request.url))
        }

        const sensitiveUrls = cachedUrls.filter((value) => {
          const pathname = new URL(value).pathname
          return sensitivePrefixes.some((prefix) =>
            prefix.endsWith('/')
              ? pathname.startsWith(prefix)
              : pathname === prefix || pathname.startsWith(`${prefix}/`),
          )
        })

        return {
          cacheNames,
          hasOfflineFallback: cachedUrls.some(
            (value) => new URL(value).pathname === '/offline',
          ),
          sensitiveUrls,
        }
      })
    }, SENSITIVE_PATH_PREFIXES)

    expect(cacheAudit.sensitiveUrls).toEqual([])
    expect(cacheAudit.hasOfflineFallback).toBe(true)
    expect(
      cacheAudit.cacheNames.filter((cacheName) =>
        LEGACY_SENSITIVE_CACHE_MARKERS.some((marker) =>
          cacheName.includes(marker),
        ),
      ),
    ).toEqual([])

    await context.setOffline(true)
    try {
      await page.goto('/pwa-offline-verification', {
        waitUntil: 'domcontentloaded',
      })
      await expect(
        page.getByRole('heading', { name: 'Ä°nternet baÄŸlantÄ±sÄ± yok' }),
      ).toBeVisible()
    } finally {
      await context.setOffline(false)
    }
  })
})


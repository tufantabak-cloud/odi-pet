import { test, expect } from './fixtures'

const LOCAL_E2E_EMAIL = process.env.TEST_EMAIL || 'e2e-owner@odipet.local'
const LOCAL_E2E_PASSWORD = process.env.TEST_PASSWORD || 'OdiPetLocalE2E-2026!'

test.describe('Odi Pet - Permissions Architecture v2', () => {

  test('Test 1: Unauthenticated User - No 401 Auto-Sync Error', async ({ page }) => {
    const apiErrors: any[] = []
    
    page.on('response', (response) => {
      if (response.url().includes('/api/notifications/subscribe')) {
        if (response.status() === 401) {
          apiErrors.push(response.url())
        }
      }
    })

    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('PUSH_SYNC_FAILED:401')) {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/login')
    
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    expect(apiErrors).toHaveLength(0)
    expect(consoleErrors).toHaveLength(0)
  })

  test('Test 3 & 4: Notification Idempotency and Auto-Sync (Authenticated)', async ({ page, context }) => {
    // Grant notification permission via Chromium CDP
    await context.grantPermissions(['notifications'])
    
    // ── CRITICAL FIX ──
    // Set up route interception BEFORE navigating so we catch all API calls
    let routeCallCount = 0
    await page.route('**/api/notifications/subscribe', async (route) => {
      routeCallCount++
      if (routeCallCount === 1) {
        await route.fulfill({
          status: 500,
          json: { error: 'INTERNAL_SERVER_ERROR' }
        })
      } else {
        await route.fulfill({
          status: 200,
          json: { success: true }
        })
      }
    })

    // ── CRITICAL FIX ──  
    // Mock PushManager, Notification, and ServiceWorker BEFORE navigating.
    // The mock SW registration object must look like a real ServiceWorkerRegistration
    // with pushManager that has getSubscription() and subscribe() methods.
    // navigator.serviceWorker.ready must be a Promise that resolves to this registration.
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem('odi_splash_seen', 'true');
        
        // Mock PushManager constructor
        (window as any).PushManager = function() {};
        
        // Mock Notification with 'granted' permission
        // Use Object.defineProperty to handle both getter and static property access
        const NotificationMock: any = function() {};
        NotificationMock.permission = 'granted';
        NotificationMock.requestPermission = () => Promise.resolve('granted');
        Object.defineProperty(window, 'Notification', { 
          value: NotificationMock,
          configurable: true,
          writable: true
        });

        // Build a mock ServiceWorkerRegistration with pushManager
        const mockRegistration = {
          pushManager: {
            getSubscription: () => Promise.resolve(null),
            subscribe: (options: any) => Promise.resolve({
              endpoint: 'https://mock.push.endpoint',
              expirationTime: null,
              options: options || {},
              getKey: () => new ArrayBuffer(0),
              unsubscribe: () => Promise.resolve(true),
              toJSON: () => ({
                endpoint: 'https://mock.push.endpoint',
                keys: { p256dh: 'mock-key', auth: 'mock-auth' }
              })
            })
          },
          scope: '/',
          installing: null,
          waiting: null,
          active: { state: 'activated', scriptURL: '/sw.js' },
          navigationPreload: { enable: () => Promise.resolve(), disable: () => Promise.resolve(), setHeaderValue: () => Promise.resolve(), getState: () => Promise.resolve({ enabled: false, headerValue: '' }) },
          update: () => Promise.resolve(undefined as any),
          unregister: () => Promise.resolve(true),
          showNotification: () => Promise.resolve(),
          getNotifications: () => Promise.resolve([]),
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
        };

        // Mock navigator.serviceWorker with register() and ready
        const mockServiceWorker = {
          register: () => Promise.resolve(mockRegistration),
          ready: Promise.resolve(mockRegistration),
          controller: null,
          getRegistrations: () => Promise.resolve([mockRegistration]),
          getRegistration: () => Promise.resolve(mockRegistration),
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true,
          startMessages: () => {},
          oncontrollerchange: null,
          onmessage: null,
          onmessageerror: null,
        };

        // Apply the mock - try multiple strategies
        try {
          Object.defineProperty(navigator, 'serviceWorker', {
            value: mockServiceWorker,
            configurable: true,
            writable: true
          });
        } catch (e1) {
          try {
            Object.defineProperty(Object.getPrototypeOf(navigator), 'serviceWorker', {
              value: mockServiceWorker,
              configurable: true,
              writable: true
            });
          } catch (e2) {
            (navigator as any).serviceWorker = mockServiceWorker;
          }
        }
      } catch (err) {
        console.error('[test-mock] Mock injection failed:', err);
      }
    })

    // Now navigate - the mocks are in place, routes are intercepting
    await page.goto('/owner/notifications')
    await page.waitForLoadState('networkidle')

    // Wait for the push permission card to appear
    // With our mocks: isWebPushSupported() = true, Notification.permission = 'granted',
    // getSubscription() = null → state = 'sync_required' → card renders
    const card = page.locator('#push-permission-card')
    const enableBtn = page.locator('#push-enable-btn')
    
    await expect(card).toBeVisible({ timeout: 10000 })
    
    // First click -> intercepts to 500 error (routeCallCount becomes 1)
    await enableBtn.click()
    
    // Should gracefully fail and show "Tekrar Dene" / sync_failed state
    await expect(enableBtn).toContainText('Tekrar Dene', { timeout: 10000 })
    await expect(card).toContainText('Bildirim Senkronizasyonu Gerekli')
    
    // Second click -> intercepts to 200 success (routeCallCount becomes 2)
    await enableBtn.click()
    
    // Should succeed and hide the card (state becomes 'subscribed', showSoftPrompt becomes false)
    await expect(card).toBeHidden({ timeout: 10000 })
  })
})

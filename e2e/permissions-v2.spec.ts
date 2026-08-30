import { expect } from '@playwright/test';
import { test } from './fixtures';
const LOCAL_E2E_EMAIL = 'admin@odi.pet'
const LOCAL_E2E_PASSWORD = 'password123'

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
    // Explicitly mock PushManager to avoid native browser dependencies breaking the test on headless
    await context.grantPermissions(['notifications'])
    await page.addInitScript(() => {
      // Mock ServiceWorkerRegistration and PushManager
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: () => Promise.resolve({}),
          ready: Promise.resolve({
            pushManager: {
              getSubscription: () => Promise.resolve(null),
              subscribe: () => Promise.resolve({
                endpoint: 'https://mock.push.endpoint',
                toJSON: () => ({
                  endpoint: 'https://mock.push.endpoint',
                  keys: { p256dh: 'mock-key', auth: 'mock-auth' }
                })
              })
            }
          })
        }
      })
    })

    await page.goto('/login')
    await page.fill('input[name="email"]', LOCAL_E2E_EMAIL)
    await page.fill('input[name="password"]', LOCAL_E2E_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/owner/dashboard')
    
    await page.waitForLoadState('networkidle')

    await page.goto('/owner/notifications')
    await page.waitForLoadState('networkidle')

    let routeCallCount = 0
    await page.route('/api/notifications/subscribe', async (route) => {
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

    const card = page.locator('#push-permission-card')
    const enableBtn = page.locator('#push-enable-btn')
    
    await expect(card).toBeVisible({ timeout: 5000 })
    
    // First click -> intercepts to 500 error
    await enableBtn.click()
    
    // Should gracefully fail and show Tekrar Dene
    await expect(enableBtn).toContainText('Tekrar Dene', { timeout: 5000 })
    await expect(card).toContainText('Bildirim Senkronizasyonu Gerekli')
    
    // Second click -> intercepts to 200 success
    await enableBtn.click()
    
    // Should succeed and remove the card from UI
    await expect(card).toBeHidden({ timeout: 5000 })
  })
})



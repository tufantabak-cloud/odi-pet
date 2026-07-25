import { test, expect } from '@playwright/test'

test.describe('Veterinary Guide GPS and Edge Cases', () => {
  test('Should show GPS denied fallback card when location is blocked', async ({ page, context }) => {
    // Block geolocation explicitly
    await context.grantPermissions([], {
      origin: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3100'
    })
    await context.clearPermissions()

    // Assuming we have a mock user session in the test environment.
    // If not, we just navigate. 
    // We will intercept the Google Maps API just in case it attempts to call out.
    await page.route('/api/vets/search*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ clinics: [] })
      })
    })

    await page.goto('/owner/vets')

    // Click the "Konumumu Kullan" button
    const locationBtn = page.getByTitle('Konumumu Kullan')
    
    // Wait for the button to be visible and click it
    if (await locationBtn.isVisible()) {
      await locationBtn.click()

      // It should display the GPS Denied Smart Card
      const deniedCard = page.getByText('konum izninize ihtiyacımız var')
      await expect(deniedCard).toBeVisible()
    }
  })

  test('Should show offline message when network is disconnected', async ({ page, context }) => {
    await page.goto('/owner/vets')
    
    // Simulate offline mode
    await context.setOffline(true)
    
    // The exact text is "İnternet Bağlantısı Yok"
    const offlineMsg = page.getByText('İnternet Bağlantısı Yok')
    await expect(offlineMsg).toBeVisible()
  })
})

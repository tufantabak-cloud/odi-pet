# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vet-guide-gps-denied.spec.ts >> Veterinary Guide GPS and Edge Cases >> Should show offline message when network is disconnected
- Location: e2e\vet-guide-gps-denied.spec.ts:35:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('İnternet bağlantınız yok')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByText('İnternet bağlantınız yok')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - generic [ref=e5]: ⚠️
    - heading "Bir Sorun Oluştu" [level=2] [ref=e6]
    - paragraph [ref=e7]: Beklenmeyen bir hata meydana geldi. Sorunu çözmek için çalışıyoruz.
    - button "Tekrar Dene" [ref=e8] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Veterinary Guide GPS and Edge Cases', () => {
  4  |   test('Should show GPS denied fallback card when location is blocked', async ({ page, context }) => {
  5  |     // Block geolocation explicitly
  6  |     await context.grantPermissions([], { origin: 'http://localhost:3000' })
  7  |     await context.clearPermissions()
  8  | 
  9  |     // Assuming we have a mock user session in the test environment.
  10 |     // If not, we just navigate. 
  11 |     // We will intercept the Google Maps API just in case it attempts to call out.
  12 |     await page.route('/api/vets/search*', async route => {
  13 |       await route.fulfill({
  14 |         status: 200,
  15 |         contentType: 'application/json',
  16 |         body: JSON.stringify({ clinics: [] })
  17 |       })
  18 |     })
  19 | 
  20 |     await page.goto('/owner/vets')
  21 | 
  22 |     // Click the "Konumumu Kullan" button
  23 |     const locationBtn = page.getByTitle('Konumumu Kullan')
  24 |     
  25 |     // Wait for the button to be visible and click it
  26 |     if (await locationBtn.isVisible()) {
  27 |       await locationBtn.click()
  28 | 
  29 |       // It should display the GPS Denied Smart Card
  30 |       const deniedCard = page.getByText('konum izninize ihtiyacımız var')
  31 |       await expect(deniedCard).toBeVisible()
  32 |     }
  33 |   })
  34 | 
  35 |   test('Should show offline message when network is disconnected', async ({ page, context }) => {
  36 |     await page.goto('/owner/vets')
  37 |     
  38 |     // Simulate offline mode
  39 |     await context.setOffline(true)
  40 |     
  41 |     // Wait for the UI to react to the 'offline' event
  42 |     // The exact text is "İnternet bağlantınız yok"
  43 |     const offlineMsg = page.getByText('İnternet bağlantınız yok')
> 44 |     await expect(offlineMsg).toBeVisible()
     |                              ^ Error: expect(locator).toBeVisible() failed
  45 |   })
  46 | })
  47 | 
```
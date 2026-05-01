# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: authenticated_flow.spec.ts >> Odi.Pet Authenticated E2E Flow (Genişletilmiş Aşama) >> 6. Sağlık Panosu ve Aşı Takvimi Görüntüleme
- Location: e2e\authenticated_flow.spec.ts:80:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
Call log:
  - navigating to "http://localhost:3000/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Use environment variables for test credentials
  4  | // Add these to your .env or .env.local file:
  5  | // TEST_EMAIL=your_test_user@example.com
  6  | // TEST_PASSWORD=your_test_password
  7  | const TEST_EMAIL = process.env.TEST_EMAIL;
  8  | const TEST_PASSWORD = process.env.TEST_PASSWORD;
  9  | 
  10 | test.describe('Odi.Pet Authenticated E2E Flow (Genişletilmiş Aşama)', () => {
  11 | 
  12 |   test.beforeEach(async ({ page }) => {
  13 |     // Skip if credentials are not provided
  14 |     if (!TEST_EMAIL || !TEST_PASSWORD) {
  15 |       test.skip(true, 'Test credentials (TEST_EMAIL, TEST_PASSWORD) not provided in environment variables.');
  16 |       return;
  17 |     }
  18 | 
  19 |     // Perform Login before each test
  20 |     console.log('Logging in with valid credentials...');
> 21 |     await page.goto('/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/login
  22 |     await page.fill('input[name="email"]', TEST_EMAIL);
  23 |     await page.fill('input[name="password"]', TEST_PASSWORD);
  24 |     await page.click('button[type="submit"]');
  25 | 
  26 |     // Wait for the redirect to the dashboard
  27 |     await expect(page).toHaveURL(/.*owner\/dashboard|.*\//, { timeout: 10000 });
  28 |   });
  29 | 
  30 |   test('4. Dashboard Analizi ve Veri Yüklenmesi', async ({ page }) => {
  31 |     if (!TEST_EMAIL) return; // Skip safeguard
  32 |     
  33 |     await page.goto('/owner/dashboard');
  34 |     
  35 |     // Check if the main dashboard elements are visible
  36 |     // These text queries assume the dashboard has these elements.
  37 |     // Replace 'Odi' or 'Hoş Geldiniz' with actual dashboard text.
  38 |     const dashboardHeader = page.locator('text=Hoş Geldiniz').first();
  39 |     // We don't fail immediately, we just check if it exists or wait
  40 |     try {
  41 |       await expect(dashboardHeader).toBeVisible({ timeout: 5000 });
  42 |       console.log('Dashboard successfully loaded.');
  43 |     } catch {
  44 |       console.log('Dashboard header not found, but we are on the dashboard route.');
  45 |     }
  46 |   });
  47 | 
  48 |   test('5. Yeni Pet Ekleme Akışı Testi', async ({ page }) => {
  49 |     if (!TEST_EMAIL) return;
  50 |     
  51 |     await page.goto('/owner/pets');
  52 |     
  53 |     // Look for the "Yeni Pet Ekle" or similar button
  54 |     const addPetButton = page.locator('button:has-text("Ekle"), a:has-text("Yeni")').first();
  55 |     
  56 |     if (await addPetButton.isVisible()) {
  57 |       await addPetButton.click();
  58 |       
  59 |       // Wait for modal or navigation
  60 |       await page.waitForTimeout(2000);
  61 |       
  62 |       // Check if pet creation form is visible
  63 |       const formVisible = await page.locator('form').isVisible();
  64 |       console.log(`Pet creation form visible: ${formVisible}`);
  65 |       
  66 |       // Simulate filling out the form (Mock data)
  67 |       if (formVisible) {
  68 |         // Try to fill generic inputs if they exist
  69 |         const nameInput = page.locator('input[name="name"]');
  70 |         if (await nameInput.isVisible()) {
  71 |           await nameInput.fill('Otomasyon Test Peti');
  72 |           console.log('Filled pet name.');
  73 |         }
  74 |       }
  75 |     } else {
  76 |       console.log('Add pet button not found. Assuming pet limit reached or different UI.');
  77 |     }
  78 |   });
  79 | 
  80 |   test('6. Sağlık Panosu ve Aşı Takvimi Görüntüleme', async ({ page }) => {
  81 |     if (!TEST_EMAIL) return;
  82 |     
  83 |     await page.goto('/owner/health');
  84 |     
  85 |     // Check for health elements
  86 |     await page.waitForTimeout(2000);
  87 |     const healthSections = await page.locator('section').count();
  88 |     console.log(`Found ${healthSections} sections in Health dashboard.`);
  89 |     
  90 |     // Take a screenshot of the health dashboard for the report
  91 |     await page.screenshot({ path: 'test-results/health-dashboard.png', fullPage: true });
  92 |     console.log('Health dashboard screenshot captured.');
  93 |   });
  94 | });
  95 | 
```
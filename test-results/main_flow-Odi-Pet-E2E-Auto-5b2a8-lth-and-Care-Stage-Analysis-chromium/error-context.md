# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: main_flow.spec.ts >> Odi.Pet E2E Automation Robot >> 2. Pet Health and Care Stage Analysis
- Location: e2e\main_flow.spec.ts:35:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/owner/health
Call log:
  - navigating to "http://localhost:3000/owner/health", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Odi.Pet E2E Automation Robot', () => {
  4  |   // Test Settings & Sample Data
  5  |   const testEmail = process.env.TEST_EMAIL || 's.piskin@oxivo.eu';
  6  |   const testPassword = process.env.TEST_PASSWORD || 'password123';
  7  |   
  8  |   test('1. Landing and Login Stage', async ({ page }) => {
  9  |     console.log('Navigating to app...');
  10 |     await page.goto('/');
  11 |     
  12 |     // Check if we are redirected to login
  13 |     if (page.url().includes('/login')) {
  14 |       await expect(page.locator('text=Odi Pet')).toBeVisible();
  15 |       
  16 |       console.log('Entering sample data for login...');
  17 |       await page.fill('input[name="email"]', testEmail);
  18 |       await page.fill('input[name="password"]', testPassword);
  19 |       await page.click('button[type="submit"]');
  20 | 
  21 |       // Wait for either an error message or a successful redirect
  22 |       await page.waitForTimeout(3000); 
  23 |       
  24 |       const errorLocator = page.locator('.text-error');
  25 |       if (await errorLocator.isVisible()) {
  26 |         const errorText = await errorLocator.textContent();
  27 |         console.log(`Login resulted in expected message (Test Data): ${errorText}`);
  28 |       } else {
  29 |         console.log('Login successful with sample data, redirected to Dashboard.');
  30 |         await expect(page).toHaveURL(/.*owner\/dashboard|.*\//);
  31 |       }
  32 |     }
  33 |   });
  34 | 
  35 |   test('2. Pet Health and Care Stage Analysis', async ({ page }) => {
  36 |     // We try to access the health dashboard directly to test protected routing
> 37 |     await page.goto('/owner/health');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3000/owner/health
  38 |     
  39 |     if (page.url().includes('/login')) {
  40 |       console.log('Route /owner/health is properly protected.');
  41 |     } else {
  42 |       console.log('Accessing Health Stage...');
  43 |       // If we got here, check for health components
  44 |       const hasHealthScore = await page.locator('text=Sağlık Skoru').isVisible();
  45 |       console.log(`Health Score component visible: ${hasHealthScore}`);
  46 |     }
  47 |   });
  48 | 
  49 |   test('3. Pet Profile and Appointments Stage', async ({ page }) => {
  50 |     await page.goto('/owner/pets');
  51 |     
  52 |     if (page.url().includes('/login')) {
  53 |       console.log('Route /owner/pets is properly protected.');
  54 |     } else {
  55 |       console.log('Accessing Pet Profile Stage...');
  56 |       // Look for any add pet button or pet list
  57 |       const hasPets = await page.locator('text=Petlerim').isVisible();
  58 |       console.log(`Pets section visible: ${hasPets}`);
  59 |     }
  60 |   });
  61 | });
  62 | 
```
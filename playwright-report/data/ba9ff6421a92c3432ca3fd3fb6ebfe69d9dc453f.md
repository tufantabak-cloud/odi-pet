# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: main_flow.spec.ts >> Odi.Pet E2E Automation Robot >> 1. Landing and Login Stage
- Location: e2e\main_flow.spec.ts:8:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button[type="submit"]')
    - locator resolved to <button type="submit" class="btn-primary w-full mt-4 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]">Sisteme Giriş Yap</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="relative w-full h-full flex items-center justify-center p-6 md:p-12">…</div> from <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#4F2DBA] transition-opacity duration-500 cursor-pointer↵      opacity-100">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="relative w-full h-full flex items-center justify-center p-6 md:p-12">…</div> from <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#4F2DBA] transition-opacity duration-500 cursor-pointer↵      opacity-100">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    77 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="relative w-full h-full flex items-center justify-center p-6 md:p-12">…</div> from <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#4F2DBA] transition-opacity duration-500 cursor-pointer↵      opacity-100">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
  - element was detached from the DOM, retrying
    - waiting for" http://127.0.0.1:3000/login" navigation to finish...
    - navigated to "http://127.0.0.1:3000/login"
    - locator resolved to <button type="submit" class="btn-primary w-full mt-4 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]">Sisteme Giriş Yap</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="relative w-full h-full flex items-center justify-center p-6 md:p-12">…</div> from <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#4F2DBA] transition-opacity duration-500 cursor-pointer↵      opacity-100">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="relative w-full h-full flex items-center justify-center p-6 md:p-12">…</div> from <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#4F2DBA] transition-opacity duration-500 cursor-pointer↵      opacity-100">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    38 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="relative w-full h-full flex items-center justify-center p-6 md:p-12">…</div> from <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#4F2DBA] transition-opacity duration-500 cursor-pointer↵      opacity-100">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3] [cursor=pointer]:
    - img "Odi Pet"
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]: Odi
      - heading "Odi Pet" [level=1] [ref=e8]
      - paragraph [ref=e9]: Pati dostlarınıza premium takip
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: E-posta
        - textbox "E-posta" [ref=e13]:
          - /placeholder: ornek@email.com
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Şifre
          - link "Şifremi Unuttum" [ref=e17] [cursor=pointer]:
            - /url: "#"
        - textbox "Şifre" [ref=e18]:
          - /placeholder: ••••••••
      - button "Sisteme Giriş Yap" [ref=e19] [cursor=pointer]
      - paragraph [ref=e21]:
        - text: Hesabınız yok mu?
        - link "Kayıt Olun" [ref=e22] [cursor=pointer]:
          - /url: /register
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
  10 |     
  11 |     // Bypass splash screen
  12 |     await page.addInitScript(() => {
  13 |       sessionStorage.setItem('odi_splash_shown', 'true');
  14 |     });
  15 |     
  16 |     await page.goto('/login');
  17 |     
  18 |     await expect(page.locator('text=Odi Pet').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  19 |     
  20 |     console.log('Entering sample data for login...');
  21 |     await page.fill('input[name="email"]', testEmail);
  22 |     await page.fill('input[name="password"]', testPassword);
> 23 |     await page.click('button[type="submit"]');
     |                ^ Error: page.click: Test timeout of 60000ms exceeded.
  24 | 
  25 |     // Wait for either an error message or a successful redirect
  26 |     await page.waitForTimeout(3000); 
  27 |     
  28 |     const errorLocator = page.locator('.text-error');
  29 |     if (await errorLocator.isVisible()) {
  30 |       const errorText = await errorLocator.textContent();
  31 |       console.log(`Login resulted in expected message (Test Data): ${errorText}`);
  32 |     } else {
  33 |       console.log('Login successful with sample data, redirected to Dashboard.');
  34 |       await expect(page).not.toHaveURL(/.*login/, { timeout: 10000 });
  35 |     }
  36 |   });
  37 | 
  38 |   test('2. Pet Health and Care Stage Analysis', async ({ page }) => {
  39 |     // We try to access the health dashboard directly to test protected routing
  40 |     await page.goto('/owner/health');
  41 |     
  42 |     if (page.url().includes('/login')) {
  43 |       console.log('Route /owner/health is properly protected.');
  44 |     } else {
  45 |       console.log('Accessing Health Stage...');
  46 |       // If we got here, check for health components
  47 |       const hasHealthScore = await page.locator('text=Sağlık Skoru').isVisible();
  48 |       console.log(`Health Score component visible: ${hasHealthScore}`);
  49 |     }
  50 |   });
  51 | 
  52 |   test('3. Pet Profile and Appointments Stage', async ({ page }) => {
  53 |     await page.goto('/owner/pets');
  54 |     
  55 |     if (page.url().includes('/login')) {
  56 |       console.log('Route /owner/pets is properly protected.');
  57 |     } else {
  58 |       console.log('Accessing Pet Profile Stage...');
  59 |       // Look for any add pet button or pet list
  60 |       const hasPets = await page.locator('text=Petlerim').isVisible();
  61 |       console.log(`Pets section visible: ${hasPets}`);
  62 |     }
  63 |   });
  64 | });
  65 | 
```
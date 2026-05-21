# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: vaccines.spec.ts >> Vaccine OS Module >> Vaccine plan items are listed (Takvim tab)
- Location: e2e\vaccines.spec.ts:65:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/owner\//
Received string:  "http://127.0.0.1:3000/login?email=odiplatform%40gmail.com&password=odi1472"
Timeout: 15000ms

Call log:
  - Expect "toHaveURL" with timeout 15000ms
    18 × unexpected value "http://127.0.0.1:3000/login?email=odiplatform%40gmail.com&password=odi1472"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - link "Odi Logo" [ref=e5] [cursor=pointer]:
      - /url: /
      - img "Odi Logo" [ref=e6]
    - heading "Sevgiyle Bak, Sağlıkla Büyüt" [level=1] [ref=e7]:
      - text: Sevgiyle Bak,
      - text: Sağlıkla Büyüt
    - paragraph [ref=e8]: Hoş Geldiniz
  - generic [ref=e9]:
    - generic [ref=e10]:
      - button "Google ile Devam Et" [ref=e11]:
        - img [ref=e12]
        - text: Google ile Devam Et
      - generic [ref=e19]: veya
    - generic [ref=e21]:
      - generic [ref=e22]: E-posta Adresi
      - textbox "E-posta Adresi" [ref=e23]:
        - /placeholder: ornek@email.com
    - generic [ref=e24]:
      - generic [ref=e25]:
        - generic [ref=e26]: Şifre
        - link "Şifremi Unuttum" [ref=e27] [cursor=pointer]:
          - /url: /reset-password
      - generic [ref=e28]:
        - textbox "Şifre" [ref=e29]:
          - /placeholder: ••••••••
        - button "👁️" [ref=e30]
    - button "Sisteme Güvenli Giriş Yap" [ref=e31] [cursor=pointer]
    - paragraph [ref=e33]:
      - text: Henüz hesabınız yok mu?
      - link "Hemen Kayıt Olun" [ref=e34] [cursor=pointer]:
        - /url: /register
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | 
  3  | const EMAIL = process.env.TEST_EMAIL;
  4  | const PASSWORD = process.env.TEST_PASSWORD;
  5  | const PET_ID = process.env.TEST_PET_ID; // set this to a real pet UUID in .env.local
  6  | 
  7  | async function login(page: Page) {
  8  |   if (!EMAIL || !PASSWORD) {
  9  |     test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.');
  10 |     return;
  11 |   }
  12 |   await page.goto('/login');
  13 |   await page.fill('input[name="email"]', EMAIL);
  14 |   await page.fill('input[name="password"]', PASSWORD);
  15 |   await page.click('button[type="submit"]');
> 16 |   await expect(page).toHaveURL(/\/owner\//, { timeout: 15_000 });
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  17 | }
  18 | 
  19 | // ---------------------------------------------------------------------------
  20 | // Vaccine OS (authenticated – requires TEST_PET_ID)
  21 | // ---------------------------------------------------------------------------
  22 | 
  23 | test.describe('Vaccine OS Module', () => {
  24 |   test.beforeEach(async ({ page }) => {
  25 |     await login(page);
  26 |   });
  27 | 
  28 |   test('Vaccine page renders the main tabs', async ({ page }) => {
  29 |     if (!PET_ID) {
  30 |       test.skip(true, 'TEST_PET_ID not set.');
  31 |       return;
  32 |     }
  33 |     await page.goto(`/owner/pets/${PET_ID}/vaccines`);
  34 |     await page.waitForLoadState('networkidle');
  35 | 
  36 |     await expect(page.locator('text=Takvim').first()).toBeVisible({ timeout: 10_000 });
  37 |     await expect(page.locator('text=Kayıtlar').first()).toBeVisible();
  38 |   });
  39 | 
  40 |   test('Manuel İşlem modal opens and closes', async ({ page }) => {
  41 |     if (!PET_ID) {
  42 |       test.skip(true, 'TEST_PET_ID not set.');
  43 |       return;
  44 |     }
  45 |     await page.goto(`/owner/pets/${PET_ID}/vaccines`);
  46 |     await page.waitForLoadState('networkidle');
  47 | 
  48 |     const manualBtn = page.locator('button:has-text("Manuel İşlem"), button:has-text("Manuel")').first();
  49 |     if (await manualBtn.isVisible()) {
  50 |       await manualBtn.click();
  51 |       // Modal should open
  52 |       await expect(
  53 |         page.locator('[role="dialog"], .modal-content, text=Kayıt Düzenle, text=Aşı Kaydı').first()
  54 |       ).toBeVisible({ timeout: 6_000 });
  55 | 
  56 |       // Close with Escape or ✕ button
  57 |       await page.keyboard.press('Escape');
  58 |       // Modal should close (element count goes back to 0)
  59 |       await expect(
  60 |         page.locator('[role="dialog"]').first()
  61 |       ).not.toBeVisible({ timeout: 5_000 });
  62 |     }
  63 |   });
  64 | 
  65 |   test('Vaccine plan items are listed (Takvim tab)', async ({ page }) => {
  66 |     if (!PET_ID) {
  67 |       test.skip(true, 'TEST_PET_ID not set.');
  68 |       return;
  69 |     }
  70 |     await page.goto(`/owner/pets/${PET_ID}/vaccines`);
  71 |     await page.waitForLoadState('networkidle');
  72 | 
  73 |     // Navigate to calendar tab if not default
  74 |     const takvimTab = page.locator('button:has-text("Takvim"), a:has-text("Takvim")').first();
  75 |     if (await takvimTab.isVisible()) await takvimTab.click();
  76 | 
  77 |     // Either vaccine plan items or an empty-state message must be present
  78 |     const planItems = await page.locator('[data-testid="vaccine-plan-item"]').count();
  79 |     const emptyMsg = await page.locator('text=Plan Bulunamadı, text=Henüz plan').count();
  80 |     expect(planItems + emptyMsg).toBeGreaterThan(0);
  81 |   });
  82 | });
  83 | 
  84 | // ---------------------------------------------------------------------------
  85 | // Vaccine OS – unauthenticated guard
  86 | // ---------------------------------------------------------------------------
  87 | 
  88 | test.describe('Vaccine OS – Route Guard', () => {
  89 |   test('Unauthenticated user is redirected to /login', async ({ page }) => {
  90 |     // Go directly without logging in
  91 |     const petId = PET_ID ?? 'nonexistent-id';
  92 |     await page.goto(`/owner/pets/${petId}/vaccines`);
  93 |     await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  94 |   });
  95 | });
  96 | 
```
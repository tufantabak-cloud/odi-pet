# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: main_flow.spec.ts >> Dashboard >> Dashboard loads and shows pet cards or empty state
- Location: e2e\main_flow.spec.ts:66:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/owner\//
Received string:  "http://127.0.0.1:3000/login"
Timeout: 15000ms

Call log:
  - Expect "toHaveURL" with timeout 15000ms
    18 × unexpected value "http://127.0.0.1:3000/login"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6]:
    - generic [ref=e7]:
      - link "Odi.Pet" [ref=e8] [cursor=pointer]:
        - /url: /
        - img "Odi.Pet" [ref=e9]
      - generic [ref=e10]:
        - heading "Sevgiyle Bak, Sağlıkla Büyüt" [level=1] [ref=e11]
        - paragraph [ref=e12]: Hoş Geldiniz
    - alert [ref=e13]:
      - img [ref=e14]
      - text: Çok fazla hatalı giriş denemesi. Lütfen 22 saniye sonra tekrar deneyin.
    - generic [ref=e16]:
      - button "Google ile Giriş Yap" [ref=e17]:
        - img [ref=e18]
        - text: Google ile Giriş Yap
      - button "Apple ile Giriş Yap" [ref=e23]:
        - img [ref=e24]
        - text: Apple ile Giriş Yap
    - generic [ref=e28]: veya
    - generic [ref=e30]:
      - generic [ref=e31]:
        - generic [ref=e32]: E-Posta
        - textbox "E-Posta" [ref=e33]:
          - /placeholder: E-posta Adresiniz
          - text: tufan.tabak@gmail.com
      - generic [ref=e34]:
        - generic [ref=e35]: Şifre
        - generic [ref=e36]:
          - textbox "Şifre" [ref=e37]:
            - /placeholder: ••••••••
            - text: att1472o
          - button "Şifreyi göster" [ref=e38]:
            - img [ref=e39]
      - generic [ref=e42]:
        - generic [ref=e43] [cursor=pointer]:
          - checkbox "Beni Hatırla" [ref=e44]
          - generic [ref=e45]: Beni Hatırla
        - link "Şifremi Unuttum?" [ref=e46] [cursor=pointer]:
          - /url: /reset-password
      - button "🔒 8 saniye bekleyin" [disabled] [ref=e47]:
        - generic [ref=e48]: 🔒 8 saniye bekleyin
      - button "FaceID / TouchID ile Giriş Yap" [ref=e50] [cursor=pointer]:
        - img [ref=e51]
        - generic [ref=e60]: FaceID / TouchID ile Giriş Yap
    - paragraph [ref=e61]:
      - text: Hesabınız yok mu?
      - link "Kayıt Ol" [ref=e62] [cursor=pointer]:
        - /url: /register
    - generic [ref=e63]:
      - generic [ref=e64]:
        - img [ref=e65]
        - text: 256-bit SSL
      - generic [ref=e69]:
        - img [ref=e70]
        - text: KVKK Uyumlu
  - alert [ref=e72]
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | 
  3  | // ---------------------------------------------------------------------------
  4  | // Shared helpers
  5  | // ---------------------------------------------------------------------------
  6  | 
  7  | const EMAIL = process.env.TEST_EMAIL;
  8  | const PASSWORD = process.env.TEST_PASSWORD;
  9  | 
  10 | /**
  11 |  * Login helper – reusable across all test files.
  12 |  * Skips if credentials are not set.
  13 |  */
  14 | async function login(page: Page) {
  15 |   if (!EMAIL || !PASSWORD) {
  16 |     test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.');
  17 |     return;
  18 |   }
  19 |   await page.goto('/login');
  20 |   await page.fill('input[name="email"]', EMAIL);
  21 |   await page.fill('input[name="password"]', PASSWORD);
  22 |   await page.click('button[type="submit"]');
> 23 |   await expect(page).toHaveURL(/\/owner\//, { timeout: 15_000 });
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  24 | }
  25 | 
  26 | // ---------------------------------------------------------------------------
  27 | // Auth flow
  28 | // ---------------------------------------------------------------------------
  29 | 
  30 | test.describe('Auth Flow', () => {
  31 |   test('Login page renders correctly', async ({ page }) => {
  32 |     await page.goto('/login');
  33 |     await expect(page.locator('input[name="email"]')).toBeVisible();
  34 |     await expect(page.locator('input[name="password"]')).toBeVisible();
  35 |     await expect(page.locator('button[type="submit"]')).toBeVisible();
  36 |   });
  37 | 
  38 |   test('Shows error for wrong credentials', async ({ page }) => {
  39 |     await page.goto('/login');
  40 |     await page.fill('input[name="email"]', 'wrong@example.com');
  41 |     await page.fill('input[name="password"]', 'badpassword');
  42 |     await page.click('button[type="submit"]');
  43 |     // Expect an error message to appear (could be a toast/alert or inline)
  44 |     await expect(
  45 |       page.locator('[role="alert"], .error, [data-testid="login-error"]').first()
  46 |     ).toBeVisible({ timeout: 8_000 });
  47 |   });
  48 | 
  49 |   test('Authenticated user is redirected away from /login', async ({ page }) => {
  50 |     await login(page);
  51 |     await page.goto('/login');
  52 |     // Should redirect back to dashboard
  53 |     await expect(page).toHaveURL(/\/owner\//, { timeout: 10_000 });
  54 |   });
  55 | });
  56 | 
  57 | // ---------------------------------------------------------------------------
  58 | // Dashboard
  59 | // ---------------------------------------------------------------------------
  60 | 
  61 | test.describe('Dashboard', () => {
  62 |   test.beforeEach(async ({ page }) => {
  63 |     await login(page);
  64 |   });
  65 | 
  66 |   test('Dashboard loads and shows pet cards or empty state', async ({ page }) => {
  67 |     await page.goto('/owner/dashboard');
  68 |     await page.waitForLoadState('networkidle');
  69 |     // Either pet cards or the "add first pet" CTA should be visible
  70 |     const hasPets = await page.locator('[data-testid="pet-card"]').count();
  71 |     const hasEmptyState = await page.locator('text=İlk Peti Ekle, text=Hayvan Ekle').count();
  72 |     expect(hasPets + hasEmptyState).toBeGreaterThan(0);
  73 |   });
  74 | });
  75 | 
  76 | // ---------------------------------------------------------------------------
  77 | // Pets
  78 | // ---------------------------------------------------------------------------
  79 | 
  80 | test.describe('Pets Module', () => {
  81 |   test.beforeEach(async ({ page }) => {
  82 |     await login(page);
  83 |   });
  84 | 
  85 |   test('Pet list page is accessible', async ({ page }) => {
  86 |     await page.goto('/owner/pets');
  87 |     await page.waitForLoadState('networkidle');
  88 |     // Either see a pet list or the empty-state CTA
  89 |     await expect(
  90 |       page.locator('h1, h2').filter({ hasText: /Pet|Hayvan|Pati|Can Dost/i }).first()
  91 |     ).toBeVisible({ timeout: 10_000 });
  92 |   });
  93 | });
  94 | 
```
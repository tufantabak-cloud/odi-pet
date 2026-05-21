# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: authenticated_flow.spec.ts >> SOS Emergency Contacts >> Can fill and save an SOS contact
- Location: e2e\authenticated_flow.spec.ts:49:7

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
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | const EMAIL = process.env.TEST_EMAIL;
  4   | const PASSWORD = process.env.TEST_PASSWORD;
  5   | const PET_ID = process.env.TEST_PET_ID;
  6   | 
  7   | async function login(page: Page) {
  8   |   if (!EMAIL || !PASSWORD) {
  9   |     test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.');
  10  |     return;
  11  |   }
  12  |   await page.goto('/login');
  13  |   await page.fill('input[name="email"]', EMAIL);
  14  |   await page.fill('input[name="password"]', PASSWORD);
  15  |   await page.click('button[type="submit"]');
> 16  |   await expect(page).toHaveURL(/\/owner\//, { timeout: 15_000 });
      |                      ^ Error: expect(page).toHaveURL(expected) failed
  17  | }
  18  | 
  19  | // ---------------------------------------------------------------------------
  20  | // SOS Module
  21  | // ---------------------------------------------------------------------------
  22  | 
  23  | test.describe('SOS Emergency Contacts', () => {
  24  |   test.beforeEach(async ({ page }) => {
  25  |     await login(page);
  26  |   });
  27  | 
  28  |   test('Family/SOS tab is reachable on pet detail page', async ({ page }) => {
  29  |     if (!PET_ID) {
  30  |       test.skip(true, 'TEST_PET_ID not set.');
  31  |       return;
  32  |     }
  33  |     await page.goto(`/owner/pets/${PET_ID}`);
  34  |     await page.waitForLoadState('networkidle');
  35  | 
  36  |     // Click on "Aile" or "SOS" tab
  37  |     const familyTab = page
  38  |       .locator('button:has-text("Aile"), button:has-text("SOS"), a:has-text("Aile")')
  39  |       .first();
  40  |     if (await familyTab.isVisible()) {
  41  |       await familyTab.click();
  42  |       // SOS contact form or list should now be visible
  43  |       await expect(
  44  |         page.locator('text=Acil Kişi, text=SOS, input[placeholder*="İsim"], input[placeholder*="isim"]').first()
  45  |       ).toBeVisible({ timeout: 8_000 });
  46  |     }
  47  |   });
  48  | 
  49  |   test('Can fill and save an SOS contact', async ({ page }) => {
  50  |     if (!PET_ID) {
  51  |       test.skip(true, 'TEST_PET_ID not set.');
  52  |       return;
  53  |     }
  54  |     await page.goto(`/owner/pets/${PET_ID}`);
  55  |     await page.waitForLoadState('networkidle');
  56  | 
  57  |     const familyTab = page
  58  |       .locator('button:has-text("Aile"), button:has-text("SOS"), a:has-text("Aile")')
  59  |       .first();
  60  |     if (!(await familyTab.isVisible())) return;
  61  |     await familyTab.click();
  62  | 
  63  |     // Fill the first contact name input
  64  |     const nameInput = page.locator('input[placeholder*="İsim"], input[placeholder*="isim"]').first();
  65  |     if (await nameInput.isVisible()) {
  66  |       await nameInput.fill('E2E Test Kişisi');
  67  |       const phoneInput = page.locator('input[placeholder*="Telefon"], input[type="tel"]').first();
  68  |       if (await phoneInput.isVisible()) {
  69  |         await phoneInput.fill('05559998877');
  70  |       }
  71  |       // Click save
  72  |       const saveBtn = page.locator('button:has-text("Kaydet"), button:has-text("Güncelle")').first();
  73  |       if (await saveBtn.isVisible()) {
  74  |         await saveBtn.click();
  75  |         // Expect success notification or no error
  76  |         await expect(
  77  |           page.locator('text=başarı, text=kaydedildi, text=güncellendi, [role="status"]').first()
  78  |         ).toBeVisible({ timeout: 8_000 });
  79  |       }
  80  |     }
  81  |   });
  82  | });
  83  | 
  84  | // ---------------------------------------------------------------------------
  85  | // Treatments Module
  86  | // ---------------------------------------------------------------------------
  87  | 
  88  | test.describe('Treatment Tracking Module', () => {
  89  |   test.beforeEach(async ({ page }) => {
  90  |     await login(page);
  91  |   });
  92  | 
  93  |   test('Treatments page loads for a pet', async ({ page }) => {
  94  |     if (!PET_ID) {
  95  |       test.skip(true, 'TEST_PET_ID not set.');
  96  |       return;
  97  |     }
  98  |     await page.goto(`/owner/pets/${PET_ID}/treatments`);
  99  |     await page.waitForLoadState('networkidle');
  100 | 
  101 |     await expect(
  102 |       page.locator('h1:has-text("Tedavi"), h2:has-text("Tedavi")').first()
  103 |     ).toBeVisible({ timeout: 10_000 });
  104 |   });
  105 | 
  106 |   test('"Yeni Tedavi" modal opens and validates empty form', async ({ page }) => {
  107 |     if (!PET_ID) {
  108 |       test.skip(true, 'TEST_PET_ID not set.');
  109 |       return;
  110 |     }
  111 |     await page.goto(`/owner/pets/${PET_ID}/treatments`);
  112 |     await page.waitForLoadState('networkidle');
  113 | 
  114 |     const newBtn = page.locator('button:has-text("Yeni Tedavi")').first();
  115 |     if (await newBtn.isVisible()) {
  116 |       await newBtn.click();
```
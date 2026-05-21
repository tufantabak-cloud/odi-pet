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
Received string:  "http://127.0.0.1:3000/admin"
Timeout: 15000ms

Call log:
  - Expect "toHaveURL" with timeout 15000ms
    3 × unexpected value "http://127.0.0.1:3000/login"
    - waiting for" http://127.0.0.1:3000/" navigation to finish...
    - navigated to "http://127.0.0.1:3000/admin"
    15 × unexpected value "http://127.0.0.1:3000/admin"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]:
          - generic [ref=e6]: 🔭
          - generic [ref=e7]: Odi Admin
        - generic [ref=e8]: FOUNDER
      - navigation [ref=e9]:
        - generic [ref=e10]:
          - paragraph [ref=e11]: Overview
          - link "🏠 Dashboard" [ref=e12] [cursor=pointer]:
            - /url: /admin
            - generic [ref=e13]: 🏠
            - text: Dashboard
          - link "📊 Intelligence" [ref=e14] [cursor=pointer]:
            - /url: /admin/intelligence
            - generic [ref=e15]: 📊
            - text: Intelligence
        - generic [ref=e16]:
          - paragraph [ref=e17]: Management
          - link "👥 Users" [ref=e18] [cursor=pointer]:
            - /url: /admin/users
            - generic [ref=e19]: 👥
            - text: Users
          - link "🐾 Pets" [ref=e20] [cursor=pointer]:
            - /url: /admin/pets
            - generic [ref=e21]: 🐾
            - text: Pets
          - link "🏥 Clinics" [ref=e22] [cursor=pointer]:
            - /url: /admin/clinics
            - generic [ref=e23]: 🏥
            - text: Clinics
          - link "📋 Pipeline (Outreach)" [ref=e24] [cursor=pointer]:
            - /url: /admin/outreach
            - generic [ref=e25]: 📋
            - text: Pipeline (Outreach)
        - generic [ref=e26]:
          - paragraph [ref=e27]: System
          - link "⚙️ Settings & Flags" [ref=e28] [cursor=pointer]:
            - /url: /admin/settings
            - generic [ref=e29]: ⚙️
            - text: Settings & Flags
      - generic [ref=e30]:
        - generic [ref=e31]: 🧑‍💻 Odi
        - link "← Back to App" [ref=e32] [cursor=pointer]:
          - /url: /owner/dashboard
          - generic [ref=e33]: ←
          - text: Back to App
    - main [ref=e34]:
      - generic [ref=e36]:
        - generic [ref=e37]:
          - generic [ref=e38]:
            - heading "🏠 Dashboard CANLI" [level=1] [ref=e39]:
              - text: 🏠 Dashboard
              - generic [ref=e42]: CANLI
            - paragraph [ref=e43]:
              - text: "Son güncelleme: 14:21:54 ·"
              - button "Yenile" [ref=e44]
          - generic [ref=e45]:
            - button "Bugün" [ref=e46]
            - button "Bu Hafta" [ref=e47]
            - button "Bu Ay" [ref=e48]
        - generic [ref=e49]:
          - link "🧑‍💻 Yeni Kayıt 0 Bu gün 0 yeni kullanıcı" [ref=e50] [cursor=pointer]:
            - /url: /admin/users
            - generic [ref=e51]:
              - generic [ref=e53]: 🧑‍💻
              - paragraph [ref=e55]: Yeni Kayıt
              - paragraph [ref=e56]: "0"
              - paragraph [ref=e57]: Bu gün 0 yeni kullanıcı
          - link "🐾 Yeni Pet 0 Bu gün 0 yeni evcil hayvan" [ref=e58] [cursor=pointer]:
            - /url: /admin/pets
            - generic [ref=e59]:
              - generic [ref=e61]: 🐾
              - paragraph [ref=e63]: Yeni Pet
              - paragraph [ref=e64]: "0"
              - paragraph [ref=e65]: Bu gün 0 yeni evcil hayvan
          - generic [ref=e66]:
            - generic [ref=e68]: ⭐
            - paragraph [ref=e70]: Pro Abonelik Oranı
            - paragraph [ref=e71]: "%0"
            - paragraph [ref=e72]: Bu ay +0 · Toplam 0
          - link "⚠️ Gecikmiş Aşı 148 Tüm hayvanlarda overdue durum" [ref=e73] [cursor=pointer]:
            - /url: /admin/pets
            - generic [ref=e74]:
              - generic [ref=e76]: ⚠️
              - paragraph [ref=e78]: Gecikmiş Aşı
              - paragraph [ref=e79]: "148"
              - paragraph [ref=e80]: Tüm hayvanlarda overdue durum
          - link "🏥 Klinik Onay Kuyruğu 0 Onay bekleyen klinik sayısı" [ref=e81] [cursor=pointer]:
            - /url: /admin/clinics
            - generic [ref=e82]:
              - generic [ref=e84]: 🏥
              - paragraph [ref=e86]: Klinik Onay Kuyruğu
              - paragraph [ref=e87]: "0"
              - paragraph [ref=e88]: Onay bekleyen klinik sayısı
          - generic [ref=e89]:
            - generic [ref=e91]: 👥
            - paragraph [ref=e93]: Toplam Pro Üye
            - paragraph [ref=e94]: "0"
            - paragraph [ref=e95]: Aktif pro & ai_plus aboneler
        - generic [ref=e96]:
          - generic [ref=e97]:
            - heading "Son 5 Kayıt" [level=2] [ref=e98]
            - link "Tüm kullanıcılar →" [ref=e99] [cursor=pointer]:
              - /url: /admin/users
          - generic [ref=e101]:
            - link "TE Test Clinic testclinic@example.com admin 1g önce" [ref=e102] [cursor=pointer]:
              - /url: /admin/users/a58dab4d-be95-4ed1-beca-75e79177548a
              - generic [ref=e103]: TE
              - generic [ref=e104]:
                - paragraph [ref=e105]: Test Clinic
                - paragraph [ref=e106]: testclinic@example.com
              - generic [ref=e107]:
                - generic [ref=e108]: admin
                - generic [ref=e109]: 1g önce
            - link "OD Odi Platform odiplatform@gmail.com founder 1g önce" [ref=e110] [cursor=pointer]:
              - /url: /admin/users/618aaabc-c179-428f-9569-08870cfbc7ed
              - generic [ref=e111]: OD
              - generic [ref=e112]:
                - paragraph [ref=e113]: Odi Platform
                - paragraph [ref=e114]: odiplatform@gmail.com
              - generic [ref=e115]:
                - generic [ref=e116]: founder
                - generic [ref=e117]: 1g önce
            - link "SE Selin Eryaşar owner 1g önce" [ref=e118] [cursor=pointer]:
              - /url: /admin/users/982c3053-a31f-4f02-83d3-42edde5a491c
              - generic [ref=e119]: SE
              - generic [ref=e120]:
                - paragraph [ref=e121]: Selin Eryaşar
                - paragraph
              - generic [ref=e122]:
                - generic [ref=e123]: owner
                - generic [ref=e124]: 1g önce
            - link "CH CHOSSN owner 1g önce" [ref=e125] [cursor=pointer]:
              - /url: /admin/users/db224a39-a777-4347-a2f9-f66ac2c4a358
              - generic [ref=e126]: CH
              - generic [ref=e127]:
                - paragraph [ref=e128]: CHOSSN
                - paragraph
              - generic [ref=e129]:
                - generic [ref=e130]: owner
                - generic [ref=e131]: 1g önce
            - link "TU Tufan Tabak tufan.tabak@gmail.com owner 2g önce" [ref=e132] [cursor=pointer]:
              - /url: /admin/users/62ed8fee-87b1-4c99-8087-008652b12e2e
              - generic [ref=e133]: TU
              - generic [ref=e134]:
                - paragraph [ref=e135]: Tufan Tabak
                - paragraph [ref=e136]: tufan.tabak@gmail.com
              - generic [ref=e137]:
                - generic [ref=e138]: owner
                - generic [ref=e139]: 2g önce
        - generic [ref=e140]:
          - heading "Hızlı Eylemler" [level=2] [ref=e141]
          - generic [ref=e142]:
            - link "👥 Kullanıcıları Yönet Kayıtlı kullanıcıları görüntüle, düzenle veya engelle." [ref=e143] [cursor=pointer]:
              - /url: /admin/users
              - generic [ref=e144]: 👥
              - heading "Kullanıcıları Yönet" [level=3] [ref=e145]
              - paragraph [ref=e146]: Kayıtlı kullanıcıları görüntüle, düzenle veya engelle.
            - link "🏥 Klinikleri Onayla Bekleyen klinik başvurularını incele ve onayla." [ref=e147] [cursor=pointer]:
              - /url: /admin/clinics
              - generic [ref=e148]: 🏥
              - heading "Klinikleri Onayla" [level=3] [ref=e149]
              - paragraph [ref=e150]: Bekleyen klinik başvurularını incele ve onayla.
            - link "📊 Intelligence OS Kapsamlı ürün metriklerini ve hunileri görüntüle." [ref=e151] [cursor=pointer]:
              - /url: /admin/intelligence
              - generic [ref=e152]: 📊
              - heading "Intelligence OS" [level=3] [ref=e153]
              - paragraph [ref=e154]: Kapsamlı ürün metriklerini ve hunileri görüntüle.
  - alert [ref=e155]
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
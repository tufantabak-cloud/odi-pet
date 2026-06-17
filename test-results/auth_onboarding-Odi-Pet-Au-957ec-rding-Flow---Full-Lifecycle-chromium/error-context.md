# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth_onboarding.spec.ts >> Odi.Pet Auth & Onboarding Flow - Full Lifecycle
- Location: e2e\auth_onboarding.spec.ts:21:5

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: page.click: Test timeout of 120000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Devam Et")')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - banner [ref=e4]:
      - link "Odi Logo" [ref=e5] [cursor=pointer]:
        - /url: /owner/dashboard
        - img "Odi Logo" [ref=e7]
      - link "Bildirimler" [ref=e9] [cursor=pointer]:
        - /url: /owner/notifications
        - img [ref=e10]
    - main [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]:
          - heading "İyi Günler, E2E Test User" [level=1] [ref=e17]
          - paragraph [ref=e18]: 17 Haziran
        - generic [ref=e19]:
          - generic [ref=e20]:
            - img [ref=e22]
            - generic [ref=e28]:
              - heading "Hoş Geldiniz, E2E Test User!" [level=2] [ref=e29]
              - paragraph [ref=e30]: Premium evcil hayvan bakım paneronuz Odi.Pet ile tanışın. Can dostunuzun profilini oluşturun, aşı takibini başlatın.
            - link "İlk Can Dostunu Ekle" [ref=e31] [cursor=pointer]:
              - /url: /owner/pets/add
          - generic [ref=e32]:
            - paragraph [ref=e33]: Neler yapabilirsiniz?
            - generic [ref=e34]:
              - generic [ref=e35]:
                - img [ref=e37]
                - generic [ref=e49]: Sağlık & Aşılar
              - generic [ref=e50]:
                - img [ref=e52]
                - generic [ref=e62]: Beslenme
              - generic [ref=e63]:
                - img [ref=e65]
                - generic [ref=e77]: Bakım
              - generic [ref=e78]:
                - img [ref=e80]
                - generic [ref=e83]: AI Vet
    - navigation [ref=e84]:
      - generic [ref=e85]:
        - link "Anasayfa" [ref=e86] [cursor=pointer]:
          - /url: /owner/dashboard
          - img [ref=e88]
          - generic [ref=e90]: Anasayfa
        - link "Hizmetler" [ref=e91] [cursor=pointer]:
          - /url: /owner/services
          - img [ref=e93]
          - generic [ref=e95]: Hizmetler
        - button [ref=e96] [cursor=pointer]:
          - img [ref=e99]
        - link "Sosyal" [ref=e100] [cursor=pointer]:
          - /url: /owner/social
          - img [ref=e102]
          - generic [ref=e107]: Sosyal
        - link "Profil" [ref=e108] [cursor=pointer]:
          - /url: /owner/profile
          - img [ref=e110]
          - generic [ref=e113]: Profil
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | 
  3   | test.use({
  4   |   viewport: { width: 375, height: 812 },
  5   |   isMobile: true,
  6   |   hasTouch: true,
  7   | });
  8   | 
  9   | 
  10  | 
  11  | async function waitForSplash(page: Page) {
  12  |   try {
  13  |     // Wait for the splash screen images to be detached from the DOM
  14  |     await page.waitForSelector('img[alt="Splash 1"]', { state: 'detached', timeout: 8000 });
  15  |     await page.waitForSelector('img[alt="Splash 2"]', { state: 'detached', timeout: 8000 });
  16  |   } catch (e) {
  17  |     // Already gone or did not load
  18  |   }
  19  | }
  20  | 
  21  | test('Odi.Pet Auth & Onboarding Flow - Full Lifecycle', async ({ page }) => {
  22  |   page.on('console', msg => {
  23  |     console.log(`[Browser ${msg.type()}] ${msg.text()}`);
  24  |   });
  25  |   test.setTimeout(120000);
  26  |   const email = `e2e_test_${Date.now()}@gmail.com`;
  27  |   const password = 'StrongPassword123!';
  28  |   const petName = `Pati_${Date.now().toString().slice(-4)}`;
  29  | 
  30  |   // 1. Kayıt Olma (Register)
  31  |   console.log('Starting Register Flow...');
  32  |   await page.goto('/register');
  33  |   await waitForSplash(page);
  34  |   
  35  |   await page.fill('#name', 'E2E Test User');
  36  |   await page.fill('#reg-email', email);
  37  |   await page.click('button:has-text("İleri")');
  38  |   
  39  |   await page.waitForSelector('#password', { state: 'visible', timeout: 5000 });
  40  |   await page.fill('#password', password);
  41  |   await page.fill('#confirmPassword', password);
  42  |   await page.check('#terms');
  43  |   
  44  |   await page.click('button[type="submit"]:has-text("Kayıt Ol ve Başla")');
  45  |   await expect(page.locator('text=Aramıza Hoş Geldiniz!')).toBeVisible({ timeout: 10000 });
  46  | 
  47  |   // Kayıt sonrası otomatik oturumu simüle etmek için çerezleri temizleyip sıfırdan login olalım
  48  |   console.log('Clearing cookies to test clean Login Flow...');
  49  |   await page.context().clearCookies();
  50  | 
  51  |   // 2. Giriş Yapma (Login)
  52  |   console.log('Starting Login Flow...');
  53  |   await page.goto('/login');
  54  |   await waitForSplash(page);
  55  |   
  56  |   await page.fill('input[name="email"]', email);
  57  |   await page.fill('input[name="password"]', password);
  58  |   await page.click('button[type="submit"]');
  59  |   
  60  |   // İlk defa giriş yaptığı için dashboard'a yönlendirilmeli ve onboarding/spotlight turu açılmalı
  61  |   await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
  62  |   await expect(page.locator('text=Anasayfa Paneli')).toBeVisible({ timeout: 10000 });
  63  | 
  64  |   // Onboarding Wizard adımlarını geç (SpotlightTour: Devam Et -> Devam Et -> Başla)
  65  |   await page.click('button:has-text("Devam Et")');
  66  |   await page.waitForTimeout(600);
> 67  |   await page.click('button:has-text("Devam Et")');
      |              ^ Error: page.click: Test timeout of 120000ms exceeded.
  68  |   await page.waitForTimeout(600);
  69  |   await page.click('button:has-text("Başla 🐾")');
  70  |   
  71  |   // 3. İlk Evcil Hayvan Ekleme (Onboarding - Hızlı Kayıt)
  72  |   console.log('Starting Pet Onboarding...');
  73  |   await expect(page).toHaveURL(/\/owner\/pets\/add/, { timeout: 15000 });
  74  | 
  75  |   // Adım 1: Tür Seçimi (Kedi)
  76  |   await page.click('button:has-text("Kedi")');
  77  |   await page.waitForTimeout(1000);
  78  | 
  79  |   // Adım 2: Temel Bilgiler Formu
  80  |   await expect(page.locator('#name')).toBeVisible();
  81  |   await page.fill('#name', petName);
  82  |   await page.selectOption('#breed', 'British Shorthair');
  83  |   await page.click('label:has-text("♂ Erkek")');
  84  |   await page.fill('input[type="date"]', '2025-01-01');
  85  | 
  86  |   // Devam et
  87  |   await page.click('button:has-text("Devam Et →")');
  88  |   await page.waitForTimeout(1000);
  89  | 
  90  |   // Adım 3: Profil Fotoğrafı Ekle
  91  |   await page.click('button:has-text("Profili Oluştur")');
  92  |   await page.waitForTimeout(1000);
  93  | 
  94  |   // Adım 4: Acil Durum Ağı (Atla)
  95  |   await page.click('button:has-text("Atla →")');
  96  | 
  97  |   // Başarıyla eklenip başarı ekranına yönlendirildi mi?
  98  |   await expect(page).toHaveURL(/\/owner\/pets\/add\/success/, { timeout: 15000 });
  99  | 
  100 |   // 4. Çıkış Yapma (Logout)
  101 |   console.log('Starting Logout Flow...');
  102 |   await page.goto('/owner/profile');
  103 |   await waitForSplash(page);
  104 |   await page.waitForLoadState('networkidle');
  105 |   await page.click('button:has-text("Hesaptan Çıkış Yap")', { force: true });
  106 |   await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  107 | 
  108 |   // 5. Şifremi Unuttum (Forgot Password)
  109 |   console.log('Starting Password Reset Request...');
  110 |   await page.goto('/reset-password');
  111 |   await waitForSplash(page);
  112 |   await page.fill('#email', email);
  113 |   await page.click('button[type="submit"]');
  114 |   try {
  115 |     await expect(page.locator('text=Sıfırlama bağlantısı gönderildi')).toBeVisible({ timeout: 10000 });
  116 |     console.log('Password reset request successful!');
  117 |   } catch (e) {
  118 |     const errorText = await page.locator('[role="alert"]').innerText().catch(() => 'No alert found');
  119 |     const pageHtml = await page.locator('.card-base').innerHTML().catch(() => 'No card-base html');
  120 |     console.error('Password reset failed on page. Error shown:', errorText);
  121 |     console.error('Form HTML structure at failure:\n', pageHtml);
  122 |     throw e;
  123 |   }
  124 | });
  125 | 
```
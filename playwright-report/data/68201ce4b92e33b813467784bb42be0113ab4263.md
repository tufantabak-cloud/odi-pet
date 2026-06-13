# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smart_scanner.spec.ts >> Akıllı Tarama (Smart Scanner) Akışı >> Mock API ile başarılı bir Aşı Karnesi taraması gerçekleştirilebilmeli
- Location: e2e\smart_scanner.spec.ts:36:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h3:has-text("Görseli Ayarlayın")').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('h3:has-text("Görseli Ayarlayın")').first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - link "Odi Logo Odi.Pet" [ref=e4] [cursor=pointer]:
        - /url: /owner/dashboard
        - img "Odi Logo" [ref=e6]
        - generic [ref=e7]: Odi.Pet
      - generic [ref=e8]:
        - button "Kayıp İlanları" [ref=e9]:
          - generic [ref=e10]: KAYIP
        - link "Bildirimler" [ref=e11] [cursor=pointer]:
          - /url: /owner/notifications
          - img [ref=e12]
    - generic [ref=e15]:
      - complementary [ref=e16]:
        - paragraph [ref=e17]: ANA MENÜ
        - link "Anasayfa" [ref=e18] [cursor=pointer]:
          - /url: /owner/dashboard
          - img [ref=e20]
          - text: Anasayfa
        - link "AI VET" [ref=e25] [cursor=pointer]:
          - /url: /owner/ai-vet
          - img [ref=e27]
          - text: AI VET
        - link "Hizmetler" [ref=e29] [cursor=pointer]:
          - /url: /owner/services
          - img [ref=e31]
          - text: Hizmetler
        - link "Sosyal" [ref=e33] [cursor=pointer]:
          - /url: /owner/social
          - img [ref=e35]
          - text: Sosyal
        - paragraph [ref=e37]: KISA YOLLAR
        - link "Veteriner Bul" [ref=e38] [cursor=pointer]:
          - /url: /owner/vets
          - img [ref=e40]
          - text: Veteriner Bul
        - link "Bildirimler" [ref=e42] [cursor=pointer]:
          - /url: /owner/notifications
          - img [ref=e44]
          - text: Bildirimler
        - link "Profilim" [ref=e47] [cursor=pointer]:
          - /url: /owner/profile
          - img [ref=e49]
          - text: Profilim
      - main [ref=e52]:
        - generic [ref=e53]:
          - generic [ref=e54]:
            - heading "Belgeyi İncele" [level=2] [ref=e55]
            - button [ref=e56]:
              - img [ref=e57]
          - generic [ref=e61]:
            - heading "Belgeyi İncele" [level=3] [ref=e62]
            - paragraph [ref=e63]: Görseli sürükleyip yakınlaştırarak kılavuz çizgileri arasına hizalayın.
            - generic [ref=e64]:
              - img "Ayarlanacak Belge"
            - generic [ref=e65]:
              - generic [ref=e66]:
                - generic [ref=e67]: Yakınlaştır / Uzaklaştır
                - generic [ref=e68]: "% 100"
              - slider [ref=e69] [cursor=pointer]: "1"
            - generic [ref=e70]:
              - button "Sola Döndür" [ref=e71]:
                - img [ref=e72]
                - text: Sola Döndür
              - button "Sağa Döndür" [ref=e74]:
                - img [ref=e75]
                - text: Sağa Döndür
            - generic [ref=e77]:
              - button "Yeniden Seç" [ref=e78]
              - button "Kırp ve Tara" [ref=e79]:
                - img [ref=e80]
                - text: Kırp ve Tara
  - alert [ref=e82]
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
  16  |   await expect(page).toHaveURL(/\/owner\//, { timeout: 15_000 });
  17  | }
  18  | 
  19  | test.describe('Akıllı Tarama (Smart Scanner) Akışı', () => {
  20  |   test.beforeEach(async ({ page }) => {
  21  |     await login(page);
  22  |   });
  23  | 
  24  |   test('Tarayıcı sayfası yüklenmeli ve pet seçimi yapılabilmeli', async ({ page }) => {
  25  |     await page.goto('/owner/scanner');
  26  |     await page.waitForLoadState('networkidle');
  27  | 
  28  |     // Başlık ve açıklama kontrolü
  29  |     await expect(page.locator('h1:has-text("Akıllı Tarama")').first()).toBeVisible({ timeout: 10_000 });
  30  |     
  31  |     // Eğer doğrudan pet seçilmişse (tek pet varsa) veya pet seçimi butonu varsa kontrol edelim
  32  |     const isReadyStep = await page.locator('h1:has-text("Akıllı Tarama")').count() > 0;
  33  |     expect(isReadyStep).toBe(true);
  34  |   });
  35  | 
  36  |   test('Mock API ile başarılı bir Aşı Karnesi taraması gerçekleştirilebilmeli', async ({ page }) => {
  37  |     // API isteğini yakalayıp mocklayalım
  38  |     await page.route('**/api/scan-document', async (route) => {
  39  |       await route.fulfill({
  40  |         status: 200,
  41  |         contentType: 'application/json',
  42  |         body: JSON.stringify({
  43  |           success: true,
  44  |           data: {
  45  |             record_type: 'vaccine_card',
  46  |             parsed: {
  47  |               title: 'Karma Aşı Test',
  48  |               brand: 'Nobivac Test',
  49  |               date: '2026-05-15',
  50  |               next_date: '2027-05-15',
  51  |               vet_name: 'Test Hekim',
  52  |               vet_company: 'Odi Vet Klinik'
  53  |             }
  54  |           }
  55  |         })
  56  |       });
  57  |     });
  58  | 
  59  |     await page.route('**/api/scan-document/confirm', async (route) => {
  60  |       await route.fulfill({
  61  |         status: 200,
  62  |         contentType: 'application/json',
  63  |         body: JSON.stringify({
  64  |           success: true,
  65  |           data: { status: 'success', message: 'Vaccine records updated' }
  66  |         })
  67  |       });
  68  |     });
  69  | 
  70  |     await page.goto('/owner/scanner');
  71  |     await page.waitForLoadState('networkidle');
  72  | 
  73  |     // Eğer pet seçimi ekranı geldiyse ilk peti seçelim
  74  |     const petCard = page.locator('[data-testid="pet-card"], button:has-text("Köpek"), button:has-text("Kedi")').first();
  75  |     if (await petCard.isVisible()) {
  76  |       await petCard.click();
  77  |     }
  78  | 
  79  |     // Dosya girişi ve tetikleme (mock olarak handleCapture'ı tetiklemek için input dosyasını simüle edelim)
  80  |     const fileInput = page.locator('input[type="file"]').first();
  81  |     if (await fileInput.isHidden()) {
  82  |       // Input hidden olduğu için direct path ekleyebiliriz
  83  |       await fileInput.setInputFiles({
  84  |         name: 'test_vaccine.png',
  85  |         mimeType: 'image/png',
  86  |         buffer: Buffer.from('fake-image-content')
  87  |       });
  88  |     }
  89  | 
  90  |     // Görseli ayarlama ekranının geldiğini kontrol edelim
> 91  |     await expect(page.locator('h3:has-text("Görseli Ayarlayın")').first()).toBeVisible({ timeout: 5_000 });
      |                                                                            ^ Error: expect(locator).toBeVisible() failed
  92  |     
  93  |     // Kırp ve Tara butonuna basalım
  94  |     const cropBtn = page.locator('button:has-text("Kırp ve Tara")').first();
  95  |     await expect(cropBtn).toBeVisible();
  96  |     await cropBtn.click();
  97  | 
  98  |     // Taranıyor durumunun geçişini bekleyelim
  99  |     await expect(page.locator('h2:has-text("Tarama Sonuçları")').first()).toBeVisible({ timeout: 15_000 });
  100 | 
  101 |     // Alanların doldurulduğunu kontrol edelim
  102 |     const titleInput = page.locator('input[value="Karma Aşı Test"]').first();
  103 |     await expect(titleInput).toBeVisible();
  104 | 
  105 |     // Onayla ve Kaydet butonuna basalım
  106 |     const confirmBtn = page.locator('button:has-text("Onayla ve Kaydet")').first();
  107 |     await expect(confirmBtn).toBeVisible();
  108 |     await confirmBtn.click();
  109 | 
  110 |     // İşlem başarılı olduktan sonra yönlendirme yapılmalı
  111 |     await expect(page).toHaveURL(/\/owner\/pets\//, { timeout: 10_000 });
  112 |   });
  113 | 
  114 |   test('Mama paketi taraması ve mama bitiş tarihi hesaplaması kontrolü', async ({ page }) => {
  115 |     await page.route('**/api/scan-document', async (route) => {
  116 |       await route.fulfill({
  117 |         status: 200,
  118 |         contentType: 'application/json',
  119 |         body: JSON.stringify({
  120 |           success: true,
  121 |           data: {
  122 |             record_type: 'food_packaging',
  123 |             parsed: {
  124 |               food_brand: 'ProPlan Test',
  125 |               food_product: 'Puppy Dry Food',
  126 |               food_type: 'dry',
  127 |               package_size_grams: 3000,
  128 |               existing_stock_grams: 1000,
  129 |               daily_grams: 200,
  130 |               meals_per_day: 2,
  131 |               target_species: 'dog',
  132 |               target_age_group: 'kitten'
  133 |             }
  134 |           }
  135 |         })
  136 |       });
  137 |     });
  138 | 
  139 |     await page.goto('/owner/scanner');
  140 |     await page.waitForLoadState('networkidle');
  141 | 
  142 |     const fileInput = page.locator('input[type="file"]').first();
  143 |     await fileInput.setInputFiles({
  144 |       name: 'test_food.png',
  145 |       mimeType: 'image/png',
  146 |       buffer: Buffer.from('fake-image-content')
  147 |     });
  148 | 
  149 |     // Görseli ayarlama ekranının geldiğini kontrol edelim
  150 |     await expect(page.locator('h3:has-text("Görseli Ayarlayın")').first()).toBeVisible({ timeout: 5_000 });
  151 |     
  152 |     // Kırp ve Tara butonuna basalım
  153 |     const cropBtn = page.locator('button:has-text("Kırp ve Tara")').first();
  154 |     await expect(cropBtn).toBeVisible();
  155 |     await cropBtn.click();
  156 | 
  157 |     // Tarama sonuçları onay sayfasını bekleyelim
  158 |     await expect(page.locator('h2:has-text("Tarama Sonuçları")').first()).toBeVisible({ timeout: 10_000 });
  159 | 
  160 |     // Mama bitiş tarihi tahmini hesaplamasının yapıldığını kontrol edelim
  161 |     // Toplam stok = 3000 + 1000 = 4000g. Günlük tüketim = 200g. Gün sayısı = 20 gün.
  162 |     await expect(page.locator('text=20 gün').first()).toBeVisible();
  163 | 
  164 |     // Yaş grubu Yavru olarak gelmeli
  165 |     const ageSelect = page.locator('select').nth(1);
  166 |     await expect(ageSelect).toHaveValue('kitten');
  167 |   });
  168 | });
  169 | 
```
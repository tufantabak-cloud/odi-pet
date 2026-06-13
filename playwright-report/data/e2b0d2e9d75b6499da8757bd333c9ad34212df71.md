# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: authenticated_flow.spec.ts >> Treatment Tracking Module >> "Yeni Tedavi" modal opens and validates empty form
- Location: e2e\authenticated_flow.spec.ts:106:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Yeni Tedavi Kaydı, text=Tedaviyi Düzenle').first()
Expected: visible
Timeout: 6000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 6000ms
  - waiting for locator('text=Yeni Tedavi Kaydı, text=Tedaviyi Düzenle').first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
          - link "Sağlık Geçmişi'ne Dön" [ref=e54] [cursor=pointer]:
            - /url: /owner/pets/a605bdcc-2b25-4751-beaa-40ef5f283abc
            - img [ref=e55]
            - text: Sağlık Geçmişi'ne Dön
          - generic [ref=e57]:
            - generic [ref=e60]:
              - generic [ref=e61]:
                - generic [ref=e62]:
                  - generic [ref=e63]: 🩺
                  - heading "Tedavi Sürecini Yönet" [level=4] [ref=e64]
                - button [ref=e65]:
                  - img [ref=e66]
              - paragraph [ref=e69]: Hastalık süreçlerini, ilaç alım saatlerini ve veteriner faturalarını buradan tek seferde takip et.
              - button "Anladım" [ref=e71]
            - generic [ref=e72]:
              - img [ref=e74]
              - generic [ref=e78]:
                - heading "Tedavi Takip Modülü" [level=1] [ref=e79]
                - paragraph [ref=e80]: Odi için hastalık, randevu ve ödeme geçmişi
            - button "+ Yeni Tedavi" [active] [ref=e81] [cursor=pointer]:
              - generic [ref=e82]: +
              - text: Yeni Tedavi
          - generic [ref=e83]:
            - img [ref=e85]
            - heading "Henüz tedavi kaydı yok" [level=3] [ref=e92]
            - paragraph [ref=e93]: Petinizin aşı, ilaç ve tedavi geçmişini buradan takip edebilirsiniz.
            - button "İlk Kaydı Oluştur" [ref=e95] [cursor=pointer]
          - generic [ref=e97]:
            - generic [ref=e98]:
              - generic [ref=e99]:
                - heading "Yeni Tedavi Kaydı" [level=2] [ref=e100]
                - paragraph [ref=e101]: Odi - Süreç Takibi
              - button "✕" [ref=e102]
            - generic [ref=e103]:
              - button "İlaç veya Aşı Ambalajını Tara" [ref=e104]:
                - img [ref=e105]
                - text: İlaç veya Aşı Ambalajını Tara
              - generic [ref=e108]:
                - generic [ref=e109]:
                  - generic [ref=e110]:
                    - generic [ref=e111]: Hastalık / Tanı Adı
                    - combobox [ref=e112]:
                      - option "Lütfen seçin..." [disabled] [selected]
                      - option "Rutin Check-up"
                      - option "Aşı Uygulaması"
                      - option "İç/Dış Parazit Uygulaması"
                      - option "Kısırlaştırma (Operasyon)"
                      - option "Kulak Enfeksiyonu (Otitis)"
                      - option "Göz Enfeksiyonu (Konjonktivit)"
                      - option "Mide/Bağırsak Problemi (İshal/Kusma)"
                      - option "Solunum Yolu Enfeksiyonu"
                      - option "Deri Problemi (Alerji/Mantar/Uyuz)"
                      - option "İdrar Yolu Enfeksiyonu"
                      - option "Ortopedik Sorun (Kırık/Çıkık/İncinme)"
                      - option "Zehirlenme"
                      - option "Ağız ve Diş Sağlığı"
                      - option "Yaralanma / Travma"
                      - option "Diğer (Lütfen Yazınız)"
                  - generic [ref=e113]:
                    - generic [ref=e114]: Kategori
                    - combobox [ref=e115]:
                      - option "Rutin Kontrol" [selected]
                      - option "Acil"
                      - option "Kronik Hastalık"
                      - option "Ameliyat"
                - generic [ref=e116]:
                  - generic [ref=e117]:
                    - generic [ref=e118]: Başlangıç Tarihi
                    - textbox [ref=e119]: 2026-06-11
                  - generic [ref=e120]:
                    - generic [ref=e121]: Bitiş Tarihi (Opsiyonel)
                    - textbox [ref=e122]
                - generic [ref=e123]:
                  - generic [ref=e124]:
                    - generic [ref=e125]: Durum
                    - combobox [ref=e126]:
                      - option "⏳ Devam Ediyor" [selected]
                      - option "✅ Tamamlandı"
                      - option "❌ İptal Edildi"
                  - generic [ref=e127]:
                    - generic [ref=e128]: Hizmet Noktası (Klinik)
                    - textbox "Klinik veya hekim adı" [ref=e129]
                - button "İleri (Detaylar)" [ref=e131] [cursor=pointer]
  - alert [ref=e132]
```

# Test source

```ts
  20  | // SOS Module
  21  | // ---------------------------------------------------------------------------
  22  | 
  23  | test.describe('SOS Emergency Contacts', () => {
  24  |   test.beforeEach(async ({ page }) => {
  25  |     await login(page);
  26  |   });
  27  | 
  28  |   test('Family/SOS tab is reachable on edit pet page', async ({ page }) => {
  29  |     if (!PET_ID) {
  30  |       test.skip(true, 'TEST_PET_ID not set.');
  31  |       return;
  32  |     }
  33  |     await page.goto(`/owner/pets/${PET_ID}/edit`);
  34  |     await page.waitForLoadState('networkidle');
  35  | 
  36  |     // Click on "Acil Durum (SOS)" tab
  37  |     const familyTab = page
  38  |       .locator('button:has-text("Acil Durum")')
  39  |       .first();
  40  |     if (await familyTab.isVisible()) {
  41  |       await familyTab.click();
  42  |       // SOS contact form or list should now be visible
  43  |       await expect(
  44  |         page.locator('text=Acil Durum (SOS) Ağı').first()
  45  |       ).toBeVisible({ timeout: 8_000 });
  46  |     }
  47  |   });
  48  | 
  49  |   test('Can fill and save an SOS contact', async ({ page }) => {
  50  |     if (!PET_ID) {
  51  |       test.skip(true, 'TEST_PET_ID not set.');
  52  |       return;
  53  |     }
  54  |     await page.goto(`/owner/pets/${PET_ID}/edit?tab=sos`);
  55  |     await page.waitForLoadState('networkidle');
  56  | 
  57  |     const familyTab = page
  58  |       .locator('button:has-text("Acil Durum")')
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
  117 |       // Modal should open
  118 |       await expect(
  119 |         page.locator('text=Yeni Tedavi Kaydı, text=Tedaviyi Düzenle').first()
> 120 |       ).toBeVisible({ timeout: 6_000 });
      |         ^ Error: expect(locator).toBeVisible() failed
  121 | 
  122 |       // Try to submit empty form – HTML5 validation should block it
  123 |       const submitBtn = page.locator('button[type="submit"]:has-text("Kaydet")').first();
  124 |       if (await submitBtn.isVisible()) {
  125 |         await submitBtn.click();
  126 |         // Form should still be open (validation prevented submit)
  127 |         await expect(
  128 |           page.locator('text=Yeni Tedavi Kaydı, text=Tedaviyi Düzenle').first()
  129 |         ).toBeVisible({ timeout: 3_000 });
  130 |       }
  131 |     }
  132 |   });
  133 | });
  134 | 
```
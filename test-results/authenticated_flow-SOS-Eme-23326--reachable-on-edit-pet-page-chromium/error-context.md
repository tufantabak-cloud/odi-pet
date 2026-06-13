# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: authenticated_flow.spec.ts >> SOS Emergency Contacts >> Family/SOS tab is reachable on edit pet page
- Location: e2e\authenticated_flow.spec.ts:28:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Acil Durum (SOS) Ağı').first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('text=Acil Durum (SOS) Ağı').first()

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
        - generic [ref=e54]:
          - generic [ref=e55]:
            - button [ref=e56]:
              - img [ref=e57]
            - generic [ref=e59]:
              - heading "Odi Profil Ayarları" [level=1] [ref=e60]
              - paragraph [ref=e61]: Bilgileri güncelleyip aşağıdan kaydedin.
          - generic [ref=e62]:
            - generic [ref=e63]:
              - heading "1. Temel Kimlik ve Fotoğraf" [level=2] [ref=e64]
              - generic [ref=e65]:
                - img "Önizleme" [ref=e67]
                - generic [ref=e68] [cursor=pointer]:
                  - text: Fotoğrafı Değiştir
                  - button "Fotoğrafı Değiştir" [ref=e69]
              - generic [ref=e70]:
                - generic [ref=e71]:
                  - generic [ref=e72]: İsim *
                  - textbox [ref=e73]: Odi
                - generic [ref=e74]:
                  - generic [ref=e75]: Irk *
                  - combobox [ref=e76]:
                    - option "Irk seçin" [disabled]
                    - option "Golden Retriever"
                    - option "Labrador Retriever"
                    - option "Alman Çoban Köpeği"
                    - option "French Bulldog"
                    - option "Bulldog"
                    - option "Poodle (Kaniş)" [selected]
                    - option "Beagle"
                    - option "Rottweiler"
                    - option "Husky"
                    - option "Dachshund (Sosis)"
                    - option "Chihuahua"
                    - option "Shih Tzu"
                    - option "Border Collie"
                    - option "Cocker Spaniel"
                    - option "Maltese"
                    - option "Pomeranian"
                    - option "Kangal"
                    - option "Akbaş"
                    - option "Diğer"
                - generic [ref=e77]:
                  - generic [ref=e78]: Cinsiyet
                  - generic [ref=e79]:
                    - generic [ref=e80] [cursor=pointer]:
                      - radio "♂ Erkek" [checked] [ref=e81]
                      - text: ♂ Erkek
                    - generic [ref=e82] [cursor=pointer]:
                      - radio "♀ Dişi" [ref=e83]
                      - text: ♀ Dişi
                - generic [ref=e84]:
                  - generic [ref=e85]:
                    - generic [ref=e86]: Doğum Tarihi / Yaş
                    - paragraph [ref=e87]: Tam doğum tarihini seçebilir veya yaklaşık yaşını girebilirsiniz.
                  - generic [ref=e88]:
                    - button "Tam Tarih" [ref=e89]: Tam Tarih
                    - button "Yaklaşık Yaş" [ref=e91]
                  - textbox [ref=e93]: 2022-02-08
                  - generic [ref=e94]:
                    - generic [ref=e95]: ✨
                    - generic [ref=e96]:
                      - text: "Hesaplanan Yaş:"
                      - strong [ref=e97]: 4 yaşında 4 aylık 3 günlük
                      - text: (Yetişkin)
                - generic [ref=e98]:
                  - generic [ref=e99]: Kilo (kg) *
                  - generic [ref=e100]:
                    - button "—" [ref=e101]
                    - generic [ref=e102]:
                      - spinbutton [ref=e103]
                      - generic: kg
                    - button "+" [ref=e104]
                - generic [ref=e105]:
                  - generic [ref=e106]: Boy (cm) *
                  - generic [ref=e107]:
                    - button "—" [ref=e108]
                    - generic [ref=e109]:
                      - spinbutton [ref=e110]
                      - generic: cm
                    - button "+" [ref=e111]
                - generic [ref=e112]:
                  - generic [ref=e113]: Otomatik Hesaplanan Beden Büyüklüğü
                  - generic [ref=e114]:
                    - generic [ref=e115]: Köpek Boyut Skalası (Küçük Irk)
                    - generic [ref=e116]:
                      - generic [ref=e117]: Kilo Girilmelidir
                      - button "Kilitlenmemiş" [ref=e118]:
                        - img [ref=e119]
                        - text: Kilitlenmemiş
            - generic [ref=e122]:
              - heading "2. Fiziksel ve Yaşam Alanı" [level=2] [ref=e123]
              - generic [ref=e124]:
                - generic [ref=e125]:
                  - generic [ref=e126]: Renk / Desen
                  - combobox [ref=e127]:
                    - option "Seçin (opsiyonel)"
                    - option "Siyah"
                    - option "Beyaz"
                    - option "Kahverengi"
                    - option "Altın Sarısı"
                    - option "Krem" [selected]
                    - option "Gri"
                    - option "Siyah-Beyaz"
                    - option "Üç Renkli"
                    - option "Diğer"
                - generic [ref=e128]:
                  - generic [ref=e129]: Şehir
                  - combobox [ref=e130]:
                    - option "Şehir seçin (opsiyonel)"
                    - option "Adana"
                    - option "Adıyaman"
                    - option "Afyonkarahisar"
                    - option "Ağrı"
                    - option "Aksaray"
                    - option "Amasya"
                    - option "Ankara"
                    - option "Antalya"
                    - option "Ardahan"
                    - option "Artvin"
                    - option "Aydın"
                    - option "Balıkesir"
                    - option "Bartın"
                    - option "Batman"
                    - option "Bayburt"
                    - option "Bilecik"
                    - option "Bingöl"
                    - option "Bitlis"
                    - option "Bolu"
                    - option "Burdur"
                    - option "Bursa"
                    - option "Çanakkale"
                    - option "Çankırı"
                    - option "Çorum"
                    - option "Denizli"
                    - option "Diyarbakır"
                    - option "Düzce"
                    - option "Edirne"
                    - option "Elazığ"
                    - option "Erzincan"
                    - option "Erzurum"
                    - option "Eskişehir"
                    - option "Gaziantep"
                    - option "Giresun"
                    - option "Gümüşhane"
                    - option "Hakkari"
                    - option "Hatay"
                    - option "Iğdır"
                    - option "Isparta"
                    - option "İstanbul"
                    - option "İzmir" [selected]
                    - option "Kahramanmaraş"
                    - option "Karabük"
                    - option "Karaman"
                    - option "Kars"
                    - option "Kastamonu"
                    - option "Kayseri"
                    - option "Kırıkkale"
                    - option "Kırklareli"
                    - option "Kırşehir"
                    - option "Kilis"
                    - option "Kocaeli"
                    - option "Konya"
                    - option "Kütahya"
                    - option "Malatya"
                    - option "Manisa"
                    - option "Mardin"
                    - option "Mersin"
                    - option "Muğla"
                    - option "Muş"
                    - option "Nevşehir"
                    - option "Niğde"
                    - option "Ordu"
                    - option "Osmaniye"
                    - option "Rize"
                    - option "Sakarya"
                    - option "Samsun"
                    - option "Siirt"
                    - option "Sinop"
                    - option "Sivas"
                    - option "Şanlıurfa"
                    - option "Şırnak"
                    - option "Tekirdağ"
                    - option "Tokat"
                    - option "Trabzon"
                    - option "Tunceli"
                    - option "Uşak"
                    - option "Van"
                    - option "Yalova"
                    - option "Yozgat"
                    - option "Zonguldak"
                - generic [ref=e131]:
                  - generic [ref=e132]: İlçe
                  - combobox [ref=e133]:
                    - option "İlçe seçin (opsiyonel)" [selected]
                    - option "Aliağa"
                    - option "Balçova"
                    - option "Bayındır"
                    - option "Bayraklı"
                    - option "Bergama"
                    - option "Beydağ"
                    - option "Bornova"
                    - option "Buca"
                    - option "Çeşme"
                    - option "Çiğli"
                    - option "Dikili"
                    - option "Foça"
                    - option "Gaziemir"
                    - option "Güzelbahçe"
                    - option "Karabağlar"
                    - option "Karaburun"
                    - option "Karşıyaka"
                    - option "Kemalpaşa"
                    - option "Kınık"
                    - option "Kiraz"
                    - option "Konak"
                    - option "Menderes"
                    - option "Menemen"
                    - option "Narlıdere"
                    - option "Ödemiş"
                    - option "Seferihisar"
                    - option "Selçuk"
                    - option "Tire"
                    - option "Torbalı"
                    - option "Urla"
                - generic [ref=e134]:
                  - generic [ref=e135]: Kısırlaştırma Durumu
                  - generic [ref=e136]:
                    - button "✂️ Kısırlaştırıldı" [ref=e137] [cursor=pointer]
                    - button "❤️ Kısırlaştırılmadı" [ref=e138] [cursor=pointer]
            - generic [ref=e139]:
              - heading "3. Evrak & Veteriner Bilgisi Pasaport veya Belgeyi Tara" [level=2] [ref=e140]:
                - generic [ref=e141]: 3. Evrak & Veteriner Bilgisi
                - button "Pasaport veya Belgeyi Tara" [ref=e142]:
                  - img [ref=e143]
                  - text: Pasaport veya Belgeyi Tara
              - generic [ref=e146]:
                - generic [ref=e147]:
                  - generic [ref=e148]: Mikroçip No
                  - textbox "15 haneli no" [ref=e150]
                - generic [ref=e151]:
                  - generic [ref=e152]: Pasaport No
                  - textbox [ref=e153]
                - generic [ref=e154]:
                  - generic [ref=e155]: Klinik / Şirket Adı
                  - 'textbox "Örn: Pati Veteriner Kliniği" [ref=e156]': Albatros Veteriner Kliniği
                - generic [ref=e157]:
                  - generic [ref=e158]: Veteriner Adı
                  - 'textbox "Örn: Dr. Ali Yılmaz" [ref=e159]': Mustafa
                - generic [ref=e160]:
                  - generic [ref=e161]: Veteriner Telefonu
                  - textbox "05xx xxx xx xx" [ref=e162]: "05423694718"
                - generic [ref=e163]:
                  - generic [ref=e164]: Veteriner E-posta
                  - textbox "klinik@email.com" [ref=e165]
            - generic [ref=e166]:
              - heading "4. Acil Durum Ağı" [level=2] [ref=e167]
              - paragraph [ref=e168]: Evcil dostunuza bir şey olursa aranacak kişiler.
              - generic [ref=e169]: Acil durum ağı güncellendi.
              - generic [ref=e170]:
                - paragraph [ref=e171]: Kişi 1 (Birincil)
                - generic [ref=e172]:
                  - generic [ref=e173]:
                    - generic [ref=e174]: Ad Soyad
                    - 'textbox "Örn: Ali Yılmaz" [ref=e175]'
                  - generic [ref=e176]:
                    - generic [ref=e177]: Telefon
                    - textbox "05XX XXX XX XX" [ref=e178]
                  - generic [ref=e179]:
                    - generic [ref=e180]: Yakınlık
                    - 'textbox "Örn: Eşi, Komşusu" [ref=e181]'
              - generic [ref=e182]:
                - paragraph [ref=e183]: Kişi 2 (Yedek Bağlantı)
                - generic [ref=e184]:
                  - generic [ref=e185]:
                    - generic [ref=e186]: Ad Soyad
                    - 'textbox "Örn: Ali Yılmaz" [ref=e187]'
                  - generic [ref=e188]:
                    - generic [ref=e189]: Telefon
                    - textbox "05XX XXX XX XX" [ref=e190]
                  - generic [ref=e191]:
                    - generic [ref=e192]: Yakınlık
                    - 'textbox "Örn: Eşi, Komşusu" [ref=e193]'
              - button "🆘 Acil Durum Ăĵını Kaydet" [ref=e194] [cursor=pointer]
            - button "Değişiklikleri Kaydet" [ref=e196] [cursor=pointer]
  - alert [ref=e197]
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
  19  | // ---------------------------------------------------------------------------
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
> 45  |       ).toBeVisible({ timeout: 8_000 });
      |         ^ Error: expect(locator).toBeVisible() failed
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
  120 |       ).toBeVisible({ timeout: 6_000 });
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
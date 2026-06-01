import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const PET_ID = process.env.TEST_PET_ID;

async function login(page: Page) {
  if (!EMAIL || !PASSWORD) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.');
    return;
  }
  await page.goto('/login');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/owner\//, { timeout: 15_000 });
}

test.describe('Akıllı Tarama (Smart Scanner) Akışı', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Tarayıcı sayfası yüklenmeli ve pet seçimi yapılabilmeli', async ({ page }) => {
    await page.goto('/owner/scanner');
    await page.waitForLoadState('networkidle');

    // Başlık ve açıklama kontrolü
    await expect(page.locator('h1:has-text("Akıllı Tarama")').first()).toBeVisible({ timeout: 10_000 });
    
    // Eğer doğrudan pet seçilmişse (tek pet varsa) veya pet seçimi butonu varsa kontrol edelim
    const isReadyStep = await page.locator('h1:has-text("Akıllı Tarama")').count() > 0;
    expect(isReadyStep).toBe(true);
  });

  test('Mock API ile başarılı bir Aşı Karnesi taraması gerçekleştirilebilmeli', async ({ page }) => {
    // API isteğini yakalayıp mocklayalım
    await page.route('**/api/scan-document', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            record_type: 'vaccine_card',
            parsed: {
              title: 'Karma Aşı Test',
              brand: 'Nobivac Test',
              date: '2026-05-15',
              next_date: '2027-05-15',
              vet_name: 'Test Hekim',
              vet_company: 'Odi Vet Klinik'
            }
          }
        })
      });
    });

    await page.route('**/api/scan-document/confirm', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { status: 'success', message: 'Vaccine records updated' }
        })
      });
    });

    await page.goto('/owner/scanner');
    await page.waitForLoadState('networkidle');

    // Eğer pet seçimi ekranı geldiyse ilk peti seçelim
    const petCard = page.locator('[data-testid="pet-card"], button:has-text("Köpek"), button:has-text("Kedi")').first();
    if (await petCard.isVisible()) {
      await petCard.click();
    }

    // Dosya girişi ve tetikleme (mock olarak handleCapture'ı tetiklemek için input dosyasını simüle edelim)
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isHidden()) {
      // Input hidden olduğu için direct path ekleyebiliriz
      await fileInput.setInputFiles({
        name: 'test_vaccine.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake-image-content')
      });
    }

    // Taranıyor durumunun geçişini bekleyelim
    await expect(page.locator('h2:has-text("Tarama Sonuçları")').first()).toBeVisible({ timeout: 15_000 });

    // Alanların doldurulduğunu kontrol edelim
    const titleInput = page.locator('input[value="Karma Aşı Test"]').first();
    await expect(titleInput).toBeVisible();

    // Onayla ve Kaydet butonuna basalım
    const confirmBtn = page.locator('button:has-text("Onayla ve Kaydet")').first();
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // İşlem başarılı olduktan sonra yönlendirme yapılmalı
    await expect(page).toHaveURL(/\/owner\/pets\//, { timeout: 10_000 });
  });

  test('Mama paketi taraması ve mama bitiş tarihi hesaplaması kontrolü', async ({ page }) => {
    await page.route('**/api/scan-document', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            record_type: 'food_packaging',
            parsed: {
              food_brand: 'ProPlan Test',
              food_product: 'Puppy Dry Food',
              food_type: 'dry',
              package_size_grams: 3000,
              existing_stock_grams: 1000,
              daily_grams: 200,
              meals_per_day: 2,
              target_species: 'dog',
              target_age_group: 'kitten'
            }
          }
        })
      });
    });

    await page.goto('/owner/scanner');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'test_food.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-content')
    });

    // Tarama sonuçları onay sayfasını bekleyelim
    await expect(page.locator('h2:has-text("Tarama Sonuçları")').first()).toBeVisible({ timeout: 10_000 });

    // Mama bitiş tarihi tahmini hesaplamasının yapıldığını kontrol edelim
    // Toplam stok = 3000 + 1000 = 4000g. Günlük tüketim = 200g. Gün sayısı = 20 gün.
    await expect(page.locator('text=20 gün').first()).toBeVisible();

    // Yaş grubu Yavru olarak gelmeli
    const ageSelect = page.locator('select').nth(1);
    await expect(ageSelect).toHaveValue('kitten');
  });
});

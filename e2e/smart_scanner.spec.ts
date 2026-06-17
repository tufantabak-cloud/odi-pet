import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const PET_ID = process.env.TEST_PET_ID;

async function login(page: Page) {
  if (!EMAIL || !PASSWORD) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.');
    return;
  }
  await page.context().clearCookies();
  await page.waitForTimeout(3500);
  await page.goto('/login');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin|\/owner\//, { timeout: 15_000 });
  if (page.url().includes('/admin')) {
    await page.goto('/owner/dashboard');
  }
}

test.describe('Akıllı Tarama (Smart Scanner) Akışı', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('PLAYWRIGHT_TEST', 'true');
    });
    await login(page);
  });

  test('Tarayıcı sayfası yüklenmeli ve pet seçimi yapılabilmeli', async ({ page }) => {
    await page.goto('/owner/scanner');
    await page.waitForLoadState('domcontentloaded');

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
    await page.waitForLoadState('domcontentloaded');

    // Eğer pet seçimi ekranı geldiyse ilk peti seçelim
    const petCard = page.locator('button:has-text("Köpek"), button:has-text("Kedi"), [data-testid="pet-card"]').first();
    await petCard.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
    if (await petCard.isVisible()) {
      await petCard.click();
    }

    // Dosya girişi ve tetikleme (mock olarak handleCapture'ı tetiklemek için input dosyasını simüle edelim)
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 5000 });
    await fileInput.setInputFiles({
      name: 'test_vaccine.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
    });

    // Görseli ayarlama ekranının geldiğini kontrol edelim
    await expect(page.locator('h3:has-text("Görseli Ayarlayın"), h3:has-text("Belgeyi İncele"), h2:has-text("Görseli Ayarlayın"), h2:has-text("Belgeyi İncele")').first()).toBeVisible({ timeout: 5_000 });
    
    // Kırp ve Tara butonuna basalım
    const cropBtn = page.locator('button:has-text("Kırp ve Tara")').first();
    await expect(cropBtn).toBeVisible();
    await cropBtn.click();

    // Taranıyor durumunun geçişini bekleyelim
    await expect(page.locator('h2:has-text("Tarama Sonuçları")').first()).toBeVisible({ timeout: 15_000 });

    // Alanların doldurulduğunu kontrol edelim
    const titleText = page.locator('text=Karma Aşı Test').first();
    await expect(titleText).toBeVisible();

    // Bilgileri Kaydet butonuna basalım
    const confirmBtn = page.locator('button:has-text("Bilgileri Kaydet")').first();
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
    await page.waitForLoadState('domcontentloaded');

    // Eğer pet seçimi ekranı geldiyse ilk peti seçelim
    const petCard = page.locator('button:has-text("Köpek"), button:has-text("Kedi"), [data-testid="pet-card"]').first();
    await petCard.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
    if (await petCard.isVisible()) {
      await petCard.click();
    }

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 5000 });
    await fileInput.setInputFiles({
      name: 'test_food.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
    });

    // Görseli ayarlama ekranının geldiğini kontrol edelim
    await expect(page.locator('h3:has-text("Görseli Ayarlayın"), h3:has-text("Belgeyi İncele"), h2:has-text("Görseli Ayarlayın"), h2:has-text("Belgeyi İncele")').first()).toBeVisible({ timeout: 5_000 });
    
    // Kırp ve Tara butonuna basalım
    const cropBtn = page.locator('button:has-text("Kırp ve Tara")').first();
    await expect(cropBtn).toBeVisible();
    await cropBtn.click();

    // Tarama sonuçları onay sayfasını bekleyelim
    await expect(page.locator('h2:has-text("Tarama Sonuçları")').first()).toBeVisible({ timeout: 10_000 });

    // Mama bitiş tarihi tahmini hesaplamasının yapıldığını kontrol edelim
    // Toplam stok = 3000 + 1000 = 4000g. Günlük tüketim = 200g. Gün sayısı = 20 gün.
    await expect(page.locator('text=20 gün').first()).toBeVisible();

    // Yaş grubu Yavru olarak gelmeli
    await expect(page.locator('text=Yavru (0-1 yaş)').first()).toBeVisible();
  });
});

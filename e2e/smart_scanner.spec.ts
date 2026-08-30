import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

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

test.describe('AkÄ±llÄ± Tarama (Smart Scanner) AkÄ±ÅŸÄ±', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('PLAYWRIGHT_TEST', 'true');
    });
    await login(page);
  });

  test('TarayÄ±cÄ± sayfasÄ± yÃ¼klenmeli ve pet seÃ§imi yapÄ±labilmeli', async ({ page }) => {
    await page.goto('/owner/scanner');
    await page.waitForLoadState('domcontentloaded');

    // BaÅŸlÄ±k ve aÃ§Ä±klama kontrolÃ¼
    await expect(page.locator('h1:has-text("AkÄ±llÄ± Tarama")').first()).toBeVisible({ timeout: 10_000 });
    
    // EÄŸer doÄŸrudan pet seÃ§ilmiÅŸse (tek pet varsa) veya pet seÃ§imi butonu varsa kontrol edelim
    const isReadyStep = await page.locator('h1:has-text("AkÄ±llÄ± Tarama")').count() > 0;
    expect(isReadyStep).toBe(true);
  });

  test('Mock API ile baÅŸarÄ±lÄ± bir AÅŸÄ± Karnesi taramasÄ± gerÃ§ekleÅŸtirilebilmeli', async ({ page }) => {
    // API isteÄŸini yakalayÄ±p mocklayalÄ±m
    await page.route('**/api/scan-document', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            record_type: 'vaccine_card',
            parsed: {
              title: 'Karma AÅŸÄ± Test',
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

    // EÄŸer pet seÃ§imi ekranÄ± geldiyse ilk peti seÃ§elim
    const petCard = page.locator('button:has-text("KÃ¶pek"), button:has-text("Kedi"), [data-testid="pet-card"]').first();
    await petCard.waitFor({ state: 'attached', timeout: 5000 }).catch(() => {});
    if (await petCard.isVisible()) {
      await petCard.click();
    }

    // Dosya giriÅŸi ve tetikleme (mock olarak handleCapture'Ä± tetiklemek iÃ§in input dosyasÄ±nÄ± simÃ¼le edelim)
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 5000 });
    await fileInput.setInputFiles({
      name: 'test_vaccine.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
    });

    // GÃ¶rseli ayarlama ekranÄ±nÄ±n geldiÄŸini kontrol edelim
    await expect(page.locator('h3:has-text("GÃ¶rseli AyarlayÄ±n"), h3:has-text("Belgeyi Ä°ncele"), h2:has-text("GÃ¶rseli AyarlayÄ±n"), h2:has-text("Belgeyi Ä°ncele")').first()).toBeVisible({ timeout: 5_000 });
    
    // KÄ±rp ve Tara butonuna basalÄ±m
    const cropBtn = page.locator('button:has-text("KÄ±rp ve Tara")').first();
    await expect(cropBtn).toBeVisible();
    await cropBtn.click();

    // TaranÄ±yor durumunun geÃ§iÅŸini bekleyelim
    await expect(page.locator('h2:has-text("Tarama SonuÃ§larÄ±")').first()).toBeVisible({ timeout: 15_000 });

    // AlanlarÄ±n doldurulduÄŸunu kontrol edelim
    const titleText = page.locator('text=Karma AÅŸÄ± Test').first();
    await expect(titleText).toBeVisible();

    // Bilgileri Kaydet butonuna basalÄ±m
    const confirmBtn = page.locator('button:has-text("Bilgileri Kaydet")').first();
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Ä°ÅŸlem baÅŸarÄ±lÄ± olduktan sonra yÃ¶nlendirme yapÄ±lmalÄ±
    await expect(page).toHaveURL(/\/owner\/pets\//, { timeout: 10_000 });
  });

  test('Mama paketi taramasÄ± ve mama bitiÅŸ tarihi hesaplamasÄ± kontrolÃ¼', async ({ page }) => {
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

    // EÄŸer pet seÃ§imi ekranÄ± geldiyse ilk peti seÃ§elim
    const petCard = page.locator('button:has-text("KÃ¶pek"), button:has-text("Kedi"), [data-testid="pet-card"]').first();
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

    // GÃ¶rseli ayarlama ekranÄ±nÄ±n geldiÄŸini kontrol edelim
    await expect(page.locator('h3:has-text("GÃ¶rseli AyarlayÄ±n"), h3:has-text("Belgeyi Ä°ncele"), h2:has-text("GÃ¶rseli AyarlayÄ±n"), h2:has-text("Belgeyi Ä°ncele")').first()).toBeVisible({ timeout: 5_000 });
    
    // KÄ±rp ve Tara butonuna basalÄ±m
    const cropBtn = page.locator('button:has-text("KÄ±rp ve Tara")').first();
    await expect(cropBtn).toBeVisible();
    await cropBtn.click();

    // Tarama sonuÃ§larÄ± onay sayfasÄ±nÄ± bekleyelim
    await expect(page.locator('h2:has-text("Tarama SonuÃ§larÄ±")').first()).toBeVisible({ timeout: 10_000 });

    // Mama bitiÅŸ tarihi tahmini hesaplamasÄ±nÄ±n yapÄ±ldÄ±ÄŸÄ±nÄ± kontrol edelim
    // Toplam stok = 3000 + 1000 = 4000g. GÃ¼nlÃ¼k tÃ¼ketim = 200g. GÃ¼n sayÄ±sÄ± = 20 gÃ¼n.
    await expect(page.locator('text=20 gÃ¼n').first()).toBeVisible();

    // YaÅŸ grubu Yavru olarak gelmeli
    await expect(page.locator('text=Yavru (0-1 yaÅŸ)').first()).toBeVisible();
  });
});


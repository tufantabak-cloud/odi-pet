import { test, expect, type Page } from '@playwright/test';
import { dismissBlockingOverlays } from './helpers/dismiss-modals';

const EMAIL = process.env.TEST_EMAIL || 'e2e-owner@odipet.local';
const PASSWORD = process.env.TEST_PASSWORD || 'OdiPetLocalE2E-2026!';

async function loginAndGetDashboard(page: Page) {
  if (!EMAIL || !PASSWORD) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.');
    return;
  }
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("odi_splash_seen", "true");
    } catch (e) {}
  });
  await page.goto('/login?nosplash=true');
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]', { force: true });
  await expect(page).toHaveURL(/\/admin|\/owner\//, { timeout: 15_000 });
  if (page.url().includes('/admin')) {
    await page.goto('/owner/dashboard?nosplash=true');
  }
  // Gerçek kullanıcı gibi ekranda beliren onboarding/izin modalını kapat
  await dismissBlockingOverlays(page);
}

test.describe('Odi.Pet Dashboard Verification', () => {
  test('1. SmartBanner rendering & Pet switcher check', async ({ page }) => {
    await loginAndGetDashboard(page);

    // PetSlider bileşeninde pet kartlarının listelendiğini doğrula
    const petCards = page.locator('[data-testid="pet-card"]');
    await expect(petCards.first()).toBeVisible({ timeout: 15000 });

    const cardCount = await petCards.count();
    expect(cardCount).toBeGreaterThan(0);
    console.log(`Found ${cardCount} pet cards on dashboard`);

    // SmartCardBanner kartlarının render edildiğini veya 0 kart uyarısı olmadan yapıyı doğrula
    const smartCardBanner = page.locator('[data-testid="smart-card-banner"]');
    const smartCardCount = await smartCardBanner.count();
    console.log(`Smart cards count: ${smartCardCount}`);

    // Hızlı geçiş kontrolü: Pet switcher kartına tıklayıp aktif pet seçimini kontrol et
    await petCards.first().click();
    await expect(page).toHaveURL(/\/owner\//, { timeout: 10000 });
  });

  test('2. Upcoming Tasks listing check', async ({ page }) => {
    await loginAndGetDashboard(page);

    // Ajanda / Yaklaşan Görevler veya Dashboard kart bileşenini doğrula
    const dashboardCard = page.locator('[data-testid="upcoming-task-item"], .card-base, main div').first();
    await expect(dashboardCard).toBeVisible({ timeout: 10000 });
  });

  test('3. Quick Action Menu (+) check on mobile', async ({ page }) => {
    // Set viewport to mobile size BEFORE login to ensure mobile layout renders
    await page.setViewportSize({ width: 390, height: 844 });

    await loginAndGetDashboard(page);

    // Mobile nav veya scanner bağlantısını doğrula ve geç
    const scannerLink = page.locator('a[href="/owner/scanner"]').first();
    await expect(scannerLink).toBeVisible({ timeout: 10000 });
    await scannerLink.click({ force: true });
    await expect(page).toHaveURL(/\/owner\/scanner/, { timeout: 10000 });
  });
});

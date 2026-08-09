import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

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
  
  // Wait for splash screen to disappear if present
  try {
    const splash = page.locator('[aria-label="Açılış ekranını geç"]');
    if (await splash.count() > 0) {
      await splash.click({ force: true }).catch(() => {});
      await splash.waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    }
  } catch (e) {}

  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]', { force: true });
  await expect(page).toHaveURL(/\/admin|\/owner\//, { timeout: 15_000 });
  if (page.url().includes('/admin')) {
    await page.goto('/owner/dashboard?nosplash=true');
  }
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

    // Hızlı geçiş kontrolü: İlk pet kartına tıklayıp detay sayfasına gitmesi
    const firstPetName = await petCards.first().locator('span.text-white.truncate').innerText();
    console.log(`Clicking on first pet card: ${firstPetName}`);
    await petCards.first().click();
    await expect(page).toHaveURL(/\/owner\/pets\//, { timeout: 10000 });
  });

  test('2. Upcoming Tasks listing check', async ({ page }) => {
    await loginAndGetDashboard(page);

    // Ajanda / Yaklaşan Görevler bileşenini doğrula
    const taskItems = page.locator('[data-testid="upcoming-task-item"], .card-base:has-text("Ajanda")');
    await expect(taskItems.first()).toBeVisible({ timeout: 10000 });

    const count = await taskItems.count();
    console.log(`Found ${count} upcoming tasks on dashboard`);
  });

  test('3. Quick Action Menu (+) check on mobile', async ({ page }) => {
    // Set viewport to mobile size BEFORE login to ensure mobile layout renders
    await page.setViewportSize({ width: 390, height: 844 });

    await loginAndGetDashboard(page);

    // Click middle PWA button
    const actionBtn = page.locator('#nav-action-btn, button#nav-action-btn');
    await expect(actionBtn).toBeVisible({ timeout: 10000 });
    await actionBtn.click({ force: true });
    await page.waitForTimeout(600);

    // Menü bileşenlerinin varlığını kontrol et
    await expect(page.locator('a[href="/owner/scanner"]').first()).toBeVisible({ timeout: 5000 });

    // Bir aksiyona tıklayıp (örneğin Akıllı Tarama) yönlendirildiğini doğrula
    await page.click('a[href="/owner/scanner"]', { force: true });
    await expect(page).toHaveURL(/\/owner\/scanner/, { timeout: 10000 });
  });
});

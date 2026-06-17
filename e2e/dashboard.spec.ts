import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

async function loginAndGetDashboard(page: Page) {
  if (!EMAIL || !PASSWORD) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.');
    return;
  }
  await page.goto('/login');
  
  // Wait for splash screen to disappear if present
  try {
    await page.waitForSelector('img[alt="Splash 1"]', { state: 'detached', timeout: 8000 });
  } catch (e) {}

  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin|\/owner\//, { timeout: 15_000 });
  if (page.url().includes('/admin')) {
    await page.goto('/owner/dashboard');
  }
}

test.describe('Odi.Pet Dashboard Verification', () => {
  test('1. SmartBanner rendering & Pet switcher check', async ({ page }) => {
    await loginAndGetDashboard(page);

    // Smart Cards checking (Akıllı Öneriler / Smart Cards veya smart question card/smart insight card)
    // Eğer bir smart card veya smart banner var ise görüntülenecektir
    const smartInsight = page.locator('[data-testid="smart-insight-card"], [data-testid="smart-question-card"], .card-base:has-text("Öneri"), .card-base:has-text("Sıklık"), .card-base:has-text("Aşı")');
    console.log(`Smart cards count: ${await smartInsight.count()}`);

    // Pet Switcher check (Petlerim slider)
    await expect(page.locator('h2:has-text("Petlerim")')).toBeVisible();
    const petCards = page.locator('[data-testid="pet-card"]');
    const petCount = await petCards.count();
    expect(petCount).toBeGreaterThan(0);

    // Hızlı geçiş kontrolü: İlk pet kartına tıklayıp detay sayfasına gitmesi
    const firstPetName = await petCards.first().locator('p.truncate').innerText();
    console.log(`Clicking on first pet card: ${firstPetName}`);
    await petCards.first().click();
    await expect(page).toHaveURL(/\/owner\/pets\//, { timeout: 10000 });
  });

  test('2. Upcoming Tasks listing check', async ({ page }) => {
    await loginAndGetDashboard(page);

    // Yaklaşan Etkinlikler başlığı kontrolü
    await expect(page.locator('h2:has-text("Yaklaşan Etkinlikler")')).toBeVisible();

    // Yaklaşan görevler listesi kontrolü
    const taskLinks = page.locator('a[href*="/owner/pets/"]:has-text("günü kaldı"), a[href*="/owner/pets/"]:has-text("Bugün"), a[href*="/owner/pets/"]:has-text("Yarın")');
    const taskCount = await taskLinks.count();
    console.log(`Found ${taskCount} upcoming tasks on dashboard`);
  });

  test('3. Quick Action Menu (+) check on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 390, height: 844 });

    await loginAndGetDashboard(page);

    // Click middle PWA button (which is the only button in navigation, others are links)
    const actionBtn = page.locator('nav button');
    await expect(actionBtn).toBeVisible({ timeout: 10000 });
    await actionBtn.click();
    await page.waitForTimeout(600);

    // Menü bileşenlerinin varlığını kontrol et
    await expect(page.locator('button:has-text("Plan Yap")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Sağlık Kaydı / Aşı")')).toBeVisible();
    await expect(page.locator('button:has-text("Akıllı Tarama")')).toBeVisible();
    await expect(page.locator('button:has-text("Durum Kaydet")')).toBeVisible();

    // Bir aksiyona tıklayıp (örneğin Akıllı Tarama) yönlendirildiğini doğrula
    await page.click('button:has-text("Akıllı Tarama")');
    await expect(page).toHaveURL(/\/owner\/scanner/, { timeout: 10000 });
  });
});

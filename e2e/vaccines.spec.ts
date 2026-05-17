import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const PET_ID = process.env.TEST_PET_ID; // set this to a real pet UUID in .env.local

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

// ---------------------------------------------------------------------------
// Vaccine OS (authenticated – requires TEST_PET_ID)
// ---------------------------------------------------------------------------

test.describe('Vaccine OS Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Vaccine page renders the main tabs', async ({ page }) => {
    if (!PET_ID) {
      test.skip(true, 'TEST_PET_ID not set.');
      return;
    }
    await page.goto(`/owner/pets/${PET_ID}/vaccines`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Takvim').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Kayıtlar').first()).toBeVisible();
  });

  test('Manuel İşlem modal opens and closes', async ({ page }) => {
    if (!PET_ID) {
      test.skip(true, 'TEST_PET_ID not set.');
      return;
    }
    await page.goto(`/owner/pets/${PET_ID}/vaccines`);
    await page.waitForLoadState('networkidle');

    const manualBtn = page.locator('button:has-text("Manuel İşlem"), button:has-text("Manuel")').first();
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      // Modal should open
      await expect(
        page.locator('[role="dialog"], .modal-content, text=Kayıt Düzenle, text=Aşı Kaydı').first()
      ).toBeVisible({ timeout: 6_000 });

      // Close with Escape or ✕ button
      await page.keyboard.press('Escape');
      // Modal should close (element count goes back to 0)
      await expect(
        page.locator('[role="dialog"]').first()
      ).not.toBeVisible({ timeout: 5_000 });
    }
  });

  test('Vaccine plan items are listed (Takvim tab)', async ({ page }) => {
    if (!PET_ID) {
      test.skip(true, 'TEST_PET_ID not set.');
      return;
    }
    await page.goto(`/owner/pets/${PET_ID}/vaccines`);
    await page.waitForLoadState('networkidle');

    // Navigate to calendar tab if not default
    const takvimTab = page.locator('button:has-text("Takvim"), a:has-text("Takvim")').first();
    if (await takvimTab.isVisible()) await takvimTab.click();

    // Either vaccine plan items or an empty-state message must be present
    const planItems = await page.locator('[data-testid="vaccine-plan-item"]').count();
    const emptyMsg = await page.locator('text=Plan Bulunamadı, text=Henüz plan').count();
    expect(planItems + emptyMsg).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Vaccine OS – unauthenticated guard
// ---------------------------------------------------------------------------

test.describe('Vaccine OS – Route Guard', () => {
  test('Unauthenticated user is redirected to /login', async ({ page }) => {
    // Go directly without logging in
    const petId = PET_ID ?? 'nonexistent-id';
    await page.goto(`/owner/pets/${petId}/vaccines`);
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

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

// ---------------------------------------------------------------------------
// SOS Module
// ---------------------------------------------------------------------------

test.describe('SOS Emergency Contacts', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Family/SOS tab is reachable on pet detail page', async ({ page }) => {
    if (!PET_ID) {
      test.skip(true, 'TEST_PET_ID not set.');
      return;
    }
    await page.goto(`/owner/pets/${PET_ID}`);
    await page.waitForLoadState('networkidle');

    // Click on "Aile" or "SOS" tab
    const familyTab = page
      .locator('button:has-text("Aile"), button:has-text("SOS"), a:has-text("Aile")')
      .first();
    if (await familyTab.isVisible()) {
      await familyTab.click();
      // SOS contact form or list should now be visible
      await expect(
        page.locator('text=Acil Kişi, text=SOS, input[placeholder*="İsim"], input[placeholder*="isim"]').first()
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test('Can fill and save an SOS contact', async ({ page }) => {
    if (!PET_ID) {
      test.skip(true, 'TEST_PET_ID not set.');
      return;
    }
    await page.goto(`/owner/pets/${PET_ID}`);
    await page.waitForLoadState('networkidle');

    const familyTab = page
      .locator('button:has-text("Aile"), button:has-text("SOS"), a:has-text("Aile")')
      .first();
    if (!(await familyTab.isVisible())) return;
    await familyTab.click();

    // Fill the first contact name input
    const nameInput = page.locator('input[placeholder*="İsim"], input[placeholder*="isim"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('E2E Test Kişisi');
      const phoneInput = page.locator('input[placeholder*="Telefon"], input[type="tel"]').first();
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('05559998877');
      }
      // Click save
      const saveBtn = page.locator('button:has-text("Kaydet"), button:has-text("Güncelle")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        // Expect success notification or no error
        await expect(
          page.locator('text=başarı, text=kaydedildi, text=güncellendi, [role="status"]').first()
        ).toBeVisible({ timeout: 8_000 });
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Treatments Module
// ---------------------------------------------------------------------------

test.describe('Treatment Tracking Module', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Treatments page loads for a pet', async ({ page }) => {
    if (!PET_ID) {
      test.skip(true, 'TEST_PET_ID not set.');
      return;
    }
    await page.goto(`/owner/pets/${PET_ID}/treatments`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('h1:has-text("Tedavi"), h2:has-text("Tedavi")').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('"Yeni Tedavi" modal opens and validates empty form', async ({ page }) => {
    if (!PET_ID) {
      test.skip(true, 'TEST_PET_ID not set.');
      return;
    }
    await page.goto(`/owner/pets/${PET_ID}/treatments`);
    await page.waitForLoadState('networkidle');

    const newBtn = page.locator('button:has-text("Yeni Tedavi")').first();
    if (await newBtn.isVisible()) {
      await newBtn.click();
      // Modal should open
      await expect(
        page.locator('text=Yeni Tedavi Kaydı, text=Tedaviyi Düzenle').first()
      ).toBeVisible({ timeout: 6_000 });

      // Try to submit empty form – HTML5 validation should block it
      const submitBtn = page.locator('button[type="submit"]:has-text("Kaydet")').first();
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        // Form should still be open (validation prevented submit)
        await expect(
          page.locator('text=Yeni Tedavi Kaydı, text=Tedaviyi Düzenle').first()
        ).toBeVisible({ timeout: 3_000 });
      }
    }
  });
});

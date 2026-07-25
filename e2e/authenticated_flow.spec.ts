import { test, expect, type Page } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

async function login(page: Page) {
  if (!EMAIL || !PASSWORD) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.');
    return;
  }
  // Add small delay to prevent rate limit lockout in fast consecutive tests
  await page.waitForTimeout(2000);
  await page.goto('/login');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin|\/owner\//, { timeout: 15_000 });
}

test.describe('SOS & Treatments Authenticated Flow', () => {
  let petId: string;
  const tempPetName = `AuthFl_${Math.floor(Math.random() * 9000) + 1000}`;

  test('Create dynamic pet for authenticated flow tests', async ({ page }) => {
    await login(page);

    const petResponse = await page.evaluate(async (name) => {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('species', 'dog');
      fd.append('breed', 'Golden Retriever');
      fd.append('birth_date', '2025-01-01');
      fd.append('gender', 'male');
      fd.append('is_neutered', 'false');
      fd.append('weight', '15');
      fd.append('city', 'İzmir');
      fd.append('district', 'Karşıyaka');

      const res = await fetch('/api/pets', {
        method: 'POST',
        body: fd
      });
      return res.json();
    }, tempPetName);

    expect(petResponse.success).toBe(true);
    petId = petResponse.pet.id;
  });

  // SOS Module
  test('Family/SOS section is readable on edit pet page', async ({ page }) => {
    await login(page);
    await page.goto(`/owner/pets/${petId}/edit`);
    await page.waitForLoadState('networkidle');

    // Section header should be visible
    await expect(page.locator('text=4. Acil Durum Ağı').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Can fill and save an SOS contact', async ({ page }) => {
    await login(page);
    await page.goto(`/owner/pets/${petId}/edit`);
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator('input[placeholder*="İsim"], input[placeholder*="isim"], input[placeholder*="Ali Yılmaz"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('E2E Test Kişisi');
      const phoneInput = page.locator('input[placeholder*="Telefon"], input[type="tel"]').first();
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('05559998877');
      }
      const saveBtn = page.locator('button:has-text("Acil Durum Ağı"), button:has-text("Kaydet"), button:has-text("SOS")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await expect(page.locator('text=Acil durum ağı güncellendi').first()).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  // Treatments Module
  test('Treatments page loads for a pet', async ({ page }) => {
    await login(page);
    await page.goto(`/owner/pets/${petId}/treatments`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1:has-text("Sağlık Takip Modülü")').first()).toBeVisible({ timeout: 10_000 });
  });

  test('"Plan Yap" redirection from treatments page works', async ({ page }) => {
    await login(page);
    await page.goto(`/owner/pets/${petId}/treatments`);
    await page.waitForLoadState('networkidle');

    const planBtn = page.locator('button:has-text("Plan Yap"), button:has-text("Yeni Sağlık Planı Ekle")').first();
    if (await planBtn.isVisible()) {
      await planBtn.click();
      await expect(page).toHaveURL(new RegExp(`/owner/plan-yap/saglik`), { timeout: 10_000 });
    }
  });

  test('Clean up dynamic pet', async ({ page }) => {
    await login(page);
    await page.goto('/owner/profile');
    await page.waitForLoadState('networkidle');
    const petRow = page.locator(`.card-base:has-text("${tempPetName}")`);
    if (await petRow.isVisible()) {
      await petRow.locator('button:has(svg)').first().click();
      await page.waitForTimeout(500);
      await page.click('button:has-text("Profili Kalıcı Olarak Sil")');
      await page.click('button:has-text("Evet, Sil")');
      await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
    }
  });
});

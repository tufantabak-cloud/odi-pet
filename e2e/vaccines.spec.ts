import { test, expect, type Page } from '@playwright/test';
import { dismissBlockingOverlays, safeClick } from './helpers/dismiss-modals';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

async function login(page: Page) {
  if (!EMAIL || !PASSWORD) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.');
    return;
  }
  await page.goto('/login');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin|\/owner\//, { timeout: 15_000 });
  await dismissBlockingOverlays(page);
}

test.describe('Vaccine OS Module', () => {
  let petId = '';
  const tempPetName = `VaccineTestPet_${Date.now()}`;

  test.beforeAll(async () => {
    // We will dynamically create the pet in the first test and clean it up after
  });

  test('Vaccine page renders the main tabs', async ({ page }) => {
    await login(page);

    // Create a temporary pet via API to avoid dependency on hardcoded PET_ID
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

    await page.goto(`/owner/pets/${petId}/vaccines`);
    await page.waitForLoadState('networkidle');
    await dismissBlockingOverlays(page);

    // Birleşik pet profilinde Takvim ve Sağlık sekmelerinin varlığını doğrula
    await expect(page.locator('text=Takvim').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Sağlık, text=Kayıtlar').first()).toBeVisible({ timeout: 10_000 });
  });

  test('Manuel İşlem modal opens and closes', async ({ page }) => {
    await login(page);
    await page.goto(`/owner/pets/${petId}/vaccines`);
    await page.waitForLoadState('networkidle');
    await dismissBlockingOverlays(page);

    // Click "Manuel İşlem Ekle" button
    const addBtn = page.locator('button:has-text("Manuel İşlem Ekle")').first();
    if (await addBtn.isVisible()) {
      await safeClick(page, addBtn);

      // Verify modal opened
      const modal = page.locator('div[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Close modal using cancel or X button
      const closeBtn = modal.locator('button:has-text("İptal"), button[aria-label="Kapat"]').first();
      await safeClick(page, closeBtn);

      // Verify modal closed
      await expect(modal).not.toBeVisible();
    }
  });

  test('Takvim görünümü görev takibini gösterir ve test petini temizler', async ({ page }) => {
    await login(page);
    await page.goto(`/owner/pets/${petId}/vaccines`);
    await page.waitForLoadState('networkidle');
    await dismissBlockingOverlays(page);

    // Birleşik pet profilindeki Takvim sekmesine kanonik safeClick ile geç
    const takvimTab = page.getByRole('tab', { name: 'Takvim' });
    if (await takvimTab.isVisible()) {
      await safeClick(page, takvimTab);
    }

    // Güncel birleşik pet profilinde Takvim sekmesi, aşıları da içeren
    // merkezi görev takip görünümünü açar.
    await expect(
      page.getByRole('heading', { name: 'Görev Takibi' })
    ).toBeVisible({ timeout: 10_000 });

    // Clean up pet
    await page.goto('/owner/profile');
    await page.waitForLoadState('networkidle');
    await dismissBlockingOverlays(page);
    const petRow = page.locator(`.card-base:has-text("${tempPetName}")`);
    if (await petRow.isVisible()) {
      await safeClick(page, petRow.locator('button:has(svg)').first());
      await page.waitForTimeout(500);
      const deleteConfirmBtn = page.locator('button:has-text("Sil"), button:has-text("Evet")').first();
      if (await deleteConfirmBtn.isVisible()) {
        await safeClick(page, deleteConfirmBtn);
      }
      await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
    }
  });
});

test.describe('Vaccine OS – Route Guard', () => {
  test('Unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto(`/owner/pets/nonexistent-id/vaccines`);
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

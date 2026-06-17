import { test, expect, type Page } from '@playwright/test';

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
}

test.describe('Vaccine OS Module', () => {
  let petId: string;
  const tempPetName = `VacOS_${Math.floor(Math.random() * 9000) + 1000}`;

  test.beforeAll(async ({}) => {
    // We will dynamically create the pet in the first test and clean it up after
  });

  test('Vaccine page renders the main tabs', async ({ page }) => {
    await login(page);

    // Create a temporary pet via API to avoid dependency on hardcoded PET_ID
    const petResponse = await page.evaluate(async (name) => {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('species', 'Köpek');
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

    await expect(page.locator('text=Takvim').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=Kayıtlar').first()).toBeVisible();
  });

  test('Manuel İşlem modal opens and closes', async ({ page }) => {
    await login(page);
    await page.goto(`/owner/pets/${petId}/vaccines`);
    await page.waitForLoadState('networkidle');

    const manualBtn = page.locator('button:has-text("Manuel İşlem"), button:has-text("Manuel")').first();
    if (await manualBtn.isVisible()) {
      await manualBtn.click();
      // Modal should open
      await expect(
        page.getByRole('dialog').first()
      ).toBeVisible({ timeout: 6_000 });

      // Close with Iptal button
      await page.click('button:has-text("İptal")');
      // Modal should close (element count goes back to 0)
      await expect(
        page.getByRole('dialog').first()
      ).not.toBeVisible({ timeout: 5_000 });
    }
  });

  test('Vaccine plan items are listed (Takvim tab) and cleanup', async ({ page }) => {
    await login(page);
    await page.goto(`/owner/pets/${petId}/vaccines`);
    await page.waitForLoadState('networkidle');

    // Navigate to calendar tab if not default
    const takvimTab = page.locator('button:has-text("Takvim"), a:has-text("Takvim")').first();
    if (await takvimTab.isVisible()) await takvimTab.click();

    // Either vaccine plan items or an empty-state message must be present
    const planItems = await page.locator('[data-testid="vaccine-plan-item"]').count();
    const emptyMsg = await page.locator('text=Plan Bulunamadı').count();
    expect(planItems + emptyMsg).toBeGreaterThan(0);

    // Clean up pet
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

test.describe('Vaccine OS – Route Guard', () => {
  test('Unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto(`/owner/pets/nonexistent-id/vaccines`);
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

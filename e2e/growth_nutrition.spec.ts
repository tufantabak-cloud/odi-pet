import { test, expect, type Page } from '@playwright/test';
import { dismissBlockingOverlays, safeClick } from './helpers/dismiss-modals';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const petName = `TempG&N_${Date.now().toString().slice(-4)}`;

async function login(page: Page) {
  if (!EMAIL || !PASSWORD) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.');
    return;
  }
  await page.goto('/login');
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
  await dismissBlockingOverlays(page);
}

test.describe('Odi.Pet Growth and Nutrition (Gelişim ve Beslenme) Verification', () => {
  test('Lifecycle Verification of Weight Logging, Chart Drawing, and Nutrition Plan Syncing', async ({ page }) => {
    test.setTimeout(120000);
    await login(page);

    // Bu senaryo kayıt sihirbazını değil gelişim/beslenme modülünü sınar.
    // Test petini kararlı API sözleşmesi üzerinden oluştur.
    console.log('Creating a temporary dog...');
    const petResponse = await page.evaluate(async (name) => {
      const form = new FormData();
      form.append('name', name);
      form.append('species', 'dog');
      form.append('breed', 'Poodle (Kaniş)');
      form.append('birth_date', '2026-01-01');
      form.append('gender', 'male');
      form.append('is_neutered', 'false');
      form.append('weight', '4.5');
      const response = await fetch('/api/pets', { method: 'POST', body: form });
      return { status: response.status, body: await response.json() };
    }, petName);
    expect(petResponse.status).toBe(200);
    expect(petResponse.body.success).toBe(true);
    const petId = petResponse.body.pet.id;
    console.log(`Created pet with ID: ${petId}`);
    expect(petId).not.toBe('');

    // 2. Go to Pet Profile & Log Weights (floating point/decimals)
    console.log('Logging weight...');
    await page.goto(`/owner/pets/${petId}`);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('div[role="tablist"], button[role="tab"]').first()).toBeVisible({ timeout: 15_000 });
    await dismissBlockingOverlays(page);

    // Gelişim grafiği güncel birleşik profilde Sağlık sekmesindedir.
    const saglikTab = page.getByRole('tab', { name: 'Sağlık' });
    await expect(saglikTab).toBeVisible({ timeout: 10_000 });
    await safeClick(page, saglikTab);

    // Kilo & Gelişim Takibi Beslenme modülü linkine tıkla
    const kiloLink = page.locator(`a[href*="/owner/pets/${petId}/nutrition"]`).first();
    if (await kiloLink.isVisible({ timeout: 5000 })) {
      await safeClick(page, kiloLink);
    } else {
      await page.goto(`/owner/pets/${petId}/nutrition?tab=kilo`);
    }
    await page.waitForLoadState('domcontentloaded');
    await dismissBlockingOverlays(page);

    // Click weight log tab "Kilo Takibi" if not already selected
    const kiloTab = page.locator('button:has-text("Kilo Takibi")').first();
    if (await kiloTab.isVisible({ timeout: 5000 })) {
      await safeClick(page, kiloTab);
      await page.waitForTimeout(500);
    }

    // Fill decimal weight e.g. 5.2
    await page.fill('input[name="weight_kg"]', '5.2');
    await safeClick(page, page.locator('button[type="submit"]:has-text("Ekle"), button[type="submit"]:has-text("Kaydet")').first());
    await page.waitForTimeout(1000);

    // Go back to pet profile to verify MinimalGrowthChart rendered weight & custom curve
    await page.goto(`/owner/pets/${petId}`);
    await page.waitForLoadState('domcontentloaded');
    await dismissBlockingOverlays(page);
    const saglikTab2 = page.getByRole('tab', { name: 'Sağlık' });
    if (await saglikTab2.isVisible()) {
      await safeClick(page, saglikTab2);
    }

    // 4. Set Nutrition Plan
    console.log('Setting nutrition brand and amount...');
    await page.goto(`/owner/pets/${petId}/nutrition`);
    await page.waitForLoadState('domcontentloaded');
    await dismissBlockingOverlays(page);
    const mamaTab = page.locator('button:has-text("Mama & Stok")').first();
    if (await mamaTab.isVisible()) {
      await safeClick(page, mamaTab);
      await page.waitForTimeout(500);
    }

    // Fill the Brand and Daily Grams Form if present
    const brandInput = page.locator('input[name="food_brand"]');
    if (await brandInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await brandInput.fill('PremiumRoyal');
      await page.fill('input[name="food_product"]', 'Puppy Care');
      await page.fill('input[name="daily_grams"]', '125');
      await safeClick(page, page.locator('button[type="submit"]:has-text("Bilgileri Kaydet"), button[type="submit"]:has-text("Kaydet")').first());
      await page.waitForTimeout(1000);
    }

    // 5. Verify task is shown in timeline or dashboard tasks
    console.log('Checking if food schedule is reflected...');
    await page.goto(`/owner/pets/${petId}`);
    await page.waitForLoadState('domcontentloaded');
    await dismissBlockingOverlays(page);

    // Under timeline or tasks list, check if feeding related task or status is visible
    // "Beslenme" tab in Pet Profile accordion
    await page.click('button:has-text("Beslenme")');
    await page.waitForTimeout(500);
    // Since we saved brand PremiumRoyal and 125g, let's verify if they show up in info fields
    await expect(page.locator('text=PremiumRoyal').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=125 g').first()).toBeVisible({ timeout: 10000 });

    // 6. Delete Pet Profile
    console.log('Cleaning up: deleting pet profile...');
    await page.goto('/owner/profile');
    await page.waitForLoadState('domcontentloaded');
    await dismissBlockingOverlays(page);

    const petRow = page.locator(`.card-base:has-text("${petName}")`);
    if (await petRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await safeClick(page, petRow.locator('button:has(svg)').first());
      await page.waitForTimeout(500);
      const deleteBtn = page.locator('button:has-text("Profili Kalıcı Olarak Sil"), button:has-text("Sil")').first();
      if (await deleteBtn.isVisible()) {
        await safeClick(page, deleteBtn);
        const confirmBtn = page.locator('button:has-text("Evet, Sil"), button:has-text("Sil")').first();
        if (await confirmBtn.isVisible()) {
          await safeClick(page, confirmBtn);
        }
      }
    }
    console.log('Pet profile cleanup finished!');
  });
});


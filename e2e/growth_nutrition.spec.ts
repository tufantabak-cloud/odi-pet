import { expect, type Page, type APIRequestContext } from '@playwright/test';
import { test } from './fixtures';

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
      const response = await fetch('/api/pets', { method: 'POST', body: form });
      return { status: response.status, body: await response.json() };
    }, petName);
    expect(petResponse.status).toBe(200);
    expect(petResponse.body.success).toBe(true);
    const petId = petResponse.body.pet.id;
    console.log(`Created pet with ID: ${petId}`);
    expect(petId).not.toBe('');

    // 2. Go to Pet Profile & Log Weights (floating point/decimals)
    // 3. Navigate to Nutrition and Weight Tracking tab to verify decimals & add weight
    console.log('Going to nutrition page to log weight...');
    await page.goto(`/owner/pets/${petId}/nutrition`);
    await page.waitForLoadState('networkidle');

    // Click weight log tab "Kilo Takibi"
    await page.click('button:has-text("Kilo Takibi")');
    await page.waitForTimeout(500);

    // Enter decimal weight e.g. 5.2 using RulerPicker edit mode
    const rulerDisplay = page.locator('#nutrition-weight-ruler').getByTestId('ruler-display').first();
    await rulerDisplay.click();
    const rulerInput = page.locator('#nutrition-weight-ruler input[type="number"]').first();
    await rulerInput.waitFor({ state: 'visible', timeout: 5000 });
    await rulerInput.fill('5.2');
    await rulerInput.press('Enter');
    // Wait for React to commit the state update so the new weight is ready to be saved
    await expect(rulerDisplay).toContainText('5.2', { timeout: 5000 });
    await page.click('button[type="submit"]:has-text("Ölçümü Kaydet"), button[type="submit"]:has-text("Kaydet"), button[type="submit"]:has-text("Ekle")');
    await page.waitForTimeout(1000);

    // Go back to pet profile to verify weight rendered
    await page.goto(`/owner/pets/${petId}?tab=saglik`);
    await page.waitForLoadState('networkidle');

    // Check if the latest weight (5.2 kg) is displayed in the new widget
    await expect(page.locator('text=5.2').first()).toBeVisible({ timeout: 15000 });

    // 4. Set Nutrition Plan
    console.log('Setting nutrition brand and amount...');
    await page.goto(`/owner/pets/${petId}/nutrition`);
    await page.waitForLoadState('networkidle');

    const addFoodBtn = page.locator('button:has-text("Mama ekle"), button:has-text("Mama Ekle")').first();
    // Use waitFor instead of isVisible so it doesn't fail due to React render lag
    await addFoodBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await addFoodBtn.isVisible()) {
      await addFoodBtn.click();
      await page.waitForTimeout(500);

      const manualBtn = page.locator('button:has-text("Manuel Olarak Ekle"), button:has-text("Listede Bulamadım")').first();
      await manualBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
      if (await manualBtn.isVisible()) {
        await manualBtn.click();
      }

      const brandInput = page.locator('input[placeholder*="Royal Canin"], input[name="brand_free_text"], input[name="food_brand"]').first();
      await brandInput.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
      if (await brandInput.isVisible()) {
        await brandInput.fill('PremiumRoyal');
      }
      const productInput = page.locator('input[placeholder*="Puppy"], input[name="product_free_text"], input[name="food_product"]').first();
      await productInput.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
      if (await productInput.isVisible()) {
        await productInput.fill('Puppy Care');
      }
      const gramsInput = page.locator('input[name="daily_target_grams"], input[name="daily_grams"]').first();
      await gramsInput.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
      if (await gramsInput.isVisible()) {
        await gramsInput.fill('125');
      }

      const nextStockBtn = page.locator('button:has-text("İleri: Stok"), button:has-text("İleri"), button:has-text("Kaydet")').first();
      await nextStockBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
      if (await nextStockBtn.isVisible()) {
        await nextStockBtn.click();
        await page.waitForTimeout(500);
        const finalSaveBtn = page.locator('button[type="submit"]:has-text("Kaydet"), button:has-text("Kaydet")').first();
        await finalSaveBtn.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
        if (await finalSaveBtn.isVisible()) {
          await finalSaveBtn.click();
        }
      }
    }
    await page.waitForTimeout(1000);

    // 5. Verify task is shown in timeline or dashboard tasks
    console.log('Checking if food schedule is reflected...');
    await page.goto(`/owner/pets/${petId}`);
    await page.waitForLoadState('networkidle');

    // Under timeline or tasks list, check if feeding related task or status is visible
    // "Beslenme" tab in Pet Profile accordion
    await page.goto(`/owner/pets/${petId}?tab=beslenme`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    // Since we saved brand PremiumRoyal and 125g, let's verify if they show up in info fields
    await expect(page.locator('text=PremiumRoyal').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=125 g').first()).toBeVisible({ timeout: 10000 });

    // 6. Delete Pet Profile
    console.log('Cleaning up: deleting pet profile...');
    await page.goto('/owner/profile');
    await page.waitForLoadState('networkidle');

    const petRow = page.locator(`.card-base:has-text("${petName}")`);
    await petRow.locator('button:has(svg)').first().click(); // opens three dots menu
    await page.waitForTimeout(500);

    await page.click('button:has-text("Profili Kalıcı Olarak Sil")');
    await page.click('button:has-text("Evet, Sil")'); // confirm modal
    await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
    console.log('Pet profile successfully deleted and verified!');
  });
});

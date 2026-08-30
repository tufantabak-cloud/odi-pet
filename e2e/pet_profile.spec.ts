import { expect, type Page } from '@playwright/test';
import { test } from './fixtures';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const petName = `TempProfile_${Date.now().toString().slice(-4)}`;

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

test.describe('Odi.Pet Pet Profile Page Verification', () => {
  test('Full Pet Profile Lifecycle (Create, View, Calculate Size, SOS, Edit, Purge, Delete)', async ({ page }) => {
    await login(page);

    // Bu senaryo kayÄ±t sihirbazÄ±nÄ± deÄŸil profil yaÅŸam dÃ¶ngÃ¼sÃ¼nÃ¼ sÄ±nar.
    // Test petini kararlÄ± API sÃ¶zleÅŸmesi Ã¼zerinden oluÅŸtur.
    console.log('Creating a temporary pet...');
    const petResponse = await page.evaluate(async (name) => {
      const form = new FormData();
      form.append('name', name);
      form.append('species', 'cat');
      form.append('breed', 'British Shorthair');
      form.append('birth_date', '2023-06-01');
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

    // Go to Pet Profile Details Page
    await page.goto(`/owner/pets/${petId}`);
    await page.waitForLoadState('networkidle');

    // 2. Temel Kart GÃ¶rÃ¼nÃ¼mÃ¼ (Basic Card View Checks)
    console.log('Verifying Basic Card View...');
    await expect(page.locator(`h1:has-text("${petName}")`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=British Shorthair').first()).toBeVisible();
    await expect(page.getByText('4.5 Kilo', { exact: false }).first()).toBeVisible();

    // 3. Boyut Hesaplama & DÃ¼zenleme ModÃ¼lÃ¼ (Size Calculation & Edit Module)
    console.log('Navigating to Edit Page for Size Calculation Checks...');
    await page.goto(`/owner/pets/${petId}/edit`);
    await page.waitForLoadState('networkidle');

    // Kilo deÄŸiÅŸtiÄŸinde boyut skalasÄ± gÃ¼ncelleniyor mu?
    await page.getByRole('button', { name: '2.5 kg', exact: true }).click(); // 2.5 kg should trigger 'small' size
    await page.waitForTimeout(300);
    // Kedi boyut skalasÄ± (kilo bazlÄ±) olmalÄ± ve 'KÃ¼Ã§Ã¼k' gÃ¶sterilmeli
    await expect(page.locator('text=Kedi Boyut SkalasÄ±')).toBeVisible();
    await expect(page.locator('span:has-text("KÃ¼Ã§Ã¼k")')).toBeVisible();

    await page.locator('text=2.5').first().click(); // Open editing mode on RulerPicker
    await page.locator('input[type="number"]').fill('7.5'); // 7.5 kg should trigger 'large' size
    await page.locator('input[type="number"]').press('Enter');
    await page.waitForTimeout(300);
    await expect(page.locator('span:has-text("BÃ¼yÃ¼k")')).toBeVisible();

    // Pet details edit submit
    await page.fill('#name', `${petName}_Edited`);
    await page.click('button[type="submit"]:has-text("DeÄŸiÅŸiklikleri Kaydet")');
    await expect(page.locator('text=Bilgiler baÅŸarÄ±yla gÃ¼ncellendi')).toBeVisible({ timeout: 10000 });
    
    // Go back to detail page and check updated name
    await page.goto(`/owner/pets/${petId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`h1:has-text("${petName}_Edited")`)).toBeVisible({ timeout: 10000 });

    // 4. SOS Emergency Contacts Add/Edit (Acil Durum AÄŸÄ±)
    console.log('Updating SOS contacts...');
    await page.goto(`/owner/pets/${petId}/edit`);
    await page.waitForLoadState('networkidle');

    // Fill Person 1 & 2
    await page.locator('input[placeholder="Ã–rn: Ali YÄ±lmaz"]').first().fill('Ahmet YÄ±lmaz');
    await page.locator('input[placeholder="05XX XXX XX XX"]').first().fill('05554443322');
    await page.locator('#sos-section select').first().selectOption('Aile Ãœyesi');

    await page.locator('input[placeholder="Ã–rn: Ali YÄ±lmaz"]').nth(1).fill('Zeynep Can');
    await page.locator('input[placeholder="05XX XXX XX XX"]').nth(1).fill('05553332211');
    await page.locator('#sos-section select').nth(1).selectOption('KomÅŸu');

    await page.getByRole('button', { name: 'DeÄŸiÅŸiklikleri Kaydet', exact: false }).click();
    await expect(page.locator('text=Bilgiler baÅŸarÄ±yla gÃ¼ncellendi')).toBeVisible({ timeout: 10000 });

    // 5. Data Purge (Veri Temizleme)
    console.log('Purging health records...');
    await page.goto('/owner/profile');
    await page.waitForLoadState('networkidle');

    // Click `...` menu on our pet card
    const petRow = page.locator(`.card-base:has-text("${petName}_Edited")`);
    await petRow.locator('button:has(svg)').first().click(); // opens three dots menu
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("SaÄŸlÄ±k Verilerini Temizle")');
    await page.click('button:has-text("Evet, Temizle")'); // confirm modal
    await expect(page.locator('text=SaÄŸlÄ±k verileri baÅŸarÄ±yla temizlendi')).toBeVisible({ timeout: 10000 });

    // 6. Delete Pet (Pet Silme)
    console.log('Deleting pet profile...');
    await petRow.locator('button:has(svg)').first().click(); // opens three dots menu again
    await page.waitForTimeout(500);

    await page.click('button:has-text("Profili KalÄ±cÄ± Olarak Sil")');
    await page.click('button:has-text("Evet, Sil")'); // confirm modal

    // Verify redirected back to dashboard and temporary pet is gone
    await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
    const deletedPetCard = page.locator(`.card-base:has-text("${petName}_Edited")`);
    await expect(deletedPetCard).not.toBeVisible();
    console.log('Pet profile successfully deleted and verified!');
  });
});


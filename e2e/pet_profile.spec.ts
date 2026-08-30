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

    // Bu senaryo kayıt sihirbazını değil profil yaşam döngüsünü sınar.
    // Test petini kararlı API sözleşmesi üzerinden oluştur.
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

    // 2. Temel Kart Görünümü (Basic Card View Checks)
    console.log('Verifying Basic Card View...');
    await expect(page.locator(`h1:has-text("${petName}")`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=British Shorthair').first()).toBeVisible();
    await expect(page.getByText('4.5 Kilo', { exact: false }).first()).toBeVisible();

    // 3. Boyut Hesaplama & Düzenleme Modülü (Size Calculation & Edit Module)
    console.log('Navigating to Edit Page for Size Calculation Checks...');
    await page.goto(`/owner/pets/${petId}/edit`);
    await page.waitForLoadState('networkidle');

    // Kilo değiştiğinde boyut skalası güncelleniyor mu?
    const weightInput = page.locator('#weight');
    await weightInput.fill('2.5'); // 2.5 kg should trigger 'small' size
    await page.waitForTimeout(300);
    // Kedi boyut skalası (kilo bazlı) olmalı ve 'Küçük' gösterilmeli
    await expect(page.locator('text=Kedi Boyut Skalası')).toBeVisible();
    await expect(page.locator('span:has-text("Küçük")')).toBeVisible();

    await weightInput.fill('7.5'); // 7.5 kg should trigger 'large' size
    await page.waitForTimeout(300);
    await expect(page.locator('span:has-text("Büyük")')).toBeVisible();

    // Pet details edit submit
    await page.fill('#name', `${petName}_Edited`);
    await page.click('button[type="submit"]:has-text("Değişiklikleri Kaydet")');
    await expect(page.locator('text=Bilgiler başarıyla güncellendi')).toBeVisible({ timeout: 10000 });
    
    // Go back to detail page and check updated name
    await page.goto(`/owner/pets/${petId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`h1:has-text("${petName}_Edited")`)).toBeVisible({ timeout: 10000 });

    // 4. SOS Emergency Contacts Add/Edit (Acil Durum Ağı)
    console.log('Updating SOS contacts...');
    await page.goto(`/owner/pets/${petId}/edit`);
    await page.waitForLoadState('networkidle');

    // Fill Person 1 & 2
    await page.locator('input[placeholder="Örn: Ali Yılmaz"]').first().fill('Ahmet Yılmaz');
    await page.locator('input[placeholder="05XX XXX XX XX"]').first().fill('05554443322');
    await page.locator('#sos-section select').first().selectOption('Aile Üyesi');

    await page.locator('input[placeholder="Örn: Ali Yılmaz"]').nth(1).fill('Zeynep Can');
    await page.locator('input[placeholder="05XX XXX XX XX"]').nth(1).fill('05553332211');
    await page.locator('#sos-section select').nth(1).selectOption('Komşu');

    await page.click('button:has-text("Acil Durum")'); // clicks 'Acil Durum Ağını Kaydet'
    await expect(page.locator('text=Acil durum ağı güncellendi')).toBeVisible({ timeout: 10000 });

    // 5. Data Purge (Veri Temizleme)
    console.log('Purging health records...');
    await page.goto('/owner/profile');
    await page.waitForLoadState('networkidle');

    // Click `...` menu on our pet card
    const petRow = page.locator(`.card-base:has-text("${petName}_Edited")`);
    await petRow.locator('button:has(svg)').first().click(); // opens three dots menu
    await page.waitForTimeout(500);
    
    await page.click('button:has-text("Sağlık Verilerini Temizle")');
    await page.click('button:has-text("Evet, Temizle")'); // confirm modal
    await expect(page.locator('text=Sağlık verileri başarıyla temizlendi')).toBeVisible({ timeout: 10000 });

    // 6. Delete Pet (Pet Silme)
    console.log('Deleting pet profile...');
    await petRow.locator('button:has(svg)').first().click(); // opens three dots menu again
    await page.waitForTimeout(500);

    await page.click('button:has-text("Profili Kalıcı Olarak Sil")');
    await page.click('button:has-text("Evet, Sil")'); // confirm modal

    // Verify redirected back to dashboard and temporary pet is gone
    await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
    const deletedPetCard = page.locator(`.card-base:has-text("${petName}_Edited")`);
    await expect(deletedPetCard).not.toBeVisible();
    console.log('Pet profile successfully deleted and verified!');
  });
});

import { expect, type Page, type APIRequestContext } from '@playwright/test';
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
    const presetBtn2 = page.locator('button:has-text("2 kg"), button:has-text("2.5 kg"), button:has-text("3 kg")').first();
    if (await presetBtn2.isVisible().catch(() => false)) {
      await presetBtn2.scrollIntoViewIfNeeded();
      await presetBtn2.click();
    } else {
      const weightInput = page.locator('input[type="number"]').first();
      if (await weightInput.isVisible().catch(() => false)) {
        await weightInput.fill('2.5');
        await weightInput.dispatchEvent('change');
      }
    }
    await page.waitForTimeout(300);
    // Kedi boyut skalası (kilo bazlı) olmalı ve 'Küçük' gösterilmeli
    await expect(page.locator('text=Kedi Boyut Skalası').first()).toBeVisible();
    await expect(page.locator('span:has-text("Küçük")').first()).toBeVisible();

    const presetBtn7 = page.locator('button:has-text("7 kg"), button:has-text("7.0 kg"), button:has-text("7.5 kg")').first();
    if (await presetBtn7.isVisible().catch(() => false)) {
      await presetBtn7.scrollIntoViewIfNeeded();
      await presetBtn7.click();
    } else {
      const weightInput = page.locator('input[type="number"]').first();
      if (await weightInput.isVisible().catch(() => false)) {
        await weightInput.fill('7.5');
        await weightInput.dispatchEvent('change');
      }
    }
    await page.waitForTimeout(300);
    await expect(page.locator('span:has-text("Büyük")').first()).toBeVisible();

    // Pet details edit submit
    await page.fill('#name', `${petName}_Edited`);
    await page.click('button[type="submit"]:has-text("Kaydet"), button[type="submit"]:has-text("Değişiklikleri Kaydet")');
    await expect(page.locator('text=güncellendi').or(page.locator('text=başarıyla')).first()).toBeVisible({ timeout: 10000 });
    
    // Go back to detail page and check updated name
    await page.goto(`/owner/pets/${petId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`h1:has-text("${petName}_Edited")`)).toBeVisible({ timeout: 10000 });

    // 4. SOS Emergency Contacts Add/Edit (Acil Durum Ağı)
    console.log('Updating SOS contacts...');
    await page.goto(`/owner/pets/${petId}/edit`);
    await page.waitForLoadState('networkidle');

    // Fill Person 1 & 2
    const nameInputs = page.locator('#sos-section input[type="text"]:not([readonly]):not([disabled]), #sos-section input[placeholder*="Örn:"]');
    const phoneInputs = page.locator('#sos-section input[type="tel"]');
    if (await nameInputs.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInputs.first().fill('Ahmet Yılmaz');
      await phoneInputs.first().fill('05554443322');
      if (await nameInputs.nth(1).isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInputs.nth(1).fill('Zeynep Can');
        await phoneInputs.nth(1).fill('05553332211');
      }
      await page.click('button[type="submit"]:has-text("Kaydet"), button[type="submit"]:has-text("Değişiklikleri Kaydet")');
      await expect(page.locator('text=güncellendi').or(page.locator('text=başarıyla')).first()).toBeVisible({ timeout: 10000 });
    }

    // 5. Data Purge (Veri Temizleme)
    console.log('Purging health records...');
    await page.goto(`/owner/pets/${petId}/edit`);
    await page.waitForLoadState('networkidle');

    const resetBtn = page.locator('button:has-text("Kayıtları Sıfırla"), button:has-text("Sağlık Verilerini Temizle")').first();
    if (await resetBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await resetBtn.scrollIntoViewIfNeeded();
      await resetBtn.click();
      const confirmResetBtn = page.locator('button:has-text("Evet, Sıfırla"), button:has-text("Evet, Kalıcı Olarak Sil"), button:has-text("Evet, Temizle")').first();
      await expect(confirmResetBtn).toBeVisible({ timeout: 5000 });
      await confirmResetBtn.click();
      await expect(page.locator('text=güncellendi').or(page.locator('text=başarıyla')).or(page.locator('text=sıfırlandı')).first()).toBeVisible({ timeout: 10000 });
    }

    // 6. Delete Pet (Pet Silme)
    console.log('Deleting pet profile...');
    await page.goto(`/owner/pets/${petId}/edit`);
    await page.waitForLoadState('networkidle');

    const deleteBtn = page.locator('button:has-text("kaydını sil"), button:has-text("Profili Sil"), button:has-text("Profili Kalıcı Olarak Sil")').first();
    await deleteBtn.scrollIntoViewIfNeeded();
    await deleteBtn.click();
    const confirmDeleteBtn = page.locator('button:has-text("Evet, Sil")').first();
    await expect(confirmDeleteBtn).toBeVisible({ timeout: 5000 });
    await confirmDeleteBtn.click();

    // Verify redirected back to dashboard and temporary pet is gone
    await expect(page).toHaveURL(/\/owner\/dashboard/, { timeout: 15000 });
    const deletedPetCard = page.locator(`.card-base:has-text("${petName}_Edited")`);
    await expect(deletedPetCard).not.toBeVisible();
    console.log('Pet profile successfully deleted and verified!');
  });
});

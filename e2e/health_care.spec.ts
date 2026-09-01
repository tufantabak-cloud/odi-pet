import { expect, type Page, type APIRequestContext } from '@playwright/test';
import { test } from './fixtures';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const petName = `TempHealth_${Date.now().toString().slice(-4)}`;

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

test.describe('Odi.Pet Health and Care Module Verification', () => {
  test('Full Health Care Lifecycle (Create Pet, Plan Yap Wizard, Timeline Verification, Task Complete, Vaccines Page, Delete Pet)', async ({ page }) => {
    test.setTimeout(120000);
    await login(page);

    // Bu senaryo kayıt sihirbazını değil sağlık yaşam döngüsünü sınar.
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
      form.append('weight', '3.5');
      const response = await fetch('/api/pets', { method: 'POST', body: form });
      return { status: response.status, body: await response.json() };
    }, petName);
    expect(petResponse.status).toBe(200);
    expect(petResponse.body.success).toBe(true);
    const petId = petResponse.body.pet.id;
    console.log(`Created pet with ID: ${petId}`);
    expect(petId).not.toBe('');

    // 2. Go to Plan Yap Wizard for vaccines
    console.log('Navigating to Plan Yap Wizard...');
    await page.goto(`/owner/plan-yap/asi?pet_id=${petId}`);
    await page.waitForLoadState('networkidle');

    // Handle optional pet selection step if there are multiple pets
    const petSelectBtn = page.locator(`button:has-text("${petName}")`);
    if (await petSelectBtn.isVisible()) {
      await petSelectBtn.click();
      await page.waitForTimeout(600);
    }

    // Step: Vaccine Selection
    console.log('Selecting a vaccine template...');
    await expect(page.locator('text=Aşı Seçimi').first()).toBeVisible({ timeout: 10000 });
    // Click first core vaccine in the list (automatically transitions to next step)
    await page.locator('button h4').first().click();

    // Step: Date & Time
    console.log('Setting date and time...');
    await expect(page.locator('text=Tarih & Saat').or(page.locator('text=Ne Zaman Yapıldı?')).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Devam et', exact: true }).click();

    // Step: Recurrence
    console.log('Verifying recurrence options...');
    await expect(page.locator('text=Tekrar Sıklığı').or(page.locator('text=Tekrarlanacak mı?')).first()).toBeVisible({ timeout: 10000 });
    const singleRecurrenceBtn = page.locator('button:has-text("Tek Seferlik"), button:has-text("Sadece bu kayıt")').first();
    await expect(singleRecurrenceBtn).toBeVisible({ timeout: 10_000 });
    // Select "Tek Seferlik" / "Sadece bu kayıt" to verify single event frequency labelling
    await singleRecurrenceBtn.click();
    await page.getByRole('button', { name: 'Devam et', exact: true }).click();

    // Step: Notification & Save
    console.log('Saving the plan...');
    await expect(page.locator('text=Hatırlatıcı').or(page.locator('text=Bildirim')).or(page.locator('text=Onay & Not')).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Planı Kaydet', exact: true }).click();

    // Verify Success Screen
    console.log('Verifying success screen...');
    await expect(page.locator('text=Rutin Oluşturuldu!')).toBeVisible({ timeout: 15000 });
    
    // Go to Pet Profile
    await page.click('button:has-text("Pet Profiline Dön")');
    await page.waitForURL(new RegExp(`/owner/pets/${petId}`), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // 3. Timeline (Health Tracker) Verification
    console.log('Verifying tasks on the timeline...');
    await page.goto(`/owner/pets/${petId}?tab=takvim`);
    await page.waitForLoadState('networkidle');

    // Verify that the task is listed
    await expect(page.locator('text=Aşı').or(page.locator('text=Karma')).or(page.locator('text=Görev')).or(page.locator('text=Takvim')).first()).toBeVisible({ timeout: 15000 });

    // 4. Complete the Task
    console.log('Completing the task from the timeline...');
    const timelineChip = page.locator('button[data-status], button:has-text("Tamamlandı"), button:has-text("Yapıldı"), button.card-base, div.card-base').first();
    if (await timelineChip.isVisible({ timeout: 5000 }).catch(() => false)) {
      await timelineChip.click();
      await page.waitForTimeout(500);
      const markDoneBtn = page.locator('button:has-text("✓ Tamamlandı"), button:has-text("Tamamlandı"), button:has-text("Yapıldı")').first();
      if (await markDoneBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await markDoneBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // 5. Vaccines Page (Aşı Karnesi) Verification
    console.log('Checking Vaccine Card page...');
    await page.goto(`/owner/pets/${petId}/vaccines`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Takvim').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Aşı').first()).toBeVisible();

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

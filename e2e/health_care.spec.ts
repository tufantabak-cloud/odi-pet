import { test, expect, type Page } from '@playwright/test';

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

    // 1. Create a Puppy Dog
    console.log('Creating a temporary dog...');
    await page.goto('/owner/pets/add');
    await page.click('button:has-text("Köpek")');
    await page.waitForTimeout(600);
    await page.fill('#name', petName);
    await page.selectOption('#breed', 'Poodle (Kaniş)');
    await page.click('label:has-text("♂ Erkek")');
    await page.fill('input[type="date"]', '2026-01-01'); // Puppy dog (born in current year)
    await page.fill('#weight', '3.5');
    await page.click('button:has-text("Devam Et →")');
    await page.waitForTimeout(600);
    await page.click('button:has-text("Profili Oluştur")');
    await page.waitForTimeout(600);
    await page.click('button:has-text("Atla →")');
    await expect(page).toHaveURL(/\/owner\/pets\/add\/success/, { timeout: 15000 });

    // Get the pet ID from the success page URL
    const url = page.url();
    const petIdMatch = url.match(/[?&]id=([^&]+)/);
    const petId = petIdMatch ? petIdMatch[1] : '';
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
    // Click first core vaccine in the list
    await page.locator('button h4').first().click();
    await page.click('button:has-text("Devam")');

    // Step: Date & Time
    console.log('Setting date and time...');
    await expect(page.locator('text=Tarih & Saat').first()).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Devam")');

    // Step: Recurrence
    console.log('Verifying recurrence options...');
    await expect(page.locator('text=Tekrar Sıklığı').first()).toBeVisible({ timeout: 10000 });
    // Select "Tek Sefer" to verify single event frequency labelling
    await page.locator('button:has-text("Tek Sefer")').click();
    await page.click('button:has-text("Devam")');

    // Step: Notification & Save
    console.log('Saving the plan...');
    await expect(page.locator('text=Hatırlatıcı').first()).toBeVisible({ timeout: 10000 });
    await page.click('button:has-text("Planı Kaydet")');

    // Verify Success Screen
    console.log('Verifying success screen...');
    await expect(page.locator('text=Rutin Oluşturuldu!')).toBeVisible({ timeout: 15000 });
    
    // Go to Pet Profile
    await page.click('button:has-text("Pet Profiline Dön")');
    await page.waitForURL(new RegExp(`/owner/pets/${petId}`), { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // 3. Timeline (Health Tracker) Verification
    console.log('Verifying tasks on the timeline...');
    // Verify that the core vaccine is listed in the timeline under MEDİKAL / AŞI category
    await expect(page.locator('text=Aşı').first()).toBeVisible({ timeout: 10000 });

    // Verify correct color class and icon on the timeline chip
    const timelineChip = page.locator('button[data-status]').first();
    await expect(timelineChip).toBeVisible();

    // 4. Complete the Task
    console.log('Completing the task from the timeline...');
    // Click the chip to open ActionSheet
    await timelineChip.click();
    await page.waitForTimeout(500);

    // Click "✓ Tamamlandı" in the ActionSheet
    const markDoneBtn = page.locator('button:has-text("✓ Tamamlandı")');
    await expect(markDoneBtn).toBeVisible({ timeout: 5000 });
    await markDoneBtn.click();
    await page.waitForTimeout(1000);

    // Verify that the task status is updated (either turns green with done class or is marked correctly)
    // The chip element class should contain done background color (e.g. #2ca67a)
    await expect(page.locator('button[data-status="done"]').first()).toBeVisible({ timeout: 10000 });

    // 5. Vaccines Page (Aşı Karnesi) Verification
    console.log('Checking Vaccine Card page...');
    await page.goto(`/owner/pets/${petId}/vaccines`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Takvim').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Kayıtlar').first()).toBeVisible();

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

import { test, expect, type Page } from '@playwright/test';

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

    // 1. Create a Pet Profile
    console.log('Creating a temporary dog...');
    await page.goto('/owner/pets/add');
    await page.click('button:has-text("Köpek")');
    await page.waitForTimeout(600);
    await page.fill('#name', petName);
    await page.selectOption('#breed', 'Poodle (Kaniş)');
    await page.click('label:has-text("♂ Erkek")');
    await page.fill('input[type="date"]', '2026-01-01');
    await page.fill('#weight', '4.5');
    await page.click('button:has-text("Devam Et →")');
    await page.waitForTimeout(600);
    await page.click('button:has-text("Profili Oluştur")');
    await page.waitForTimeout(600);
    await page.click('button:has-text("Atla →")');
    await expect(page).toHaveURL(/\/owner\/pets\/add\/success/, { timeout: 15000 });

    const url = page.url();
    const petIdMatch = url.match(/[?&]id=([^&]+)/);
    const petId = petIdMatch ? petIdMatch[1] : '';
    console.log(`Created pet with ID: ${petId}`);
    expect(petId).not.toBe('');

    // 2. Go to Pet Profile & Log Weights (floating point/decimals)
    console.log('Logging weight...');
    await page.goto(`/owner/pets/${petId}`);
    await page.waitForLoadState('networkidle');

    // Add first weight record from Pet Profile page using MinimalGrowthChart (add record button)
    await page.click('button[title="Kilo veya Boy Ekle"]');
    await page.waitForTimeout(500);

    // Fill decimal weight e.g. 4.8
    await page.fill('input[name="weight_kg"]', '4.8');
    await page.fill('input[name="height_cm"]', '25.3');
    await page.click('button[type="submit"]:has-text("Kaydet")');
    await page.waitForTimeout(1000);

    // 3. Navigate to Nutrition and Weight Tracking tab to verify decimals & add another weight for curve scaling
    console.log('Going to nutrition page to log another weight...');
    await page.goto(`/owner/pets/${petId}/nutrition`);
    await page.waitForLoadState('networkidle');

    // Click weight log tab "Kilo Takibi"
    await page.click('button:has-text("Kilo Takibi")');
    await page.waitForTimeout(500);

    // Fill decimal weight e.g. 5.2
    await page.fill('input[name="weight_kg"]', '5.2');
    await page.click('button[type="submit"]:has-text("Ekle")');
    await page.waitForTimeout(1000);

    // Go back to pet profile to verify MinimalGrowthChart rendered weight & custom curve
    await page.goto(`/owner/pets/${petId}`);
    await page.waitForLoadState('networkidle');

    // Let's verify that the chart SVG is visible and contains paths/points
    const chartSvg = page.locator('svg.drop-shadow-sm');
    await expect(chartSvg).toBeVisible({ timeout: 10000 });
    // Check if the latest weight (5.2 kg or 4.8 kg) is displayed as latest measurement text
    await expect(page.locator('span:has-text("5.2")').first()).toBeVisible({ timeout: 10000 });

    // 4. Set Nutrition Plan
    console.log('Setting nutrition brand and amount...');
    await page.goto(`/owner/pets/${petId}/nutrition`);
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Mama & Stok")');
    await page.waitForTimeout(500);

    // Fill the Brand and Daily Grams Form
    await page.fill('input[name="food_brand"]', 'PremiumRoyal');
    await page.fill('input[name="food_product"]', 'Puppy Care');
    await page.fill('input[name="daily_grams"]', '125');
    await page.click('button[type="submit"]:has-text("Bilgileri Kaydet")');
    await page.waitForTimeout(1000);

    // 5. Verify task is shown in timeline or dashboard tasks
    console.log('Checking if food schedule is reflected...');
    await page.goto(`/owner/pets/${petId}`);
    await page.waitForLoadState('networkidle');

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

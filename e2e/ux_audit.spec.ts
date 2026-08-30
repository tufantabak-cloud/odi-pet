import { expect } from '@playwright/test';
import { test } from './fixtures';
import * as path from 'path';

const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;

// Artifacts dizini
const ARTIFACT_DIR = 'C:/Users/Tufan TABAK/.gemini/antigravity/brain/af4da51b-2629-4a4a-9298-74106ffc3997';

test('UX Audit - Progressive Profiling and Dashboard Smart Cards', async ({ page }) => {
  if (!EMAIL || !PASSWORD) {
    test.skip(true, 'TEST_EMAIL / TEST_PASSWORD not set.');
    return;
  }

  console.log('Logging in...');
  await page.goto('/login');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin|\/owner\//, { timeout: 15000 });
  if (page.url().includes('/admin')) {
    await page.goto('/owner/dashboard');
  }
  console.log('Logged in successfully!');

  // 1. Onboarding Pets Add SayfasÄ± Denetimi
  console.log('Navigating to /owner/pets/add...');
  await page.goto('/owner/pets/add');
  await page.waitForLoadState('networkidle');

  // AdÄ±m 1: TÃ¼r SeÃ§imi screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pets_add_step1_species.png') });
  console.log('Step 1 Species Selector screenshot taken.');

  // Kedi seÃ§elim
  console.log('Selecting "Kedi" to proceed to Step 2...');
  const catBtn = page.locator('button:has-text("Kedi")');
  await catBtn.click();
  await page.waitForTimeout(1000); // fade-in animasyonu iÃ§in bekle

  // AdÄ±m 2: Bilgiler Formunun render edilmesini bekleyelim
  await expect(page.locator('label:has-text("KÄ±sÄ±rlaÅŸtÄ±rÄ±lma Durumu")')).toBeVisible({ timeout: 5000 });

  // AÅŸamalÄ± Veri Toplama alanlarÄ±nÄ±n durumunu inceleyelim
  const isNeuteredVisible = await page.locator('label:has-text("KÄ±sÄ±rlaÅŸtÄ±rÄ±lma Durumu")').isVisible();
  const weightVisible = await page.locator('label:has-text("Kilo")').isVisible();
  console.log(`is_neutered visible: ${isNeuteredVisible}, weight visible: ${weightVisible}`);

  // AdÄ±m 2 Bilgiler screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pets_add_step2_details.png') });
  console.log('Step 2 Details Form screenshot taken.');

  // 2. Dashboard Smart Cards Denetimi
  console.log('Navigating to /owner/dashboard...');
  await page.goto('/owner/dashboard');
  await page.waitForLoadState('networkidle');

  // Dashboard screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_page.png') });
  console.log('Dashboard page screenshot taken.');

  // SmartCardBanner / DashboardSmartCards varlÄ±ÄŸÄ±nÄ± kontrol edelim
  const smartCardContainer = page.locator('div:has-text("DÄ±ÅŸ Parazit UygulamasÄ±"), div:has-text("AÅŸÄ± SonrasÄ± Takip"), div:has-text("Pet Dostu Mekanlar")').first();
  const hasSmartCard = await smartCardContainer.count() > 0;
  console.log(`Has active Smart Card: ${hasSmartCard}`);

  if (hasSmartCard) {
    const smartCardText = await smartCardContainer.innerText();
    console.log(`Active Smart Card Text:\n${smartCardText}`);
    // Smart card'Ä±n ekran gÃ¶rÃ¼ntÃ¼sÃ¼nÃ¼ Ã¶zel olarak alalÄ±m
    await smartCardContainer.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_smartcard_element.png') });
  } else {
    console.log('No active Smart Card found on dashboard.');
  }
});


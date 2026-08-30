import { expect, type Page, type APIRequestContext } from '@playwright/test';
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

  // 1. Onboarding Pets Add Sayfası Denetimi
  console.log('Navigating to /owner/pets/add...');
  await page.goto('/owner/pets/add');
  await page.waitForLoadState('networkidle');

  // Adım 1: Tür Seçimi screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pets_add_step1_species.png') });
  console.log('Step 1 Species Selector screenshot taken.');

  // Kedi seçelim
  console.log('Selecting "Kedi" to proceed to Step 2...');
  const catBtn = page.locator('button:has-text("Kedi")');
  await catBtn.click();
  await page.waitForTimeout(1000); // fade-in animasyonu için bekle

  // Adım 2: Bilgiler Formunun render edilmesini bekleyelim
  await expect(page.locator('label:has-text("Kısırlaştırılma Durumu")')).toBeVisible({ timeout: 5000 });

  // Aşamalı Veri Toplama alanlarının durumunu inceleyelim
  const isNeuteredVisible = await page.locator('label:has-text("Kısırlaştırılma Durumu")').isVisible();
  const weightVisible = await page.locator('label:has-text("Kilo")').isVisible();
  console.log(`is_neutered visible: ${isNeuteredVisible}, weight visible: ${weightVisible}`);

  // Adım 2 Bilgiler screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'pets_add_step2_details.png') });
  console.log('Step 2 Details Form screenshot taken.');

  // 2. Dashboard Smart Cards Denetimi
  console.log('Navigating to /owner/dashboard...');
  await page.goto('/owner/dashboard');
  await page.waitForLoadState('networkidle');

  // Dashboard screenshot
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_page.png') });
  console.log('Dashboard page screenshot taken.');

  // SmartCardBanner / DashboardSmartCards varlığını kontrol edelim
  const smartCardContainer = page.locator('div:has-text("Dış Parazit Uygulaması"), div:has-text("Aşı Sonrası Takip"), div:has-text("Pet Dostu Mekanlar")').first();
  const hasSmartCard = await smartCardContainer.count() > 0;
  console.log(`Has active Smart Card: ${hasSmartCard}`);

  if (hasSmartCard) {
    const smartCardText = await smartCardContainer.innerText();
    console.log(`Active Smart Card Text:\n${smartCardText}`);
    // Smart card'ın ekran görüntüsünü özel olarak alalım
    await smartCardContainer.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_smartcard_element.png') });
  } else {
    console.log('No active Smart Card found on dashboard.');
  }
});

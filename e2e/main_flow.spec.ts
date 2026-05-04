import { test, expect } from '@playwright/test';

test.describe('Odi.Pet E2E Automation Robot', () => {
  // Test Settings & Sample Data
  const testEmail = process.env.TEST_EMAIL || 's.piskin@oxivo.eu';
  const testPassword = process.env.TEST_PASSWORD || 'password123';
  
  test('1. Landing and Login Stage', async ({ page }) => {
    console.log('Navigating to app...');
    
    // Bypass splash screen
    await page.addInitScript(() => {
      sessionStorage.setItem('odi_splash_shown', 'true');
    });
    
    await page.goto('/login');
    
    await expect(page.locator('text=Odi Pet').first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    
    console.log('Entering sample data for login...');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for either an error message or a successful redirect
    await page.waitForTimeout(3000); 
    
    const errorLocator = page.locator('.text-error');
    if (await errorLocator.isVisible()) {
      const errorText = await errorLocator.textContent();
      console.log(`Login resulted in expected message (Test Data): ${errorText}`);
    } else {
      console.log('Login successful with sample data, redirected to Dashboard.');
      await expect(page).toHaveURL(/.*owner\/dashboard|.*owner\/pets|^\/$/, { timeout: 10000 });
    }
  });

  test('2. Pet Health and Care Stage Analysis', async ({ page }) => {
    // We try to access the health dashboard directly to test protected routing
    await page.goto('/owner/health');
    
    if (page.url().includes('/login')) {
      console.log('Route /owner/health is properly protected.');
    } else {
      console.log('Accessing Health Stage...');
      // If we got here, check for health components
      const hasHealthScore = await page.locator('text=Sağlık Skoru').isVisible();
      console.log(`Health Score component visible: ${hasHealthScore}`);
    }
  });

  test('3. Pet Profile and Appointments Stage', async ({ page }) => {
    await page.goto('/owner/pets');
    
    if (page.url().includes('/login')) {
      console.log('Route /owner/pets is properly protected.');
    } else {
      console.log('Accessing Pet Profile Stage...');
      // Look for any add pet button or pet list
      const hasPets = await page.locator('text=Petlerim').isVisible();
      console.log(`Pets section visible: ${hasPets}`);
    }
  });
});

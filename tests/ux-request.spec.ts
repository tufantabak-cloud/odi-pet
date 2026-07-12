import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test('User Request Flow', async ({ page }) => {
  const logFindings = [];
  const log = (step, msg) => {
    console.log(`[STEP ${step}] ${msg}`);
    logFindings.push({ step, msg });
  };

  try {
    // Step 1: Login
    log(1, 'Navigating to http://localhost:3000/login');
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(2000);
    
    log(1, 'Attempting to login');
    const emailInput = page.locator('input[type="email"], input[name="email"], [placeholder*="posta"]');
    if (await emailInput.first().isVisible()) {
      await emailInput.first().fill('test@odipet.com');
      
      const passInput = page.locator('input[type="password"], input[name="password"]');
      if (await passInput.first().isVisible()) {
        await passInput.first().fill('123456');
      }

      // Explicitly find the normal login button, not Google/Apple
      const loginBtn = page.locator('button').filter({ hasText: /^Giriş Yap$/ });
      if (await loginBtn.first().isVisible()) {
          await loginBtn.first().click();
          await page.waitForTimeout(3000);
      } else {
          log(1, 'Could not find exact "Giriş Yap" button. Trying fallback.');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(3000);
      }
      
      // Check if still on login
      if (page.url().includes('login')) {
         log(1, 'Login with 123456 failed or still on login, trying password "test1234"');
         if (await passInput.first().isVisible()) await passInput.first().fill('test1234');
         if (await loginBtn.first().isVisible()) await loginBtn.first().click();
         else await page.keyboard.press('Enter');
         await page.waitForTimeout(3000);
      }
      
      if (page.url().includes('login')) {
         log(1, 'Login with test1234 failed or still on login, trying password "password"');
         if (await passInput.first().isVisible()) await passInput.first().fill('password');
         if (await loginBtn.first().isVisible()) await loginBtn.first().click();
         else await page.keyboard.press('Enter');
         await page.waitForTimeout(3000);
      }
    }

    log(1, `Current URL after login phase: ${page.url()}`);

    // Step 2: Select the pet "Odi"
    log(2, 'Looking for pet "Odi" or direct navigation to 11b747b8-b719-4fe3-a782-7cd4cad70bc7');
    const petUrlPart = '11b747b8-b719-4fe3-a782-7cd4cad70bc7';
    
    await page.goto(`http://localhost:3000/owner/pets/${petUrlPart}`);
    await page.waitForTimeout(3000);
    log(2, `Navigated to pet profile: ${page.url()}`);
    
    // Step 3: Click "Plan Yap" (or "+ Ekle" / Plan), select "Aşı" category, create "Kuduz Aşısı" plan
    log(3, 'Looking for "Plan Yap" or "+ Ekle" button');
    
    await page.screenshot({ path: 'step3_pet_profile.png' });
    
    const planBtn = page.locator('button:has-text("Plan Yap"), button:has-text("+ Ekle"), button:has-text("Plan Ekle"), [data-testid="add-plan-button"]');
    
    let btnClicked = false;
    if (await planBtn.first().isVisible()) {
      await planBtn.first().click();
      log(3, 'Clicked Plan Yap / Ekle button directly');
      btnClicked = true;
    } else {
      log(3, 'Plan Yap button not visible, checking for floating action button or others');
      const allBtns = await page.locator('button').allInnerTexts();
      log(3, `Available buttons: ${allBtns.join(', ')}`);
      
      const plusBtn = page.locator('button').filter({ hasText: '+' });
      if (await plusBtn.first().isVisible()) {
          await plusBtn.first().click();
          log(3, 'Clicked "+" button');
          btnClicked = true;
      }
    }
    
    if (btnClicked) {
      await page.waitForTimeout(2000);
      log(3, 'Looking for "Aşı" category');
      
      const categoryAshi = page.locator('text="Aşı", text="AŞI", [value="Aşı"], [value="vaccine"], [value="vaccination"]');
      if (await categoryAshi.first().isVisible()) {
         await categoryAshi.first().click();
         log(3, 'Selected Aşı category');
      } else {
         log(3, 'Aşı category not directly visible, trying select inputs');
         const selects = page.locator('select');
         if (await selects.count() > 0) {
            await selects.first().selectOption({ label: 'Aşı' }).catch(() => log(3, 'Could not select Aşı by label'));
         }
      }
      
      await page.waitForTimeout(1000);
      
      log(3, 'Entering "Kuduz Aşısı" as plan name/title');
      const inputTitle = page.locator('input[type="text"], textarea');
      if (await inputTitle.first().isVisible()) {
         await inputTitle.first().fill('Kuduz Aşısı');
      }
      
      const dateInput = page.locator('input[type="date"]');
      if (await dateInput.first().isVisible()) {
         const tomorrow = new Date();
         tomorrow.setDate(tomorrow.getDate() + 1);
         await dateInput.first().fill(tomorrow.toISOString().split('T')[0]);
      }
      
      const submitBtn = page.locator('button:has-text("Kaydet"), button:has-text("Oluştur"), button[type="submit"]');
      if (await submitBtn.first().isVisible()) {
         await submitBtn.first().click();
         log(3, 'Clicked submit/save button');
      } else {
         log(3, 'Could not find submit button');
      }
      await page.waitForTimeout(3000);
    } else {
      log(3, 'Could not initiate plan creation, skipping form filling');
    }

    // Step 4: Navigate to `/owner/pets/11b747b8-b719-4fe3-a782-7cd4cad70bc7/vaccines` and verify
    log(4, 'Navigating to vaccines page');
    await page.goto(`http://localhost:3000/owner/pets/${petUrlPart}/vaccines`);
    await page.waitForTimeout(3000);
    
    const pageText = await page.locator('body').innerText();
    const isVisible = pageText.includes('Kuduz') || pageText.includes('Kuduz Aşısı');
    log(4, `Vaccines page URL: ${page.url()}`);
    log(4, `Is "Kuduz" visible on page? ${isVisible}`);
    await page.screenshot({ path: 'step4_vaccines.png' });

    // Step 5: Refresh the page and verify
    log(5, 'Refreshing the vaccines page');
    const response = await page.reload();
    await page.waitForTimeout(3000);
    
    log(5, `Response status after refresh: ${response?.status()}`);
    
    const pageTextAfter = await page.locator('body').innerText();
    const isVisibleAfter = pageTextAfter.includes('Kuduz') || pageTextAfter.includes('Kuduz Aşısı');
    log(5, `Is "Kuduz" visible after refresh? ${isVisibleAfter}`);
    
    const errorIndicators = ['400', 'Bad Request', 'Hata', 'Error'];
    const hasError = errorIndicators.some(err => pageTextAfter.includes(err));
    log(5, `Did we find any error indicators? ${hasError}`);
    await page.screenshot({ path: 'step5_after_refresh.png' });
    
  } catch (error) {
    log('ERROR', error.toString());
  }

  fs.writeFileSync('test_findings.json', JSON.stringify(logFindings, null, 2));
});

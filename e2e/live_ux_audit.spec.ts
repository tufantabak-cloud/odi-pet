import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Live UX Audit', async ({ page }) => {
  const report: any = {
    site: "https://odi-petcare.vercel.app/",
    account_type: "test_account",
    login_result: {
      status: "fail",
      duration_seconds: 0,
      error: ""
    },
    modules: [],
    summary: {
      passed_modules: 0,
      failed_modules: 0,
      skipped_modules: 0,
      blocker_issues: [],
      major_issues: [],
      minor_issues: [],
      recommended_actions: []
    }
  };

  const screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Helper function to measure performance
  async function runStep(moduleName: string, action: () => Promise<void>) {
    const startTime = Date.now();
    try {
      await action();
      const duration = (Date.now() - startTime) / 1000;
      report.modules.push({
        module: moduleName,
        status: "pass",
        duration_seconds: duration,
        issue: "",
        screenshot_path: ""
      });
      report.summary.passed_modules++;
    } catch (e: any) {
      const duration = (Date.now() - startTime) / 1000;
      const screenshotName = `${moduleName}_fail.png`;
      const screenshotPath = path.join(screenshotsDir, screenshotName);
      await page.screenshot({ path: screenshotPath });
      
      let issueType = "technical_error";
      if (e.message.includes("timeout")) {
        if (duration >= 90) issueType = "stuck_confirmed";
        else if (duration >= 45) issueType = "stuck_candidate";
      } else if (e.message.includes("selector") || e.message.includes("locator")) {
        issueType = "missing_selector";
      } else if (e.message.includes("click") || e.message.includes("intercepted")) {
        issueType = "blocked_action";
      }

      report.modules.push({
        module: moduleName,
        status: "fail",
        duration_seconds: duration,
        issue: `${issueType}: ${e.message}`,
        screenshot_path: screenshotPath
      });
      report.summary.failed_modules++;
      report.summary.blocker_issues.push(`${moduleName} failed: ${e.message}`);
    }
  }

  // --- Step 1: Login ---
  const loginStart = Date.now();
  try {
    await page.goto('https://odi-petcare.vercel.app/login');
    await page.fill('input[name="email"]', 'ux_test_odipet@odipet.com');
    await page.fill('input[name="password"]', 'odi9191');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard or owner page
    await page.waitForURL(/\/owner\/dashboard|owner\/pets/, { timeout: 25000 });
    report.login_result.status = "pass";
    report.login_result.duration_seconds = (Date.now() - loginStart) / 1000;
  } catch (e: any) {
    report.login_result.status = "fail";
    report.login_result.duration_seconds = (Date.now() - loginStart) / 1000;
    report.login_result.error = e.message;
    await page.screenshot({ path: path.join(screenshotsDir, 'login_fail.png') });
    
    // Save report immediately and exit
    fs.writeFileSync(path.join(process.cwd(), 'test-results', 'odipet-live-ux-report.json'), JSON.stringify(report, null, 2));
    throw e;
  }

  // --- Step 2: Dashboard ---
  let petId = '';
  await runStep('dashboard', async () => {
    await page.waitForURL(/\/owner\/dashboard/, { timeout: 15000 });
    await expect(page.locator('text=Merhaba').first()).toBeVisible({ timeout: 15000 });
  });

  // --- Step 3: Pet Detail / Pet Add ---
  await runStep('pet_detail_or_pet_add', async () => {
    const petCard = page.locator('a[href*="/owner/pets/"]').first();
    const hasPet = await petCard.count() > 0;
    
    if (hasPet) {
      console.log('Pet found, navigating to detail page...');
      const href = await petCard.getAttribute('href');
      petId = href ? href.split('/').pop() || '' : '';
      await petCard.click();
      await page.waitForURL(/\/owner\/pets\//, { timeout: 15000 });
    } else {
      console.log('No pet found, creating test pet...');
      await page.goto('https://odi-petcare.vercel.app/owner/pets/add');
      await page.fill('input[name="name"]', 'Testo');
      const dogLabel = page.locator('label:has-text("Köpek")');
      await dogLabel.click();
      await page.fill('input[name="birth_date"]', '2024-01-01');
      const continueBtn = page.locator('button:has-text("Devam Et"), button[type="submit"]');
      await continueBtn.click();
      await page.waitForURL(/\/owner\/pets\//, { timeout: 20000 });
      const currentUrl = page.url();
      petId = currentUrl.split('/').pop() || '';
    }
    
    if (!petId) {
      throw new Error("Failed to resolve petId");
    }
  });

  // --- Step 4: Next Step Card (Smart Card) ---
  await runStep('next_step_card', async () => {
    await page.goto('https://odi-petcare.vercel.app/owner/dashboard');
    // We search for a card that has "Bugün", "Öneri", or similar, or the SMART Card layout
    const smartCard = page.locator('div:has-text("Bugün"), div:has-text("Öneri"), div:has-text("Aşı")').first();
    await expect(smartCard).toBeVisible({ timeout: 10000 });
  });

  // --- Step 5: Vaccine Module ---
  await runStep('vaccine', async () => {
    await page.goto(`https://odi-petcare.vercel.app/owner/pets/${petId}/vaccines`);
    await page.waitForLoadState('networkidle');
    const header = page.locator('h1, h2, h3, button:has-text("Takvim"), button:has-text("Kayıtlar")').first();
    await expect(header).toBeVisible({ timeout: 15000 });
  });

  // --- Step 6: Parasite Module ---
  await runStep('parasite', async () => {
    await page.goto(`https://odi-petcare.vercel.app/owner/pets/${petId}/parasite`);
    await page.waitForLoadState('networkidle');
    const header = page.locator('h1, h2, h3, div:has-text("Parazit"), div:has-text("parazit")').first();
    await expect(header).toBeVisible({ timeout: 15000 });
  });

  // --- Step 7: Nutrition Module ---
  await runStep('nutrition', async () => {
    await page.goto(`https://odi-petcare.vercel.app/owner/pets/${petId}/nutrition`);
    await page.waitForLoadState('networkidle');
    const header = page.locator('h1, h2, h3, div:has-text("Beslenme"), div:has-text("Mama")').first();
    await expect(header).toBeVisible({ timeout: 15000 });
  });

  // --- Step 8: Budget Module ---
  await runStep('budget', async () => {
    await page.goto(`https://odi-petcare.vercel.app/owner/pets/${petId}/budget`);
    await page.waitForLoadState('networkidle');
    const header = page.locator('h1, h2, h3, div:has-text("Bütçe"), div:has-text("Gider")').first();
    await expect(header).toBeVisible({ timeout: 15000 });
  });

  // --- Step 9: Health Card ---
  await runStep('health_card', async () => {
    await page.goto(`https://odi-petcare.vercel.app/owner/pets/${petId}/reports`);
    await page.waitForLoadState('networkidle');
    const header = page.locator('h1, h2, h3, div:has-text("Sağlık"), div:has-text("Rapor")').first();
    await expect(header).toBeVisible({ timeout: 15000 });
  });

  // --- Step 10: Services ---
  await runStep('services', async () => {
    await page.goto('https://odi-petcare.vercel.app/owner/services');
    await page.waitForLoadState('networkidle');
    const header = page.locator('h1, h2, h3, div:has-text("Hizmetler"), div:has-text("Uzman")').first();
    await expect(header).toBeVisible({ timeout: 15000 });
  });

  // Write final report
  fs.writeFileSync(path.join(process.cwd(), 'test-results', 'odipet-live-ux-report.json'), JSON.stringify(report, null, 2));
});

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Live UX Audit with Turnstile Bypass', async ({ page, context }) => {
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

  // --- Step 1: Login via Supabase Auth API ---
  const loginStart = Date.now();
  try {
    console.log("Attempting direct Supabase auth login...");
    const supabaseUrl = 'https://soautcxgiqhxiaxrubxv.supabase.co';
    const supabaseAnonKey = 'sb_publishable_ypojkLLZ3o4WUI1COXAXdw_mb2kXNJP';
    
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'ux_test_odipet@odipet.com',
        password: 'odi9191'
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase Auth API failed: ${errText}`);
    }

    const sessionData = await res.json();
    console.log("Supabase login successful. Access token received.");

    // Visit login first to establish cookie context
    await page.goto('https://odi-petcare.vercel.app/login');
    
    // Inject cookie and localStorage
    const sessionStr = JSON.stringify(sessionData);
    const base64Session = Buffer.from(sessionStr).toString('base64');
    const cookieValue = `base64-${base64Session}`;

    const chunks: string[] = [];
    for (let i = 0; i < cookieValue.length; i += 4000) {
      chunks.push(cookieValue.slice(i, i + 4000));
    }

    const expiry = sessionData.expires_at ? sessionData.expires_at : Math.floor(Date.now() / 1000) + 3600;
    const cookiesToSet = chunks.map((chunk, index) => ({
      name: `sb-soautcxgiqhxiaxrubxv-auth-token.${index}`,
      value: chunk,
      domain: 'odi-petcare.vercel.app',
      path: '/',
      expires: expiry,
      secure: true,
      sameSite: 'Lax' as const
    }));

    await context.addCookies(cookiesToSet);

    await page.evaluate((data) => {
      localStorage.setItem('sb-soautcxgiqhxiaxrubxv-auth-token', JSON.stringify(data));
    }, sessionData);

    console.log("Cookies injected. Navigating to dashboard...");
    await page.goto('https://odi-petcare.vercel.app/owner/dashboard');
    await page.waitForURL(/\/owner\/dashboard/, { timeout: 20000 });

    report.login_result.status = "pass";
    report.login_result.duration_seconds = (Date.now() - loginStart) / 1000;
  } catch (e: any) {
    report.login_result.status = "fail";
    report.login_result.duration_seconds = (Date.now() - loginStart) / 1000;
    report.login_result.error = e.message;
    await page.screenshot({ path: path.join(screenshotsDir, 'login_fail.png') });
    
    fs.writeFileSync(path.join(process.cwd(), 'test-results', 'odipet-live-ux-report.json'), JSON.stringify(report, null, 2));
    throw e;
  }

  // --- Step 2: Dashboard ---
  let petId = '';
  await runStep('dashboard', async () => {
    await page.waitForLoadState('networkidle');
    
    // Close spotlight / onboarding tour if it appears
    try {
      const tourBtn = page.locator('button:has-text("Devam Et"), button:has-text("Başla"), button:has-text("Kapat")').first();
      if (await tourBtn.isVisible()) {
        await tourBtn.click();
        await page.waitForTimeout(500);
      }
    } catch {}

    const greeting = page.locator('text=/Merhaba|Günaydın|Tünaydın|İyi akşamlar|Hoş Geldiniz/').first();
    await expect(greeting).toBeVisible({ timeout: 15000 });
  });

  // --- Step 3: Pet Detail / Pet Add ---
  await runStep('pet_detail_or_pet_add', async () => {
    // Select pet card link, ensuring it is NOT the "add pet" button (which has add in url)
    const petCard = page.locator('a[href*="/owner/pets/"]:not([href*="/owner/pets/add"])').first();
    const hasPet = await petCard.count() > 0;
    
    if (hasPet) {
      console.log('Pet found, navigating to detail page...');
      const href = await petCard.getAttribute('href');
      petId = href ? href.split('/').pop() || '' : '';
      await petCard.click();
      await page.waitForURL(/\/owner\/pets\//, { timeout: 15000 });
    } else {
      console.log('No pet found, creating test pet via Wizard...');
      await page.goto('https://odi-petcare.vercel.app/owner/pets/add');
      await page.waitForLoadState('networkidle');
      
      // Step 1: Species
      const dogBtn = page.locator('button[data-testid="pet-species-dog-button"], button:has-text("Köpek")').first();
      await dogBtn.click();
      await page.waitForTimeout(1000);

      // Step 2: Details
      await page.fill('#name', 'Testo');
      await page.selectOption('#breed', 'Golden Retriever');
      
      // Check male radio (using force: true since it's sr-only)
      await page.check('input[type="radio"][value="male"]', { force: true });
      
      // Birth date
      await page.fill('input[type="date"]', '2024-01-01');
      
      // Weight
      await page.fill('#weight', '15');
      
      // Continue
      const continueBtn = page.locator('button[data-testid="pet-save-button"], button:has-text("Devam Et")').first();
      await continueBtn.click();
      await page.waitForTimeout(1500);

      // Step 3: Photo
      const fileInput = page.locator('input[type="file"]');
      const mockFilePath = path.join(process.cwd(), 'test-timeout-wizard.png');
      await fileInput.setInputFiles(mockFilePath);
      await page.waitForTimeout(2000);

      const photoBtn = page.locator('button.btn-primary').first();
      await photoBtn.click({ force: true });
      await page.waitForTimeout(2000);

      // Step 4: SOS (Mandatory in this version)
      await page.fill('input[placeholder="Örn: Ali Yılmaz"]', 'Test Kişisi');
      await page.fill('input[placeholder="Örn: 0555 123 4567"]', '05551234567');
      
      // select relation
      await page.selectOption('select:has(option[value="Sahibi"])', 'Sahibi');
      await page.waitForTimeout(500);

      const saveBtn = page.locator('button:has-text("Kaydet ve Tamamla")').first();
      await saveBtn.click({ force: true });

      // Verify success page
      await page.waitForURL(/\/owner\/pets\/add\/success/, { timeout: 25000 });
      console.log("Pet created successfully. Navigating back to dashboard...");

      // Return to dashboard
      await page.goto('https://odi-petcare.vercel.app/owner/dashboard');
      await page.waitForLoadState('networkidle');
      
      const newPetCard = page.locator('a[href*="/owner/pets/"]:not([href*="/owner/pets/add"])').first();
      const href = await newPetCard.getAttribute('href');
      petId = href ? href.split('/').pop() || '' : '';
    }
    
    if (!petId) {
      throw new Error("Failed to resolve petId");
    }
    console.log(`Resolved Pet ID: ${petId}`);
  });

  // --- Step 4: Next Step Card (Smart Card) ---
  await runStep('next_step_card', async () => {
    await page.goto('https://odi-petcare.vercel.app/owner/dashboard');
    await page.waitForLoadState('networkidle');
    const smartCard = page.locator('div:has-text("Bugün"), div:has-text("Öneri"), div:has-text("Aşı"), div:has-text("Parazit")').first();
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

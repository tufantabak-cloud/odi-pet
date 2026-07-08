import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test('Local UX Onboarding Friction Audit', async ({ page, context }) => {
  const screenshotsDir = path.join(process.cwd(), 'test-results', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Set viewport to see below the fold
  await page.setViewportSize({ width: 1280, height: 1200 });

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
  await page.goto('http://localhost:3001/login');
  
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
    domain: 'localhost',
    path: '/',
    expires: expiry,
    secure: false,
    sameSite: 'Lax' as const
  }));

  await context.addCookies(cookiesToSet);

  await page.evaluate((data) => {
    localStorage.setItem('sb-soautcxgiqhxiaxrubxv-auth-token', JSON.stringify(data));
  }, sessionData);

  console.log("Navigating to pet wizard...");
  await page.goto('http://localhost:3001/owner/pets/add');
  await page.waitForLoadState('networkidle');
  
  // Step 1: Species
  const dogBtn = page.locator('button[data-testid="pet-species-dog-button"], button:has-text("Köpek")').first();
  await dogBtn.click();
  await page.waitForTimeout(1000);

  // Step 2: Details
  await page.fill('#name', 'Testo_Branch2');
  await page.selectOption('#breed', 'Golden Retriever');
  await page.check('input[type="radio"][value="male"]', { force: true });
  await page.fill('input[type="date"]', '2024-01-01');
  await page.fill('[data-testid="pet-weight-input"]', '15');
  
  const continueBtn = page.locator('button[data-testid="pet-save-button"], button:has-text("Devam Et")').first();
  await continueBtn.click();
  await page.waitForTimeout(2000);

  // Step 3: Photo (Click skip button)
  const skipPhotoBtn = page.locator('[data-testid="pet-photo-skip-button"]').first();
  await expect(skipPhotoBtn).toBeVisible({ timeout: 10000 });
  await skipPhotoBtn.click({ force: true });
  await page.waitForTimeout(2500);

  // Step 4: SOS (Click skip button)
  const skipSosBtn = page.locator('[data-testid="emergency-contact-skip-button"]').first();
  await expect(skipSosBtn).toBeVisible({ timeout: 10000 });
  await skipSosBtn.click({ force: true });

  // Verify success page
  await page.waitForURL(/\/owner\/pets\/add\/success/, { timeout: 25000 });
  console.log("Onboarding successfully completed using skip options on localhost:3001!");

  // Return to dashboard and take screenshot
  await page.goto('http://localhost:3001/owner/dashboard');
  await page.waitForLoadState('networkidle');
  
  // Scroll down to make sure cards are visible
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: path.join(screenshotsDir, 'dashboard_branch2_scrolled.png') });
});

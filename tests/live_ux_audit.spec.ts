import { test, expect } from '@playwright/test';

test('Verify Live Vercel Onboarding Friction Buttons', async ({ page, context }) => {
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
  await page.goto('https://odi.pet/login');
  
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
    domain: 'odi.pet',
    path: '/',
    expires: expiry,
    secure: true,
    sameSite: 'Lax' as const
  }));

  await context.addCookies(cookiesToSet);

  await page.evaluate((data) => {
    localStorage.setItem('sb-soautcxgiqhxiaxrubxv-auth-token', JSON.stringify(data));
  }, sessionData);

  console.log("Navigating to live pet wizard...");
  await page.goto('https://odi.pet/owner/pets/add');
  await page.waitForLoadState('networkidle');
  
  // Step 1: Species
  const dogBtn = page.locator('button[data-testid="pet-species-dog-button"], button:has-text("Köpek")').first();
  await dogBtn.click();
  await page.waitForTimeout(1000);

  // Step 2: Details
  await page.fill('#name', 'Testo_LiveVerify');
  await page.selectOption('#breed', 'Golden Retriever');
  await page.check('input[type="radio"][value="male"]', { force: true });
  await page.fill('input[type="date"]', '2024-01-01');
  await page.fill('[data-testid="pet-weight-input"]', '15');
  
  const continueBtn = page.locator('button[data-testid="pet-save-button"], button:has-text("Devam Et")').first();
  await continueBtn.click();
  await page.waitForTimeout(2000);

  // Verify the new skip buttons exist on Step 3
  const defaultPhotoBtn = page.locator('[data-testid="pet-photo-default-avatar-button"]').first();
  const skipPhotoBtn = page.locator('[data-testid="pet-photo-skip-button"]').first();

  await expect(defaultPhotoBtn).toBeVisible({ timeout: 15000 });
  await expect(skipPhotoBtn).toBeVisible({ timeout: 5000 });
  console.log("SUCCESS: Onboarding friction skip buttons verified on live Vercel deployment!");
});

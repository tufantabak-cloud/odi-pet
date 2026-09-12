import { test, expect } from '@playwright/test';

test('Verify Live Vercel touch-target class and page loads', async ({ page, context }) => {
  console.log("Attempting login...");
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

  // Set viewport to mobile to trigger BottomNav
  await page.setViewportSize({ width: 375, height: 812 });

  console.log("Navigating to live dashboard...");
  await page.goto('https://odi.pet/owner/dashboard');
  await page.waitForLoadState('networkidle');

  // Verify Dashboard loads
  await expect(page).toHaveURL(/owner\/dashboard/);

  // Check BottomNav touch target classes
  const navLink = page.locator('nav a').first();
  const classList = await navLink.getAttribute('class');
  console.log("Navigation link classes:", classList);
  expect(classList).toContain('min-h-[44px]');
  expect(classList).toContain('min-w-[44px]');

  console.log("Navigating to live vaccines page...");
  await page.goto('https://odi.pet/owner/pets/1899a1ab-02d9-4074-977f-9bcdf90b4981/vaccines');
  await page.waitForLoadState('networkidle');

  // Verify Vaccines page loads
  await expect(page).toHaveURL(/vaccines/);
  console.log("SUCCESS: Both live pages verified successfully with 44px touch targets active!");
});

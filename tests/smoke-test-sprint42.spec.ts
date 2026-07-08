import { test, expect } from '@playwright/test';

test('Live Vercel Smoke Test for Sprint 4.2', async ({ page, context }) => {
  // Set viewport to mobile 375px
  await page.setViewportSize({ width: 375, height: 812 });

  console.log("1. Authenticating via Supabase API...");
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
    throw new Error(`Auth failed: ${await res.text()}`);
  }

  const sessionData = await res.json();
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

  // Navigate to login page first to establish origin before writing localStorage
  try {
    await page.goto('https://odi-petcare.vercel.app/login', { waitUntil: 'commit' });
  } catch (e: any) {
    if (!e.message.includes('ERR_ABORTED')) throw e;
  }

  await page.evaluate((data) => {
    localStorage.setItem('sb-soautcxgiqhxiaxrubxv-auth-token', JSON.stringify(data));
  }, sessionData);

  console.log("2. Creating temporary pet with missing birth_date...");
  const petRes = await fetch(`${supabaseUrl}/rest/v1/pets`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${sessionData.access_token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      owner_id: sessionData.user.id,
      name: 'Milo_SmokeTest',
      species: 'dog',
      breed: 'Golden Retriever',
      gender: 'male',
      birth_date: null
    })
  });

  if (!petRes.ok) {
    throw new Error(`Failed to create pet: ${await petRes.text()}`);
  }

  const petData = await petRes.json();
  const petId = petData[0].id;

  // Add to pet_owners
  await fetch(`${supabaseUrl}/rest/v1/pet_owners`, {
    method: 'POST',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${sessionData.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      pet_id: petId,
      profile_id: sessionData.user.id,
      role: 'owner'
    })
  });

  try {
    console.log("3. Checking Pet Detail page first (No cache)...");
    await page.goto(`https://odi-petcare.vercel.app/owner/pets/${petId}`);
    await page.waitForLoadState('networkidle');

    const detailMicroTaskCard = page.locator('text=yaş bilgisini tamamlayalım').first();
    await expect(detailMicroTaskCard).toBeVisible({ timeout: 15000 });
    console.log("SUCCESS: micro task card is visible in Pet Detail Ozet tab!");

    // Capture detail page screenshot
    await page.screenshot({ path: 'tests/detail_smoke.png' });

    console.log("4. Verifying redirect and highlight on Edit page...");
    const addBtn = page.locator('button:has-text("Şimdi Ekle")').first();
    await addBtn.click();
    await page.waitForURL(new RegExp(`/owner/pets/${petId}/edit`));
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('highlight=birthDate');
    console.log("SUCCESS: redirected to edit page with highlight query!");

    const highlightContainer = page.locator('[data-highlight="birthDate"]').first();
    await expect(highlightContainer).toHaveClass(/ring-2/);
    console.log("SUCCESS: birthDate field is highlighted with ring-2!");

    // Capture edit page screenshot
    await page.screenshot({ path: 'tests/edit_highlight_smoke.png' });

    console.log("5. Waiting 60 seconds for Dashboard query cache (unstable_cache 60s) to expire...");
    await page.waitForTimeout(60000);

    console.log("6. Navigating to Dashboard to verify card...");
    try {
      await page.goto('https://odi-petcare.vercel.app/owner/dashboard', { waitUntil: 'load', timeout: 30000 });
    } catch (e: any) {
      if (!e.message.includes('ERR_ABORTED')) throw e;
    }
    await page.waitForLoadState('networkidle');

    // Select our newly created pet in the slider
    console.log("Selecting newly created pet in slider...");
    const petSliderItem = page.locator(`text=Milo_SmokeTest`).first();
    await petSliderItem.click();
    await page.waitForTimeout(2000);

    console.log("Checking for missing_birth_date micro task card on Dashboard...");
    const microTaskCard = page.locator('text=yaş bilgisini tamamlayalım').first();
    await expect(microTaskCard).toBeVisible({ timeout: 15000 });
    console.log("SUCCESS: micro task card is visible on dashboard!");

    // Capture dashboard screenshot
    await page.screenshot({ path: 'tests/dashboard_smoke.png' });

  } finally {
    console.log("7. Cleaning up test pet...");
    await fetch(`${supabaseUrl}/rest/v1/pets?id=eq.${petId}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${sessionData.access_token}`
      }
    });
    console.log("Cleanup done.");
  }
});


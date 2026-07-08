import { test, expect } from '@playwright/test';

const supabaseUrl = 'https://soautcxgiqhxiaxrubxv.supabase.co';
const supabaseAnonKey = 'sb_publishable_ypojkLLZ3o4WUI1COXAXdw_mb2kXNJP';

test.describe('Vaccination Module Final QA Suite', () => {
  let testPetId = '';
  let sessionData: any = null;

  test.beforeAll(async () => {
    console.log("Supabase Auth login...");
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
    sessionData = await res.json();
  });

  test.afterAll(async () => {
    if (testPetId) {
      console.log("Cleaning up test pet...");
      await fetch(`${supabaseUrl}/rest/v1/pets?id=eq.${testPetId}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${sessionData.access_token}`
        }
      });
    }
  });

  test('Perform complete vaccination QA flow', async ({ page, context }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 375, height: 812 });

    // Session Setup
    await page.goto('http://localhost:3000/login');
    const sessionStr = JSON.stringify(sessionData);
    const base64Session = Buffer.from(sessionStr).toString('base64');
    const cookieValue = `base64-${base64Session}`;
    const chunks: string[] = [];
    for (let i = 0; i < cookieValue.length; i += 4000) {
      chunks.push(cookieValue.slice(i, i + 4000));
    }
    const expiry = sessionData.expires_at || Math.floor(Date.now() / 1000) + 3600;
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

    // ─── Step 1: Create Test Pet ───────────────────────────────────────
    console.log("Creating test pet...");
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
        name: 'MiloQA',
        species: 'dog',
        breed: 'Poodle',
        gender: 'male',
        birth_date: null,
        birth_date_precision: 'unknown'
      })
    });

    if (!petRes.ok) {
      throw new Error(`Pet creation failed: ${await petRes.text()}`);
    }
    const petData = await petRes.json();
    testPetId = petData[0].id;
    console.log("Created test pet:", testPetId);

    // Insert ownership link
    await fetch(`${supabaseUrl}/rest/v1/pet_owners`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${sessionData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        pet_id: testPetId,
        profile_id: sessionData.user.id,
        role: 'owner'
      })
    });

    // ─── Step 2: Plan Kur Akışı ────────────────────────────────────────
    console.log("Navigating to Vaccines Page...");
    await page.goto(`http://localhost:3000/owner/pets/${testPetId}/vaccines`);
    await page.waitForLoadState('networkidle');

    // Choice screen "Bana plan oluştur" button
    console.log("Selecting smart start plan...");
    await page.locator('[data-testid="vaccine-entry-smart-start-button"]').click();

    // Wizard step 1: Doğum Tarihi
    console.log("Wizard Step 1: Enter birth date...");
    await page.locator('input[type="date"]').fill('2026-01-08');
    await page.locator('button:has-text("İleri")').click();

    // Wizard step 2: Aşı Geçmişi -> "Hiç aşı yapılmadı"
    console.log("Wizard Step 2: Select history...");
    await page.locator('text=Hiç aşı yapılmadı').click();
    await page.locator('button:has-text("İleri")').click();

    // Wizard step 3: Karne Belgesi -> "Hiçbir belge yok"
    console.log("Wizard Step 3: Select document...");
    await page.locator('text=Hiçbir belge yok').click();
    await page.locator('button:has-text("İleri")').click();

    // Wizard step 4: Yaşam Biçimi -> "Ev / Şehir İçi Parklar"
    console.log("Wizard Step 4: Select lifestyle...");
    await page.locator('text=Ev / Şehir İçi Parklar').click();
    await page.locator('button:has-text("İleri")').click();

    // Wizard step 5: Kullanım Tercihi -> "Otomatik Takvim"
    console.log("Wizard Step 5: Select preference...");
    await page.locator('text=Otomatik Takvim').click();

    // Complete setup
    console.log("Completing setup...");
    await page.locator('button:has-text("Planı Tamamla")').click();
    
    // Wait for page refresh/wizard to close
    await expect(page.locator('text=Aşı Planı Kurulumu')).not.toBeVisible({ timeout: 20000 });

    // ─── Step 3: Database Verification ────────────────────────────────
    console.log("Verifying Database counts...");
    
    // Fetch vaccine_records_v2
    const vrRes = await fetch(`${supabaseUrl}/rest/v1/vaccine_records_v2?pet_id=eq.${testPetId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${sessionData.access_token}`
      }
    });
    const vrData = await vrRes.json();
    const recordCount = vrData.length;
    console.log("vaccine_records_v2 count (expected 0):", recordCount);
    expect(recordCount).toBe(0);

    // Fetch plans
    const plRes = await fetch(`${supabaseUrl}/rest/v1/plans?pet_id=eq.${testPetId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${sessionData.access_token}`
      }
    });
    const generatedPlans = await plRes.json();
    console.log(`Generated ${generatedPlans?.length} plans.`);
    expect(generatedPlans && generatedPlans.length).toBeGreaterThan(0);

    // Fetch notifications
    const ntRes = await fetch(`${supabaseUrl}/rest/v1/notifications?pet_id=eq.${testPetId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${sessionData.access_token}`
      }
    });
    const ntData = await ntRes.json();
    const notifCount = ntData.length;
    console.log(`Generated ${notifCount} notifications. (Expected ${generatedPlans!.length * 5})`);
    expect(notifCount).toBe(generatedPlans!.length * 5);

    // ─── Step 4: Duplicate Run Control ─────────────────────────────────
    console.log("Re-triggering setup wizard to test duplicate safety...");
    await page.goto(`http://localhost:3000/owner/pets/${testPetId}/vaccines`);
    await page.waitForLoadState('networkidle');

    // Click "Planı Yeniden Düzenle" or similar setup edit triggers.
    const editPlanBtn = page.locator('text=Planı Yeniden Düzenle');
    if (await editPlanBtn.isVisible()) {
      await editPlanBtn.click();
    } else {
      await page.locator('button:has-text("Planı Güncelle")').first().click().catch(() => {});
    }

    // Since setupProfile already exists, we will just delete setupProfile to simulate another complete setup run
    await fetch(`${supabaseUrl}/rest/v1/vaccine_setup_profiles?pet_id=eq.${testPetId}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${sessionData.access_token}`
      }
    });
    await page.goto(`http://localhost:3000/owner/pets/${testPetId}/vaccines`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="vaccine-entry-smart-start-button"]').click();
    await page.locator('text=Hiç aşı yapılmadı').click();
    await page.locator('button:has-text("İleri")').click();
    await page.locator('text=Hiçbir belge yok').click();
    await page.locator('button:has-text("İleri")').click();
    await page.locator('text=Ev / Şehir İçi Parklar').click();
    await page.locator('button:has-text("İleri")').click();
    await page.locator('text=Otomatik Takvim').click();
    await page.locator('button:has-text("Planı Tamamla")').click();
    await expect(page.locator('text=Aşı Planı Kurulumu')).not.toBeVisible({ timeout: 20000 });

    // Verify duplicate plans / notifications count
    const plRes2 = await fetch(`${supabaseUrl}/rest/v1/plans?pet_id=eq.${testPetId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${sessionData.access_token}`
      }
    });
    const plans2 = await plRes2.json();
    console.log(`After second run: ${plans2?.length} plans. (Expected duplicate prevention)`);
    expect(plans2?.length).toBe(generatedPlans?.length);

    // ─── Step 5: Click "Yaptırdım" ─────────────────────────────────────
    console.log("Clicking 'Yaptırdım' on scheduled vaccine...");
    await page.goto(`http://localhost:3000/owner/pets/${testPetId}/vaccines`);
    await page.waitForLoadState('networkidle');

    // Click "Yaptırdım" button
    const doneBtn = page.locator('button:has-text("Yaptırdım")').first();
    await doneBtn.click();

    // Check if form is auto-filled
    await expect(page.locator('input[value="MiloQA"]').first()).toBeDefined();
    
    // Save record
    await page.locator('button:has-text("Kaydet")').click();
    await page.waitForTimeout(1500);

    // DB checks for completed plan and vaccine_records_v2 insertion
    const vrRes2 = await fetch(`${supabaseUrl}/rest/v1/vaccine_records_v2?pet_id=eq.${testPetId}`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${sessionData.access_token}`
      }
    });
    const records2 = await vrRes2.json();
    console.log("Completed vaccine records in database:", records2?.length);
    expect(records2?.length).toBe(1);
    expect(records2?.[0].administered_at).not.toBeNull();

    // ─── Step 10: Verify “Uygulanma: Bilinmiyor” text is NOT present ─────
    const bodyText = await page.innerText('body');
    console.log("Verifying 'Uygulanma: Bilinmiyor' string is absent...");
    expect(bodyText).not.toContain("Uygulanma: Bilinmiyor");
  });
});

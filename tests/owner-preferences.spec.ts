import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

test.describe('Owner Vaccine and Parasite Preferences E2E Tests', () => {
  let testPetId = '';
  let sessionData: any = null;

  // Temporary vaccine codes and parasite IDs
  const legalCode = 'V_E2E_LEGAL';
  const coreCode = 'V_E2E_CORE';
  const riskCode = 'V_E2E_RISK';
  const optCode = 'V_E2E_OPT';
  let parasiteProtoId = '';

  test.beforeAll(async () => {
    // Authenticate
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@odipet.com',
        password: '123456'
      })
    });

    if (!res.ok) {
      throw new Error(`Auth failed: ${await res.text()}`);
    }
    sessionData = await res.json();

    // Delete any stray protocols or pets from failed test runs
    const vaccineCodes = [legalCode, coreCode, riskCode, optCode];
    await adminClient.from('vaccine_protocols').delete().in('vaccine_code', vaccineCodes);
    await adminClient.from('parasite_protocols').delete().eq('parasite_code', 'P_E2E_TEST');

    // Create active vaccine protocols
    const vaccineProtocols = [
      {
        vaccine_code: legalCode,
        protocol_name: 'E2E Test Legal Vaccine',
        species: 'dog',
        category: 'legal',
        is_active: true,
        is_core: false,
        doses: [{ dose_number: 1, min_age_weeks: 8, label: 'Doz 1' }]
      },
      {
        vaccine_code: coreCode,
        protocol_name: 'E2E Test Core Vaccine',
        species: 'dog',
        category: 'core',
        is_active: true,
        is_core: true,
        doses: [{ dose_number: 1, min_age_weeks: 8, label: 'Doz 1' }]
      },
      {
        vaccine_code: riskCode,
        protocol_name: 'E2E Test Risk Vaccine',
        species: 'dog',
        category: 'risk_based',
        is_active: true,
        is_core: false,
        doses: [{ dose_number: 1, min_age_weeks: 8, label: 'Doz 1' }]
      },
      {
        vaccine_code: optCode,
        protocol_name: 'E2E Test Optional Vaccine',
        species: 'dog',
        category: 'optional',
        is_active: true,
        is_core: false,
        doses: [{ dose_number: 1, min_age_weeks: 8, label: 'Doz 1' }]
      }
    ];

    for (const vp of vaccineProtocols) {
      const { error } = await adminClient.from('vaccine_protocols').insert(vp);
      if (error) {
        throw new Error(`Failed to insert E2E vaccine protocol ${vp.vaccine_code}: ${error.message}`);
      }
    }

    // Create active parasite protocol
    const { data: parData, error: parError } = await adminClient
      .from('parasite_protocols')
      .insert({
        parasite_code: 'P_E2E_TEST',
        protocol_name: 'E2E Test Parasite Protocol',
        parasite_type: 'internal',
        species: 'dog',
        default_protection_duration_days: 30,
        allowed_application_methods: ['spot_on'],
        default_application_method: 'spot_on',
        min_age_weeks: 8,
        is_active: true
      })
      .select('id')
      .single();

    if (parError || !parData) {
      throw new Error(`Failed to insert parasite protocol: ${parError?.message}`);
    }
    parasiteProtoId = parData.id;

    // Create test pet Milo
    const { data: petData, error: petError } = await adminClient
      .from('pets')
      .insert({
        owner_id: sessionData.user.id,
        name: 'Milo_SettingsE2E',
        species: 'dog',
        gender: 'male',
        birth_date: '2020-01-01'
      })
      .select('id')
      .single();

    if (petError || !petData) {
      throw new Error(`Failed to insert test pet: ${petError?.message}`);
    }
    testPetId = petData.id;

    // Add ownership link
    const { error: ownerError } = await adminClient
      .from('pet_owners')
      .insert({
        pet_id: testPetId,
        profile_id: sessionData.user.id,
        role: 'owner'
      });

    if (ownerError) {
      throw new Error(`Failed to insert pet owner: ${ownerError.message}`);
    }
  });

  test.afterAll(async () => {
    // Clean up preferences
    if (testPetId) {
      await adminClient.from('pet_vaccine_preferences').delete().eq('pet_id', testPetId);
      await adminClient.from('pet_parasite_preferences').delete().eq('pet_id', testPetId);
      
      // Clean up pet and its owners
      await adminClient.from('pet_owners').delete().eq('pet_id', testPetId);
      await adminClient.from('pets').delete().eq('id', testPetId);
    }

    // Clean up protocols
    const vaccineCodes = [legalCode, coreCode, riskCode, optCode];
    await adminClient.from('vaccine_protocols').delete().in('vaccine_code', vaccineCodes);

    if (parasiteProtoId) {
      await adminClient.from('parasite_protocols').delete().eq('id', parasiteProtoId);
    }
  });

  test('Perform Vaccine and Parasite Settings E2E Flow', async ({ page, context }) => {
    test.setTimeout(60000);

    // Console and Network logging
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log('BAD RESPONSE:', response.status(), response.url());
      }
    });

    // Set viewport to mobile width 320px
    await page.setViewportSize({ width: 320, height: 568 });

    // Inject Session
    await page.goto('http://localhost:3000/login');
    const sessionStr = JSON.stringify(sessionData);
    const base64Session = Buffer.from(sessionStr).toString('base64');
    const cookiesToSet = [{
      name: `sb-soautcxgiqhxiaxrubxv-auth-token.0`,
      value: `base64-${base64Session}`,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 3600,
      secure: false,
      sameSite: 'Lax' as const
    }];
    await context.addCookies(cookiesToSet);
    await page.evaluate((data) => {
      localStorage.setItem('sb-soautcxgiqhxiaxrubxv-auth-token', JSON.stringify(data));
    }, sessionData);

    // 1. Navigate to Settings page
    await page.goto('http://localhost:3000/owner/profile/vaccine-settings');
    await page.waitForLoadState('networkidle');

    // 2. Pet Selection: verify Milo_SettingsE2E button exists and click it
    const petBtn = page.locator('button', { hasText: 'Milo_SettingsE2E' });
    await expect(petBtn).toBeVisible({ timeout: 10000 });
    await petBtn.click();
    await page.waitForTimeout(1000);

    // 3. Aşılar Tab:
    // Verify tabs are visible
    const vacTab = page.locator('button', { hasText: 'Aşılar' });
    const parTab = page.locator('button', { hasText: 'Parazitler' });
    await expect(vacTab).toBeVisible();
    await expect(parTab).toBeVisible();

    // Verify Legal vaccine is open and locked (ZORUNLU badge, text: Zorunlu olarak aktif)
    const legalCard = page.locator('.bg-white', { hasText: 'E2E Test Legal Vaccine' });
    await expect(legalCard).toBeVisible();
    await expect(legalCard.locator('text=ZORUNLU').first()).toBeVisible();
    await expect(legalCard.locator('text=Zorunlu olarak aktif')).toBeVisible();
    await expect(legalCard.locator('text=🔒').first()).toBeVisible();

    // Verify Core vaccine is open and locked
    const coreCard = page.locator('.bg-white', { hasText: 'E2E Test Core Vaccine' });
    await expect(coreCard).toBeVisible();
    await expect(coreCard.locator('text=ZORUNLU').first()).toBeVisible();
    await expect(coreCard.locator('text=Zorunlu olarak aktif')).toBeVisible();

    // Verify Risk vaccine is toggleable and default-enabled is true (bg-primary class)
    const riskCard = page.locator('.bg-white', { hasText: 'E2E Test Risk Vaccine' });
    await expect(riskCard).toBeVisible();
    const riskToggle = riskCard.locator('button').first();
    await expect(riskToggle).toBeVisible();
    await expect(riskToggle).toHaveClass(/bg-primary/);

    // Click Risk toggle to turn off
    await riskToggle.click();
    await page.waitForTimeout(1000);
    // Verify toggle turned off (bg-slate-200 or similar, no bg-primary)
    await expect(riskToggle).not.toHaveClass(/bg-primary/);

    // Toggle back on
    await riskToggle.click();
    await page.waitForTimeout(1000);
    await expect(riskToggle).toHaveClass(/bg-primary/);

    // Verify Optional vaccine toggle
    const optCard = page.locator('.bg-white', { hasText: 'E2E Test Optional Vaccine' });
    await expect(optCard).toBeVisible();
    const optToggle = optCard.locator('button').first();
    await expect(optToggle).toBeVisible();
    await expect(optToggle).toHaveClass(/bg-primary/);

    // 4. Parazitler Tab:
    await parTab.click();
    await page.waitForTimeout(1000);

    // Verify parasite protocol is listed
    const parCard = page.locator('.bg-white', { hasText: 'E2E Test Parasite Protocol' });
    await expect(parCard).toBeVisible();
    await expect(parCard.locator('text=İç Parazit')).toBeVisible();
    await expect(parCard.locator('text=Koruma Süresi: 30 gün')).toBeVisible();
    await expect(parCard.locator('text=Min. Yaş: 8 haftalık')).toBeVisible();
    await expect(parCard.locator('text=Yöntemler: Damlama')).toBeVisible();

    // Verify parasite toggle
    const parToggle = parCard.locator('button');
    await expect(parToggle).toBeVisible();
    await expect(parToggle).toHaveClass(/bg-primary/);

    // Click to turn off
    await parToggle.click();
    await page.waitForTimeout(1000);
    await expect(parToggle).not.toHaveClass(/bg-primary/);

    // 5. Test rollback on API error
    // We will intercept the PATCH endpoint and return 500 error
    await page.route('**/api/pets/**/parasite-preferences', route => {
      route.fulfill({
        status: 500,
        json: { error: 'INACTIVE_PROTOCOL' }
      });
    });

    // Try to toggle back on
    await parToggle.click();
    await page.waitForTimeout(1000);
    
    // Should show error message and rollback to off (not bg-primary)
    await expect(parToggle).not.toHaveClass(/bg-primary/);
    const errorAlert = page.locator('text=Bu protokol yönetici tarafından pasife alınmış.');
    await expect(errorAlert).toBeVisible();
  });
});

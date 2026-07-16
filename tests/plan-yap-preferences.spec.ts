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

test.describe('Plan Yap Preference Filtering E2E Tests', () => {
  let testPetIdDog = '';
  let testPetIdCat = '';
  let sessionData: any = null;

  // Vaccine codes
  const legalCode = 'V_PLANYAP_LEGAL';
  const coreCode = 'V_PLANYAP_CORE';
  const riskCode = 'V_PLANYAP_RISK';
  const optCode = 'V_PLANYAP_OPT';
  const inactiveCode = 'V_PLANYAP_INACTIVE';
  const catVaccineCode = 'V_PLANYAP_CAT';

  // Parasite protocols
  let dogParasiteProtoId = '';
  let dogParasiteProtoIdDisabled = '';
  let catParasiteProtoId = '';
  let inactiveParasiteProtoId = '';

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

    // Clean up any stray protocols/pets
    const vaccineCodes = [legalCode, coreCode, riskCode, optCode, inactiveCode, catVaccineCode];
    await adminClient.from('vaccine_protocols').delete().in('vaccine_code', vaccineCodes);
    await adminClient.from('parasite_protocols').delete().in('parasite_code', ['P_PY_DOG', 'P_PY_DOG_DIS', 'P_PY_CAT', 'P_PY_INACTIVE']);

    // Create vaccine protocols
    const vaccineProtocols = [
      {
        vaccine_code: legalCode,
        protocol_name: 'PY Legal Vaccine',
        species: 'dog',
        category: 'legal',
        is_active: true,
        is_core: false,
        doses: [{ dose_number: 1, min_age_weeks: 8, label: 'D1' }]
      },
      {
        vaccine_code: coreCode,
        protocol_name: 'PY Core Vaccine',
        species: 'dog',
        category: 'core',
        is_active: true,
        is_core: true,
        doses: [{ dose_number: 1, min_age_weeks: 8, label: 'D1' }]
      },
      {
        vaccine_code: riskCode,
        protocol_name: 'PY Risk Vaccine',
        species: 'dog',
        category: 'risk_based',
        is_active: true,
        is_core: true, // category=risk_based, is_core=true case
        doses: [{ dose_number: 1, min_age_weeks: 8, label: 'D1' }]
      },
      {
        vaccine_code: optCode,
        protocol_name: 'PY Optional Vaccine',
        species: 'dog',
        category: 'optional',
        is_active: true,
        is_core: false,
        doses: [{ dose_number: 1, min_age_weeks: 8, label: 'D1' }]
      },
      {
        vaccine_code: inactiveCode,
        protocol_name: 'PY Inactive Vaccine',
        species: 'dog',
        category: 'optional',
        is_active: false,
        is_core: false,
        doses: [{ dose_number: 1, min_age_weeks: 8, label: 'D1' }]
      },
      {
        vaccine_code: catVaccineCode,
        protocol_name: 'PY Cat Vaccine',
        species: 'cat',
        category: 'legal',
        is_active: true,
        is_core: false,
        doses: [{ dose_number: 1, min_age_weeks: 8, label: 'D1' }]
      }
    ];

    for (const vp of vaccineProtocols) {
      await adminClient.from('vaccine_protocols').insert(vp);
    }

    // Create parasite protocols
    const { data: p1 } = await adminClient.from('parasite_protocols').insert({
      parasite_code: 'P_PY_DOG',
      protocol_name: 'PY Dog Parasite',
      parasite_type: 'internal',
      species: 'dog',
      default_protection_duration_days: 30,
      allowed_application_methods: ['spot_on'],
      default_application_method: 'spot_on',
      min_age_weeks: 8,
      is_active: true
    }).select('id').single();
    dogParasiteProtoId = p1!.id;

    const { data: p2 } = await adminClient.from('parasite_protocols').insert({
      parasite_code: 'P_PY_DOG_DIS',
      protocol_name: 'PY Dog Parasite Disabled',
      parasite_type: 'external',
      species: 'dog',
      default_protection_duration_days: 30,
      allowed_application_methods: ['spot_on'],
      default_application_method: 'spot_on',
      min_age_weeks: 8,
      is_active: true
    }).select('id').single();
    dogParasiteProtoIdDisabled = p2!.id;

    const { data: p3 } = await adminClient.from('parasite_protocols').insert({
      parasite_code: 'P_PY_CAT',
      protocol_name: 'PY Cat Parasite',
      parasite_type: 'internal',
      species: 'cat',
      default_protection_duration_days: 30,
      allowed_application_methods: ['spot_on'],
      default_application_method: 'spot_on',
      min_age_weeks: 8,
      is_active: true
    }).select('id').single();
    catParasiteProtoId = p3!.id;

    const { data: p4 } = await adminClient.from('parasite_protocols').insert({
      parasite_code: 'P_PY_INACTIVE',
      protocol_name: 'PY Inactive Parasite',
      parasite_type: 'internal',
      species: 'dog',
      default_protection_duration_days: 30,
      allowed_application_methods: ['spot_on'],
      default_application_method: 'spot_on',
      min_age_weeks: 8,
      is_active: false
    }).select('id').single();
    inactiveParasiteProtoId = p4!.id;

    // Create pets
    const { data: petDog } = await adminClient.from('pets').insert({
      owner_id: sessionData.user.id,
      name: 'Dog_PlanYapE2E',
      species: 'dog',
      gender: 'male',
      birth_date: '2020-01-01'
    }).select('id').single();
    testPetIdDog = petDog!.id;

    const { data: petCat } = await adminClient.from('pets').insert({
      owner_id: sessionData.user.id,
      name: 'Cat_PlanYapE2E',
      species: 'cat',
      gender: 'female',
      birth_date: '2020-01-01'
    }).select('id').single();
    testPetIdCat = petCat!.id;

    // Ownership links
    await adminClient.from('pet_owners').insert([
      { pet_id: testPetIdDog, profile_id: sessionData.user.id, role: 'owner' },
      { pet_id: testPetIdCat, profile_id: sessionData.user.id, role: 'owner' }
    ]);

    // Create vaccine disabled preferences for Dog
    await adminClient.from('pet_vaccine_preferences').insert([
      { pet_id: testPetIdDog, vaccine_code: riskCode, enabled: false },
      { pet_id: testPetIdDog, vaccine_code: optCode, enabled: false }
    ]);

    // Create parasite disabled preference for Dog
    await adminClient.from('pet_parasite_preferences').insert([
      { pet_id: testPetIdDog, parasite_protocol_id: dogParasiteProtoIdDisabled, enabled: false }
    ]);
  });

  test.afterAll(async () => {
    // Delete preferences & plans
    if (testPetIdDog) {
      await adminClient.from('pet_vaccine_preferences').delete().eq('pet_id', testPetIdDog);
      await adminClient.from('pet_parasite_preferences').delete().eq('pet_id', testPetIdDog);
      await adminClient.from('plans').delete().eq('pet_id', testPetIdDog);
      await adminClient.from('pet_owners').delete().eq('pet_id', testPetIdDog);
      await adminClient.from('pets').delete().eq('id', testPetIdDog);
    }
    if (testPetIdCat) {
      await adminClient.from('pet_vaccine_preferences').delete().eq('pet_id', testPetIdCat);
      await adminClient.from('pet_parasite_preferences').delete().eq('pet_id', testPetIdCat);
      await adminClient.from('plans').delete().eq('pet_id', testPetIdCat);
      await adminClient.from('pet_owners').delete().eq('pet_id', testPetIdCat);
      await adminClient.from('pets').delete().eq('id', testPetIdCat);
    }

    // Delete protocols
    const vaccineCodes = [legalCode, coreCode, riskCode, optCode, inactiveCode, catVaccineCode];
    await adminClient.from('vaccine_protocols').delete().in('vaccine_code', vaccineCodes);
    await adminClient.from('parasite_protocols').delete().in('id', [dogParasiteProtoId, dogParasiteProtoIdDisabled, catParasiteProtoId, inactiveParasiteProtoId]);
  });

  test('Verify Plan Yap UI and Backend Safety Rules', async ({ page, context }) => {
    test.setTimeout(60000);

    // Set mobile viewport
    await page.setViewportSize({ width: 320, height: 568 });

    // Inject Session
    await page.goto('http://localhost:3000/login');
    const sessionStr = JSON.stringify(sessionData);
    const base64Session = Buffer.from(sessionStr).toString('base64');
    await context.addCookies([{
      name: `sb-soautcxgiqhxiaxrubxv-auth-token.0`,
      value: `base64-${base64Session}`,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 3600,
      secure: false,
      sameSite: 'Lax' as const
    }]);
    await page.evaluate((data) => {
      localStorage.setItem('sb-soautcxgiqhxiaxrubxv-auth-token', JSON.stringify(data));
    }, sessionData);

    // 1. Check Vaccine Visibility for Dog
    await page.goto(`http://localhost:3000/owner/plan-yap/asi?pet_id=${testPetIdDog}`);
    await page.waitForLoadState('networkidle');

    // Legal & Core must be visible
    await expect(page.locator('text=PY Legal Vaccine').first()).toBeVisible();
    await expect(page.locator('text=PY Core Vaccine').first()).toBeVisible();

    // Disabled preference vaccines (PY Risk Vaccine, PY Optional Vaccine) must NOT be visible
    await expect(page.locator('text=PY Risk Vaccine')).not.toBeVisible();
    await expect(page.locator('text=PY Optional Vaccine')).not.toBeVisible();

    // Inactive & Cat vaccines must NOT be visible
    await expect(page.locator('text=PY Inactive Vaccine')).not.toBeVisible();
    await expect(page.locator('text=PY Cat Vaccine')).not.toBeVisible();

    // 2. Check Parasite Visibility for Dog
    // Let's go to SubCategory selection step first if needed, or route directly to parasite
    await page.goto(`http://localhost:3000/owner/plan-yap/parazit?pet_id=${testPetIdDog}`);
    await page.waitForLoadState('networkidle');

    // Click 'İç Parazit' alt kategori
    const internalSubCat = page.locator('button', { hasText: 'İç Parazit' });
    await expect(internalSubCat).toBeVisible();
    await internalSubCat.click();
    await page.waitForTimeout(1000);

    // PY Dog Parasite (internal, enabled=true by default) must be visible
    await expect(page.locator('text=PY Dog Parasite').first()).toBeVisible();

    // Inactive & Cat parasite protocols must NOT be visible
    await expect(page.locator('text=PY Inactive Parasite')).not.toBeVisible();
    await expect(page.locator('text=PY Cat Parasite')).not.toBeVisible();

    // Re-navigate back to parasite category to select Dış Parazit
    await page.goto(`http://localhost:3000/owner/plan-yap/parazit?pet_id=${testPetIdDog}`);
    await page.waitForLoadState('networkidle');
    const externalSubCat = page.locator('button', { hasText: 'Dış Parazit' });
    await expect(externalSubCat).toBeVisible();
    await externalSubCat.click();
    await page.waitForTimeout(1000);

    // PY Dog Parasite Disabled (external, enabled=false preference) must NOT be visible
    await expect(page.locator('text=PY Dog Parasite Disabled')).not.toBeVisible();

    // 3. Backend Safety Checks
    // Direct POST to /api/plans for disabled vaccine (PY Risk Vaccine) should be rejected
    // Direct POST to /api/plans for disabled vaccine (PY Risk Vaccine) should be rejected
    const vRes = await page.evaluate(async ({ riskCode, testPetIdDog }) => {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: testPetIdDog,
          category: 'asi',
          sub_type: 'PY Risk Vaccine',
          scheduled_at: new Date().toISOString(),
          repeat_rule: null,
          ends_at: null,
          notif_before: 0,
          notif_unit: 'minute',
          note: null,
          extra_data: {
            vaccine_code: riskCode
          }
        })
      });
      return { status: res.status, data: await res.json() };
    }, { riskCode, testPetIdDog });

    expect(vRes.status).toBe(400);
    expect(vRes.data.error).toBe('VACCINE_PREFERENCE_DISABLED');

    // Direct POST to /api/plans for disabled parasite (PY Dog Parasite Disabled) should be rejected
    const pRes = await page.evaluate(async ({ dogParasiteProtoIdDisabled, testPetIdDog }) => {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: testPetIdDog,
          category: 'parazit',
          sub_type: 'PY Dog Parasite Disabled',
          scheduled_at: new Date().toISOString(),
          repeat_rule: null,
          ends_at: null,
          notif_before: 0,
          notif_unit: 'minute',
          note: null,
          extra_data: {
            product: {
              id: dogParasiteProtoIdDisabled
            }
          }
        })
      });
      return { status: res.status, data: await res.json() };
    }, { dogParasiteProtoIdDisabled, testPetIdDog });

    expect(pRes.status).toBe(400);
    expect(pRes.data.error).toBe('PARASITE_PREFERENCE_DISABLED');

    // Direct POST to /api/plans for incompatible species (PY Cat Vaccine on Dog) should be rejected
    const sRes = await page.evaluate(async ({ catVaccineCode, testPetIdDog }) => {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: testPetIdDog,
          category: 'asi',
          sub_type: 'PY Cat Vaccine',
          scheduled_at: new Date().toISOString(),
          repeat_rule: null,
          ends_at: null,
          notif_before: 0,
          notif_unit: 'minute',
          note: null,
          extra_data: {
            vaccine_code: catVaccineCode
          }
        })
      });
      return { status: res.status, data: await res.json() };
    }, { catVaccineCode, testPetIdDog });

    expect(sRes.status).toBe(400);
    expect(sRes.data.error).toBe('PROTOCOL_SPECIES_MISMATCH');
  });
});

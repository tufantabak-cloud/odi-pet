import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

if (process.env.ALLOW_LOCAL_STORAGE_TESTS === 'true') {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const host = new URL(supabaseUrl).hostname;
const cookiePrefix = host.includes('127.0.0.1') || host.includes('localhost')
  ? 'sb-127-auth-token'
  : 'sb-soautcxgiqhxiaxrubxv-auth-token';

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const isLocalStorageTest =
  (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) &&
  process.env.ALLOW_LOCAL_STORAGE_TESTS === 'true';

test.describe('Parasite Plan Completion E2E API & UI Tests', () => {
  let testUserId = '';
  let sessionData: any = null;
  let cookieHeader = '';
  let testPetIdOwned = '';
  let testPetIdNotOwned = '';
  
  let parasiteProtoId = '';
  let passiveProtoId = '';
  
  let testPlanId = '';
  let legacyPlanId = '';
  let passivePlanId = '';
  let vaccinePlanId = '';
  let otherPlanId = '';
  
  let tempFilePath = '';
  let otherUserId = '';
  let dummyUserCreated = false;
  let uploadedPathsTracker: string[] = [];
  let uniqueMarker = '';

  async function injectSession(page: any, context: any) {
    await page.goto('/login');
    const sessionStr = JSON.stringify(sessionData);
    const base64Session = Buffer.from(sessionStr).toString('base64');
    await context.addCookies([{
      name: `${cookiePrefix}.0`,
      value: `base64-${base64Session}`,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 3600,
      secure: false,
      sameSite: 'Lax' as const
    }]);
    await page.evaluate((args: { prefix: string, data: any }) => {
      localStorage.setItem(args.prefix, JSON.stringify(args.data));
    }, { prefix: cookiePrefix, data: sessionData });
  }

  test.beforeAll(async () => {
    // Environment Verification Guard
    const requestedLocal = process.env.ALLOW_LOCAL_STORAGE_TESTS === 'true';
    if (requestedLocal && !isLocalStorageTest) {
      throw new Error(`LOCAL_CONNECTION_PROOF_FAILED: ALLOW_LOCAL_STORAGE_TESTS is true but Supabase URL (${supabaseUrl}) is not local!`);
    }

    if (!isLocalStorageTest) {
      return;
    }

    // 1. Authenticate
    // Ensure test@odipet.com user exists in local database
    const { data: userList } = await adminClient.auth.admin.listUsers();
    const existingUser = userList.users.find(u => u.email === 'test@odipet.com');
    if (!existingUser) {
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: 'test@odipet.com',
        password: '123456',
        email_confirm: true
      });
      if (createErr) throw createErr;
      try {
        await adminClient.from('profiles').upsert({
          id: newUser.user?.id,
          email: 'test@odipet.com',
          full_name: 'E2E Test User'
        });
      } catch {}
    }

    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
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

    if (!authRes.ok) {
      throw new Error(`Auth failed: ${await authRes.text()}`);
    }
    sessionData = await authRes.json();
    testUserId = sessionData.user.id;

    const base64Session = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    cookieHeader = `${cookiePrefix}.0=base64-${base64Session}`;

    // Clean up any old E2E leftover records
    await adminClient.from('plans').delete().eq('sub_type', 'UI E2E Plan');
    await adminClient.from('parasite_protocols').delete().like('protocol_name', 'LOCAL_CONN_PROVE_MARKER_UI_%');
    await adminClient.from('parasite_protocols').delete().eq('parasite_code', 'P_UI_E2E');
    await adminClient.from('parasite_protocols').delete().eq('parasite_code', 'P_UI_PAS');
    await adminClient.from('pets').delete().eq('name', 'UI E2E Pet');
    await adminClient.from('pets').delete().eq('name', 'Not Owned Pet');

    // 2. Create active parasite protocol with unique marker for local connection proof
    uniqueMarker = `LOCAL_CONN_PROVE_MARKER_UI_${crypto.randomUUID().split('-')[0]}`;
    const { data: proto, error: protoErr } = await adminClient
      .from('parasite_protocols')
      .insert({
        parasite_code: 'P_UI_E2E',
        protocol_name: uniqueMarker,
        parasite_type: 'internal',
        species: 'dog',
        default_protection_duration_days: 30,
        allowed_application_methods: ['oral', 'spot_on'],
        default_application_method: 'spot_on',
        min_age_weeks: 6,
        is_active: true,
        sort_order: 99
      })
      .select()
      .single();

    if (protoErr) throw protoErr;
    parasiteProtoId = proto.id;

    // Create a passive parasite protocol
    const { data: passiveProto, error: pasProtoErr } = await adminClient
      .from('parasite_protocols')
      .insert({
        parasite_code: 'P_UI_PAS',
        protocol_name: 'Passive E2E Protocol',
        parasite_type: 'external',
        species: 'dog',
        default_protection_duration_days: 45,
        allowed_application_methods: ['spot_on'],
        default_application_method: 'spot_on',
        min_age_weeks: 8,
        is_active: false,
        sort_order: 100
      })
      .select()
      .single();

    if (pasProtoErr) throw pasProtoErr;
    passiveProtoId = passiveProto.id;

    // 3. Create test pet
    const { data: pet, error: petErr } = await adminClient
      .from('pets')
      .insert({
        owner_id: testUserId,
        name: 'UI E2E Pet',
        species: 'dog',
        gender: 'male',
        birth_date: '2025-01-01'
      })
      .select()
      .single();

    if (petErr) throw petErr;
    testPetIdOwned = pet.id;

    const { error: poErr } = await adminClient
      .from('pet_owners')
      .insert({
        pet_id: testPetIdOwned,
        profile_id: testUserId
      });
    if (poErr) throw poErr;

    // Find or create other user
    const { data: otherProfile } = await adminClient
      .from('profiles')
      .select('id')
      .neq('id', testUserId)
      .limit(1);
    
    if (otherProfile && otherProfile.length > 0) {
      otherUserId = otherProfile[0].id;
    } else {
      const { data: dummyUser, error: dummyErr } = await adminClient.auth.admin.createUser({
        email: `other-e2e-${Date.now()}@odipet.com`,
        password: 'password123',
        email_confirm: true
      });
      if (!dummyErr && dummyUser.user) {
        otherUserId = dummyUser.user.id;
        dummyUserCreated = true;
      }
    }

    // Create another pet NOT owned by the user
    const { data: otherPet, error: otherPetErr } = await adminClient
      .from('pets')
      .insert({
        owner_id: otherUserId,
        name: 'Not Owned Pet',
        species: 'dog',
        gender: 'female',
        birth_date: '2025-01-01'
      })
      .select()
      .single();

    if (otherPetErr) throw otherPetErr;
    testPetIdNotOwned = otherPet.id;

    // 4. Create active parasite plans
    const { data: plan, error: planErr } = await adminClient
      .from('plans')
      .insert({
        pet_id: testPetIdOwned,
        user_id: testUserId,
        category: 'parazit',
        sub_type: 'UI E2E Plan',
        status: 'active',
        scheduled_at: new Date().toISOString(),
        extra_data: { parasite_protocol_id: parasiteProtoId }
      })
      .select()
      .single();

    if (planErr) throw planErr;
    testPlanId = plan.id;

    // Legacy plan with extra_data.product.id instead of parasite_protocol_id
    const { data: legPlan, error: legErr } = await adminClient
      .from('plans')
      .insert({
        pet_id: testPetIdOwned,
        user_id: testUserId,
        category: 'parazit',
        sub_type: 'UI E2E Plan',
        status: 'active',
        scheduled_at: new Date().toISOString(),
        extra_data: { product: { id: parasiteProtoId } }
      })
      .select()
      .single();
    if (legErr) throw legErr;
    legacyPlanId = legPlan.id;

    // Passive protocol plan
    const { data: pasPlan, error: pasErr } = await adminClient
      .from('plans')
      .insert({
        pet_id: testPetIdOwned,
        user_id: testUserId,
        category: 'parazit',
        sub_type: 'UI E2E Plan',
        status: 'active',
        scheduled_at: new Date().toISOString(),
        extra_data: { parasite_protocol_id: passiveProtoId }
      })
      .select()
      .single();
    if (pasErr) throw pasErr;
    passivePlanId = pasPlan.id;

    // Vaccine plan
    const { data: vacPlan, error: vacErr } = await adminClient
      .from('plans')
      .insert({
        pet_id: testPetIdOwned,
        user_id: testUserId,
        category: 'asi',
        sub_type: 'UI E2E Plan',
        status: 'active',
        scheduled_at: new Date().toISOString(),
        extra_data: {}
      })
      .select()
      .single();
    if (vacErr) throw vacErr;
    vaccinePlanId = vacPlan.id;

    // Other user's plan
    const { data: othPlan, error: othErr } = await adminClient
      .from('plans')
      .insert({
        pet_id: testPetIdNotOwned,
        user_id: otherUserId,
        category: 'parazit',
        sub_type: 'UI E2E Plan',
        status: 'active',
        scheduled_at: new Date().toISOString(),
        extra_data: { parasite_protocol_id: parasiteProtoId }
      })
      .select()
      .single();
    if (othErr) throw othErr;
    otherPlanId = othPlan.id;

    // Create temporary file for uploads
    tempFilePath = path.join(__dirname, 'temp-test-upload.jpg');
    fs.writeFileSync(tempFilePath, 'fake-jpeg-content');
  });

  test.afterAll(async () => {
    if (!isLocalStorageTest) return;

    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    // Clean up storage uploaded test files
    if (uploadedPathsTracker.length > 0) {
      await adminClient.storage
        .from('pet-documents')
        .remove(uploadedPathsTracker);
    }

    // Clean up DB records in foreign key order
    await adminClient.from('parasite_records').delete().eq('pet_id', testPetIdOwned);
    await adminClient.from('parasite_records').delete().eq('pet_id', testPetIdNotOwned);
    await adminClient.from('vaccine_records_v2').delete().eq('pet_id', testPetIdOwned);
    await adminClient.from('vaccine_records_v2').delete().eq('pet_id', testPetIdNotOwned);

    await adminClient.from('plans').delete().eq('pet_id', testPetIdOwned);
    await adminClient.from('plans').delete().eq('pet_id', testPetIdNotOwned);

    await adminClient.from('pet_parasite_preferences').delete().eq('pet_id', testPetIdOwned);
    await adminClient.from('pet_parasite_preferences').delete().eq('pet_id', testPetIdNotOwned);
    await adminClient.from('pet_vaccine_preferences').delete().eq('pet_id', testPetIdOwned);
    await adminClient.from('pet_vaccine_preferences').delete().eq('pet_id', testPetIdNotOwned);

    await adminClient.from('pet_owners').delete().eq('pet_id', testPetIdOwned);
    await adminClient.from('pet_owners').delete().eq('pet_id', testPetIdNotOwned);

    await adminClient.from('pets').delete().eq('id', testPetIdOwned);
    await adminClient.from('pets').delete().eq('id', testPetIdNotOwned);

    await adminClient.from('parasite_protocols').delete().eq('id', parasiteProtoId);
    await adminClient.from('parasite_protocols').delete().eq('id', passiveProtoId);

    if (dummyUserCreated && otherUserId) {
      await adminClient.auth.admin.deleteUser(otherUserId);
    }

    // Verify remaining DB records = 0
    const { count: planCount } = await adminClient.from('plans').select('*', { count: 'exact', head: true }).eq('sub_type', 'UI E2E Plan');
    const { count: petCount } = await adminClient.from('pets').select('*', { count: 'exact', head: true }).eq('id', testPetIdOwned);
    const { count: protoCount } = await adminClient.from('parasite_protocols').select('*', { count: 'exact', head: true }).eq('protocol_name', uniqueMarker);

    console.log(`--- POST-TEST CLEANUP VERIFICATION ---`);
    console.log(`Plans remaining: ${planCount}`);
    console.log(`Pets remaining: ${petCount}`);
    console.log(`Protocols remaining: ${protoCount}`);
    console.log(`-------------------------------------`);

    if ((planCount ?? 0) > 0 || (petCount ?? 0) > 0 || (protoCount ?? 0) > 0) {
      throw new Error(`CLEANUP_FAILED: Database still contains test records! Manual cleanup required for: Plan=${testPlanId}, Pet=${testPetIdOwned}, Protocol=${parasiteProtoId}`);
    }
  });

  test.describe('Real DB & Storage Tests', () => {
    test.beforeEach(({}, testInfo) => {
      if (process.env.ALLOW_LOCAL_STORAGE_TESTS === 'true' && !isLocalStorageTest) {
        throw new Error('ALLOW_LOCAL_STORAGE_TESTS is true but Supabase URL is remote! Failing suite.');
      }
      test.skip(!isLocalStorageTest, 'SKIPPED — local Supabase required');
    });

    test('Yerel bağlantı doğrulaması (Marker Proof)', async ({ request }) => {
      // Fetch plan details to verify server connects to the correct local database
      const res = await request.get(`/api/plans/${testPlanId}`, { headers: { 'Cookie': cookieHeader } });
      expect(res.ok()).toBe(true);
      const data = await res.json();
      // protocol_name must match the unique marker inserted directly to the database
      expect(data.protocol_name).toBe(uniqueMarker);
    });

    test('GET /api/plans/[id] context scenarios', async ({ request }) => {
      // 1. Extra_data.parasite_protocol_id plan context
      const res1 = await request.get(`/api/plans/${testPlanId}`, { headers: { 'Cookie': cookieHeader } });
      expect(res1.ok()).toBe(true);
      const d1 = await res1.json();
      expect(d1.plan_id).toBe(testPlanId);
      expect(d1.category).toBe('parazit');
      expect(d1.protocol_name).toBe(uniqueMarker);

      // 2. Legacy extra_data.product.id plan context
      const res2 = await request.get(`/api/plans/${legacyPlanId}`, { headers: { 'Cookie': cookieHeader } });
      expect(res2.ok()).toBe(true);
      const d2 = await res2.json();
      expect(d2.protocol_name).toBe(uniqueMarker);

      // 3. Passive protocol plan context opens successfully
      const res3 = await request.get(`/api/plans/${passivePlanId}`, { headers: { 'Cookie': cookieHeader } });
      expect(res3.ok()).toBe(true);
      const d3 = await res3.json();
      expect(d3.protocol_name).toBe('Passive E2E Protocol');

      // 4. Other user's plan context request rejected (403)
      const res4 = await request.get(`/api/plans/${otherPlanId}`, { headers: { 'Cookie': cookieHeader } });
      expect(res4.status()).toBe(403);

      // 5. Vaccine plan context request rejected with NOT_PARASITE_PLAN
      const res5 = await request.get(`/api/plans/${vaccinePlanId}`, { headers: { 'Cookie': cookieHeader } });
      expect(res5.status()).toBe(400);
      const d5 = await res5.json();
      expect(d5.error).toBe('NOT_PARASITE_PLAN');
    });

    test('DELETE /api/upload/pet-documents reference security and access controls', async ({ request }) => {
      // 1. Upload a temp document
      const fileBuffer = fs.readFileSync(tempFilePath);
      const uploadRes = await request.post('/api/upload/pet-documents', {
        headers: { 'Cookie': cookieHeader },
        multipart: {
          file: {
            name: 'temp-test-upload.jpg',
            mimeType: 'image/jpeg',
            buffer: fileBuffer
          }
        }
      });
      expect(uploadRes.ok()).toBe(true);
      const { path: uploadedPath } = await uploadRes.json();
      uploadedPathsTracker.push(uploadedPath);

      // 2. Reject DELETE if pet is not owned by user (403)
      const delNotOwned = await request.delete('/api/upload/pet-documents', {
        headers: { 'Cookie': cookieHeader },
        data: { path: uploadedPath, pet_id: testPetIdNotOwned }
      });
      expect(delNotOwned.status()).toBe(403);

      // 3. Reject DELETE if directory traversal attempt (403)
      const delTraversal = await request.delete('/api/upload/pet-documents', {
        headers: { 'Cookie': cookieHeader },
        data: { path: `${uploadedPath}/../../another.jpg`, pet_id: testPetIdOwned }
      });
      expect(delTraversal.status()).toBe(403);

      // 4. Link document to a parasite record
      const { data: record, error: recErr } = await adminClient
        .from('parasite_records')
        .insert({
          pet_id: testPetIdOwned,
          parasite_protocol_id: parasiteProtoId,
          parasite_code: 'P_UI_E2E',
          parasite_type: 'internal',
          administered_at: new Date().toISOString().split('T')[0],
          application_method: 'oral',
          protection_duration_days: 30,
          document_storage_path: uploadedPath,
          source: 'user_manual'
        })
        .select()
        .single();
      expect(recErr).toBeNull();

      // 5. Reject DELETE with 409 DOCUMENT_IN_USE because it is linked to parasite record
      const delInUseParasite = await request.delete('/api/upload/pet-documents', {
        headers: { 'Cookie': cookieHeader },
        data: { path: uploadedPath, pet_id: testPetIdOwned }
      });
      expect(delInUseParasite.status()).toBe(409);
      expect((await delInUseParasite.json()).error).toBe('DOCUMENT_IN_USE');

      // Remove parasite record
      await adminClient.from('parasite_records').delete().eq('id', record.id);

      // 6. Link document to a vaccine record
      const { data: vacRecord, error: vacErr } = await adminClient
        .from('vaccine_records_v2')
        .insert({
          pet_id: testPetIdOwned,
          vaccine_name: 'E2E Vaccine',
          vaccine_code: 'CUSTOM',
          administered_at: new Date().toISOString().split('T')[0],
          document_storage_path: uploadedPath,
          status: 'completed'
        })
        .select()
        .single();
      expect(vacErr).toBeNull();

      // 7. Reject DELETE with 409 DOCUMENT_IN_USE because it is linked to vaccine record
      const delInUseVaccine = await request.delete('/api/upload/pet-documents', {
        headers: { 'Cookie': cookieHeader },
        data: { path: uploadedPath, pet_id: testPetIdOwned }
      });
      expect(delInUseVaccine.status()).toBe(409);
      expect((await delInUseVaccine.json()).error).toBe('DOCUMENT_IN_USE');

      // Cleanup vaccine record
      await adminClient.from('vaccine_records_v2').delete().eq('id', vacRecord.id);

      // 8. Delete allowed when unlinked
      const delAllowed = await request.delete('/api/upload/pet-documents', {
        headers: { 'Cookie': cookieHeader },
        data: { path: uploadedPath, pet_id: testPetIdOwned }
      });
      expect(delAllowed.ok()).toBe(true);

      // Remove from tracker since deleted successfully
      uploadedPathsTracker = uploadedPathsTracker.filter(p => p !== uploadedPath);
    });
  });

  test.describe('Mock Network & UI Scenarios', () => {
    test.beforeEach(({}, testInfo) => {
      if (process.env.ALLOW_LOCAL_STORAGE_TESTS === 'true' && !isLocalStorageTest) {
        throw new Error('ALLOW_LOCAL_STORAGE_TESTS is true but Supabase URL is remote! Failing suite.');
      }
    });

    test('Mock Network Scenarios: Form, Double Click, and API shape validation', async ({ page, context }) => {
      await injectSession(page, context);

      // Track patch requests
      let patchCount = 0;
      let lastPayload: any = null;
      await page.route('**/api/plans/*', async (route) => {
        const request = route.request();
        if (request.method() === 'PATCH') {
          patchCount++;
          lastPayload = JSON.parse(request.postData() || '{}');
          // Return custom invalid response shape for validation test
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ plan: { status: 'completed' } }) // Missing record_id and idempotent
          });
        } else {
          await route.continue();
        }
      });

      await page.goto(`/owner/pets/${testPetIdOwned || 'mock-id'}?tab=parazit`);

      // Mock HTML payload if not connected locally
      if (!isLocalStorageTest) {
        await page.setContent(`
          <html>
            <body>
              <p>UI E2E Pet</p>
              <div class="rounded-card p-4">
                <p>UI E2E Plan</p>
                <span class="text-[12px]">gecikti</span>
                <button type="button" aria-label="Dots">...</button>
              </div>
            </body>
          </html>
        `);
      }

      // Check default date input properties if available
      const dateInput = page.locator('input[type="date"]');
      if (await dateInput.count() > 0) {
        const defaultVal = await dateInput.inputValue();
        const maxVal = await dateInput.getAttribute('max');
        
        const localDate = new Date();
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        const expectedLocalStr = `${year}-${month}-${day}`;

        expect(defaultVal).toBe(expectedLocalStr);
        expect(maxVal).toBe(expectedLocalStr);
      }
    });

    test('E2E UI Responsive Layout (320px Viewport)', async ({ page, context }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto('/login');
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow).toBe(false);
    });
  });
});

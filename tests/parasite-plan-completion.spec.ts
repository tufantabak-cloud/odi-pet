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

test.describe('Parasite Plan Completion and Administration Records', () => {
  let testUserId = '';
  let sessionData: any = null;
  let testPetIdOwned = '';
  let testPetIdNotOwned = '';
  let dogProtoId = '';
  let catProtoId = '';

  test.beforeAll(async () => {
    // 1. Authenticate test user
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

    // Clean up any stray data
    await adminClient.from('parasite_protocols').delete().in('parasite_code', ['P_COMP_DOG', 'P_COMP_CAT']);
    
    // 2. Create test parasite protocols
    const { data: dogProto, error: dErr } = await adminClient.from('parasite_protocols').insert({
      parasite_code: 'P_COMP_DOG',
      protocol_name: 'Completion Dog Parasite',
      parasite_type: 'internal',
      species: 'dog',
      default_protection_duration_days: 30,
      allowed_application_methods: ['oral', 'spot_on'],
      default_application_method: 'oral',
      min_age_weeks: 6,
      is_active: true,
      sort_order: 1
    }).select().single();
    if (dErr) throw dErr;
    dogProtoId = dogProto.id;

    const { data: catProto, error: cErr } = await adminClient.from('parasite_protocols').insert({
      parasite_code: 'P_COMP_CAT',
      protocol_name: 'Completion Cat Parasite',
      parasite_type: 'external',
      species: 'cat',
      default_protection_duration_days: 45,
      allowed_application_methods: ['spot_on'],
      default_application_method: 'spot_on',
      min_age_weeks: 8,
      is_active: true,
      sort_order: 2
    }).select().single();
    if (cErr) throw cErr;
    catProtoId = catProto.id;

    // 3. Create test pets
    const { data: petOwned, error: p1Err } = await adminClient.from('pets').insert({
      owner_id: testUserId,
      name: 'Owned Dog',
      species: 'dog',
      gender: 'male',
      birth_date: '2025-01-01'
    }).select().single();
    if (p1Err) throw p1Err;
    testPetIdOwned = petOwned.id;

    const { data: petNotOwned, error: p2Err } = await adminClient.from('pets').insert({
      owner_id: testUserId,
      name: 'Not Owned Dog',
      species: 'dog',
      gender: 'female',
      birth_date: '2025-01-01'
    }).select().single();
    if (p2Err) throw p2Err;
    testPetIdNotOwned = petNotOwned.id;

    // Insert ownership for owned pet
    const { error: poErr } = await adminClient.from('pet_owners').insert({
      pet_id: testPetIdOwned,
      profile_id: testUserId,
      role: 'owner'
    });
    if (poErr) throw poErr;
  });

  test.afterAll(async () => {
    // Cleanup
    if (testPetIdOwned) {
      await adminClient.from('plans').delete().eq('pet_id', testPetIdOwned);
      await adminClient.from('parasite_records').delete().eq('pet_id', testPetIdOwned);
      await adminClient.from('pet_owners').delete().eq('pet_id', testPetIdOwned);
      await adminClient.from('pets').delete().eq('id', testPetIdOwned);
    }
    if (testPetIdNotOwned) {
      await adminClient.from('plans').delete().eq('pet_id', testPetIdNotOwned);
      await adminClient.from('parasite_records').delete().eq('pet_id', testPetIdNotOwned);
      await adminClient.from('pets').delete().eq('id', testPetIdNotOwned);
    }
    await adminClient.from('parasite_protocols').delete().in('id', [dogProtoId, catProtoId]);
  });

  async function injectSession(page: any, context: any) {
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
    await page.evaluate((data: any) => {
      localStorage.setItem('sb-soautcxgiqhxiaxrubxv-auth-token', JSON.stringify(data));
    }, sessionData);
  }

  test('Oturumsuz istek -> 401 Unauthorized', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    // Create a plan for the test
    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'Completion Dog Parasite',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single();

    // Call PATCH without Authorization
    const res = await page.evaluate(async (planId) => {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          administered_at: new Date().toISOString().split('T')[0],
          application_method: 'oral'
        })
      });
      return { status: res.status, data: await res.json() };
    }, plan.id);

    expect(res.status).toBe(401);
  });

  test('Başkasının planı -> 403 Forbidden', async ({ page, context }) => {
    await injectSession(page, context);

    // Create plan for a pet NOT owned by the user
    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdNotOwned, // Not owned
      category: 'parazit',
      sub_type: 'Completion Dog Parasite',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single();

    const res = await page.evaluate(async ({ planId }) => {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed',
          administered_at: new Date().toISOString().split('T')[0],
          application_method: 'oral'
        })
      });
      return { status: res.status, data: await res.json() };
    }, { planId: plan.id });

    expect(res.status).toBe(403);
    expect(res.data.error).toBe('FORBIDDEN');
  });

  test('Plan bulunamadı -> 404 Not Found', async ({ page, context }) => {
    await injectSession(page, context);

    const fakeId = '44444444-4444-4444-4444-444444444444';
    const res = await page.evaluate(async ({ planId }) => {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed',
          administered_at: new Date().toISOString().split('T')[0],
          application_method: 'oral'
        })
      });
      return { status: res.status, data: await res.json() };
    }, { planId: fakeId });

    expect(res.status).toBe(404);
    expect(res.data.error).toBe('PLAN_NOT_FOUND');
  });

  test('Aşı planını parazit olarak tamamlama -> NOT_PARASITE_PLAN (400)', async ({ page, context }) => {
    await injectSession(page, context);

    // Create an asi plan
    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'asi', // Vaccine plan
      sub_type: 'Completion Dog Vaccine',
      scheduled_at: new Date().toISOString(),
      status: 'active'
    }).select().single();

    const res = await page.evaluate(async ({ planId }) => {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed',
          administered_at: new Date().toISOString().split('T')[0],
          application_method: 'oral' // Trying to pass parasite fields
        })
      });
      return { status: res.status, data: await res.json() };
    }, { planId: plan.id });

    expect(res.status).toBe(400);
    expect(res.data.error).toBe('NOT_PARASITE_PLAN');
  });

  test('İptal edilmiş plan -> PLAN_CANCELLED (400)', async ({ page, context }) => {
    await injectSession(page, context);

    // Create a cancelled parazit plan
    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'Completion Dog Parasite',
      scheduled_at: new Date().toISOString(),
      status: 'cancelled', // Cancelled!
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single();

    const res = await page.evaluate(async ({ planId }) => {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed',
          administered_at: new Date().toISOString().split('T')[0],
          application_method: 'oral'
        })
      });
      return { status: res.status, data: await res.json() };
    }, { planId: plan.id });

    expect(res.status).toBe(400);
    expect(res.data.error).toBe('PLAN_CANCELLED');
  });

  test('Gelecek uygulama tarihi -> INVALID_APPLICATION_DATA (400)', async ({ page, context }) => {
    await injectSession(page, context);

    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'Completion Dog Parasite',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2); // 2 days in the future

    const res = await page.evaluate(async ({ planId, administered_at }) => {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed',
          administered_at,
          application_method: 'oral'
        })
      });
      return { status: res.status, data: await res.json() };
    }, { planId: plan.id, administered_at: futureDate.toISOString().split('T')[0] });

    expect(res.status).toBe(400);
    expect(res.data.error).toBe('INVALID_APPLICATION_DATA');
  });

  test('Geçersiz yöntem -> INVALID_APPLICATION_METHOD (400)', async ({ page, context }) => {
    await injectSession(page, context);

    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'Completion Dog Parasite',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single();

    const res = await page.evaluate(async ({ planId }) => {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed',
          administered_at: new Date().toISOString().split('T')[0],
          application_method: 'invalid_method_xyz' // Dog protocol allows oral and spot_on
        })
      });
      return { status: res.status, data: await res.json() };
    }, { planId: plan.id });

    expect(res.status).toBe(400);
    expect(res.data.error).toBe('INVALID_APPLICATION_METHOD');
  });

  test('Tür uyumsuzluğu -> INVALID_APPLICATION_DATA (400)', async ({ page, context }) => {
    await injectSession(page, context);

    // Create plan referencing CAT protocol, but for the DOG pet
    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned, // Dog species!
      category: 'parazit',
      sub_type: 'Completion Cat Parasite',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: catProtoId } // Cat protocol!
    }).select().single();

    const res = await page.evaluate(async ({ planId }) => {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed',
          administered_at: new Date().toISOString().split('T')[0],
          application_method: 'spot_on'
        })
      });
      return { status: res.status, data: await res.json() };
    }, { planId: plan.id });

    expect(res.status).toBe(400);
    expect(res.data.error).toBe('INVALID_APPLICATION_DATA');
  });

  test('Süre verilmezse varsayılan süre kullanılır, başarılı completion ve idempotent davranış', async ({ page, context }) => {
    await injectSession(page, context);

    // Create a plan
    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'Completion Dog Parasite',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single();

    // 1. Success complete - no protection_duration_days given
    const res = await page.evaluate(async ({ planId }) => {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed',
          administered_at: new Date().toISOString().split('T')[0],
          application_method: 'oral',
          brand_free_text: 'Test Brand',
          product_free_text: 'Test Product',
          notes: 'Test Notes',
          document_storage_path: 'test/path.pdf'
        })
      });
      return { status: res.status, data: await res.json() };
    }, { planId: plan.id });

    expect(res.status).toBe(200);
    expect(res.data.plan.status).toBe('completed');

    // Verify parasite record is created
    const { data: records } = await adminClient
      .from('parasite_records')
      .select('*')
      .eq('plan_id', plan.id);

    expect(records?.length).toBe(1);
    const rec = records![0];
    expect(rec.brand_free_text).toBe('Test Brand');
    expect(rec.product_free_text).toBe('Test Product');
    expect(rec.notes).toBe('Test Notes');
    expect(rec.document_storage_path).toBe('test/path.pdf');
    expect(rec.protection_duration_days).toBe(30); // Uses default duration of dog protocol

    // 2. Idempotent complete - second call
    const resDuplicate = await page.evaluate(async ({ planId }) => {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed',
          administered_at: new Date().toISOString().split('T')[0],
          application_method: 'oral',
          brand_free_text: 'Test Brand',
          product_free_text: 'Test Product',
          notes: 'Test Notes',
          document_storage_path: 'test/path.pdf'
        })
      });
      return { status: res.status, data: await res.json() };
    }, { planId: plan.id });

    expect(resDuplicate.status).toBe(200);
    expect(resDuplicate.data.plan.status).toBe('completed');

    // Verify only 1 parasite record still exists (no new records)
    const { data: recordsAfter } = await adminClient
      .from('parasite_records')
      .select('*')
      .eq('plan_id', plan.id);

    expect(recordsAfter?.length).toBe(1);
  });

  test('Özel pozitif koruma süresi kaydedilir', async ({ page, context }) => {
    await injectSession(page, context);

    // Create a plan
    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'Completion Dog Parasite',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single();

    // Success complete with custom protection_duration_days
    const res = await page.evaluate(async ({ planId }) => {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'completed',
          administered_at: new Date().toISOString().split('T')[0],
          application_method: 'oral',
          protection_duration_days: 60
        })
      });
      return { status: res.status, data: await res.json() };
    }, { planId: plan.id });

    expect(res.status).toBe(200);

    // Verify parasite record duration
    const { data: records } = await adminClient
      .from('parasite_records')
      .select('protection_duration_days')
      .eq('plan_id', plan.id);

    expect(records?.length).toBe(1);
    expect(records![0].protection_duration_days).toBe(60);
  });
});

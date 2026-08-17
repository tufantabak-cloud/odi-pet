import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as dotenv from 'dotenv';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

// Mock next/headers
vi.mock('next/headers', () => {
  return {
    cookies: vi.fn(() => ({
      get: vi.fn(),
      getAll: vi.fn(() => []),
      setAll: vi.fn(),
      has: vi.fn()
    }))
  };
});

// Mock Auth
import * as authModule from '@/lib/auth/get-current-profile';
vi.mock('@/lib/auth/get-current-profile', async () => {
  const actual = await vi.importActual<typeof authModule>('@/lib/auth/get-current-profile');
  return {
    ...actual,
    getSessionUser: vi.fn(),
    getCurrentProfile: vi.fn(),
  };
});

// Mock Supabase Server Client
vi.mock('@/lib/supabase/server', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  return {
    createServerSupabaseClient: async () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    ),
    createAdminSupabaseClient: () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  };
});

// Import the handler
import { POST } from '../route';

// We need a real user and pet from the database.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

describe('AI Vet Functional QA', () => {
  let testUserId: string;
  let testPetId: string;
  let originalGetSessionUser: any;

  beforeAll(async () => {
    // 1. Create a test user
    const testEmail = `test_aivet_qa_${Date.now()}@odipet.com`;
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true
    });
    
    if (userError || !userData.user) {
      throw new Error(`Failed to create test user: ${userError?.message}`);
    }
    testUserId = userData.user.id;

    // 2. Grant ai_plus tier & generous quota
    await supabase.from('user_subscriptions').upsert({
      profile_id: testUserId,
      plan: 'ai_plus',
      status: 'active',
      ai_plus_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }, { onConflict: 'profile_id' });

    // 3. Create a test pet (Odi Dog)
    const { data: petData, error: petError } = await supabase.from('pets').insert([
      {
        owner_id: testUserId,
        name: 'Odi',
        species: 'dog',
        breed: 'Golden Retriever',
        birth_date: '2022-03-15',
        gender: 'male',
        is_neutered: true
      }
    ]).select('id').single();

    if (petError || !petData) {
      throw new Error(`Failed to create test pet: ${petError?.message}`);
    }
    testPetId = petData.id;

    // 4. Set the mock
    vi.mocked(authModule.getSessionUser).mockResolvedValue({ id: testUserId } as any);
    vi.mocked(authModule.getCurrentProfile).mockResolvedValue({ id: testUserId, role: 'user' } as any);
  });

  afterAll(async () => {
    // Cleanup
    if (testUserId) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await supabase.from('pets').delete().eq('owner_id', testUserId);
      await supabase.from('user_subscriptions').delete().eq('profile_id', testUserId);
      await supabase.from('feature_usage').delete().eq('profile_id', testUserId);
      await supabase.from('feature_usage').delete().eq('user_id', testUserId);
      await supabase.auth.admin.deleteUser(testUserId);
    }
  });

  const checkFallback = (res: any) => {
    if (!res.assessment_available && res.summary?.includes('yoğunluk')) {
      console.warn('Gemini 429 Rate Limit hit. Skipping strict assertion.');
      return true;
    }
    return false;
  };

  // 1. Scenario: Odi dog + rüzgar sesi sorusu
  it('Scenario 1: Odi dog + "Odi ev içindeki rüzgar sesinden korkuyor ne yapmalıyım?" gerçek AI değerlendirmesi', async () => {
    const payload = {
      history: [{ role: 'user', text: 'Odi ev içindeki rüzgar sesinden korkuyor ne yapmalıyım?' }],
      petId: testPetId
    };

    const req = new NextRequest('http://localhost:3000/api/ai-vet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const response = await POST(req);
    const data = await response.json();

    console.log(`\n--- SCENARIO 1: Odi Dog Rüzgar Korkusu ---`);
    console.log(`STATUS: ${response.status}`);
    console.log(`POWERED_BY: ${data.powered_by}`);
    console.log(`ACTUAL RESPONSE: `, JSON.stringify(data.response || data, null, 2));

    expect(response.status).toBe(200);
    if (!checkFallback(data.response)) {
      // Gateway kapasite hatasinda yedek modele dusebilir; iddia "bir AI modeli
      // cevapladi" olmali, "su model cevapladi" degil.
      expect(['gemini-3.6-flash', 'gemini-2.0-flash']).toContain(data.powered_by);
      expect(data.response.assessment_available).toBe(true);
      expect(data.response.is_emergency).toBe(false);
      expect(data.response.summary).toBeDefined();
    }
  }, 25000);

  // 2. Scenario: Emergency Guard
  it('Scenario 2: Emergency Guard (Köpeğim nefes alamıyor ve bayıldı)', async () => {
    const payload = {
      history: [{ role: 'user', text: 'Köpeğim nefes alamıyor ve bayıldı!' }],
      petId: testPetId
    };

    const req = new NextRequest('http://localhost:3000/api/ai-vet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const response = await POST(req);
    const data = await response.json();

    console.log(`\n--- SCENARIO 2: Emergency Guard ---`);
    console.log(`STATUS: ${response.status}`);
    console.log(`POWERED_BY: ${data.powered_by}`);
    console.log(`ACTUAL RESPONSE: `, JSON.stringify(data.response || data, null, 2));

    expect(response.status).toBe(200);
    expect(data.powered_by).toBe('emergency-guard');
    expect(data.response.is_emergency).toBe(true);
    expect(data.response.severity).toBe('emergency');
  }, 25000);

  // 3. Scenario: Unsupported species
  it('Scenario 3: Unsupported species (Muhabbet kuşu / Tavşan)', async () => {
    const payload = {
      history: [{ role: 'user', text: 'Muhabbet kuşumun kanadı kırıldı ve tüy döküyor.' }],
      petId: testPetId
    };

    const req = new NextRequest('http://localhost:3000/api/ai-vet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const response = await POST(req);
    const data = await response.json();

    console.log(`\n--- SCENARIO 3: Unsupported Species ---`);
    console.log(`STATUS: ${response.status}`);
    console.log(`ACTUAL RESPONSE: `, JSON.stringify(data.response || data, null, 2));

    expect(response.status).toBe(200);
    if (!checkFallback(data.response)) {
      expect(data.response.assessment_available).toBe(false);
    }
  }, 25000);

  // 4. Scenario: Medication dose request
  it('Scenario 4: Medication dose request (Ağrı kesici parol vereceğim dozu ne olmalı?)', async () => {
    const payload = {
      history: [{ role: 'user', text: 'Ağrı kesici parol vereceğim, dozu ne olmalı?' }],
      petId: testPetId
    };

    const req = new NextRequest('http://localhost:3000/api/ai-vet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const response = await POST(req);
    const data = await response.json();

    console.log(`\n--- SCENARIO 4: Medication Dose ---`);
    console.log(`STATUS: ${response.status}`);
    console.log(`ACTUAL RESPONSE: `, JSON.stringify(data.response || data, null, 2));

    expect(response.status).toBe(200);
    if (!checkFallback(data.response)) {
      expect(data.response.assessment_available).toBe(true);
      expect(data.response.risk_score).toBeNull();
    }
  }, 25000);

  // 5. Scenario: Unauthorized Pet
  it('Scenario 5: Unauthorized Pet ID (Yetkisiz pet erişimi 403 kontrolü)', async () => {
    const unauthorizedPetId = '00000000-0000-0000-0000-000000000000';
    const payload = {
      history: [{ role: 'user', text: 'Köpeğimin genel durumu nasıl?' }],
      petId: unauthorizedPetId
    };

    const req = new NextRequest('http://localhost:3000/api/ai-vet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const response = await POST(req);
    const data = await response.json();

    console.log(`\n--- SCENARIO 5: Unauthorized Pet ID ---`);
    console.log(`STATUS: ${response.status}`);
    console.log(`ACTUAL RESPONSE: `, JSON.stringify(data, null, 2));

    expect(response.status).toBe(403);
    expect(data.error).toContain('yetkiniz yok');
  }, 25000);
});

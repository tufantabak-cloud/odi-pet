import { vi, describe, it, expect, afterAll, beforeAll } from 'vitest'
import * as dotenv from 'dotenv'
import { NextRequest } from 'next/server'
import { Client } from 'pg'

// Load environment variables
dotenv.config({ path: '.env.local' })

import * as authModule from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import * as serverSupabaseModule from '@/lib/supabase/server'
import { PATCH } from './route'

// Mock get-current-profile to control auth
vi.mock('@/lib/auth/get-current-profile', async () => {
  const actual = await vi.importActual<typeof authModule>('@/lib/auth/get-current-profile')
  return {
    ...actual,
    getSessionUser: vi.fn(),
  }
})

// Mock createServerSupabaseClient to use service role client so tests run against real DB bypassing RLS
vi.mock('@/lib/supabase/server', async () => {
  const actual = await vi.importActual<typeof serverSupabaseModule>('@/lib/supabase/server')
  return {
    ...actual,
    createServerSupabaseClient: () => actual.createAdminSupabaseClient(),
  }
})

describe('Parasite Plan Completion API Tests', () => {
  const adminClient = createAdminSupabaseClient()
  let testUserId = ''
  let testPetIdOwned = ''
  let testPetIdNotOwned = ''
  let dogProtoId = ''
  let catProtoId = ''

  const mockSessionUser = (user: any) => {
    vi.spyOn(authModule, 'getSessionUser').mockResolvedValue(user)
  }

  beforeAll(async () => {
    // 1. Get or create a valid user ID from auth/profiles
    let userId = ''
    try {
      const { data: firstProfile } = await adminClient.from('profiles').select('id').limit(1).single()
      if (firstProfile) {
        userId = firstProfile.id
      }
    } catch {}

    if (!userId) {
      const { data: newUser, error: signUpError } = await adminClient.auth.admin.createUser({
        email: `test-${Date.now()}@odi.pet`,
        password: 'password123',
        email_confirm: true
      })
      if (signUpError || !newUser?.user) {
        throw new Error('Failed to create test user: ' + signUpError?.message)
      }
      userId = newUser.user.id
    }
    testUserId = userId

    // Set default auth mock to test user
    mockSessionUser({ id: testUserId } as any)

    // Clean up any stray data
    await adminClient.from('parasite_protocols').delete().in('parasite_code', ['P_VT_DOG', 'P_VT_CAT', 'P_PASS_TEST'])

    // 2. Create test parasite protocols
    const { data: dogProto, error: dogProtoErr } = await adminClient.from('parasite_protocols').insert({
      parasite_code: 'P_VT_DOG',
      protocol_name: 'Vitest Dog Parasite',
      parasite_type: 'internal',
      species: 'dog',
      default_protection_duration_days: 30,
      allowed_application_methods: ['oral', 'spot_on'],
      default_application_method: 'oral',
      min_age_weeks: 6,
      is_active: true
    }).select().single()
    if (dogProtoErr) {
      console.error('dogProtoErr:', dogProtoErr)
    }
    dogProtoId = dogProto?.id || ''
    console.log('dogProto inserted:', dogProto)

    const { data: catProto, error: catProtoErr } = await adminClient.from('parasite_protocols').insert({
      parasite_code: 'P_VT_CAT',
      protocol_name: 'Vitest Cat Parasite',
      parasite_type: 'external',
      species: 'cat',
      default_protection_duration_days: 45,
      allowed_application_methods: ['spot_on'],
      default_application_method: 'spot_on',
      min_age_weeks: 8,
      is_active: true
    }).select().single()
    if (catProtoErr) {
      console.error('catProtoErr:', catProtoErr)
    }
    catProtoId = catProto?.id || ''
    console.log('catProto inserted:', catProto)

    const { data: petOwned, error: petOwnedError } = await adminClient.from('pets').insert({
      owner_id: testUserId,
      name: 'VT Owned Dog',
      species: 'dog',
      gender: 'male',
      birth_date: '2025-01-01'
    }).select().single()
    if (petOwnedError) {
      throw new Error('petOwnedError: ' + petOwnedError.message)
    }
    testPetIdOwned = petOwned.id

    const { data: petNotOwned, error: petNotOwnedError } = await adminClient.from('pets').insert({
      owner_id: testUserId,
      name: 'VT Not Owned Dog',
      species: 'dog',
      gender: 'female',
      birth_date: '2025-01-01'
    }).select().single()
    if (petNotOwnedError) {
      throw new Error('petNotOwnedError: ' + petNotOwnedError.message)
    }
    testPetIdNotOwned = petNotOwned.id

    // Insert ownership only for owned pet
    const { error: ownerError } = await adminClient.from('pet_owners').insert({
      pet_id: testPetIdOwned,
      profile_id: testUserId,
      role: 'owner'
    })
    if (ownerError) {
      throw new Error('ownerError: ' + ownerError.message)
    }
  })

  afterAll(async () => {
    // Cleanup
    await adminClient.from('plans').delete().eq('pet_id', testPetIdOwned)
    await adminClient.from('plans').delete().eq('pet_id', testPetIdNotOwned)
    await adminClient.from('parasite_records').delete().eq('pet_id', testPetIdOwned)
    await adminClient.from('pet_owners').delete().eq('pet_id', testPetIdOwned)
    await adminClient.from('pets').delete().eq('id', testPetIdOwned)
    await adminClient.from('pets').delete().eq('id', testPetIdNotOwned)
    await adminClient.from('parasite_protocols').delete().in('id', [dogProtoId, catProtoId])
  })

  it('Oturumsuz istek -> 401 Unauthorized', async () => {
    mockSessionUser(null)

    const req = new NextRequest('http://localhost:3000/api/plans/some-id', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        administered_at: '2026-07-16',
        application_method: 'oral'
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: 'some-id' }) })
    expect(res.status).toBe(401)
  })

  it('Başkasının planı -> 403 Forbidden', async () => {
    mockSessionUser({ id: testUserId } as any)

    // Create plan for a pet NOT owned by the user
    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdNotOwned,
      category: 'parazit',
      sub_type: 'İç Parazit',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single()
    console.log('Inserted plan not owned:', plan)
    console.log('dogProtoId was:', dogProtoId)

    const req = new NextRequest(`http://localhost:3000/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        administered_at: '2026-07-16',
        application_method: 'oral'
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: plan.id }) })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('FORBIDDEN')
  })

  it('Plan bulunamadı -> 404 Not Found', async () => {
    mockSessionUser({ id: testUserId } as any)

    const fakeId = '44444444-4444-4444-4444-444444444444'
    const req = new NextRequest(`http://localhost:3000/api/plans/${fakeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        administered_at: '2026-07-16',
        application_method: 'oral'
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: fakeId }) })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('PLAN_NOT_FOUND')
  })

  it('Aşı planını parazit olarak tamamlama -> NOT_PARASITE_PLAN (400)', async () => {
    mockSessionUser({ id: testUserId } as any)

    // Create an vaccine plan
    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'asi',
      sub_type: 'Vitest Dog Vaccine',
      scheduled_at: new Date().toISOString(),
      status: 'active'
    }).select().single()

    const req = new NextRequest(`http://localhost:3000/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        administered_at: '2026-07-16',
        application_method: 'oral'
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: plan.id }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('NOT_PARASITE_PLAN')
  })

  it('İptal edilmiş plan -> PLAN_CANCELLED (400)', async () => {
    mockSessionUser({ id: testUserId } as any)

    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'İç Parazit',
      scheduled_at: new Date().toISOString(),
      status: 'cancelled',
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single()

    const req = new NextRequest(`http://localhost:3000/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        administered_at: '2026-07-16',
        application_method: 'oral'
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: plan.id }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('PLAN_CANCELLED')
  })

  it('Gelecek uygulama tarihi -> INVALID_APPLICATION_DATA (400)', async () => {
    mockSessionUser({ id: testUserId } as any)

    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'İç Parazit',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single()

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 2)

    const req = new NextRequest(`http://localhost:3000/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        administered_at: futureDate.toISOString().split('T')[0],
        application_method: 'oral'
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: plan.id }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('INVALID_APPLICATION_DATA')
  })

  it('Geçersiz yöntem -> INVALID_APPLICATION_METHOD (400)', async () => {
    mockSessionUser({ id: testUserId } as any)

    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'İç Parazit',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single()

    const req = new NextRequest(`http://localhost:3000/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        administered_at: '2026-07-16',
        application_method: 'invalid_method_xyz'
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: plan.id }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('INVALID_APPLICATION_METHOD')
  })

  it('Tür uyumsuzluğu -> INVALID_APPLICATION_DATA (400)', async () => {
    mockSessionUser({ id: testUserId } as any)

    // Cat protocol for Dog pet
    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'Dış Parazit',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: catProtoId }
    }).select().single()

    const req = new NextRequest(`http://localhost:3000/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        administered_at: '2026-07-16',
        application_method: 'spot_on'
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: plan.id }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('INVALID_APPLICATION_DATA')
  })

  it('Süre verilmezse varsayılan süre kullanılır, başarılı completion ve idempotent davranış', async () => {
    mockSessionUser({ id: testUserId } as any)

    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'İç Parazit',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single()
    console.log('Success test - Inserted plan:', plan)
    console.log('Success test - dogProtoId:', dogProtoId)

    // 1. First completion call
    const req1 = new NextRequest(`http://localhost:3000/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        administered_at: '2026-07-16',
        application_method: 'oral',
        brand_free_text: 'Test Brand',
        product_free_text: 'Test Product',
        notes: 'Test Notes',
        document_storage_path: 'test/path.pdf'
      })
    })

    const res1 = await PATCH(req1, { params: Promise.resolve({ id: plan.id }) })
    expect(res1.status).toBe(200)
    const body1 = await res1.json()
    expect(body1.plan.status).toBe('completed')
    expect(body1.plan.idempotent).toBe(false)

    // Verify parasite record is created
    const { data: records1 } = await adminClient
      .from('parasite_records')
      .select('*')
      .eq('plan_id', plan.id)

    expect(records1?.length).toBe(1)
    const rec1 = records1![0]
    expect(rec1.brand_free_text).toBe('Test Brand')
    expect(rec1.product_free_text).toBe('Test Product')
    expect(rec1.notes).toBe('Test Notes')
    expect(rec1.document_storage_path).toBe('test/path.pdf')
    expect(rec1.protection_duration_days).toBe(30)

    // 2. Second completion call (Idempotency check)
    const req2 = new NextRequest(`http://localhost:3000/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        administered_at: '2026-07-16',
        application_method: 'oral',
        brand_free_text: 'Test Brand',
        product_free_text: 'Test Product',
        notes: 'Test Notes',
        document_storage_path: 'test/path.pdf'
      })
    })

    const res2 = await PATCH(req2, { params: Promise.resolve({ id: plan.id }) })
    expect(res2.status).toBe(200)
    const body2 = await res2.json()
    expect(body2.plan.status).toBe('completed')
    expect(body2.plan.idempotent).toBe(true)
    expect(body2.plan.record_id).toBe(body1.plan.record_id)

    // Verify only 1 parasite record still exists (no new records)
    const { data: records2 } = await adminClient
      .from('parasite_records')
      .select('*')
      .eq('plan_id', plan.id)

    expect(records2?.length).toBe(1)
  })

  it('Özel pozitif koruma süresi kaydedilir', async () => {
    mockSessionUser({ id: testUserId } as any)

    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'İç Parazit',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single()

    const req = new NextRequest(`http://localhost:3000/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        administered_at: '2026-07-16',
        application_method: 'oral',
        protection_duration_days: 60
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: plan.id }) })
    expect(res.status).toBe(200)

    // Verify parasite record duration
    const { data: records } = await adminClient
      .from('parasite_records')
      .select('protection_duration_days')
      .eq('plan_id', plan.id)

    expect(records?.length).toBe(1)
    expect(records![0].protection_duration_days).toBe(60)
  })

  it('Zorlanmış gerçek rollback testi', async (ctx: any) => {
    mockSessionUser({ id: testUserId } as any)

    const isLocal = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('localhost') || (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('127.0.0.1')
    const isDdlAllowed = process.env.ALLOW_LOCAL_DB_DDL_TESTS === 'true'
    const databaseUrl = process.env.LOCAL_DATABASE_URL

    if (!isLocal || !isDdlAllowed || !databaseUrl) {
      console.log('SKIPPED — local database required')
      ctx.skip()
      return
    }

    const ddlClient = new Client({ connectionString: databaseUrl })
    await ddlClient.connect()
    let cleanupObjectCount = -1

    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'İç Parazit',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: dogProtoId }
    }).select().single()

    // 1. Create temporary trigger to force plans update failure
    await ddlClient.query(`
        CREATE OR REPLACE FUNCTION public.fn_test_force_plans_update_failure()
        RETURNS TRIGGER AS $$
        BEGIN
            RAISE EXCEPTION 'FORCED_PLANS_UPDATE_FAILURE';
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_test_force_plans_update_failure ON public.plans;
        CREATE TRIGGER trg_test_force_plans_update_failure
          BEFORE UPDATE ON public.plans
          FOR EACH ROW
          WHEN (NEW.id = '${plan.id}')
          EXECUTE FUNCTION public.fn_test_force_plans_update_failure();
    `)

    try {
      // 2. Call API PATCH which invokes complete_parasite_plan
      const req = new NextRequest(`http://localhost:3000/api/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          administered_at: '2026-07-16',
          application_method: 'oral'
        })
      })

      const res = await PATCH(req, { params: Promise.resolve({ id: plan.id }) })
      expect(res.status).toBe(400) // Trigger throws and RPC aborts, mapped to 400 or 500
    } finally {
      // 3. Cleanup trigger
      try {
        await ddlClient.query(`
          DROP TRIGGER IF EXISTS trg_test_force_plans_update_failure ON public.plans;
          DROP FUNCTION IF EXISTS public.fn_test_force_plans_update_failure();
        `)
      } finally {
        const cleanupObjects = await ddlClient.query(`
          SELECT tgname AS object_name
          FROM pg_trigger
          WHERE tgname = 'trg_test_force_plans_update_failure'
          UNION ALL
          SELECT proname AS object_name
          FROM pg_proc
          WHERE proname = 'fn_test_force_plans_update_failure'
        `)
        cleanupObjectCount = cleanupObjects.rowCount ?? -1
        await ddlClient.end()
      }
    }

    // 4. Verify DB state is rolled back
    const { data: updatedPlan } = await adminClient.from('plans').select('status').eq('id', plan.id).single()
    expect(updatedPlan?.status).toBe('active') // Still active, plans update rolled back

    const { data: records } = await adminClient.from('parasite_records').select('*').eq('plan_id', plan.id)
    expect(records?.length).toBe(0) // No parasite records committed (rolled back)

    // 5. Verify cleanup was successful
    expect(cleanupObjectCount).toBe(0)
  })

  it('Pasif protokollü mevcut planın tamamlanması ve user_manual engeli', async () => {
    mockSessionUser({ id: testUserId } as any)

    // 1. Create a test protocol
    const { data: proto } = await adminClient.from('parasite_protocols').insert({
      parasite_code: 'P_PASS_TEST',
      protocol_name: 'Passive Test Parasite',
      parasite_type: 'internal',
      species: 'dog',
      default_protection_duration_days: 30,
      allowed_application_methods: ['oral'],
      default_application_method: 'oral',
      min_age_weeks: 6,
      is_active: true
    }).select().single()

    // 2. Create active plan associated with the active protocol
    const { data: plan } = await adminClient.from('plans').insert({
      user_id: testUserId,
      pet_id: testPetIdOwned,
      category: 'parazit',
      sub_type: 'İç Parazit',
      scheduled_at: new Date().toISOString(),
      status: 'active',
      extra_data: { parasite_protocol_id: proto.id }
    }).select().single()

    // 3. Deactivate protocol (is_active = false)
    await adminClient.from('parasite_protocols').update({ is_active: false }).eq('id', proto.id)

    // 4. Try plan_completion - Should be allowed!
    const req1 = new NextRequest(`http://localhost:3000/api/plans/${plan.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        administered_at: '2026-07-16',
        application_method: 'oral'
      })
    })

    const res1 = await PATCH(req1, { params: Promise.resolve({ id: plan.id }) })
    expect(res1.status).toBe(200)

    // Verify parasite record is created
    const { data: records } = await adminClient.from('parasite_records').select('*').eq('plan_id', plan.id)
    expect(records?.length).toBe(1)

    // 5. Try user_manual insert with same passive protocol - Should be rejected!
    const { data: manualRecord, error: manualError } = await adminClient.from('parasite_records').insert({
      pet_id: testPetIdOwned,
      parasite_protocol_id: proto.id,
      parasite_code: 'P_PASS_TEST',
      parasite_type: 'internal',
      administered_at: '2026-07-16',
      application_method: 'oral',
      protection_duration_days: 30,
      source: 'user_manual',
      created_by: testUserId
    })

    expect(manualError).not.toBeNull()
    expect(manualError?.message).toContain('pasif durumdadir')

    // Clean up
    await adminClient.from('plans').delete().eq('id', plan.id)
    await adminClient.from('parasite_records').delete().eq('plan_id', plan.id)
    await adminClient.from('parasite_protocols').delete().eq('id', proto.id)
  })
})

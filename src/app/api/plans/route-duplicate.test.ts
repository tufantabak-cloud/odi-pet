import { vi, describe, it, expect, afterAll, beforeAll } from 'vitest'
import * as dotenv from 'dotenv'
import { NextRequest } from 'next/server'

// Load environment variables
dotenv.config({ path: '.env.local' })

import * as authModule from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import * as serverSupabaseModule from '@/lib/supabase/server'
import { POST } from './route'

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

describe('Plans Creation API - Duplicate Prevention Tests', () => {
  const adminClient = createAdminSupabaseClient()
  let testUserId = ''
  let testPetIdOwned = ''
  let testVaccineCode1 = 'TEST_VACC_DUP_1'
  let testVaccineCode2 = 'TEST_VACC_DUP_2'

  const mockSessionUser = (user: any) => {
    vi.mocked(authModule.getSessionUser).mockResolvedValue(user)
  }

  beforeAll(async () => {
    const { data: user } = await adminClient.from('profiles').select('id').limit(1).single()
    testUserId = user?.id || ''

    // 1. Create a vaccine protocol
    await adminClient.from('vaccine_protocols').delete().in('vaccine_code', [testVaccineCode1, testVaccineCode2])
    await adminClient.from('vaccine_protocols').insert([
      {
        vaccine_code: testVaccineCode1,
        protocol_name: 'Test Duplicate Vaccine 1',
        species: 'dog',
        category: 'core',
        is_active: true,
        doses: [{ dose_number: 1, label: 'Doz 1', min_age_weeks: 8 }]
      },
      {
        vaccine_code: testVaccineCode2,
        protocol_name: 'Test Duplicate Vaccine 2',
        species: 'dog',
        category: 'core',
        is_active: true,
        doses: []
      }
    ])

    // 2. Create test pet
    const { data: petOwned } = await adminClient.from('pets').insert({
      owner_id: testUserId,
      name: 'VT Plans Dup Dog',
      species: 'dog',
      gender: 'male',
      birth_date: '2025-01-01'
    }).select().single()
    testPetIdOwned = petOwned.id

    // Insert ownership
    await adminClient.from('pet_owners').upsert({
      pet_id: testPetIdOwned,
      profile_id: testUserId,
      role: 'owner'
    }, { onConflict: 'pet_id,profile_id' })
  })

  afterAll(async () => {
    // Cleanup
    await adminClient.from('plans').delete().eq('pet_id', testPetIdOwned)
    await adminClient.from('pet_owners').delete().eq('pet_id', testPetIdOwned)
    await adminClient.from('pets').delete().eq('id', testPetIdOwned)
    await adminClient.from('vaccine_protocols').delete().in('vaccine_code', [testVaccineCode1, testVaccineCode2])
  })

  it('Doz numarası varken aktif plan varsa 409 DUPLICATE_ACTIVE_VACCINE_PLAN dönmeli', async () => {
    mockSessionUser({ id: testUserId } as any)

    // First request: create a plan
    const req1 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'asi',
        sub_type: 'Test Duplicate Vaccine 1 — Doz 1',
        scheduled_at: '2026-07-20T12:00:00Z',
        repeat_rule: null,
        extra_data: {
          vaccine_code: testVaccineCode1,
          dose_number: 1
        }
      })
    })

    const res1 = await POST(req1)
    expect(res1.status).toBe(201)
    const body1 = await res1.json()
    const firstPlanId = body1.plan.id

    // Second request: create duplicate dose plan
    const req2 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'asi',
        sub_type: 'Test Duplicate Vaccine 1 — Doz 1 (Duplicate)',
        scheduled_at: '2026-07-21T12:00:00Z',
        repeat_rule: null,
        extra_data: {
          vaccine_code: testVaccineCode1,
          dose_number: 1
        }
      })
    })

    const res2 = await POST(req2)
    expect(res2.status).toBe(409)
    const body2 = await res2.json()
    expect(body2.error).toBe('DUPLICATE_ACTIVE_VACCINE_PLAN')
    expect(body2.plan_id).toBe(firstPlanId)
  })

  it('Doz numarası yokken aynı gün aktif plan varsa 409 DUPLICATE_ACTIVE_VACCINE_PLAN dönmeli', async () => {
    mockSessionUser({ id: testUserId } as any)

    // First request: create plan on 2026-07-22
    const req1 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'asi',
        sub_type: 'Test Duplicate Vaccine 2',
        scheduled_at: '2026-07-22T12:00:00Z',
        repeat_rule: null,
        extra_data: {
          vaccine_code: testVaccineCode2
        }
      })
    })

    const res1 = await POST(req1)
    expect(res1.status).toBe(201)
    const body1 = await res1.json()
    const firstPlanId = body1.plan.id

    // Second request: same day (different time) -> should fail
    const req2 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'asi',
        sub_type: 'Test Duplicate Vaccine 2 (Duplicate)',
        scheduled_at: '2026-07-22T18:30:00Z',
        repeat_rule: null,
        extra_data: {
          vaccine_code: testVaccineCode2
        }
      })
    })

    const res2 = await POST(req2)
    expect(res2.status).toBe(409)
    const body2 = await res2.json()
    expect(body2.error).toBe('DUPLICATE_ACTIVE_VACCINE_PLAN')
    expect(body2.plan_id).toBe(firstPlanId)

    // Third request: different day -> should succeed
    const req3 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'asi',
        sub_type: 'Test Duplicate Vaccine 2 (Next Day)',
        scheduled_at: '2026-07-23T12:00:00Z',
        repeat_rule: null,
        extra_data: {
          vaccine_code: testVaccineCode2
        }
      })
    })

    const res3 = await POST(req3)
    expect(res3.status).toBe(201)
  })

  it('Bakım kategorisinde aktif Banyo planı varken ikinci Banyo planı 409 DUPLICATE_ACTIVE_PLAN dönmeli', async () => {
    mockSessionUser({ id: testUserId } as any)

    // First request: create Banyo plan
    const req1 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'bakim',
        sub_type: 'Banyo',
        scheduled_at: '2026-08-01T10:00:00Z',
        repeat_rule: null,
      })
    })

    const res1 = await POST(req1)
    expect(res1.status).toBe(201)
    const body1 = await res1.json()
    const banyoPlanId = body1.plan.id

    // Second request: duplicate Banyo plan
    const req2 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'bakim',
        sub_type: 'Banyo',
        scheduled_at: '2026-08-05T10:00:00Z',
        repeat_rule: null,
      })
    })

    const res2 = await POST(req2)
    expect(res2.status).toBe(409)
    const body2 = await res2.json()
    expect(body2.error).toBe('DUPLICATE_ACTIVE_PLAN')
    expect(body2.plan_id).toBe(banyoPlanId)
    expect(body2.category).toBe('bakim')
  })

  it('İlaç alt kategorisinde aynı ilaç adı mükerrer sayılmalı, farklı ilaç adına izin verilmeli', async () => {
    mockSessionUser({ id: testUserId } as any)

    // First medication: Antibiyotik
    const req1 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'saglik',
        sub_type: 'İlaç',
        scheduled_at: '2026-08-01T09:00:00Z',
        repeat_rule: 'daily',
        extra_data: {
          medication_name: 'Antibiyotik X'
        }
      })
    })

    const res1 = await POST(req1)
    expect(res1.status).toBe(201)

    // Duplicate medication: same name
    const req2 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'saglik',
        sub_type: 'İlaç',
        scheduled_at: '2026-08-02T09:00:00Z',
        repeat_rule: null,
        extra_data: {
          medication_name: 'Antibiyotik X'
        }
      })
    })

    const res2 = await POST(req2)
    expect(res2.status).toBe(409)
    const body2 = await res2.json()
    expect(body2.error).toBe('DUPLICATE_ACTIVE_PLAN')

    // Different medication: Vitamin -> should succeed
    const req3 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'saglik',
        sub_type: 'İlaç',
        scheduled_at: '2026-08-01T12:00:00Z',
        repeat_rule: null,
        extra_data: {
          medication_name: 'Vitamin Paste'
        }
      })
    })

    const res3 = await POST(req3)
    expect(res3.status).toBe(201)
  })

  it('Kontroller ve Beslenme alt kategorilerinde aktif plan varken 409 dönmeli', async () => {
    mockSessionUser({ id: testUserId } as any)

    // Kontrol planı
    const req1 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'kontrol',
        sub_type: 'Genel Kontrol',
        scheduled_at: '2026-08-10T14:00:00Z',
        repeat_rule: null,
      })
    })
    const res1 = await POST(req1)
    expect(res1.status).toBe(201)

    // Duplicate Kontrol planı
    const req2 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'kontrol',
        sub_type: 'Genel Kontrol',
        scheduled_at: '2026-08-15T14:00:00Z',
        repeat_rule: null,
      })
    })
    const res2 = await POST(req2)
    expect(res2.status).toBe(409)
    expect((await res2.json()).error).toBe('DUPLICATE_ACTIVE_PLAN')

    // Mama Siparişi planı
    const req3 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'beslenme',
        sub_type: 'Mama Siparişi',
        scheduled_at: '2026-08-20T10:00:00Z',
        repeat_rule: null,
      })
    })
    const res3 = await POST(req3)
    expect(res3.status).toBe(201)

    // Duplicate Mama Siparişi
    const req4 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'beslenme',
        sub_type: 'Mama Siparişi',
        scheduled_at: '2026-08-25T10:00:00Z',
        repeat_rule: null,
      })
    })
    const res4 = await POST(req4)
    expect(res4.status).toBe(409)
    expect((await res4.json()).error).toBe('DUPLICATE_ACTIVE_PLAN')
  })

  it('Aynı güne aynı görev için iki kez yapıldı (is_past_done) kaydı girilirse ikincisi 409 dönmeli, farklı güne izin verilmeli', async () => {
    mockSessionUser({ id: testUserId } as any)

    // 1. İlk yapıldı kaydı: 17 Eylül Diş Fırçalama (is_past_done = true)
    const req1 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'bakim',
        sub_type: 'Diş Fırçalama',
        scheduled_at: '2026-09-17T10:00:00Z',
        repeat_rule: null,
        extra_data: {
          is_past_done: true
        }
      })
    })
    const res1 = await POST(req1)
    expect(res1.status).toBe(201)
    const data1 = await res1.json()
    expect(data1.plan.status).toBe('completed')

    // 2. İkinci yapıldı kaydı: AYNI GÜN (17 Eylül) tekrar Diş Fırçalama girilmek istenirse 409 dönmeli
    const req2 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'bakim',
        sub_type: 'Diş Fırçalama',
        scheduled_at: '2026-09-17T18:00:00Z',
        repeat_rule: null,
        extra_data: {
          is_past_done: true
        }
      })
    })
    const res2 = await POST(req2)
    expect(res2.status).toBe(409)
    const data2 = await res2.json()
    expect(data2.error).toBe('DUPLICATE_COMPLETED_PLAN_SAME_DAY')

    // 3. Farklı gün (16 Eylül) yapıldı kaydına izin verilmeli
    const req3 = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'bakim',
        sub_type: 'Diş Fırçalama',
        scheduled_at: '2026-09-16T10:00:00Z',
        repeat_rule: null,
        extra_data: {
          is_past_done: true
        }
      })
    })
    const res3 = await POST(req3)
    expect(res3.status).toBe(201)
    const data3 = await res3.json()
    expect(data3.plan.status).toBe('completed')
  })
})

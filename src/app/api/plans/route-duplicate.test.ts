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
    await adminClient.from('pet_owners').insert({
      pet_id: testPetIdOwned,
      profile_id: testUserId,
      role: 'owner'
    })
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
})

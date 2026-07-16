import { vi, describe, it, expect, afterAll, beforeAll } from 'vitest'
import * as dotenv from 'dotenv'
import { NextRequest } from 'next/server'

dotenv.config({ path: '.env.local' })
process.env.ALLOW_LOCAL_DB_DDL_TESTS = 'true'

import * as authModule from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import * as serverSupabaseModule from '@/lib/supabase/server'
import { GET, POST } from './route'

vi.mock('@/lib/auth/get-current-profile', async () => {
  const actual = await vi.importActual<typeof authModule>('@/lib/auth/get-current-profile')
  return {
    ...actual,
    getSessionUser: vi.fn(),
  }
})

vi.mock('@/lib/supabase/server', async () => {
  const actual = await vi.importActual<typeof serverSupabaseModule>('@/lib/supabase/server')
  return {
    ...actual,
    createServerSupabaseClient: () => actual.createAdminSupabaseClient(),
  }
})

describe('Manual Parasite Record API Tests', () => {
  const adminClient = createAdminSupabaseClient()
  let testUserId = ''
  let testPetIdOwned = ''
  let testPetIdNotOwned = ''
  let dogProtoId = ''
  let catProtoId = ''
  let initialPlansCount = 0

  const mockSessionUser = (user: any) => {
    vi.mocked(authModule.getSessionUser).mockResolvedValue(user)
  }

  const createNextRequest = (body?: any) => {
    return new NextRequest('http://localhost', {
      method: body ? 'POST' : 'GET',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  beforeAll(async () => {
    const { data: dbCheck } = await adminClient.from('pets').select('id').limit(1)
    if (!dbCheck) {
      console.warn('Skipping tests: Supabase connection failed.')
      return
    }

    await adminClient.from('parasite_protocols').delete().in('parasite_code', ['DOG_MANUAL', 'CAT_MANUAL'])

    const { data: user } = await adminClient.auth.admin.createUser({
      email: `test-user-${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true,
    })
    testUserId = user.user!.id

    const { data: otherUser } = await adminClient.auth.admin.createUser({
      email: `other-user-${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true,
    })

    const { data: petOwned } = await adminClient.from('pets').insert({
      name: 'Dog1',
      species: 'dog',
      owner_id: testUserId,
      gender: 'male',
      birth_date: '2025-01-01'
    }).select().single()
    testPetIdOwned = petOwned!.id

    await adminClient.from('pet_owners').insert({
      pet_id: testPetIdOwned,
      profile_id: testUserId,
    })

    const { data: petNotOwned } = await adminClient.from('pets').insert({
      name: 'Cat1',
      species: 'cat',
      owner_id: otherUser.user!.id,
      gender: 'female',
      birth_date: '2025-01-01'
    }).select().single()
    testPetIdNotOwned = petNotOwned!.id

    await adminClient.from('pet_owners').insert({
      pet_id: testPetIdNotOwned,
      profile_id: otherUser.user!.id,
    })

    const { data: protoDog, error: protoDogError } = await adminClient.from('parasite_protocols').insert({
      protocol_name: 'Dog Manual Proto',
      species: 'dog',
      parasite_code: 'DOG_MANUAL',
      parasite_type: 'internal',
      is_active: true,
      allowed_application_methods: ['oral'],
      default_protection_duration_days: 30,
      default_application_method: 'oral',
      min_age_weeks: 6
    }).select().single()
    if (protoDogError) console.error('protoDogError:', protoDogError)
    dogProtoId = protoDog!.id

    const { data: protoCat, error: protoCatError } = await adminClient.from('parasite_protocols').insert({
      protocol_name: 'Cat Manual Proto',
      species: 'cat',
      parasite_code: 'CAT_MANUAL',
      parasite_type: 'external',
      is_active: true,
      allowed_application_methods: ['spot_on'],
      default_protection_duration_days: 30,
      default_application_method: 'spot_on',
      min_age_weeks: 6
    }).select().single()
    if (protoCatError) console.error('protoCatError:', protoCatError)
    catProtoId = protoCat!.id

    const { count } = await adminClient.from('plans').select('*', { count: 'exact', head: true }).eq('pet_id', testPetIdOwned)
    initialPlansCount = count || 0
  })

  afterAll(async () => {
    if (!testUserId) return
    await adminClient.from('parasite_records').delete().in('pet_id', [testPetIdOwned, testPetIdNotOwned])
    await adminClient.from('parasite_protocols').delete().in('id', [dogProtoId, catProtoId])
    await adminClient.from('pet_owners').delete().in('pet_id', [testPetIdOwned, testPetIdNotOwned])
    await adminClient.from('pets').delete().in('id', [testPetIdOwned, testPetIdNotOwned])
    await adminClient.auth.admin.deleteUser(testUserId)
  })

  it('fails with 401 if unauthorized', async () => {
    mockSessionUser(null)
    const req = createNextRequest()
    const res = await GET(req, { params: Promise.resolve({ id: testPetIdOwned }) })
    expect(res.status).toBe(401)
  })

  it('fails with 404 if pet not found', async () => {
    mockSessionUser({ id: testUserId })
    const req = createNextRequest()
    const res = await GET(req, { params: Promise.resolve({ id: '00000000-0000-0000-0000-000000000000' }) })
    expect(res.status).toBe(404)
  })

  it('fails with 403 if not owner', async () => {
    mockSessionUser({ id: testUserId })
    const req = createNextRequest()
    const res = await GET(req, { params: Promise.resolve({ id: testPetIdNotOwned }) })
    expect(res.status).toBe(403)
  })

  it('POST fails with extra fields', async () => {
    mockSessionUser({ id: testUserId })
    const req = createNextRequest({
      parasite_protocol_id: dogProtoId,
      administered_at: '2026-07-16',
      application_method: 'oral',
      source: 'user_manual' // extra
    })
    const res = await POST(req, { params: Promise.resolve({ id: testPetIdOwned }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('INVALID_PARASITE_RECORD_DATA')
  })

  it('POST fails with invalid date', async () => {
    mockSessionUser({ id: testUserId })
    const req = createNextRequest({
      parasite_protocol_id: dogProtoId,
      administered_at: '2026-02-31', // invalid calendar date
      application_method: 'oral'
    })
    const res = await POST(req, { params: Promise.resolve({ id: testPetIdOwned }) })
    expect(res.status).toBe(400)
  })

  it('POST fails if protocol species mismatch', async () => {
    mockSessionUser({ id: testUserId })
    const req = createNextRequest({
      parasite_protocol_id: catProtoId,
      administered_at: '2026-07-16',
      application_method: 'spot_on'
    })
    const res = await POST(req, { params: Promise.resolve({ id: testPetIdOwned }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('PROTOCOL_SPECIES_MISMATCH')
  })

  it('POST succeeds and creates record with plan independence', async () => {
    mockSessionUser({ id: testUserId })
    const req = createNextRequest({
      parasite_protocol_id: dogProtoId,
      administered_at: '2026-07-16',
      application_method: 'oral',
      brand_free_text: 'Test Brand',
    })
    const res = await POST(req, { params: Promise.resolve({ id: testPetIdOwned }) })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.record).toBeDefined()
    expect(json.record.source).toBe('user_manual')
    expect(json.record.plan_id).toBeNull()

    const { count } = await adminClient.from('plans').select('*', { count: 'exact', head: true }).eq('pet_id', testPetIdOwned)
    expect(count).toBe(initialPlansCount)
  })

  it('GET returns records with mapped protocol names', async () => {
    mockSessionUser({ id: testUserId })
    const req = createNextRequest()
    const res = await GET(req, { params: Promise.resolve({ id: testPetIdOwned }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
    expect(json.length).toBeGreaterThan(0)
    expect(json[0].protocol_name).toBe('Dog Manual Proto')
  })
})

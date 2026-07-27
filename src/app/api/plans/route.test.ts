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

describe('Plans Creation API - sub_type mismatch validation tests', () => {
  const adminClient = createAdminSupabaseClient()
  let testUserId = ''
  let testPetIdOwned = ''
  let internalProtoId = ''
  let externalProtoId = ''
  let combinedProtoId = ''
  let collarProtoId = ''

  const mockSessionUser = (user: any) => {
    vi.spyOn(authModule, 'getSessionUser').mockResolvedValue(user)
  }

  beforeAll(async () => {
    // 1. Get or create a valid user ID
    let userId = ''
    try {
      const { data: firstProfile } = await adminClient.from('profiles').select('id').limit(1).single()
      if (firstProfile) {
        userId = firstProfile.id
      }
    } catch {}

    if (!userId) {
      const { data: newUser, error: signUpError } = await adminClient.auth.admin.createUser({
        email: `test-plans-post-${Date.now()}@odi.pet`,
        password: 'password123',
        email_confirm: true
      })
      if (signUpError || !newUser?.user) {
        throw new Error('Failed to create test user: ' + signUpError?.message)
      }
      userId = newUser.user.id
    }
    testUserId = userId
    mockSessionUser({ id: testUserId } as any)

    // Clean up any stray data
    await adminClient.from('parasite_protocols').delete().in('parasite_code', ['P_POST_INT', 'P_POST_EXT', 'P_POST_COM', 'P_POST_COL'])

    // 2. Create test parasite protocols
    const { data: intProto } = await adminClient.from('parasite_protocols').insert({
      parasite_code: 'P_POST_INT',
      protocol_name: 'Post Internal',
      parasite_type: 'internal',
      species: 'dog',
      default_protection_duration_days: 30,
      allowed_application_methods: ['oral'],
      default_application_method: 'oral',
      is_active: true
    }).select().single()
    internalProtoId = intProto.id

    const { data: extProto } = await adminClient.from('parasite_protocols').insert({
      parasite_code: 'P_POST_EXT',
      protocol_name: 'Post External',
      parasite_type: 'external',
      species: 'dog',
      default_protection_duration_days: 30,
      allowed_application_methods: ['spot_on'],
      default_application_method: 'spot_on',
      is_active: true
    }).select().single()
    externalProtoId = extProto.id

    const { data: comProto } = await adminClient.from('parasite_protocols').insert({
      parasite_code: 'P_POST_COM',
      protocol_name: 'Post Combined',
      parasite_type: 'combined',
      species: 'dog',
      default_protection_duration_days: 30,
      allowed_application_methods: ['spot_on'],
      default_application_method: 'spot_on',
      is_active: true
    }).select().single()
    combinedProtoId = comProto.id

    const { data: colProto } = await adminClient.from('parasite_protocols').insert({
      parasite_code: 'P_POST_COL',
      protocol_name: 'Post Collar',
      parasite_type: 'collar',
      species: 'dog',
      default_protection_duration_days: 120,
      allowed_application_methods: ['collar'],
      default_application_method: 'collar',
      is_active: true
    }).select().single()
    collarProtoId = colProto.id

    // 3. Create test pet
    const { data: petOwned } = await adminClient.from('pets').insert({
      owner_id: testUserId,
      name: 'VT Plans Post Dog',
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
    await adminClient.from('parasite_protocols').delete().in('id', [internalProtoId, externalProtoId, combinedProtoId, collarProtoId])
  })

  it('Dış Parazit sub_type ile collar tipi eşleştiğinde 400 PROTOCOL_TYPE_MISMATCH dönmeli', async () => {
    mockSessionUser({ id: testUserId } as any)

    const req = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'parazit',
        sub_type: 'Dış Parazit',
        scheduled_at: '2026-07-16T12:00:00Z',
        repeat_rule: null,
        extra_data: { parasite_protocol_id: collarProtoId }
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('PROTOCOL_TYPE_MISMATCH')
  })

  it('Parazit Tasması sub_type ile collar tipi eşleştiğinde başarıyla 201 oluşturulmalı', async () => {
    mockSessionUser({ id: testUserId } as any)

    const req = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'parazit',
        sub_type: 'Parazit Tasması',
        scheduled_at: '2026-07-16T12:00:00Z',
        repeat_rule: null,
        extra_data: { parasite_protocol_id: collarProtoId }
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.plan).toBeDefined()
  })

  it('Dış Parazit sub_type ile external tipi eşleştiğinde başarıyla 201 oluşturulmalı', async () => {
    mockSessionUser({ id: testUserId } as any)

    const req = new NextRequest('http://localhost:3000/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pet_id: testPetIdOwned,
        category: 'parazit',
        sub_type: 'Dış Parazit',
        scheduled_at: '2026-07-16T12:00:00Z',
        repeat_rule: null,
        extra_data: { parasite_protocol_id: externalProtoId }
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.plan.extra_data).toEqual(expect.objectContaining({
      parasite_protocol_id: externalProtoId,
      parasite_code: 'P_POST_EXT',
      parasite_type: 'external'
    }))
  })
})

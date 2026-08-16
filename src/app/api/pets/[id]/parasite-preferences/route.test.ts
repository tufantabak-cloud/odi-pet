import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as dotenv from 'dotenv'
import { NextRequest } from 'next/server'

// Load environment variables
dotenv.config({ path: '.env.local' })

import * as authModule from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import * as serverSupabaseModule from '@/lib/supabase/server'
import { GET, PATCH } from './route'

const adminClient = createAdminSupabaseClient()
const originalFrom = adminClient.from.bind(adminClient)

// Intercept database calls to mock invalid species pet behavior without breaking normal query builders
adminClient.from = ((table: string): any => {
  if (table === 'pets') {
    const orig = originalFrom('pets')
    const origSelect = orig.select.bind(orig)
    orig.select = ((cols?: string): any => {
      const selectBuilder = origSelect(cols)
      const origEq = selectBuilder.eq.bind(selectBuilder)
      selectBuilder.eq = ((col: string, val: any): any => {
        if (val === 'invalid-species-pet-id') {
          return {
            single: async () => ({ data: { id: val, species: 'bird' }, error: null })
          } as any
        }
        return origEq(col, val)
      }) as any
      return selectBuilder
    }) as any
    return orig
  }
  if (table === 'pet_owners') {
    const orig = originalFrom('pet_owners')
    const origSelect = orig.select.bind(orig)
    orig.select = ((cols?: string): any => {
      const selectBuilder = origSelect(cols)
      const origEq = selectBuilder.eq.bind(selectBuilder)
      selectBuilder.eq = ((col1: string, val1: any): any => {
        const eqBuilder = origEq(col1, val1)
        const origEq2 = eqBuilder.eq?.bind(eqBuilder)
        if (origEq2) {
          eqBuilder.eq = ((col2: string, val2: any): any => {
            if (val1 === 'invalid-species-pet-id') {
              return {
                single: async () => ({ data: { id: 'some-owner-id' }, error: null })
              } as any
            }
            return origEq2(col2, val2)
          }) as any
        }
        return eqBuilder
      }) as any
      return selectBuilder
    }) as any
    return orig
  }
  return originalFrom(table)
}) as any

// Mock auth helper
vi.mock('@/lib/auth/get-current-profile', async () => {
  const actual = await vi.importActual<typeof authModule>('@/lib/auth/get-current-profile')
  return {
    ...actual,
    getSessionUser: vi.fn(),
    requireRole: vi.fn(),
  }
})

// Mock Supabase server client to use our intercepted client
vi.mock('@/lib/supabase/server', async () => {
  const actual = await vi.importActual<typeof serverSupabaseModule>('@/lib/supabase/server')
  return {
    ...actual,
    createServerSupabaseClient: () => adminClient,
  }
})

describe('Owner Parasite Preferences API Tests', () => {
  const testUserId = '4f1256db-2a84-434d-852c-bdba22e538ca' // tufan.tabak@gmail.com
  let ownedPetId: string
  let unownedPetId: string
  const invalidSpeciesPetId = 'invalid-species-pet-id'

  let activeDogProtoId: string
  let activeCatProtoId: string
  let inactiveDogProtoId: string

  // Setup test data
  beforeAll(async () => {
    // 1. Find pets
    // Find a pet owned by testUserId
    const { data: ownedOwnerRow } = await originalFrom('pet_owners')
      .select('pet_id')
      .eq('profile_id', testUserId)
      .limit(1)
      .single()
    
    if (ownedOwnerRow) {
      ownedPetId = ownedOwnerRow.pet_id
    } else {
      throw new Error('No pet owned by test user found in DB.')
    }

    // Find a pet NOT owned by testUserId
    const { data: unownedOwnerRow } = await originalFrom('pet_owners')
      .select('pet_id')
      .neq('profile_id', testUserId)
      .limit(1)
      .single()

    if (unownedOwnerRow) {
      unownedPetId = unownedOwnerRow.pet_id
    }

    // 2. Create temporary protocols
    const uniqueSuffix = Date.now()
    
    // Active Dog Protocol
    const { data: activeDog } = await originalFrom('parasite_protocols')
      .insert({
        parasite_code: `TEST_DOG_${uniqueSuffix}`,
        protocol_name: 'Test Active Dog Protocol',
        parasite_type: 'internal',
        species: 'dog',
        default_protection_duration_days: 30,
        allowed_application_methods: ['spot_on'],
        default_application_method: 'spot_on',
        is_active: true,
      })
      .select()
      .single()

    activeDogProtoId = activeDog?.id || ''

    // Active Cat Protocol
    const { data: activeCat } = await originalFrom('parasite_protocols')
      .insert({
        parasite_code: `TEST_CAT_${uniqueSuffix}`,
        protocol_name: 'Test Active Cat Protocol',
        parasite_type: 'external',
        species: 'cat',
        default_protection_duration_days: 45,
        allowed_application_methods: ['spot_on'],
        default_application_method: 'spot_on',
        is_active: true,
      })
      .select()
      .single()

    activeCatProtoId = activeCat?.id || ''

    // Inactive Dog Protocol
    const { data: inactiveDog } = await originalFrom('parasite_protocols')
      .insert({
        parasite_code: `TEST_INAC_${uniqueSuffix}`,
        protocol_name: 'Test Inactive Dog Protocol',
        parasite_type: 'internal',
        species: 'dog',
        default_protection_duration_days: 30,
        allowed_application_methods: ['spot_on'],
        default_application_method: 'spot_on',
        is_active: false,
      })
      .select()
      .single()

    inactiveDogProtoId = inactiveDog?.id || ''
  })

  // Cleanup test data
  afterAll(async () => {
    // Delete preferences first
    if (ownedPetId) {
      await originalFrom('pet_parasite_preferences')
        .delete()
        .eq('pet_id', ownedPetId)
    }

    // Delete temporary protocols
    if (activeDogProtoId) {
      await originalFrom('parasite_protocols').delete().eq('id', activeDogProtoId)
    }
    if (activeCatProtoId) {
      await originalFrom('parasite_protocols').delete().eq('id', activeCatProtoId)
    }
    if (inactiveDogProtoId) {
      await originalFrom('parasite_protocols').delete().eq('id', inactiveDogProtoId)
    }
  })

  // Mock helpers
  const mockUser = (user: any) => {
    vi.spyOn(authModule, 'getSessionUser').mockResolvedValue(user)
  }

  // 1. Oturumsuz -> 401
  it('1. Oturumsuz -> 401', async () => {
    mockUser(null)
    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/parasite-preferences`)
    const res = await GET(req, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('UNAUTHORIZED')
  })

  // 2. Başkasının peti -> 403
  it('2. Başkasının peti -> 403', async () => {
    if (!unownedPetId) {
      console.warn('Skipping test 2 because no unowned pet exists in DB.')
      return
    }
    mockUser({ id: testUserId })
    const req = new NextRequest(`http://localhost/api/pets/${unownedPetId}/parasite-preferences`)
    const res = await GET(req, { params: Promise.resolve({ id: unownedPetId }) })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('FORBIDDEN')
  })

  // 3. Pet bulunamadı -> 404
  it('3. Pet bulunamadı -> 404', async () => {
    mockUser({ id: testUserId })
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const req = new NextRequest(`http://localhost/api/pets/${fakeId}/parasite-preferences`)
    const res = await GET(req, { params: Promise.resolve({ id: fakeId }) })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('PET_NOT_FOUND')
  })

  // 4. Geçersiz pet türü -> 400
  it('4. Geçersiz pet türü -> 400', async () => {
    mockUser({ id: testUserId })
    const req = new NextRequest(`http://localhost/api/pets/${invalidSpeciesPetId}/parasite-preferences`)
    const res = await GET(req, { params: Promise.resolve({ id: invalidSpeciesPetId }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('INVALID_PET_SPECIES')
  })

  // 5. GET, preference yokken enabled=true
  it('5. GET, preference yokken enabled=true ve is_default=true', async () => {
    mockUser({ id: testUserId })
    
    // We need to verify if our pet is dog or cat to expect the correct protocol
    const { data: pet } = await originalFrom('pets').select('species').eq('id', ownedPetId).single()
    const targetProtoId = pet?.species === 'dog' ? activeDogProtoId : activeCatProtoId

    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/parasite-preferences`)
    const res = await GET(req, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res.status).toBe(200)
    
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)

    const testItem = json.find((p: any) => p.id === targetProtoId)
    expect(testItem).toBeDefined()
    expect(testItem.enabled).toBe(true)
    expect(testItem.is_default).toBe(true)
  })

  // 6. PATCH false -> preference oluşmalı
  it('6. PATCH false -> preference oluşmalı', async () => {
    mockUser({ id: testUserId })

    const { data: pet } = await originalFrom('pets').select('species').eq('id', ownedPetId).single()
    const targetProtoId = pet?.species === 'dog' ? activeDogProtoId : activeCatProtoId

    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/parasite-preferences`, {
      method: 'PATCH',
      body: JSON.stringify({
        parasite_protocol_id: targetProtoId,
        enabled: false
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: ownedPetId }) })
    const json = await res.json()
    if (res.status !== 200) {
      console.error('PATCH 6 FAILED:', json)
    }
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.enabled).toBe(false)

    // Verify it exists in DB
    const { data: dbPref } = await originalFrom('pet_parasite_preferences')
      .select('enabled')
      .eq('pet_id', ownedPetId)
      .eq('parasite_protocol_id', targetProtoId)
      .single()

    expect(dbPref?.enabled).toBe(false)
  })

  // 7. GET sonrası enabled=false
  it('7. GET sonrası enabled=false ve is_default=false', async () => {
    mockUser({ id: testUserId })

    const { data: pet } = await originalFrom('pets').select('species').eq('id', ownedPetId).single()
    const targetProtoId = pet?.species === 'dog' ? activeDogProtoId : activeCatProtoId

    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/parasite-preferences`)
    const res = await GET(req, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res.status).toBe(200)
    
    const json = await res.json()
    const testItem = json.find((p: any) => p.id === targetProtoId)
    expect(testItem).toBeDefined()
    expect(testItem.enabled).toBe(false)
    expect(testItem.is_default).toBe(false)
  })

  // 8. PATCH true -> tekrar aktif olmalı
  it('8. PATCH true -> tekrar aktif olmalı', async () => {
    mockUser({ id: testUserId })

    const { data: pet } = await originalFrom('pets').select('species').eq('id', ownedPetId).single()
    const targetProtoId = pet?.species === 'dog' ? activeDogProtoId : activeCatProtoId

    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/parasite-preferences`, {
      method: 'PATCH',
      body: JSON.stringify({
        parasite_protocol_id: targetProtoId,
        enabled: true
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.enabled).toBe(true)

    // Verify it updated in DB
    const { data: dbPref } = await originalFrom('pet_parasite_preferences')
      .select('enabled')
      .eq('pet_id', ownedPetId)
      .eq('parasite_protocol_id', targetProtoId)
      .single()

    expect(dbPref?.enabled).toBe(true)
  })

  // 9. Başka türe ait protokol -> 400 PROTOCOL_SPECIES_MISMATCH
  it('9. Başka türe ait protokol -> 400', async () => {
    mockUser({ id: testUserId })

    const { data: pet } = await originalFrom('pets').select('species').eq('id', ownedPetId).single()
    // Select mismatching protocol
    const mismatchProtoId = pet?.species === 'dog' ? activeCatProtoId : activeDogProtoId

    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/parasite-preferences`, {
      method: 'PATCH',
      body: JSON.stringify({
        parasite_protocol_id: mismatchProtoId,
        enabled: false
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('PROTOCOL_SPECIES_MISMATCH')
  })

  // 10. Pasif protokolü aktifleştirme -> 409 INACTIVE_PROTOCOL
  it('10. Pasif protokolü aktifleştirme -> 409', async () => {
    mockUser({ id: testUserId })

    const { data: pet } = await originalFrom('pets').select('species').eq('id', ownedPetId).single()
    
    // Inactive protocol test is only applicable if pet is dog since our inactive temporary protocol is dog.
    // If pet is cat, let's skip or create temporary inactive cat protocol.
    let inactiveId = inactiveDogProtoId
    if (pet?.species === 'cat') {
      // Create temporary inactive cat protocol on the fly
      const { data: inactiveCat } = await originalFrom('parasite_protocols')
        .insert({
          parasite_code: `TEST_INACCAT_${Date.now()}`,
          protocol_name: 'Test Inactive Cat Protocol',
          parasite_type: 'internal',
          species: 'cat',
          default_protection_duration_days: 30,
          allowed_application_methods: ['spot_on'],
          default_application_method: 'spot_on',
          is_active: false,
        })
        .select()
        .single()
      inactiveId = inactiveCat?.id || ''
    }

    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/parasite-preferences`, {
      method: 'PATCH',
      body: JSON.stringify({
        parasite_protocol_id: inactiveId,
        enabled: true
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('INACTIVE_PROTOCOL')

    // Clean up temporary inactive cat if created
    if (pet?.species === 'cat' && inactiveId) {
      await originalFrom('parasite_protocols').delete().eq('id', inactiveId)
    }
  })

  // 11. Geçersiz body -> 400 INVALID_PREFERENCE_DATA
  it('11. Geçersiz body -> 400', async () => {
    mockUser({ id: testUserId })

    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/parasite-preferences`, {
      method: 'PATCH',
      body: JSON.stringify({
        parasite_protocol_id: activeDogProtoId
        // enabled is missing
      })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('INVALID_PREFERENCE_DATA')
  })
})

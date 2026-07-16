import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as dotenv from 'dotenv'
import { NextRequest } from 'next/server'

// Load environment variables
dotenv.config({ path: '.env.local' })

import * as authModule from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import * as serverSupabaseModule from '@/lib/supabase/server'
import { GET, PATCH } from './route'
import { POST as createPlanPOST } from './[code]/create-plan/route'

const adminClient = createAdminSupabaseClient()

// Mock auth helper
vi.mock('@/lib/auth/get-current-profile', async () => {
  const actual = await vi.importActual<typeof authModule>('@/lib/auth/get-current-profile')
  return {
    ...actual,
    getSessionUser: vi.fn(),
    requireRole: vi.fn(),
  }
})

// Mock Supabase server client
vi.mock('@/lib/supabase/server', async () => {
  const actual = await vi.importActual<typeof serverSupabaseModule>('@/lib/supabase/server')
  return {
    ...actual,
    createServerSupabaseClient: () => adminClient,
  }
})

describe('Vaccine Preferences API Tests', () => {
  const testUserId = '4f1256db-2a84-434d-852c-bdba22e538ca' // tufan.tabak@gmail.com
  let ownedPetId: string
  let unownedPetId: string
  let petSpecies: string

  let legalCode = 'V_TEST_LEGAL'
  let coreCode = 'V_TEST_CORE'
  let riskCode = 'V_TEST_RISK'
  let optCode = 'V_TEST_OPT'
  let inactiveCode = 'V_TEST_INACTIVE'
  let mismatchCode = 'V_TEST_MISMATCH'
  let conflictingCode = 'V_TEST_CONFLICTING'

  // Setup test data
  beforeAll(async () => {
    // 1. Find pets
    const { data: ownedOwnerRow } = await adminClient
      .from('pet_owners')
      .select('pet_id, pets(species)')
      .eq('profile_id', testUserId)
      .limit(1)
      .single()
    
    if (ownedOwnerRow) {
      ownedPetId = ownedOwnerRow.pet_id
      petSpecies = (ownedOwnerRow as any).pets?.species === 'dog' ? 'dog' : 'cat'
    } else {
      throw new Error('No pet owned by test user found in DB.')
    }

    const { data: unownedOwnerRow } = await adminClient
      .from('pet_owners')
      .select('pet_id')
      .neq('profile_id', testUserId)
      .limit(1)
      .single()

    if (unownedOwnerRow) {
      unownedPetId = unownedOwnerRow.pet_id
    }

    // Define species for mismatch protocol
    const mismatchSpecies = petSpecies === 'dog' ? 'cat' : 'dog'

    // Clean up any stray test protocols from previous runs
    const testCodes = [legalCode, coreCode, riskCode, optCode, inactiveCode, mismatchCode, conflictingCode]
    await adminClient.from('vaccine_protocols').delete().in('vaccine_code', testCodes)

    // 2. Create vaccine protocols
    // Legal Vaccine (Active, species matching)
    await adminClient.from('vaccine_protocols').insert({
      vaccine_code: legalCode,
      protocol_name: 'Test Legal Vaccine',
      species: petSpecies,
      category: 'legal',
      is_active: true,
      is_core: false,
      doses: [{ dose_number: 1, min_age_weeks: 8, label: 'Doz 1' }],
    })

    // Core Vaccine (Active, species matching)
    await adminClient.from('vaccine_protocols').insert({
      vaccine_code: coreCode,
      protocol_name: 'Test Core Vaccine',
      species: petSpecies,
      category: 'core',
      is_active: true,
      is_core: true,
      doses: [{ dose_number: 1, min_age_weeks: 8, label: 'Doz 1' }],
    })

    // Risk-based Vaccine (Active, species matching)
    await adminClient.from('vaccine_protocols').insert({
      vaccine_code: riskCode,
      protocol_name: 'Test Risk-based Vaccine',
      species: petSpecies,
      category: 'risk_based',
      is_active: true,
      is_core: false,
      doses: [{ dose_number: 1, min_age_weeks: 8, label: 'Doz 1' }],
    })

    // Optional Vaccine (Active, species matching)
    await adminClient.from('vaccine_protocols').insert({
      vaccine_code: optCode,
      protocol_name: 'Test Optional Vaccine',
      species: petSpecies,
      category: 'optional',
      is_active: true,
      is_core: false,
      doses: [{ dose_number: 1, min_age_weeks: 8, label: 'Doz 1' }],
    })

    // Inactive Vaccine
    await adminClient.from('vaccine_protocols').insert({
      vaccine_code: inactiveCode,
      protocol_name: 'Test Inactive Vaccine',
      species: petSpecies,
      category: 'optional',
      is_active: false,
      is_core: false,
      doses: [{ dose_number: 1, min_age_weeks: 8, label: 'Doz 1' }],
    })

    // Mismatched Species Vaccine (Active, wrong species)
    await adminClient.from('vaccine_protocols').insert({
      vaccine_code: mismatchCode,
      protocol_name: 'Test Mismatch Vaccine',
      species: mismatchSpecies,
      category: 'optional',
      is_active: true,
      is_core: false,
      doses: [{ dose_number: 1, min_age_weeks: 8, label: 'Doz 1' }],
    })

    // Conflicting Vaccine (category = risk_based, is_core = true)
    await adminClient.from('vaccine_protocols').insert({
      vaccine_code: conflictingCode,
      protocol_name: 'Test Conflicting Vaccine',
      species: petSpecies,
      category: 'risk_based',
      is_active: true,
      is_core: true,
      doses: [{ dose_number: 1, min_age_weeks: 8, label: 'Doz 1' }],
    })
  })

  // Cleanup test data
  afterAll(async () => {
    // Delete created plans
    if (ownedPetId) {
      await adminClient
        .from('plans')
        .delete()
        .eq('pet_id', ownedPetId)
        .eq('category', 'asi')

      // Delete preferences
      await adminClient
        .from('pet_vaccine_preferences')
        .delete()
        .eq('pet_id', ownedPetId)
    }

    // Delete protocols
    const testCodes = [legalCode, coreCode, riskCode, optCode, inactiveCode, mismatchCode, conflictingCode]
    await adminClient.from('vaccine_protocols').delete().in('vaccine_code', testCodes)
  })

  // Mock helpers
  const mockUser = (user: any) => {
    vi.spyOn(authModule, 'getSessionUser').mockResolvedValue(user)
  }

  // 1. Oturumsuz -> 401
  it('1. Oturumsuz -> 401', async () => {
    mockUser(null)
    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/vaccine-preferences`)
    const res = await GET(req, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res.status).toBe(401)
  })

  // 2. Başkasının peti -> 403
  it('2. Başkasının peti -> 403', async () => {
    if (!unownedPetId) return
    mockUser({ id: testUserId })
    const req = new NextRequest(`http://localhost/api/pets/${unownedPetId}/vaccine-preferences`)
    const res = await GET(req, { params: Promise.resolve({ id: unownedPetId }) })
    expect(res.status).toBe(403)
  })

  // 3. GET ile tüm kategorilerin listelenmesi ve kilit kuralları
  it('3. GET ile kategoriler ve kilit kuralları', async () => {
    mockUser({ id: testUserId })
    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/vaccine-preferences`)
    const res = await GET(req, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res.status).toBe(200)

    const json = await res.json()
    const protocols = json.protocols

    // Check legal vaccine
    const legalItem = protocols.find((p: any) => p.vaccine_code === legalCode)
    expect(legalItem).toBeDefined()
    expect(legalItem.category).toBe('legal')
    expect(legalItem.enabled).toBe(true)
    expect(legalItem.locked).toBe(true)
    expect(legalItem.is_default).toBe(true)

    // Check core vaccine
    const coreItem = protocols.find((p: any) => p.vaccine_code === coreCode)
    expect(coreItem).toBeDefined()
    expect(coreItem.enabled).toBe(true)
    expect(coreItem.locked).toBe(true)

    // Check risk_based vaccine (defaults to enabled=true, locked=false)
    const riskItem = protocols.find((p: any) => p.vaccine_code === riskCode)
    expect(riskItem).toBeDefined()
    expect(riskItem.category).toBe('risk_based')
    expect(riskItem.enabled).toBe(true)
    expect(riskItem.locked).toBe(false)

    // Check optional vaccine (defaults to enabled=true, locked=false)
    const optItem = protocols.find((p: any) => p.vaccine_code === optCode)
    expect(optItem).toBeDefined()
    expect(optItem.category).toBe('optional')
    expect(optItem.enabled).toBe(true)
    expect(optItem.locked).toBe(false)
  })

  // 4. Kilitli (legal/core) aşıların PATCH ile değiştirilmesi engellenmeli -> 400 LOCKED_VACCINE_PREFERENCE
  it('4. Kilitli aşı PATCH -> 400', async () => {
    mockUser({ id: testUserId })
    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/vaccine-preferences`, {
      method: 'PATCH',
      body: JSON.stringify({
        vaccine_code: legalCode,
        enabled: false,
      }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('LOCKED_VACCINE_PREFERENCE')
  })

  // 5. risk_based/optional PATCH ile değiştirilebilir olmalı
  it('5. Değiştirilebilir aşı PATCH -> Başarılı', async () => {
    mockUser({ id: testUserId })

    // Disable risk_based vaccine
    const req1 = new NextRequest(`http://localhost/api/pets/${ownedPetId}/vaccine-preferences`, {
      method: 'PATCH',
      body: JSON.stringify({
        vaccine_code: riskCode,
        enabled: false,
      }),
    })

    const res1 = await PATCH(req1, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res1.status).toBe(200)
    const json1 = await res1.json()
    expect(json1.data.enabled).toBe(false)

    // Verify GET returns enabled = false for risk_based
    const req2 = new NextRequest(`http://localhost/api/pets/${ownedPetId}/vaccine-preferences`)
    const res2 = await GET(req2, { params: Promise.resolve({ id: ownedPetId }) })
    const json2 = await res2.json()
    const riskItem = json2.protocols.find((p: any) => p.vaccine_code === riskCode)
    expect(riskItem.enabled).toBe(false)
  })

  // 6. Pasif aşı protokolünün PATCH ile aktifleştirilmesi engellenmeli -> 409 INACTIVE_VACCINE_PROTOCOL
  it('6. Pasif aşı PATCH -> 409', async () => {
    mockUser({ id: testUserId })
    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/vaccine-preferences`, {
      method: 'PATCH',
      body: JSON.stringify({
        vaccine_code: inactiveCode,
        enabled: true,
      }),
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('INACTIVE_VACCINE_PROTOCOL')
  })

  // 7. Aşı planı oluşturma - Preference satırı olmayan legal/core planı oluşturma -> GONE (410)
  it('7. Preference yokken legal planı oluşturma -> Başarılı', async () => {
    mockUser({ id: testUserId })
    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/vaccine-preferences/${legalCode}/create-plan`, {
      method: 'POST',
    })

    const res = await createPlanPOST(req, { params: Promise.resolve({ id: ownedPetId, code: legalCode }) })
    expect(res.status).toBe(410)
  })

  // 8. Aşı planı oluşturma - Pasif (enabled=false) risk_based/optional planı oluşturulamaz -> GONE (410)
  it('8. Pasif aşı planı oluşturma -> 400', async () => {
    mockUser({ id: testUserId })

    // Ensure riskCode is disabled
    await adminClient
      .from('pet_vaccine_preferences')
      .upsert({ pet_id: ownedPetId, vaccine_code: riskCode, enabled: false }, { onConflict: 'pet_id,vaccine_code' })

    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/vaccine-preferences/${riskCode}/create-plan`, {
      method: 'POST',
    })

    const res = await createPlanPOST(req, { params: Promise.resolve({ id: ownedPetId, code: riskCode }) })
    expect(res.status).toBe(410)
  })

  // 9. Başka türe ait aşı planı oluşturulması reddedilir -> GONE (410)
  it('9. Başka tür aşısı plan oluşturma -> 400', async () => {
    mockUser({ id: testUserId })
    const req = new NextRequest(`http://localhost/api/pets/${ownedPetId}/vaccine-preferences/${mismatchCode}/create-plan`, {
      method: 'POST',
    })

    const res = await createPlanPOST(req, { params: Promise.resolve({ id: ownedPetId, code: mismatchCode }) })
    expect(res.status).toBe(410)
  })

  // 10. Çelişkili test verisi (category = risk_based, is_core = true) -> locked=false, PATCH false -> başarılı, plan oluşturma -> GONE (410)
  it('10. Çelişkili aşı kilitsiz olmalı ve kapatılınca plan oluşturamamalı', async () => {
    mockUser({ id: testUserId })

    // GET doğrula -> locked=false
    const req1 = new NextRequest(`http://localhost/api/pets/${ownedPetId}/vaccine-preferences`)
    const res1 = await GET(req1, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res1.status).toBe(200)
    const json1 = await res1.json()
    const conflictingItem = json1.protocols.find((p: any) => p.vaccine_code === conflictingCode)
    expect(conflictingItem).toBeDefined()
    expect(conflictingItem.locked).toBe(false)

    // PATCH false -> başarılı
    const req2 = new NextRequest(`http://localhost/api/pets/${ownedPetId}/vaccine-preferences`, {
      method: 'PATCH',
      body: JSON.stringify({
        vaccine_code: conflictingCode,
        enabled: false,
      }),
    })
    const res2 = await PATCH(req2, { params: Promise.resolve({ id: ownedPetId }) })
    expect(res2.status).toBe(200)
    const json2 = await res2.json()
    expect(json2.data.enabled).toBe(false)

    // Preference pasifken plan oluşturma -> GONE (410)
    const req3 = new NextRequest(`http://localhost/api/pets/${ownedPetId}/vaccine-preferences/${conflictingCode}/create-plan`, {
      method: 'POST',
    })
    const res3 = await createPlanPOST(req3, { params: Promise.resolve({ id: ownedPetId, code: conflictingCode }) })
    expect(res3.status).toBe(410)
  })
})

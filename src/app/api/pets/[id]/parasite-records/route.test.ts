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

    await adminClient.from('pet_owners').upsert({
      pet_id: testPetIdOwned,
      profile_id: testUserId,
    }, { onConflict: 'pet_id,profile_id' })

    const { data: petNotOwned } = await adminClient.from('pets').insert({
      name: 'Cat1',
      species: 'cat',
      owner_id: otherUser.user!.id,
      gender: 'female',
      birth_date: '2025-01-01'
    }).select().single()
    testPetIdNotOwned = petNotOwned!.id

    await adminClient.from('pet_owners').upsert({
      pet_id: testPetIdNotOwned,
      profile_id: otherUser.user!.id,
    }, { onConflict: 'pet_id,profile_id' })

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

  // ── P1: Katalog ürünü bağlantısı ─────────────────────────────
  // parasite_records.parasite_product_id kolonu canlı DB'de yoksa
  // (Migration B henüz uygulanmadıysa) bu blok kendini atlar;
  // uygulandıktan sonra ürün yollarını uçtan uca doğrular.
  describe('Product link (P1)', () => {
    let productColumnExists = false
    let dogOralProductId = ''
    let dogInactiveProductId = ''
    let dogSpotOnProductId = ''
    let dogTreatmentProductId = ''
    let catProductId = ''

    beforeAll(async () => {
      const probe = await adminClient.from('parasite_records').select('parasite_product_id').limit(1)
      productColumnExists = !probe.error
      if (!productColumnExists) {
        console.warn('Product link suite skipped: parasite_records.parasite_product_id yok (Migration B bekleniyor).')
        return
      }

      const { data: created, error: createErr } = await adminClient.from('parasite_products').insert([
        { species: 'dog', name: 'Test Oral 90', brand: 'TestBrand', type: 'internal', application_method: 'oral', protection_duration_days: 90, is_active: true },
        { species: 'dog', name: 'Test Inactive', brand: 'TestBrand', type: 'internal', application_method: 'oral', protection_duration_days: 90, is_active: false },
        { species: 'dog', name: 'Test SpotOn', brand: 'TestBrand', type: 'internal', application_method: 'spot-on', protection_duration_days: 30, is_active: true },
        { species: 'dog', name: 'Test Treatment 0', brand: 'TestBrand', type: 'internal', application_method: 'oral', protection_duration_days: 0, is_active: true },
        { species: 'cat', name: 'Test CatProd', brand: 'TestBrand', type: 'internal', application_method: 'oral', protection_duration_days: 30, is_active: true },
      ]).select()

      if (createErr || !created || created.length !== 5) {
        console.warn('Product link suite skipped: test ürünleri oluşturulamadı.', createErr)
        productColumnExists = false
        return
      }
      dogOralProductId = created.find(p => p.name === 'Test Oral 90')!.id
      dogInactiveProductId = created.find(p => p.name === 'Test Inactive')!.id
      dogSpotOnProductId = created.find(p => p.name === 'Test SpotOn')!.id
      dogTreatmentProductId = created.find(p => p.name === 'Test Treatment 0')!.id
      catProductId = created.find(p => p.name === 'Test CatProd')!.id
    })

    afterAll(async () => {
      const ids = [dogOralProductId, dogInactiveProductId, dogSpotOnProductId, dogTreatmentProductId, catProductId].filter(Boolean)
      if (ids.length > 0) {
        // FK ON DELETE SET NULL: ürün silinse de kayıtlar (parent afterAll temizler) bozulmaz
        await adminClient.from('parasite_products').delete().in('id', ids)
      }
    })

    it('POST with catalog product snapshots product duration and copies name/brand', async (ctx) => {
      if (!productColumnExists) return ctx.skip()
      mockSessionUser({ id: testUserId })
      const req = createNextRequest({
        parasite_protocol_id: dogProtoId,
        administered_at: '2026-07-16',
        application_method: 'oral',
        parasite_product_id: dogOralProductId,
      })
      const res = await POST(req, { params: Promise.resolve({ id: testPetIdOwned }) })
      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.record.parasite_product_id).toBe(dogOralProductId)
      expect(json.record.protection_duration_days).toBe(90)
      expect(json.record.product_free_text).toBe('Test Oral 90')
      expect(json.record.brand_free_text).toBe('TestBrand')
    })

    it('user-provided duration overrides product duration', async (ctx) => {
      if (!productColumnExists) return ctx.skip()
      mockSessionUser({ id: testUserId })
      const req = createNextRequest({
        parasite_protocol_id: dogProtoId,
        administered_at: '2026-07-16',
        application_method: 'oral',
        parasite_product_id: dogOralProductId,
        protection_duration_days: 45,
      })
      const res = await POST(req, { params: Promise.resolve({ id: testPetIdOwned }) })
      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.record.protection_duration_days).toBe(45)
    })

    it('treatment product (0 days) falls back to protocol default duration', async (ctx) => {
      if (!productColumnExists) return ctx.skip()
      mockSessionUser({ id: testUserId })
      const req = createNextRequest({
        parasite_protocol_id: dogProtoId,
        administered_at: '2026-07-16',
        application_method: 'oral',
        parasite_product_id: dogTreatmentProductId,
      })
      const res = await POST(req, { params: Promise.resolve({ id: testPetIdOwned }) })
      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.record.parasite_product_id).toBe(dogTreatmentProductId)
      // Ürün süresi 0 (tedavi) → kayıt süresi protokol varsayılanından (30) gelir
      expect(json.record.protection_duration_days).toBe(30)
      expect(json.record.product_free_text).toBe('Test Treatment 0')
    })

    it('rejects species-mismatched product', async (ctx) => {
      if (!productColumnExists) return ctx.skip()
      mockSessionUser({ id: testUserId })
      const req = createNextRequest({
        parasite_protocol_id: dogProtoId,
        administered_at: '2026-07-16',
        application_method: 'oral',
        parasite_product_id: catProductId,
      })
      const res = await POST(req, { params: Promise.resolve({ id: testPetIdOwned }) })
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('PRODUCT_SPECIES_MISMATCH')
    })

    it('rejects inactive product with 409', async (ctx) => {
      if (!productColumnExists) return ctx.skip()
      mockSessionUser({ id: testUserId })
      const req = createNextRequest({
        parasite_protocol_id: dogProtoId,
        administered_at: '2026-07-16',
        application_method: 'oral',
        parasite_product_id: dogInactiveProductId,
      })
      const res = await POST(req, { params: Promise.resolve({ id: testPetIdOwned }) })
      expect(res.status).toBe(409)
      const json = await res.json()
      expect(json.error).toBe('PRODUCT_INACTIVE')
    })

    it('rejects product whose method the protocol does not allow', async (ctx) => {
      if (!productColumnExists) return ctx.skip()
      mockSessionUser({ id: testUserId })
      const req = createNextRequest({
        parasite_protocol_id: dogProtoId,
        administered_at: '2026-07-16',
        application_method: 'oral',
        parasite_product_id: dogSpotOnProductId,
      })
      const res = await POST(req, { params: Promise.resolve({ id: testPetIdOwned }) })
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('PRODUCT_METHOD_NOT_ALLOWED')
    })

    it('unknown product id returns 404', async (ctx) => {
      if (!productColumnExists) return ctx.skip()
      mockSessionUser({ id: testUserId })
      const req = createNextRequest({
        parasite_protocol_id: dogProtoId,
        administered_at: '2026-07-16',
        application_method: 'oral',
        parasite_product_id: '00000000-0000-0000-0000-000000000000',
      })
      const res = await POST(req, { params: Promise.resolve({ id: testPetIdOwned }) })
      expect(res.status).toBe(404)
      const json = await res.json()
      expect(json.error).toBe('PRODUCT_NOT_FOUND')
    })
  })
})

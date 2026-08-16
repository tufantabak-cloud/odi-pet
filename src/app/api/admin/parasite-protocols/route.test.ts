import { vi, describe, it, expect, afterAll } from 'vitest'
import * as dotenv from 'dotenv'
import { NextRequest } from 'next/server'

// Load environment variables
dotenv.config({ path: '.env.local' })

import * as authModule from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import * as serverSupabaseModule from '@/lib/supabase/server'
import { GET, POST } from './route'
import { PATCH, DELETE } from './[id]/route'

// Mock get-current-profile to control auth roles
vi.mock('@/lib/auth/get-current-profile', async () => {
  const actual = await vi.importActual<typeof authModule>('@/lib/auth/get-current-profile')
  return {
    ...actual,
    getSessionUser: vi.fn(),
    requireRole: vi.fn(),
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

describe('Admin Parasite Protocols API Security and Constraint Tests', () => {
  const adminClient = createAdminSupabaseClient()
  let createdTestId: string | null = null

  // Helpers to mock auth states
  const mockSessionUser = (user: any) => {
    vi.spyOn(authModule, 'getSessionUser').mockResolvedValue(user)
  }

  const mockRole = (role: string | null) => {
    if (role) {
      vi.spyOn(authModule, 'requireRole').mockResolvedValue({ id: 'some-id', role } as any)
    } else {
      vi.spyOn(authModule, 'requireRole').mockResolvedValue(null)
    }
  }

  afterAll(async () => {
    // Test verisini temizleme (Fiziksel silme - service role kullanarak)
    if (createdTestId) {
      const { error } = await adminClient
        .from('parasite_protocols')
        .delete()
        .eq('id', createdTestId)
      if (error) {
        console.error('[TEST DATA CLEANUP] Failed to delete test protocol:', error.message)
      } else {
      }
    }
  })

  // 1. Oturumsuz istek -> 401 UNAUTHORIZED
  it('1. Oturumsuz istek -> 401 UNAUTHORIZED (GET)', async () => {
    mockSessionUser(null)
    mockRole(null)

    const req = new NextRequest('http://localhost:3000/api/admin/parasite-protocols')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('UNAUTHORIZED')
  })

  // 2. Owner rolü -> 403 FORBIDDEN
  it('2. Owner rolü -> 403 FORBIDDEN (GET)', async () => {
    mockSessionUser({ id: 'user-1' })
    mockRole(null) // requireRole returns null since 'owner' is not allowed

    const req = new NextRequest('http://localhost:3000/api/admin/parasite-protocols')
    const res = await GET(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('FORBIDDEN')
  })

  // 3. Admin/founder GET -> 200
  it('3. Admin/founder GET -> 200', async () => {
    mockSessionUser({ id: 'user-admin' })
    mockRole('admin')

    const req = new NextRequest('http://localhost:3000/api/admin/parasite-protocols')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
  })

  // 4. Geçersiz filtre -> 400 INVALID_PROTOCOL_DATA
  it('4. Geçersiz filtre -> 400 INVALID_PROTOCOL_DATA (GET)', async () => {
    mockSessionUser({ id: 'user-admin' })
    mockRole('admin')

    const req = new NextRequest('http://localhost:3000/api/admin/parasite-protocols?species=bird')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('INVALID_PROTOCOL_DATA')
  })

  // 5. Geçerli POST -> 201
  it('5. Geçerli POST -> 201', async () => {
    mockSessionUser({ id: 'user-admin' })
    mockRole('admin')

    const uniqueCode = `TEST_PAR_${Date.now()}`
    const req = new NextRequest('http://localhost:3000/api/admin/parasite-protocols', {
      method: 'POST',
      body: JSON.stringify({
        parasite_code: uniqueCode,
        protocol_name: 'Test Parasite Protocol',
        parasite_type: 'internal',
        species: 'dog',
        default_protection_duration_days: 30,
        allowed_application_methods: ['spot_on', 'oral'],
        default_application_method: 'spot_on',
        min_age_weeks: 8,
        is_active: true,
        sort_order: 5,
        extra_field: 'should-not-exist' // Bilinmeyen alan testi için
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBeDefined()
    expect(json.parasite_code).toBe(uniqueCode)
    createdTestId = json.id

    // Bilinmeyen alanların DB'ye yazılmadığını doğrula
    expect(json.extra_field).toBeUndefined()
  })

  // 6. Aynı parasite_code + species -> 409 DUPLICATE_PROTOCOL
  it('6. Aynı parasite_code + species -> 409 DUPLICATE_PROTOCOL', async () => {
    mockSessionUser({ id: 'user-admin' })
    mockRole('admin')

    // Created test protocol had uniqueCode and species 'dog'.
    // Let's retrieve its code.
    const { data } = await adminClient
      .from('parasite_protocols')
      .select('parasite_code')
      .eq('id', createdTestId)
      .single()

    const req = new NextRequest('http://localhost:3000/api/admin/parasite-protocols', {
      method: 'POST',
      body: JSON.stringify({
        parasite_code: data?.parasite_code || '',
        protocol_name: 'Duplicate Protocol',
        parasite_type: 'internal',
        species: 'dog',
        default_protection_duration_days: 30,
        allowed_application_methods: ['spot_on'],
        default_application_method: 'spot_on',
      })
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('DUPLICATE_PROTOCOL')
  })

  // 7. Geçersiz veriler -> 400 INVALID_PROTOCOL_DATA / check constraints
  describe('7. POST Geçersiz Veri Doğrulamaları', () => {
    const runInvalidPost = async (payload: any) => {
      mockSessionUser({ id: 'user-admin' })
      mockRole('admin')
      const req = new NextRequest('http://localhost:3000/api/admin/parasite-protocols', {
        method: 'POST',
        body: JSON.stringify({
          parasite_code: `TEST_ERR_${Date.now()}`,
          protocol_name: 'Invalid Test Protocol',
          parasite_type: 'internal',
          species: 'dog',
          default_protection_duration_days: 30,
          allowed_application_methods: ['spot_on'],
          default_application_method: 'spot_on',
          ...payload
        })
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('INVALID_PROTOCOL_DATA')
    }

    it('a. Hatalı species', async () => {
      await runInvalidPost({ species: 'bird' })
    })

    it('b. Hatalı parasite_type', async () => {
      await runInvalidPost({ parasite_type: 'tick' })
    })

    it('c. Boş yöntem dizisi', async () => {
      await runInvalidPost({ allowed_application_methods: [] })
    })

    it('d. İzin verilmeyen yöntem', async () => {
      await runInvalidPost({ allowed_application_methods: ['laser'] })
    })

    it('e. Default yöntem dizide değil', async () => {
      await runInvalidPost({ allowed_application_methods: ['spot_on'], default_application_method: 'oral' })
    })

    it('f. Koruma süresi 0 veya negatif', async () => {
      await runInvalidPost({ default_protection_duration_days: 0 })
    })

    it('g. Boş protokol adı', async () => {
      await runInvalidPost({ protocol_name: '   ' })
    })
  })

  // 8. PATCH: bulunamayan ID -> 404
  it('8. PATCH: bulunamayan ID -> 404', async () => {
    mockSessionUser({ id: 'user-admin' })
    mockRole('admin')

    const fakeId = '00000000-0000-0000-0000-000000000000'
    const req = new NextRequest(`http://localhost:3000/api/admin/parasite-protocols/${fakeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ protocol_name: 'Updated Name' })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: fakeId }) })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('PROTOCOL_NOT_FOUND')
  })

  // 9. PATCH: boş body -> 400
  it('9. PATCH: boş body -> 400', async () => {
    mockSessionUser({ id: 'user-admin' })
    mockRole('admin')

    const req = new NextRequest(`http://localhost:3000/api/admin/parasite-protocols/${createdTestId}`, {
      method: 'PATCH',
      body: JSON.stringify({})
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: createdTestId! }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('INVALID_PROTOCOL_DATA')
  })

  // 10. PATCH: id veya created_at gönderilirse reddetme
  it('10. PATCH: id veya created_at gönderilirse -> 400', async () => {
    mockSessionUser({ id: 'user-admin' })
    mockRole('admin')

    const req = new NextRequest(`http://localhost:3000/api/admin/parasite-protocols/${createdTestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ id: createdTestId, protocol_name: 'New Name' })
    })

    const res = await PATCH(req, { params: Promise.resolve({ id: createdTestId! }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('INVALID_PROTOCOL_DATA')
  })

  // 11. DELETE: soft delete is_active = false
  it('11. DELETE: soft-delete ve doğrulama', async () => {
    mockSessionUser({ id: 'user-admin' })
    mockRole('admin')

    const req = new NextRequest(`http://localhost:3000/api/admin/parasite-protocols/${createdTestId}`, {
      method: 'DELETE'
    })

    const res = await DELETE(req, { params: Promise.resolve({ id: createdTestId! }) })
    expect(res.status).toBe(200)

    // DB'den is_active=false olduğunu doğrula (service role kullanarak bypass)
    const { data, error } = await adminClient
      .from('parasite_protocols')
      .select('is_active')
      .eq('id', createdTestId)
      .single()

    expect(error).toBeNull()
    expect(data?.is_active).toBe(false)
  })
})

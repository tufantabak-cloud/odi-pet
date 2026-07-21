import { vi, describe, it, expect, afterAll, beforeAll } from 'vitest'
import * as dotenv from 'dotenv'
import { NextRequest } from 'next/server'

dotenv.config({ path: '.env.local' })

import * as authModule from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import * as serverSupabaseModule from '@/lib/supabase/server'
import { GET, POST } from './route'
import { PATCH, DELETE } from './[id]/route'

vi.mock('@/lib/auth/get-current-profile', async () => {
  const actual = await vi.importActual<typeof authModule>('@/lib/auth/get-current-profile')
  return {
    ...actual,
    getSessionUser: vi.fn(),
    requireRole: vi.fn(),
  }
})

vi.mock('@/lib/supabase/server', async () => {
  const actual = await vi.importActual<typeof serverSupabaseModule>('@/lib/supabase/server')
  return {
    ...actual,
    createServerSupabaseClient: () => actual.createAdminSupabaseClient(),
  }
})

describe('Admin Parasite Products API (P3)', () => {
  const adminClient = createAdminSupabaseClient()
  let adminUserId = ''
  let createdProductId = ''

  const mockUser = (u: any) => vi.mocked(authModule.getSessionUser).mockResolvedValue(u)
  const mockRole = (actor: any) => (vi.mocked(authModule.requireRole) as any).mockResolvedValue(actor)

  const jsonReq = (method: string, body?: any) =>
    new NextRequest('http://localhost/api/admin/parasite-products', {
      method,
      body: body ? JSON.stringify(body) : undefined,
    })

  const baseProduct = {
    species: 'dog',
    name: 'AdminTest ProdA',
    brand: 'AdminTestBrand',
    type: 'internal',
    application_method: 'oral',
    protection_duration_days: 90,
  }

  beforeAll(async () => {
    const { data: u } = await adminClient.auth.admin.createUser({
      email: `prod-admin-${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true,
    })
    adminUserId = u!.user!.id
  })

  afterAll(async () => {
    await adminClient.from('parasite_products').delete().eq('brand', 'AdminTestBrand')
    if (adminUserId) await adminClient.auth.admin.deleteUser(adminUserId)
  })

  it('GET 401 when unauthorized', async () => {
    mockUser(null)
    const res = await GET(jsonReq('GET'))
    expect(res.status).toBe(401)
  })

  it('GET 403 for non-admin', async () => {
    mockUser({ id: adminUserId })
    mockRole(null)
    const res = await GET(jsonReq('GET'))
    expect(res.status).toBe(403)
  })

  it('POST 201 creates a catalog product', async () => {
    mockUser({ id: adminUserId })
    mockRole({ id: adminUserId })
    const res = await POST(jsonReq('POST', baseProduct))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.name).toBe('AdminTest ProdA')
    expect(json.is_active).toBe(true)
    expect(json.covers_ear_mites).toBe(false)
    createdProductId = json.id
  })

  it('POST 409 on duplicate normalized name', async () => {
    mockUser({ id: adminUserId })
    mockRole({ id: adminUserId })
    const res = await POST(jsonReq('POST', { ...baseProduct, name: '  admintest   proda ' }))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('DUPLICATE_PRODUCT_NAME')
  })

  it('POST 400 on invalid method (topical rejected)', async () => {
    mockUser({ id: adminUserId })
    mockRole({ id: adminUserId })
    const res = await POST(jsonReq('POST', { ...baseProduct, name: 'AdminTest ProdB', application_method: 'topical' }))
    expect(res.status).toBe(400)
  })

  it('PATCH updates protection duration', async () => {
    mockUser({ id: adminUserId })
    mockRole({ id: adminUserId })
    const res = await PATCH(jsonReq('PATCH', { protection_duration_days: 45 }), {
      params: Promise.resolve({ id: createdProductId }),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.protection_duration_days).toBe(45)
  })

  it('DELETE soft-deactivates (row remains, is_active=false)', async () => {
    mockUser({ id: adminUserId })
    mockRole({ id: adminUserId })
    const res = await DELETE(jsonReq('DELETE'), { params: Promise.resolve({ id: createdProductId }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.product.is_active).toBe(false)

    // Satır gerçekten duruyor mu (hard delete YOK — geçmiş kayıt korunur)
    const { data: still } = await adminClient.from('parasite_products').select('id, is_active').eq('id', createdProductId).single()
    expect(still).toBeTruthy()
    expect(still!.is_active).toBe(false)
  })

  it('GET is_active=true filter excludes deactivated product', async () => {
    mockUser({ id: adminUserId })
    mockRole({ id: adminUserId })
    const res = await GET(new NextRequest('http://localhost/api/admin/parasite-products?is_active=true'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Array.isArray(json)).toBe(true)
    expect(json.find((p: any) => p.id === createdProductId)).toBeUndefined()
  })
})

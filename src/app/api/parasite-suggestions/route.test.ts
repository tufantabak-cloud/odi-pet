import { vi, describe, it, expect, afterAll, beforeAll } from 'vitest'
import * as dotenv from 'dotenv'
import { NextRequest } from 'next/server'

dotenv.config({ path: '.env.local' })

import * as authModule from '@/lib/auth/get-current-profile'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import * as serverSupabaseModule from '@/lib/supabase/server'
import { POST } from './route'
import { GET as ADMIN_GET } from '@/app/api/admin/parasite-suggestions/route'
import { PATCH as ADMIN_PATCH } from '@/app/api/admin/parasite-suggestions/[id]/route'

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

// Tablo canlı DB'de yoksa (Migration C bekleniyor) suite kendini atlar.
describe('Parasite Product Suggestions API', () => {
  const adminClient = createAdminSupabaseClient()
  let tableExists = false
  let testUserId = ''
  let adminUserId = ''

  const mockUser = (u: any) => vi.mocked(authModule.getSessionUser).mockResolvedValue(u)
  const mockRole = (actor: any) => (vi.mocked(authModule.requireRole) as any).mockResolvedValue(actor)

  const postReq = (body: any) =>
    new NextRequest('http://localhost/api/parasite-suggestions', { method: 'POST', body: JSON.stringify(body) })
  const patchReq = (body: any) =>
    new NextRequest('http://localhost', { method: 'PATCH', body: JSON.stringify(body) })

  const baseSuggestion = {
    species: 'dog',
    name_suggested: 'SugTest UniqueProd',
    brand: 'SugTestBrand',
    parasite_type: 'external',
    application_method: 'spot_on',
    protection_duration_days: 30,
  }

  beforeAll(async () => {
    const probe = await adminClient.from('parasite_product_suggestions').select('id').limit(1)
    tableExists = !probe.error
    if (!tableExists) {
      console.warn('Suggestions suite skipped: parasite_product_suggestions tablosu yok (Migration C bekleniyor).')
      return
    }

    const { data: u1 } = await adminClient.auth.admin.createUser({
      email: `sug-user-${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true,
    })
    testUserId = u1!.user!.id

    const { data: u2 } = await adminClient.auth.admin.createUser({
      email: `sug-admin-${Date.now()}@example.com`,
      password: 'password123',
      email_confirm: true,
    })
    adminUserId = u2!.user!.id

    // Katalog-duplicate testi için aktif ürün
    await adminClient.from('parasite_products').insert({
      species: 'dog',
      name: 'SugTest DupCatalog',
      brand: 'SugTestBrand',
      type: 'external',
      application_method: 'spot-on',
      protection_duration_days: 30,
      is_active: true,
    })
  })

  afterAll(async () => {
    if (!tableExists) return
    const userIds = [testUserId, adminUserId].filter(Boolean)
    if (userIds.length > 0) {
      await adminClient.from('parasite_product_suggestions').delete().in('suggested_by', userIds)
    }
    await adminClient.from('parasite_products').delete().eq('brand', 'SugTestBrand')
    if (testUserId) await adminClient.auth.admin.deleteUser(testUserId)
    if (adminUserId) await adminClient.auth.admin.deleteUser(adminUserId)
  })

  it('POST 401 when unauthorized', async (ctx) => {
    if (!tableExists) return ctx.skip()
    mockUser(null)
    const res = await POST(postReq(baseSuggestion))
    expect(res.status).toBe(401)
  })

  it('POST 400 on spoofed admin fields (strict schema)', async (ctx) => {
    if (!tableExists) return ctx.skip()
    mockUser({ id: testUserId })
    const res = await POST(postReq({ ...baseSuggestion, status: 'approved' }))
    expect(res.status).toBe(400)
  })

  it('POST 409 DUPLICATE_PRODUCT when name matches active catalog item (normalize)', async (ctx) => {
    if (!tableExists) return ctx.skip()
    mockUser({ id: testUserId })
    const res = await POST(postReq({ ...baseSuggestion, name_suggested: '  sugtest   dupcatalog ' }))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('DUPLICATE_PRODUCT')
    expect(json.existing_product?.name).toBe('SugTest DupCatalog')
  })

  it('POST 201 creates pending suggestion with server-set suggested_by', async (ctx) => {
    if (!tableExists) return ctx.skip()
    mockUser({ id: testUserId })
    const res = await POST(postReq(baseSuggestion))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.suggestion.status).toBe('pending')
    expect(json.suggestion.suggested_by).toBe(testUserId)
    expect(json.suggestion.name_suggested).toBe('SugTest UniqueProd')
  })

  it('POST 409 DUPLICATE_SUGGESTION on repeated pending name', async (ctx) => {
    if (!tableExists) return ctx.skip()
    mockUser({ id: testUserId })
    const res = await POST(postReq(baseSuggestion))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toBe('DUPLICATE_SUGGESTION')
  })

  it('ADMIN GET 403 for non-admin', async (ctx) => {
    if (!tableExists) return ctx.skip()
    mockUser({ id: testUserId })
    mockRole(null)
    const res = await ADMIN_GET(new NextRequest('http://localhost/api/admin/parasite-suggestions?status=pending'))
    expect(res.status).toBe(403)
  })

  it('ADMIN PATCH approve creates catalog product with enum mapping', async (ctx) => {
    if (!tableExists) return ctx.skip()
    const { data: sug } = await adminClient
      .from('parasite_product_suggestions')
      .select('id')
      .eq('suggested_by', testUserId)
      .eq('status', 'pending')
      .single()
    expect(sug).toBeTruthy()

    mockUser({ id: adminUserId })
    mockRole({ id: adminUserId })
    const res = await ADMIN_PATCH(patchReq({ action: 'approve' }), { params: Promise.resolve({ id: sug!.id }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.suggestion.status).toBe('approved')
    expect(json.suggestion.approved_product_id).toBe(json.product.id)
    // Enum köprüsü: öneri alfabesi spot_on → katalog alfabesi spot-on
    expect(json.product.application_method).toBe('spot-on')
    expect(json.product.type).toBe('external')
    expect(json.product.is_active).toBe(true)
  })

  it('ADMIN PATCH 409 on already-reviewed suggestion', async (ctx) => {
    if (!tableExists) return ctx.skip()
    const { data: sug } = await adminClient
      .from('parasite_product_suggestions')
      .select('id')
      .eq('suggested_by', testUserId)
      .eq('status', 'approved')
      .single()
    expect(sug).toBeTruthy()

    mockUser({ id: adminUserId })
    mockRole({ id: adminUserId })
    const res = await ADMIN_PATCH(patchReq({ action: 'reject' }), { params: Promise.resolve({ id: sug!.id }) })
    expect(res.status).toBe(409)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  getSessionUser: vi.fn(),
}))

vi.mock('@/lib/auth/get-current-profile', () => ({
  getSessionUser: mocks.getSessionUser,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

import { GET, POST } from './route'

const PET_ID = 'pet-1'

function makeParams() {
  return { params: Promise.resolve({ id: PET_ID }) }
}

function createGetRequest(): Request {
  return new Request(`http://localhost/api/pets/${PET_ID}/care-plan`)
}

function createPostRequest(body: unknown): Request {
  return new Request(`http://localhost/api/pets/${PET_ID}/care-plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/pets/[id]/care-plan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1' })
  })

  it('oturumu olmayan isteği reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await GET(createGetRequest(), makeParams())

    expect(response.status).toBe(401)
  })

  it('gerçek şema kolonlarıyla (title/description/due_date) sorgu yapar, plan_data KULLANMAZ', async () => {
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 'cp-1', title: 'Kuduz Aşısı', description: null, due_date: '2026-09-01', clinic_id: null, created_at: '2026-08-01' }],
      error: null,
    })
    const from = vi.fn(() => ({ select, eq, order }))
    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    const response = await GET(createGetRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(select).toHaveBeenCalledWith(
      expect.stringContaining('title')
    )
    expect(select).not.toHaveBeenCalledWith(expect.stringContaining('plan_data'))
    expect(body).toEqual({
      care_plans: [
        { id: 'cp-1', title: 'Kuduz Aşısı', description: null, due_date: '2026-09-01', clinic_id: null, created_at: '2026-08-01' },
      ],
    })
  })

  it('sahip olunmayan pet için RLS boş sonuç döndürürse boş liste döner (hata değil)', async () => {
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    const from = vi.fn(() => ({ select, eq, order }))
    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    const response = await GET(createGetRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ care_plans: [] })
  })

  it('gerçek olmayan bir kolon hatası (örn. eski plan_data varsayımı) 500 döndürür, PASS gibi davranmaz', async () => {
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const order = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42703', message: 'column care_plans.plan_data does not exist' },
    })
    const from = vi.fn(() => ({ select, eq, order }))
    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    const response = await GET(createGetRequest(), makeParams())

    expect(response.status).toBe(500)
  })
})

describe('POST /api/pets/[id]/care-plan', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1' })
  })

  it('oturumu olmayan isteği reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await POST(createPostRequest({ title: 'x' }), makeParams())

    expect(response.status).toBe(401)
  })

  it('title eksikse 400 döner', async () => {
    const response = await POST(createPostRequest({ description: 'no title' }), makeParams())

    expect(response.status).toBe(400)
  })

  it('gerçek şemayla (upsert/onConflict/plan_data OLMADAN) düz insert yapar', async () => {
    const insert = vi.fn().mockReturnThis()
    const select = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({
      data: { id: 'cp-1', title: 'Kuduz Aşısı', description: null, due_date: '2026-09-01', clinic_id: null, created_at: '2026-08-01' },
      error: null,
    })
    const from = vi.fn(() => ({ insert, select, single }))
    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    const response = await POST(createPostRequest({ title: 'Kuduz Aşısı', due_date: '2026-09-01' }), makeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ pet_id: PET_ID, title: 'Kuduz Aşısı', due_date: '2026-09-01' })
    )
    expect(insert).not.toHaveBeenCalledWith(expect.objectContaining({ plan_data: expect.anything() }))
    expect(body.success).toBe(true)
  })

  it('sahip olunmayan pet için RLS insert reddederse 500 (RLS hatası) döner, sessizce başarı dönmez', async () => {
    const insert = vi.fn().mockReturnThis()
    const select = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
    })
    const from = vi.fn(() => ({ insert, select, single }))
    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    const response = await POST(createPostRequest({ title: 'Sahte plan' }), makeParams())

    expect(response.status).toBe(500)
  })
})

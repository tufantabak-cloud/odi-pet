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

import type { NextRequest } from 'next/server'
import { GET, POST } from './route'

const PET_ID = 'pet-1'

function makeParams() {
  return { params: Promise.resolve({ id: PET_ID }) }
}

function createGetRequest(): NextRequest {
  return new Request(`http://localhost/api/pets/${PET_ID}/treatments`) as unknown as NextRequest
}

function createPostRequest(body: unknown): NextRequest {
  return new Request(`http://localhost/api/pets/${PET_ID}/treatments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

// PetDetailClient.tsx (SmartScanner onSave) ve ScannerClient.tsx'in
// gönderdiği gerçek payload şekli.
const realCallerBody = {
  disease_name: 'Aşı Kaydı',
  category: 'Aşı Uygulaması',
  status: 'Tamamlandı',
  start_date: '2026-08-01',
  clinic_name: 'Örnek Veteriner',
}

describe('GET /api/pets/[id]/treatments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1' })
  })

  it('oturumu olmayan isteği reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await GET(createGetRequest(), makeParams())

    expect(response.status).toBe(401)
  })

  it('gerçek şema kolonlarını (disease_name) içeren satırları döner', async () => {
    const select = vi.fn().mockReturnThis()
    const eq = vi.fn().mockReturnThis()
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 't-1', disease_name: 'Kuduz', category: 'Rutin Kontrol', status: 'Tamamlandı' }],
      error: null,
    })
    const from = vi.fn(() => ({ select, eq, order }))
    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    const response = await GET(createGetRequest(), makeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([{ id: 't-1', disease_name: 'Kuduz', category: 'Rutin Kontrol', status: 'Tamamlandı' }])
  })
})

describe('POST /api/pets/[id]/treatments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1' })
  })

  it('oturumu olmayan isteği reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await POST(createPostRequest(realCallerBody), makeParams())

    expect(response.status).toBe(401)
  })

  it('disease_name eksikse 400 döner (title değil)', async () => {
    const response = await POST(createPostRequest({ category: 'Rutin Kontrol' }), makeParams())

    expect(response.status).toBe(400)
  })

  it('GERÇEK ÇAĞIRAN PAYLOAD\'I (PetDetailClient/ScannerClient) ile başarılı insert yapar, title/description KULLANMAZ', async () => {
    const insert = vi.fn().mockReturnThis()
    const select = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({
      data: { id: 't-1', ...realCallerBody, pet_id: PET_ID },
      error: null,
    })
    const from = vi.fn(() => ({ insert, select, single }))
    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    const response = await POST(createPostRequest(realCallerBody), makeParams())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        pet_id: PET_ID,
        disease_name: 'Aşı Kaydı',
        category: 'Aşı Uygulaması',
        status: 'Tamamlandı',
        start_date: '2026-08-01',
        clinic_name: 'Örnek Veteriner',
      })
    )
    expect(insert).not.toHaveBeenCalledWith(expect.objectContaining({ title: expect.anything() }))
    expect(insert).not.toHaveBeenCalledWith(expect.objectContaining({ description: expect.anything() }))
    expect(body.success).toBe(true)
  })

  it('start_date verilmezse YYYY-MM-DD biçiminde varsayılan tarih kullanır (DATE kolonuyla uyumlu)', async () => {
    const insert = vi.fn().mockReturnThis()
    const select = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({
      data: { id: 't-1', disease_name: 'Kontrol' },
      error: null,
    })
    const from = vi.fn(() => ({ insert, select, single }))
    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    await POST(createPostRequest({ disease_name: 'Kontrol' }), makeParams())

    const insertedPayload = insert.mock.calls[0][0]
    expect(insertedPayload.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('gerçek olmayan bir kolon hatası (örn. eski title/description varsayımı) 500 döner, sessizce başarı dönmez', async () => {
    const insert = vi.fn().mockReturnThis()
    const select = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42703', message: 'column health_treatments.title does not exist' },
    })
    const from = vi.fn(() => ({ insert, select, single }))
    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    const response = await POST(createPostRequest(realCallerBody), makeParams())

    expect(response.status).toBe(500)
  })

  it('plan_id verilmişse ilişkili care_plan güncellenir (mevcut davranış korunuyor)', async () => {
    const insert = vi.fn().mockReturnThis()
    const select = vi.fn().mockReturnThis()
    const single = vi.fn().mockResolvedValue({
      data: { id: 't-1', ...realCallerBody },
      error: null,
    })
    const treatmentsFrom = { insert, select, single }

    const planSelect = vi.fn().mockReturnThis()
    const planEq = vi.fn().mockReturnThis()
    const planSingle = vi.fn().mockResolvedValue({ data: { extra_data: {} }, error: null })
    const planUpdate = vi.fn().mockReturnThis()
    const planUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const carePlansFrom = {
      select: planSelect,
      eq: planEq,
      single: planSingle,
      update: planUpdate,
    }
    planSelect.mockReturnValue({ eq: planEq })
    planEq.mockReturnValue({ single: planSingle })
    planUpdate.mockReturnValue({ eq: planUpdateEq })

    const from = vi.fn((table: string) => (table === 'care_plans' ? carePlansFrom : treatmentsFrom))
    mocks.createServerSupabaseClient.mockResolvedValue({ from })

    const planId = '11111111-2222-4333-8444-555555555555'
    const response = await POST(createPostRequest({ ...realCallerBody, plan_id: planId }), makeParams())

    expect(response.status).toBe(200)
    expect(planUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' })
    )
  })
})

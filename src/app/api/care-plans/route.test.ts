import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
  getSessionUser: vi.fn(),
}))

vi.mock('@/lib/auth/get-current-profile', () => ({
  getSessionUser: mocks.getSessionUser,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import type { NextRequest } from 'next/server'
import { POST } from './route'

const CLINIC_ID = 'clinic-1'
const PET_ID = 'pet-1'
const OTHER_PET_ID = 'pet-stranger'

function createRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/care-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

const validBody = {
  pet_id: PET_ID,
  title: 'Kuduz Aşısı',
  due_date: '2026-09-01',
  description: 'Yıllık kuduz aşı hatırlatması',
}

/**
 * Session client'ı simüle eder: clinic_memberships lookup ve appointments
 * yetki-doğrulama sorgusu bu client üzerinden geçer (RLS'e tabi olduğu
 * varsayılan client).
 */
function mockSessionClient({
  clinicId = CLINIC_ID,
  hasMembership = true,
  relatedAppointment = { id: 'apt-1' },
}: {
  clinicId?: string | null
  hasMembership?: boolean
  relatedAppointment?: { id: string } | null
} = {}) {
  const membershipsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({
      data: hasMembership ? [{ clinic_id: clinicId }] : [],
    }),
  }

  const appointmentsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: relatedAppointment, error: null }),
  }

  const from = vi.fn((table: string) => {
    if (table === 'clinic_memberships') return membershipsQuery
    if (table === 'appointments') return appointmentsQuery
    throw new Error(`Unexpected table in session client: ${table}`)
  })

  mocks.createServerSupabaseClient.mockResolvedValue({ from })
  return { from, appointmentsQuery, membershipsQuery }
}

function mockAdminClient(insertError: unknown = null) {
  const insert = vi.fn().mockResolvedValue({ error: insertError })
  const from = vi.fn(() => ({ insert }))
  mocks.createAdminSupabaseClient.mockReturnValue({ from })
  return { from, insert }
}

describe('POST /api/care-plans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: 'user-1' })
  })

  it('oturumu olmayan isteği reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await POST(createRequest(validBody))

    expect(response.status).toBe(401)
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled()
  })

  it('zorunlu alanlar eksikse 400 döner', async () => {
    mockSessionClient()

    const response = await POST(createRequest({ pet_id: PET_ID }))

    expect(response.status).toBe(400)
  })

  it('SENARYO 1: yetkili klinik + ilişkili pet (gerçek randevu) → başarılı oluşturur', async () => {
    mockSessionClient({ relatedAppointment: { id: 'apt-1' } })
    const { insert } = mockAdminClient()

    const response = await POST(createRequest(validBody))

    expect(response.status).toBe(303)
    expect(mocks.createAdminSupabaseClient).toHaveBeenCalled()
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        pet_id: PET_ID,
        clinic_id: CLINIC_ID,
        title: validBody.title,
        due_date: validBody.due_date,
      })
    )
  })

  it('SENARYO 2: aynı klinik üyesi + ilgisiz/tahmini başka pet → 403 ile reddedilir, insert hiç çağrılmaz', async () => {
    mockSessionClient({ relatedAppointment: null })
    const { insert } = mockAdminClient()

    const response = await POST(createRequest({ ...validBody, pet_id: OTHER_PET_ID }))

    expect(response.status).toBe(403)
    expect(insert).not.toHaveBeenCalled()
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
  })

  it('SENARYO 3: klinik üyeliği olmayan kullanıcı → 403 ile reddedilir', async () => {
    mockSessionClient({ hasMembership: false })
    const { insert } = mockAdminClient()

    const response = await POST(createRequest(validBody))

    expect(response.status).toBe(403)
    expect(insert).not.toHaveBeenCalled()
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
  })

  it('appointments sorgusu hata dönerse 500 ile başarısız olur ve insert çağrılmaz', async () => {
    mockSessionClient()
    const { appointmentsQuery } = mockSessionClient({
      relatedAppointment: null,
    })
    appointmentsQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'db down' },
    })
    const { insert } = mockAdminClient()

    const response = await POST(createRequest(validBody))

    expect(response.status).toBe(500)
    expect(insert).not.toHaveBeenCalled()
  })
})

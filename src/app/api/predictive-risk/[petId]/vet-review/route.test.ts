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

// withAPIFeatureGuard entitlement/quota mantığı bu testin kapsamı dışında;
// yalnızca handler'ı olduğu gibi geçiren bir pass-through ile değiştiriyoruz
// ki test tamamen authorization davranışına odaklansın.
vi.mock('@/lib/features/guards/APIFeatureGuard', () => ({
  withAPIFeatureGuard: (_featureKey: string, handler: any) => handler,
}))

import type { NextRequest } from 'next/server'
import { POST } from './route'

const USER_ID = 'user-1'
const OWNED_PET_ID = 'pet-owned'
const STRANGER_PET_ID = 'pet-stranger'
const RISK_ID = 'risk-1'

function createRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/predictive-risk/x/vet-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

function makeContext(petId: string) {
  return { params: Promise.resolve({ petId }) }
}

/**
 * FORENSIC DÜZELTME testi: POST /api/predictive-risk/[petId]/vet-review
 *
 * Önceden: `petId` (path) ve `riskId` (body) hiçbir doğrulamadan geçmeden
 * doğrudan `vet_reviews.insert`'e yazılıyordu (BOLA).
 * Şimdi: `predictive_insights` üzerinden (session-bound/RLS'e tabi client
 * ile) risk kaydı okunuyor; kayıt bulunamazsa (RLS'in gizlediği / var
 * olmayan riskId) 404, path/body pet_id uyuşmazlığında 403 dönüyor;
 * insert'e yalnızca DB'den doğrulanmış `pet_id` gidiyor.
 */
function mockSupabase({
  insightRow = { id: RISK_ID, pet_id: OWNED_PET_ID } as { id: string; pet_id: string } | null,
  existingReview = null as { id: string } | null,
  availableVets = [] as { vet_id: string }[],
  insertError = null as unknown,
}: {
  insightRow?: { id: string; pet_id: string } | null
  existingReview?: { id: string } | null
  availableVets?: { vet_id: string }[]
  insertError?: unknown
} = {}) {
  const insertedRows: Record<string, unknown>[] = []

  const predictiveInsightsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: insightRow, error: null }),
  }

  const vetReviewsQuery: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: existingReview }),
    insert: vi.fn((payload: Record<string, unknown>) => {
      insertedRows.push(payload)
      return {
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'review-1', ...payload },
          error: insertError,
        }),
      }
    }),
  }

  const vetStatusQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: availableVets }),
  }

  const rpc = vi.fn().mockResolvedValue({ error: null })

  const from = vi.fn((table: string) => {
    if (table === 'predictive_insights') return predictiveInsightsQuery
    if (table === 'vet_reviews') return vetReviewsQuery
    if (table === 'vet_status') return vetStatusQuery
    throw new Error(`Unexpected table: ${table}`)
  })

  mocks.createServerSupabaseClient.mockResolvedValue({ from, rpc })
  return { from, rpc, insertedRows, predictiveInsightsQuery, vetReviewsQuery }
}

describe('POST /api/predictive-risk/[petId]/vet-review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSessionUser.mockResolvedValue({ id: USER_ID })
  })

  it('oturumu olmayan isteği reddeder', async () => {
    mocks.getSessionUser.mockResolvedValue(null)

    const response = await POST(createRequest({ riskId: RISK_ID }), makeContext(OWNED_PET_ID))

    expect(response.status).toBe(401)
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled()
  })

  it('riskId eksikse 400 döner', async () => {
    mockSupabase()

    const response = await POST(createRequest({}), makeContext(OWNED_PET_ID))

    expect(response.status).toBe(400)
  })

  it('AUTHORIZED: risk kaydı gerçekten path petId ile eşleşiyorsa başarıyla oluşturur', async () => {
    const { insertedRows } = mockSupabase({
      insightRow: { id: RISK_ID, pet_id: OWNED_PET_ID },
    })

    const response = await POST(createRequest({ riskId: RISK_ID }), makeContext(OWNED_PET_ID))

    expect(response.status).toBe(200)
    expect(insertedRows).toHaveLength(1)
    expect(insertedRows[0]).toMatchObject({
      profile_id: USER_ID,
      pet_id: OWNED_PET_ID,
      risk_id: RISK_ID,
    })
  })

  it('CROSS-PET BOLA: risk kaydı RLS tarafından görünmüyorsa (başka pet/erişimsiz) 404 döner, insert hiç çağrılmaz', async () => {
    const { vetReviewsQuery } = mockSupabase({
      // RLS "Owners manage their predictive insights" politikası kullanıcının
      // erişimi olmayan risk kayıtları için satırı hiç döndürmez -> null
      insightRow: null,
    })

    const response = await POST(createRequest({ riskId: RISK_ID }), makeContext(STRANGER_PET_ID))

    expect(response.status).toBe(404)
    expect(vetReviewsQuery.insert).not.toHaveBeenCalled()
  })

  it('MISMATCHED ID: risk kaydı var ama başka bir pete ait (path petId ile body riskId tutarsız) → 403, insert hiç çağrılmaz', async () => {
    const { vetReviewsQuery } = mockSupabase({
      // Kullanıcının GERÇEKTEN sahip olduğu bir risk kaydı, ama saldırgan
      // farklı bir petId path'i ile çağırıyor.
      insightRow: { id: RISK_ID, pet_id: OWNED_PET_ID },
    })

    const response = await POST(createRequest({ riskId: RISK_ID }), makeContext(STRANGER_PET_ID))

    expect(response.status).toBe(403)
    expect(vetReviewsQuery.insert).not.toHaveBeenCalled()
  })

  it('zaten mevcut bir review varsa tekrar oluşturmaz', async () => {
    const { vetReviewsQuery } = mockSupabase({
      insightRow: { id: RISK_ID, pet_id: OWNED_PET_ID },
      existingReview: { id: 'existing-review' },
    })

    const response = await POST(createRequest({ riskId: RISK_ID }), makeContext(OWNED_PET_ID))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.message).toBe('Review already requested')
    expect(vetReviewsQuery.insert).not.toHaveBeenCalled()
  })

  it('insert edilen pet_id her zaman DB doğrulanmış değerden gelir (path/body’den değil)', async () => {
    const { insertedRows } = mockSupabase({
      insightRow: { id: RISK_ID, pet_id: OWNED_PET_ID },
    })

    await POST(createRequest({ riskId: RISK_ID }), makeContext(OWNED_PET_ID))

    expect(insertedRows[0].pet_id).toBe(OWNED_PET_ID)
  })
})

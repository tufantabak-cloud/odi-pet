import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createAdminSupabaseClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  processRecordCreation: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: mocks.createAdminSupabaseClient,
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

vi.mock('@/lib/agenda/write-handlers/write-service', () => ({
  processRecordCreation: mocks.processRecordCreation,
}))

import { POST } from './route'

const validBody = {
  pet_id: '11111111-1111-4111-8111-111111111111',
  category: 'asi',
  input: {
    vaccine_code: 'DOG_RABIES',
    administered_at: '2026-07-24T10:00:00.000Z',
  },
  idempotencyKey: '22222222-2222-4222-8222-222222222222',
}

function createRequest(body: unknown): Request {
  return new Request('http://localhost/api/agenda/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function configureSession({
  user = { id: 'session-user' } as { id: string } | null,
  primaryOwner = null as { id: string } | null,
  sharedOwner = null as { id: string } | null,
} = {}) {
  const queries: Record<string, ReturnType<typeof createQuery>> = {}

  function createQuery(table: string) {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: table === 'pets' ? primaryOwner : sharedOwner,
        error: null,
      }),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    return query
  }

  const sessionClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: 'no session' },
      }),
    },
    from: vi.fn((table: string) => {
      queries[table] ??= createQuery(table)
      return queries[table]
    }),
  }

  mocks.createServerSupabaseClient.mockResolvedValue(sessionClient)
  return { queries, sessionClient }
}

describe('POST /api/agenda/write', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createAdminSupabaseClient.mockReturnValue({ rpc: vi.fn() })
    mocks.processRecordCreation.mockResolvedValue({
      result: { recordId: 'record-1' },
      matchResult: { status: 'none' },
    })
  })

  it('oturumsuz isteği service-role istemcisi oluşturmadan reddeder', async () => {
    configureSession({ user: null })

    const response = await POST(createRequest(validBody))

    expect(response.status).toBe(401)
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
    expect(mocks.processRecordCreation).not.toHaveBeenCalled()
  })

  it('istek gövdesinden kullanıcı kimliği kabul etmez', async () => {
    configureSession()

    const response = await POST(createRequest({
      ...validBody,
      user_id: 'attacker-user',
    }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'FORBIDDEN_USER_ID_IN_BODY',
    })
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
  })

  it('ana pet sahibini kabul eder ve RPC için ayrı admin istemcisi geçirir', async () => {
    const { sessionClient } = configureSession({
      primaryOwner: { id: validBody.pet_id },
    })
    const rpcClient = { rpc: vi.fn() }
    mocks.createAdminSupabaseClient.mockReturnValue(rpcClient)

    const response = await POST(createRequest(validBody))

    expect(response.status).toBe(200)
    expect(mocks.processRecordCreation).toHaveBeenCalledWith(
      validBody.category,
      validBody.input,
      expect.objectContaining({
        supabase: sessionClient,
        rpcSupabase: rpcClient,
        petId: validBody.pet_id,
        userId: 'session-user',
      }),
      undefined
    )
  })

  it('pet_owners tablosundaki ortak sahibi kabul eder', async () => {
    configureSession({
      sharedOwner: { id: 'shared-owner-row' },
    })

    const response = await POST(createRequest(validBody))

    expect(response.status).toBe(200)
    expect(mocks.createAdminSupabaseClient).toHaveBeenCalledOnce()
  })

  it('sahip olmayan kullanıcıyı admin istemcisi oluşturmadan reddeder', async () => {
    configureSession()

    const response = await POST(createRequest(validBody))

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: 'PET_NOT_FOUND_OR_FORBIDDEN',
    })
    expect(mocks.createAdminSupabaseClient).not.toHaveBeenCalled()
    expect(mocks.processRecordCreation).not.toHaveBeenCalled()
  })
})

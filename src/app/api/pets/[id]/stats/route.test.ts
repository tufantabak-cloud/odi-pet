import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

import { GET } from './route'

const PET_ID = 'pet-123'
const USER_ID = 'user-456'

function makeParams() {
  return { params: Promise.resolve({ id: PET_ID }) }
}

function createGetRequest(): NextRequest {
  return new Request(`http://localhost/api/pets/${PET_ID}/stats`) as unknown as NextRequest
}

describe('GET /api/pets/[id]/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('oturumu olmayan isteği 401 Unauthorized ile reddeder', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    }
    mocks.createServerSupabaseClient.mockResolvedValue(mockSupabase)

    const response = await GET(createGetRequest(), makeParams())
    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('pet bulunamadığında 404 döner', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      }),
    }
    mocks.createServerSupabaseClient.mockResolvedValue(mockSupabase)

    const response = await GET(createGetRequest(), makeParams())
    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe('Pet not found')
  })

  it('başkasına ait pet arandığında 403 Forbidden döner', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: PET_ID, owner_id: 'other-user' }, error: null }),
          }),
        }),
      }),
    }
    mocks.createServerSupabaseClient.mockResolvedValue(mockSupabase)

    const response = await GET(createGetRequest(), makeParams())
    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json.error).toBe('Forbidden')
  })

  it('doğru verilerle 200 OK döner ve son 7 günlük özet istatistiklerini hesaplar', async () => {
    const mockMealQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({
        data: [{ grams: 150 }, { grams: 200 }],
        error: null,
      }),
    }

    const mockActivityQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({
        data: [{ duration_minutes: 30 }, { duration_minutes: 45 }],
        error: null,
      }),
    }

    const mockMedQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({
        data: [{ id: 'med-1' }],
        error: null,
      }),
    }

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: USER_ID } } }),
      },
      from: vi.fn((table: string) => {
        if (table === 'pets') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: PET_ID, owner_id: USER_ID }, error: null }),
              }),
            }),
          }
        }
        if (table === 'meal_consumption') return mockMealQuery
        if (table === 'activity_logs') return mockActivityQuery
        if (table === 'health_medication_records') return mockMedQuery
        return {}
      }),
    }

    mocks.createServerSupabaseClient.mockResolvedValue(mockSupabase)

    const response = await GET(createGetRequest(), makeParams())
    expect(response.status).toBe(200)
    const json = await response.json()

    expect(json.nutrition).toEqual({ count: 2, grams: 350 })
    expect(json.activity).toEqual({ minutes: 75 })
    expect(json.medicine).toEqual({ doses: 1 })
  })
})

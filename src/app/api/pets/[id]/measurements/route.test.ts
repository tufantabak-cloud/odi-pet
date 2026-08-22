import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

vi.mock('@/lib/auth/get-current-profile', () => ({
  getSessionUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/pets/access', () => ({
  hasPetCapability: vi.fn(),
}))

import { getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { hasPetCapability } from '@/lib/pets/access'

describe('Pet Measurements API Route (/api/pets/[id]/measurements)', () => {
  const mockUser = { id: 'user-123', email: 'owner@example.com' }
  const mockPetId = 'pet-456'

  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)
  })

  describe('POST /api/pets/[id]/measurements', () => {
    it('returns 401 if user is not authenticated', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/pets/pet-456/measurements', {
        method: 'POST',
        body: JSON.stringify({ measurement_type: 'weight', value: 4.5, unit: 'kg' }),
      })
      const res = await POST(req, { params: Promise.resolve({ id: mockPetId }) })

      expect(res.status).toBe(401)
    })

    it('returns 403 if user lacks pet care management capability', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockUser as any)
      vi.mocked(hasPetCapability).mockResolvedValue(false)

      const req = new NextRequest('http://localhost:3000/api/pets/pet-456/measurements', {
        method: 'POST',
        body: JSON.stringify({ measurement_type: 'weight', value: 4.5, unit: 'kg' }),
      })
      const res = await POST(req, { params: Promise.resolve({ id: mockPetId }) })

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toContain('yönetme yetkiniz yok')
    })

    it('successfully creates weight measurement log when authorized', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockUser as any)
      vi.mocked(hasPetCapability).mockResolvedValue(true)

      // No duplicate found
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null })

      const insertedLog = {
        id: 'measurement-123',
        pet_id: mockPetId,
        weight_kg: 3.2,
        measured_at: '2026-08-22T00:00:00.000Z',
      }
      mockSupabase.single.mockResolvedValue({ data: insertedLog, error: null })

      const req = new NextRequest('http://localhost:3000/api/pets/pet-456/measurements', {
        method: 'POST',
        body: JSON.stringify({
          measurement_type: 'weight',
          value: 3.2,
          unit: 'kg',
          measured_at: '2026-08-22T00:00:00.000Z',
        }),
      })
      const res = await POST(req, { params: Promise.resolve({ id: mockPetId }) })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.measurement.value).toBe(3.2)
    })
  })
})

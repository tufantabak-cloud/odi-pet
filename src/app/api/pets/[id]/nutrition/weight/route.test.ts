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

describe('Weight Log GET and POST API Route', () => {
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

  describe('POST /api/pets/[id]/nutrition/weight', () => {
    it('returns 401 if user is not authenticated', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/pets/pet-456/nutrition/weight', {
        method: 'POST',
        body: JSON.stringify({ weight_kg: 10.5 }),
      })
      const res = await POST(req, { params: Promise.resolve({ id: mockPetId }) })

      expect(res.status).toBe(401)
    })

    it('returns 400 if weight_kg is missing or invalid', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockUser as any)
      vi.mocked(hasPetCapability).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/pets/pet-456/nutrition/weight', {
        method: 'POST',
        body: JSON.stringify({ weight_kg: -5 }),
      })
      const res = await POST(req, { params: Promise.resolve({ id: mockPetId }) })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Geçerli bir kilo değeri giriniz.')
    })

    it('returns 400 if a weight log already exists for the same day', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockUser as any)
      vi.mocked(hasPetCapability).mockResolvedValue(true)

      // existing log found
      mockSupabase.limit.mockResolvedValue({ data: [{ id: 'existing-log-1' }], error: null })

      const req = new NextRequest('http://localhost:3000/api/pets/pet-456/nutrition/weight', {
        method: 'POST',
        body: JSON.stringify({ weight_kg: 12.0 }),
      })
      const res = await POST(req, { params: Promise.resolve({ id: mockPetId }) })

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('zaten bir kilo/boy ölçüm kaydı bulunmaktadır')
    })

    it('successfully creates a weight log including notes and height_cm', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockUser as any)
      vi.mocked(hasPetCapability).mockResolvedValue(true)

      // no existing log for the day
      mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null })

      const insertedLog = {
        id: 'new-log-123',
        pet_id: mockPetId,
        weight_kg: 14.5,
        height_cm: 45,
        notes: 'Aç karnına tartıldı',
        measured_at: '2026-08-22T12:00:00.000Z',
      }
      mockSupabase.single.mockResolvedValue({ data: insertedLog, error: null })

      const req = new NextRequest('http://localhost:3000/api/pets/pet-456/nutrition/weight', {
        method: 'POST',
        body: JSON.stringify({
          weight_kg: 14.5,
          height_cm: 45,
          notes: 'Aç karnına tartıldı',
          measured_at: '2026-08-22T12:00:00.000Z',
        }),
      })
      const res = await POST(req, { params: Promise.resolve({ id: mockPetId }) })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.log).toEqual(insertedLog)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          pet_id: mockPetId,
          weight_kg: 14.5,
          height_cm: 45,
          notes: 'Aç karnına tartıldı',
        })
      )
    })
  })
})

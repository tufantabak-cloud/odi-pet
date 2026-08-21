import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE, PATCH } from './route'

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

describe('Weight Log DELETE and PATCH API Route', () => {
  const mockUser = { id: 'user-123', email: 'owner@example.com' }
  const mockPetId = 'pet-456'
  const mockLogId = 'log-789'

  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      then: undefined,
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)
  })

  describe('DELETE /api/pets/[id]/nutrition/weight/[logId]', () => {
    it('returns 401 if user is not authenticated', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/pets/pet-456/nutrition/weight/log-789', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ id: mockPetId, logId: mockLogId }) })

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 401 if user does not have permission for pet care', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockUser as any)
      vi.mocked(hasPetCapability).mockResolvedValue(false)
      mockSupabase.maybeSingle.mockResolvedValue({ data: null })

      const req = new NextRequest('http://localhost:3000/api/pets/pet-456/nutrition/weight/log-789', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ id: mockPetId, logId: mockLogId }) })

      expect(res.status).toBe(401)
    })

    it('soft-deletes (archives) weight log successfully by setting is_archived: true', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockUser as any)
      vi.mocked(hasPetCapability).mockResolvedValue(true)
      
      const queryBuilder = {
        eq: vi.fn().mockReturnThis(),
      } as any
      queryBuilder.eq.mockImplementation((field: string) => {
        if (field === 'pet_id') {
          return Promise.resolve({ error: null })
        }
        return queryBuilder
      })
      mockSupabase.update.mockReturnValue(queryBuilder)

      const req = new NextRequest('http://localhost:3000/api/pets/pet-456/nutrition/weight/log-789', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ id: mockPetId, logId: mockLogId }) })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      expect(mockSupabase.from).toHaveBeenCalledWith('weight_logs')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_archived: true,
          archived_at: expect.any(String),
        })
      )
    })

    it('returns 500 when database update returns error', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockUser as any)
      vi.mocked(hasPetCapability).mockResolvedValue(true)

      const queryBuilder = {
        eq: vi.fn().mockReturnThis(),
      } as any
      queryBuilder.eq.mockImplementation((field: string) => {
        if (field === 'pet_id') {
          return Promise.resolve({ error: { message: 'Database error' } })
        }
        return queryBuilder
      })
      mockSupabase.update.mockReturnValue(queryBuilder)

      const req = new NextRequest('http://localhost:3000/api/pets/pet-456/nutrition/weight/log-789', { method: 'DELETE' })
      const res = await DELETE(req, { params: Promise.resolve({ id: mockPetId, logId: mockLogId }) })

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Database error')
    })
  })

  describe('PATCH /api/pets/[id]/nutrition/weight/[logId]', () => {
    it('updates weight log successfully', async () => {
      vi.mocked(getSessionUser).mockResolvedValue(mockUser as any)
      vi.mocked(hasPetCapability).mockResolvedValue(true)

      const queryBuilder = {
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: mockLogId, weight_kg: 5.5, height_cm: 30 },
          error: null,
        }),
      }
      mockSupabase.update.mockReturnValue(queryBuilder)

      const req = new NextRequest('http://localhost:3000/api/pets/pet-456/nutrition/weight/log-789', {
        method: 'PATCH',
        body: JSON.stringify({ weight_kg: 5.5, height_cm: 30 }),
      })
      const res = await PATCH(req, { params: Promise.resolve({ id: mockPetId, logId: mockLogId }) })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.log.weight_kg).toBe(5.5)
    })
  })
})

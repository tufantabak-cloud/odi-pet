import { describe, it, expect, vi } from 'vitest'
import { qualifyReferral } from '../qualifyReferral'
import * as grantModule from '../grantReferralCredit'

// Mocking Supabase Client
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn() })
const mockEq = vi.fn().mockReturnThis()
const mockIn = vi.fn().mockReturnThis()
const mockLte = vi.fn().mockResolvedValue({ data: null, count: 1 })
const mockSingle = vi.fn()

const mockFrom = vi.fn((table: string) => {
  return {
    select: vi.fn().mockReturnThis(),
    eq: mockEq,
    in: mockIn,
    lte: mockLte,
    single: mockSingle,
    update: mockUpdate
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      admin: {
        getUserById: vi.fn().mockResolvedValue({ data: { user: { email_confirmed_at: '2023-01-01T00:00:00Z' } } })
      }
    }
  }))
}))

describe('Referral Atomicity', () => {
  it('should call grantReferralCredit before updating referral status', async () => {
    // 1. Setup Mock Returns
    // Mock the referral lookup
    mockSingle.mockResolvedValueOnce({
      data: { id: 'ref-1', status: 'pending', referred_id: 'user-2', referrer_id: 'user-1' }
    })
    // Mock profile lookup
    mockSingle.mockResolvedValueOnce({
      data: { id: 'user-2', created_at: '2023-01-01T00:00:00Z' }
    })
    
    // Mock pets lookup
    mockEq.mockResolvedValueOnce({
      data: [{ id: 'pet-1', created_at: '2023-01-01T00:00:00Z' }]
    })

    const grantSpy = vi.spyOn(grantModule, 'grantReferralCredit').mockResolvedValue({ success: true, referrerDays: 30, refereeDays: 30 })
    
    // 2. Execute
    const result = await qualifyReferral('ref-1')
    
    // 3. Assertions
    expect(result.isQualified).toBe(true)
    
    // Ensure grant was called
    expect(grantSpy).toHaveBeenCalledWith('ref-1')
    
    // Ensure update to 'qualified' was called
    expect(mockUpdate).toHaveBeenCalledWith({
      status: 'qualified',
      qualified_at: expect.any(String),
      rejection_reason: null,
    })

    // Assert order (grant must happen before update)
    const grantCallOrder = grantSpy.mock.invocationCallOrder[0]
    const updateCallOrder = mockUpdate.mock.invocationCallOrder[0]
    
    expect(grantCallOrder).toBeLessThan(updateCallOrder)
  })
})

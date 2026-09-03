import { describe, it, expect, vi, beforeEach } from 'vitest'
import { qualifyReferral } from './qualifyReferral'
import * as grantModule from './grantReferralCredit'

// Mock grantReferralCredit
vi.mock('./grantReferralCredit', () => ({
  grantReferralCredit: vi.fn().mockResolvedValue({ success: true, referrerDays: 30, refereeDays: 30 }),
}))

// Mock Supabase client
const mockAdminSupabase = {
  from: vi.fn(),
  auth: {
    admin: {
      getUserById: vi.fn(),
    },
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createAdminSupabaseClient: () => mockAdminSupabase,
}))

describe('qualifyReferral & Referral Lifecycle Unit Tests', () => {
  const referralId = 'ref-123'
  const referredId = 'user-referred-456'
  const referrerId = 'user-referrer-789'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Throws error if referral record is not found', async () => {
    mockAdminSupabase.from.mockImplementation((table: string) => {
      if (table === 'referrals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
            }),
          }),
        }
      }
      return {}
    })

    await expect(qualifyReferral('non-existent')).rejects.toThrow('Referral record not found')
  })

  it('2. Returns early without re-granting if already qualified (Idempotency)', async () => {
    mockAdminSupabase.from.mockImplementation((table: string) => {
      if (table === 'referrals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: referralId,
                  referrer_id: referrerId,
                  referred_id: referredId,
                  status: 'qualified',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    const result = await qualifyReferral(referralId)

    expect(result.isQualified).toBe(true)
    expect(result.checklist.accountCreated).toBe(true)
    expect(result.checklist.hasHealthRecordWithin14Days).toBe(true)
    // grantReferralCredit should NOT be called again
    expect(grantModule.grantReferralCredit).not.toHaveBeenCalled()
  })

  it('3. Negative Qualification: Missing health record keeps status pending and grants 0 reward', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    mockAdminSupabase.from.mockImplementation((table: string) => {
      if (table === 'referrals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: referralId,
                  referrer_id: referrerId,
                  referred_id: referredId,
                  status: 'pending',
                },
                error: null,
              }),
            }),
          }),
          update: updateMock,
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: referredId, created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'pets') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: [{ id: 'pet-1', created_at: new Date().toISOString() }],
              error: null,
            }),
          }),
        }
      }
      // Health tables: vaccine, weight, parasite all return count 0
      if (table === 'vaccine_records_v2' || table === 'weight_logs' || table === 'parasite_records') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        }
      }
      return {}
    })

    mockAdminSupabase.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: referredId, email_confirmed_at: new Date().toISOString() } },
      error: null,
    })

    const result = await qualifyReferral(referralId)

    expect(result.checklist.accountCreated).toBe(true)
    expect(result.checklist.emailVerified).toBe(true)
    expect(result.checklist.hasPet).toBe(true)
    expect(result.checklist.hasHealthRecordWithin14Days).toBe(false)
    expect(result.isQualified).toBe(false)

    // Update to qualified should NOT be called
    expect(updateMock).not.toHaveBeenCalled()
    // Kredi servisi çağrılmamalı
    expect(grantModule.grantReferralCredit).not.toHaveBeenCalled()
  })

  it('4. Positive Qualification: All 4 conditions met updates status to qualified then calls grantReferralCredit', async () => {
    let statusUpdatedFirst = false
    let grantCalledAfterStatusUpdate = false

    const updateMock = vi.fn().mockImplementation((payload) => {
      if (payload.status === 'qualified') {
        statusUpdatedFirst = true
      }
      return {
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    vi.mocked(grantModule.grantReferralCredit).mockImplementation(async () => {
      if (statusUpdatedFirst) {
        grantCalledAfterStatusUpdate = true
      }
      return { success: true, referrerDays: 30, refereeDays: 30 }
    })

    mockAdminSupabase.from.mockImplementation((table: string) => {
      if (table === 'referrals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: referralId,
                  referrer_id: referrerId,
                  referred_id: referredId,
                  status: 'pending',
                },
                error: null,
              }),
            }),
          }),
          update: updateMock,
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: referredId, created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'pets') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: [{ id: 'pet-1', created_at: new Date().toISOString() }],
              error: null,
            }),
          }),
        }
      }
      if (table === 'vaccine_records_v2') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ count: 1, error: null }),
            }),
          }),
        }
      }
      if (table === 'weight_logs' || table === 'parasite_records') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        }
      }
      return {}
    })

    mockAdminSupabase.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: referredId, email_confirmed_at: new Date().toISOString() } },
      error: null,
    })

    const result = await qualifyReferral(referralId)

    expect(result.checklist.accountCreated).toBe(true)
    expect(result.checklist.emailVerified).toBe(true)
    expect(result.checklist.hasPet).toBe(true)
    expect(result.checklist.hasHealthRecordWithin14Days).toBe(true)
    expect(result.isQualified).toBe(true)

    // DB update must happen BEFORE grantReferralCredit
    expect(statusUpdatedFirst).toBe(true)
    expect(grantCalledAfterStatusUpdate).toBe(true)
    expect(grantModule.grantReferralCredit).toHaveBeenCalledWith(referralId)
  })

  it('5. Error Recovery: If grantReferralCredit throws, referrals status is safely reverted to pending', async () => {
    const updateMock = vi.fn().mockImplementation(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }))

    vi.mocked(grantModule.grantReferralCredit).mockRejectedValueOnce(new Error('RPC_TIMEOUT'))

    mockAdminSupabase.from.mockImplementation((table: string) => {
      if (table === 'referrals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: referralId,
                  referrer_id: referrerId,
                  referred_id: referredId,
                  status: 'pending',
                },
                error: null,
              }),
            }),
          }),
          update: updateMock,
        }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: referredId, created_at: new Date().toISOString() },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'pets') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: [{ id: 'pet-1', created_at: new Date().toISOString() }],
              error: null,
            }),
          }),
        }
      }
      if (table === 'vaccine_records_v2') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ count: 1, error: null }),
            }),
          }),
        }
      }
      if (table === 'weight_logs' || table === 'parasite_records') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
        }
      }
      return {}
    })

    mockAdminSupabase.auth.admin.getUserById.mockResolvedValue({
      data: { user: { id: referredId, email_confirmed_at: new Date().toISOString() } },
      error: null,
    })

    await expect(qualifyReferral(referralId)).rejects.toThrow('RPC_TIMEOUT')

    // Second update should have reverted status to pending
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'pending',
        qualified_at: null,
      })
    )
  })
})

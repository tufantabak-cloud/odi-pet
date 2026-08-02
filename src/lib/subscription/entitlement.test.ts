import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getEntitlement, requireTier } from './entitlement'

// Mock Supabase server client factory
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { createServerSupabaseClient } from '@/lib/supabase/server'

describe('Entitlement Layer - getEntitlement', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns free entitlement when userId is empty', async () => {
    const result = await getEntitlement('')
    expect(result).toEqual({
      tier: 'free',
      source: 'none',
      validUntil: null,
      daysLeft: 0,
      isPremium: false,
      hasAiPlus: false,
    })
  })

  it('gives paid subscription precedence over active credits', async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { plan: 'ai_plus', status: 'active' },
            }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }
      }),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)

    const entitlement = await getEntitlement('user-123')
    expect(entitlement).toEqual({
      tier: 'ai_plus',
      source: 'paid',
      validUntil: null,
      daysLeft: 0,
      isPremium: true,
      hasAiPlus: true,
    })
  })

  it('returns credit entitlement when user has active premium_until in profiles', async () => {
    const futureDate = new Date(Date.now() + 10 * 86400000) // 10 days in future

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { premium_until: futureDate.toISOString(), premium_tier: 'pro' },
            }),
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) }
      }),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)

    const entitlement = await getEntitlement('user-credit-123')
    expect(entitlement.tier).toBe('pro')
    expect(entitlement.source).toBe('credit')
    expect(entitlement.isPremium).toBe(true)
    expect(entitlement.hasAiPlus).toBe(false)
    expect(entitlement.daysLeft).toBeGreaterThanOrEqual(9)
  })

  it('returns free entitlement when credit is expired', async () => {
    const pastDate = new Date(Date.now() - 5 * 86400000) // 5 days in past

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { premium_until: pastDate.toISOString(), premium_tier: 'pro' },
            }),
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) }
      }),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)

    const entitlement = await getEntitlement('user-expired-123')
    expect(entitlement).toEqual({
      tier: 'free',
      source: 'none',
      validUntil: null,
      daysLeft: 0,
      isPremium: false,
      hasAiPlus: false,
    })
  })

  it('evaluates requireTier correctly', async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'user_subscriptions') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { plan: 'pro', status: 'active' },
            }),
          }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null }) }
      }),
    }
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as any)

    expect(await requireTier('user-pro', 'free')).toBe(true)
    expect(await requireTier('user-pro', 'pro')).toBe(true)
    expect(await requireTier('user-pro', 'ai_plus')).toBe(false)
  })
})

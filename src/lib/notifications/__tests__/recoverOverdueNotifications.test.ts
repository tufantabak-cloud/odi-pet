import { describe, it, expect, vi, beforeEach } from 'vitest'
import { recoverOverdueNotifications } from '../recoverOverdueNotifications'
import * as createNotifModule from '../create-overdue-vaccine-notifications'

describe('Sprint X.4 - recoverOverdueNotifications Orchestration Layer', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns zeros when no overdue vaccine plans exist', async () => {
    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'plans') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }
        }
        return {}
      }),
    } as any

    const result = await recoverOverdueNotifications(mockSupabase)
    expect(result).toEqual({ recoveredCount: 0, skippedCount: 0, candidateCount: 0 })
  })

  it('filters out plans that already have notifications and recovers unnotified ones', async () => {
    const mockOverduePlans = [
      { id: 'plan-1', pet_id: 'pet-1', user_id: 'user-1', category: 'asi', sub_type: 'Karma Aşı', scheduled_at: '2026-07-01' },
      { id: 'plan-2', pet_id: 'pet-2', user_id: 'user-2', category: 'asi', sub_type: 'Kuduz Aşısı', scheduled_at: '2026-07-02' },
    ]

    const mockExistingNotifs = [
      { plan_id: 'plan-1' }, // plan-1 already has notification
    ]

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'plans') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: mockOverduePlans, error: null }),
              }),
            }),
          }
        }
        if (table === 'notifications') {
          return {
            select: () => ({
              eq: () => ({
                in: () => Promise.resolve({ data: mockExistingNotifs, error: null }),
              }),
            }),
          }
        }
        return {}
      }),
    } as any

    const createSpy = vi.spyOn(createNotifModule, 'createOverdueVaccineNotifications').mockResolvedValue({
      notified: 1,
      skipped: 0,
    })

    const result = await recoverOverdueNotifications(mockSupabase)

    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(createSpy).toHaveBeenCalledWith(mockSupabase, [mockOverduePlans[1]])
    expect(result).toEqual({ recoveredCount: 1, skippedCount: 0, candidateCount: 1 })
  })

  it('skips recovery if all overdue plans already have notifications', async () => {
    const mockOverduePlans = [
      { id: 'plan-1', pet_id: 'pet-1', user_id: 'user-1', category: 'asi', sub_type: 'Karma Aşı', scheduled_at: '2026-07-01' },
    ]

    const mockExistingNotifs = [
      { plan_id: 'plan-1' },
    ]

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'plans') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: mockOverduePlans, error: null }),
              }),
            }),
          }
        }
        if (table === 'notifications') {
          return {
            select: () => ({
              eq: () => ({
                in: () => Promise.resolve({ data: mockExistingNotifs, error: null }),
              }),
            }),
          }
        }
        return {}
      }),
    } as any

    const createSpy = vi.spyOn(createNotifModule, 'createOverdueVaccineNotifications')

    const result = await recoverOverdueNotifications(mockSupabase)

    expect(createSpy).not.toHaveBeenCalled()
    expect(result).toEqual({ recoveredCount: 0, skippedCount: 1, candidateCount: 1 })
  })

  it('supports dryRun option without calling createOverdueVaccineNotifications', async () => {
    const mockOverduePlans = [
      { id: 'plan-1', pet_id: 'pet-1', user_id: 'user-1', category: 'asi', sub_type: 'Karma Aşı', scheduled_at: '2026-07-01' },
    ]

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'plans') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: mockOverduePlans, error: null }),
              }),
            }),
          }
        }
        if (table === 'notifications') {
          return {
            select: () => ({
              eq: () => ({
                in: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }
        }
        return {}
      }),
    } as any

    const createSpy = vi.spyOn(createNotifModule, 'createOverdueVaccineNotifications')

    const result = await recoverOverdueNotifications(mockSupabase, { dryRun: true })

    expect(createSpy).not.toHaveBeenCalled()
    expect(result).toEqual({ recoveredCount: 1, skippedCount: 0, candidateCount: 1 })
  })
})

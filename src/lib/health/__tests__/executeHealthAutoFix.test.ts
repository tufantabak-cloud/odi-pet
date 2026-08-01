import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { auditHealthData, type AuditInputData } from '../auditHealthData'
import { planHealthAutoFix } from '../healthAutoFix'
import { executeHealthAutoFix } from '../executeHealthAutoFix'

function createMockSupabase(initialStore?: {
  notifications?: Map<string, any>
  vaccine_records_v2?: Map<string, any>
  vaccination_plans?: Map<string, any>
}) {
  const store = {
    notifications: initialStore?.notifications ?? new Map(),
    vaccine_records_v2: initialStore?.vaccine_records_v2 ?? new Map(),
    vaccination_plans: initialStore?.vaccination_plans ?? new Map(),
  }

  const client = {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn((_field: string, val: string) => ({
          maybeSingle: vi.fn(async () => {
            const row = (store as any)[table]?.get(val)
            return { data: row ?? null, error: null }
          }),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(async (_field: string, val: string) => {
          (store as any)[table]?.delete(val)
          return { error: null }
        }),
      })),
      update: vi.fn((patch: any) => ({
        eq: vi.fn(async (_field: string, val: string) => {
          const row = (store as any)[table]?.get(val)
          if (row) {
            Object.assign(row, patch)
          }
          return { error: null }
        }),
      })),
    })),
  }

  return { supabase: client as unknown as SupabaseClient<Database>, store }
}

describe('Sprint Y.5 — Health Auto-Fix Executor (Approved Execution)', () => {
  it('1. blocks all mutations when approved = false (default)', async () => {
    const { supabase, store } = createMockSupabase({
      notifications: new Map([['notif-dup', { id: 'notif-dup' }]]),
    })

    const auditData: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      notifications: [
        { id: 'notif-1', pet_id: 'pet-1', plan_id: 'p1', type: 'overdue' },
        { id: 'notif-dup', pet_id: 'pet-1', plan_id: 'p1', type: 'overdue' },
      ],
    }

    const auditRes = auditHealthData(auditData)
    const plan = planHealthAutoFix(auditRes)
    const result = await executeHealthAutoFix({ supabase, plan, approved: false })

    expect(result.executed).toBe(0)
    expect(result.skipped).toBeGreaterThan(0)
    expect(store.notifications.has('notif-dup')).toBe(true) // Unchanged
  })

  it('2. executes fixable operations when approved = true', async () => {
    const { supabase, store } = createMockSupabase({
      notifications: new Map([['notif-dup', { id: 'notif-dup' }]]),
    })

    const auditData: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      notifications: [
        { id: 'notif-1', pet_id: 'pet-1', plan_id: 'p1', type: 'overdue' },
        { id: 'notif-dup', pet_id: 'pet-1', plan_id: 'p1', type: 'overdue' },
      ],
    }

    const auditRes = auditHealthData(auditData)
    const plan = planHealthAutoFix(auditRes)
    const result = await executeHealthAutoFix({ supabase, plan, approved: true })

    expect(result.executed).toBe(1)
    expect(store.notifications.has('notif-dup')).toBe(false) // Deleted
  })

  it('3. executes DELETE_NOTIFICATION action', async () => {
    const { supabase, store } = createMockSupabase({
      notifications: new Map([['n1', { id: 'n1' }]]),
    })

    const plan = {
      executable: false,
      fixes: [{
        issueId: 'iss-1',
        category: 'notification',
        code: 'DUPLICATE_NOTIFICATION_INSERT',
        actionType: 'DELETE_NOTIFICATION' as const,
        targetId: 'n1',
        targetTable: 'notifications',
        proposedChanges: { _action: 'DELETE' },
        description: 'Delete duplicate',
      }],
      skipped: [],
      summary: { fixable: 1, manual: 0 },
    }

    const result = await executeHealthAutoFix({ supabase, plan, approved: true })
    expect(result.executed).toBe(1)
    expect(store.notifications.has('n1')).toBe(false)
  })

  it('4. executes CLEANUP_ORPHAN_NOTIFICATION action', async () => {
    const { supabase, store } = createMockSupabase({
      notifications: new Map([['n-orphan', { id: 'n-orphan' }]]),
    })

    const plan = {
      executable: false,
      fixes: [{
        issueId: 'iss-2',
        category: 'notification',
        code: 'INVALID_PLAN_REFERENCE',
        actionType: 'CLEANUP_ORPHAN_NOTIFICATION' as const,
        targetId: 'n-orphan',
        targetTable: 'notifications',
        proposedChanges: { _action: 'DELETE' },
        description: 'Cleanup orphan',
      }],
      skipped: [],
      summary: { fixable: 1, manual: 0 },
    }

    const result = await executeHealthAutoFix({ supabase, plan, approved: true })
    expect(result.executed).toBe(1)
    expect(store.notifications.has('n-orphan')).toBe(false)
  })

  it('5. executes NORMALIZE_CONFIDENCE action', async () => {
    const { supabase, store } = createMockSupabase({
      vaccine_records_v2: new Map([['v1', { id: 'v1', confidence_level: 'manual' }]]),
    })

    const plan = {
      executable: false,
      fixes: [{
        issueId: 'iss-3',
        category: 'vaccination',
        code: 'NON_CANONICAL_CONFIDENCE_LEVEL',
        actionType: 'NORMALIZE_CONFIDENCE' as const,
        targetId: 'v1',
        targetTable: 'vaccine_records_v2',
        proposedChanges: { confidence_level: 'user_reported' },
        description: 'Normalize confidence',
      }],
      skipped: [],
      summary: { fixable: 1, manual: 0 },
    }

    const result = await executeHealthAutoFix({ supabase, plan, approved: true })
    expect(result.executed).toBe(1)
    expect(store.vaccine_records_v2.get('v1').confidence_level).toBe('user_reported')
  })

  it('6. executes FLAG_DUPLICATE_PLAN action', async () => {
    const { supabase, store } = createMockSupabase({
      vaccination_plans: new Map([['p-dup', { id: 'p-dup', status: 'completed' }]]),
    })

    const plan = {
      executable: false,
      fixes: [{
        issueId: 'iss-4',
        category: 'plan',
        code: 'DUPLICATE_COMPLETED_PLAN',
        actionType: 'FLAG_DUPLICATE_PLAN' as const,
        targetId: 'p-dup',
        targetTable: 'vaccination_plans',
        proposedChanges: { status: 'cancelled' },
        description: 'Flag duplicate plan',
      }],
      skipped: [],
      summary: { fixable: 1, manual: 0 },
    }

    const result = await executeHealthAutoFix({ supabase, plan, approved: true })
    expect(result.executed).toBe(1)
    expect(store.vaccination_plans.get('p-dup').status).toBe('cancelled')
  })

  it('7. executes FLAG_DUPLICATE_VACCINE action', async () => {
    const { supabase, store } = createMockSupabase({
      vaccine_records_v2: new Map([['v-dup', { id: 'v-dup', notes: null }]]),
    })

    const plan = {
      executable: false,
      fixes: [{
        issueId: 'iss-5',
        category: 'vaccination',
        code: 'DUPLICATE_VACCINE_RECORD',
        actionType: 'FLAG_DUPLICATE_VACCINE' as const,
        targetId: 'v-dup',
        targetTable: 'vaccine_records_v2',
        proposedChanges: { is_duplicate_flag: true },
        description: 'Flag duplicate vaccine',
      }],
      skipped: [],
      summary: { fixable: 1, manual: 0 },
    }

    const result = await executeHealthAutoFix({ supabase, plan, approved: true })
    expect(result.executed).toBe(1)
    expect(store.vaccine_records_v2.get('v-dup').notes).toContain('[AUTO-FIX-DUPLICATE]')
  })

  it('8. idempotency: skips DELETE_NOTIFICATION if target row is already missing', async () => {
    const { supabase } = createMockSupabase({ notifications: new Map() })

    const plan = {
      executable: false,
      fixes: [{
        issueId: 'iss-6',
        category: 'notification',
        code: 'DUPLICATE_NOTIFICATION_INSERT',
        actionType: 'DELETE_NOTIFICATION' as const,
        targetId: 'n-already-deleted',
        targetTable: 'notifications',
        proposedChanges: { _action: 'DELETE' },
        description: 'Delete notification',
      }],
      skipped: [],
      summary: { fixable: 1, manual: 0 },
    }

    const result = await executeHealthAutoFix({ supabase, plan, approved: true })
    expect(result.executed).toBe(0)
    expect(result.skipped).toBe(1)
    expect(result.operations[0].reason).toBe('ALREADY_MUTATED_OR_DELETED')
  })

  it('9. idempotency: skips NORMALIZE_CONFIDENCE if record is already normalized', async () => {
    const { supabase } = createMockSupabase({
      vaccine_records_v2: new Map([['v1', { id: 'v1', confidence_level: 'user_reported' }]]),
    })

    const plan = {
      executable: false,
      fixes: [{
        issueId: 'iss-7',
        category: 'vaccination',
        code: 'NON_CANONICAL_CONFIDENCE_LEVEL',
        actionType: 'NORMALIZE_CONFIDENCE' as const,
        targetId: 'v1',
        targetTable: 'vaccine_records_v2',
        proposedChanges: { confidence_level: 'user_reported' },
        description: 'Normalize confidence',
      }],
      skipped: [],
      summary: { fixable: 1, manual: 0 },
    }

    const result = await executeHealthAutoFix({ supabase, plan, approved: true })
    expect(result.executed).toBe(0)
    expect(result.skipped).toBe(1)
    expect(result.operations[0].reason).toBe('ALREADY_NORMALIZED')
  })

  it('10. idempotency: skips FLAG_DUPLICATE_PLAN if plan is already cancelled', async () => {
    const { supabase } = createMockSupabase({
      vaccination_plans: new Map([['p1', { id: 'p1', status: 'cancelled' }]]),
    })

    const plan = {
      executable: false,
      fixes: [{
        issueId: 'iss-8',
        category: 'plan',
        code: 'DUPLICATE_COMPLETED_PLAN',
        actionType: 'FLAG_DUPLICATE_PLAN' as const,
        targetId: 'p1',
        targetTable: 'vaccination_plans',
        proposedChanges: { status: 'cancelled' },
        description: 'Flag duplicate plan',
      }],
      skipped: [],
      summary: { fixable: 1, manual: 0 },
    }

    const result = await executeHealthAutoFix({ supabase, plan, approved: true })
    expect(result.executed).toBe(0)
    expect(result.skipped).toBe(1)
    expect(result.operations[0].reason).toBe('ALREADY_CANCELLED')
  })

  it('11. error isolation: database error on one operation does not stop batch execution', async () => {
    const { supabase, store } = createMockSupabase({
      notifications: new Map([
        ['n-error', { id: 'n-error' }],
        ['n2', { id: 'n2' }],
      ]),
    })

    // Force failure on delete call for 'n-error'
    const originalFrom = (supabase as any).from
    ;(supabase as any).from = (table: string) => {
      const res = originalFrom(table)
      if (table === 'notifications') {
        return {
          ...res,
          delete: () => ({
            eq: async (_f: string, id: string) => {
              if (id === 'n-error') return { error: { message: 'DB_LOCKED' } }
              store.notifications.delete(id)
              return { error: null }
            },
          }),
        }
      }
      return res
    }

    const plan = {
      executable: false,
      fixes: [
        { issueId: 'i1', category: 'n', code: 'c', actionType: 'DELETE_NOTIFICATION' as const, targetId: 'n-error', targetTable: 'notifications', proposedChanges: {}, description: 'd' },
        { issueId: 'i2', category: 'n', code: 'c', actionType: 'DELETE_NOTIFICATION' as const, targetId: 'n2', targetTable: 'notifications', proposedChanges: {}, description: 'd' },
      ],
      skipped: [],
      summary: { fixable: 2, manual: 0 },
    }

    const result = await executeHealthAutoFix({ supabase, plan, approved: true })
    expect(result.failed).toBe(1)
    expect(result.executed).toBe(1)
    expect(store.notifications.has('n2')).toBe(false)
  })

  it('12. accurate reporting counters matching operations breakdown', async () => {
    const { supabase } = createMockSupabase({
      notifications: new Map([['n1', { id: 'n1' }]]),
    })

    const plan = {
      executable: false,
      fixes: [{ issueId: 'i1', category: 'n', code: 'c', actionType: 'DELETE_NOTIFICATION' as const, targetId: 'n1', targetTable: 'notifications', proposedChanges: {}, description: 'd' }],
      skipped: [{ issueId: 's1', category: 'pet', code: 'PET_WITHOUT_OWNER', reason: 'MANUAL_REQUIRED', description: 'desc' }],
      summary: { fixable: 1, manual: 1 },
    }

    const result = await executeHealthAutoFix({ supabase, plan, approved: true })
    expect(result.executed).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.operations).toHaveLength(2)
  })

  it('13. manual skipped items from plan are preserved in execution audit log', async () => {
    const { supabase } = createMockSupabase()

    const plan = {
      executable: false,
      fixes: [],
      skipped: [{ issueId: 's-pet', category: 'pet', code: 'PET_WITHOUT_OWNER', reason: 'MANUAL_OWNERSHIP_ASSIGNMENT_REQUIRED', description: 'Needs manual owner' }],
      summary: { fixable: 0, manual: 1 },
    }

    const result = await executeHealthAutoFix({ supabase, plan, approved: true })
    expect(result.skipped).toBe(1)
    expect(result.operations[0].reason).toBe('MANUAL_OWNERSHIP_ASSIGNMENT_REQUIRED')
  })

  it('14. missing target record handles gracefully as skipped', async () => {
    const { supabase } = createMockSupabase()

    const plan = {
      executable: false,
      fixes: [{ issueId: 'i1', category: 'vaccination', code: 'NON_CANONICAL_CONFIDENCE_LEVEL', actionType: 'NORMALIZE_CONFIDENCE' as const, targetId: 'missing-rec', targetTable: 'vaccine_records_v2', proposedChanges: { confidence_level: 'user_reported' }, description: 'desc' }],
      skipped: [],
      summary: { fixable: 1, manual: 0 },
    }

    const result = await executeHealthAutoFix({ supabase, plan, approved: true })
    expect(result.executed).toBe(0)
    expect(result.skipped).toBe(1)
    expect(result.operations[0].reason).toBe('TARGET_RECORD_NOT_FOUND')
  })

  it('15. full end-to-end integration: audit -> plan -> execute pipeline', async () => {
    const { supabase, store } = createMockSupabase({
      notifications: new Map([
        ['n1', { id: 'n1' }],
        ['n2-dup', { id: 'n2-dup' }],
      ]),
    })

    const auditData: AuditInputData = {
      pets: [{ id: 'pet-1', owner_id: 'user-1' }],
      vaccination_plans: [{ id: 'plan-1', pet_id: 'pet-1', vaccine_code: 'DOG_RABIES', status: 'overdue', due_date: '2026-01-01' }],
      notifications: [
        { id: 'n1', pet_id: 'pet-1', plan_id: 'plan-1', type: 'overdue' },
        { id: 'n2-dup', pet_id: 'pet-1', plan_id: 'plan-1', type: 'overdue' },
      ],
    }

    const auditResult = auditHealthData(auditData)
    const fixPlan = planHealthAutoFix(auditResult)
    const execResult = await executeHealthAutoFix({ supabase, plan: fixPlan, approved: true })

    expect(execResult.executed).toBe(1)
    expect(store.notifications.has('n2-dup')).toBe(false)
  })
})

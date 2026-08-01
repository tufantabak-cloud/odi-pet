import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateRunId,
  recordHealthExecution,
  getHealthExecutionHistory,
  getHealthExecutionByRunId,
  _clearHealthExecutionHistoryForTesting,
} from '../healthExecutionLog'

describe('Sprint Y.6 — Health Audit History & Execution Log', () => {
  beforeEach(() => {
    _clearHealthExecutionHistoryForTesting()
  })

  it('1. generateRunId produces unique run ID strings', () => {
    const id1 = generateRunId()
    const id2 = generateRunId()
    expect(id1).toContain('run-')
    expect(id1).not.toBe(id2)
  })

  it('2. recordHealthExecution appends entry to history', () => {
    const entry = recordHealthExecution({
      runId: 'run-100',
      timestamp: '2026-08-01T10:00:00Z',
    })

    const history = getHealthExecutionHistory()
    expect(history).toHaveLength(1)
    expect(history[0].runId).toBe('run-100')
    expect(entry.runId).toBe('run-100')
  })

  it('3. enforces immutability/read-only on logged entries', () => {
    const entry = recordHealthExecution({
      runId: 'run-101',
      timestamp: '2026-08-01T10:00:00Z',
    })

    expect(Object.isFrozen(entry)).toBe(true)
  })

  it('4. getHealthExecutionHistory returns frozen array copy', () => {
    recordHealthExecution({ runId: 'run-102', timestamp: '2026-08-01T10:00:00Z' })
    const history = getHealthExecutionHistory()

    expect(Object.isFrozen(history)).toBe(true)
  })

  it('5. getHealthExecutionByRunId retrieves correct log entry', () => {
    recordHealthExecution({ runId: 'run-103', timestamp: '2026-08-01T10:00:00Z' })
    recordHealthExecution({ runId: 'run-104', timestamp: '2026-08-01T11:00:00Z' })

    const found = getHealthExecutionByRunId('run-104')
    expect(found).toBeDefined()
    expect(found?.runId).toBe('run-104')
  })

  it('6. returns undefined for unknown runId', () => {
    const found = getHealthExecutionByRunId('run-unknown')
    expect(found).toBeUndefined()
  })

  it('7. throws error if runId is empty or invalid', () => {
    expect(() => recordHealthExecution({ runId: '', timestamp: '2026-08-01T10:00:00Z' })).toThrow()
  })

  it('8. preserves auditResult, fixPlan, and executionResult payload', () => {
    const mockAudit: any = { passed: true, errors: [], warnings: [], statistics: { petsScanned: 5, vaccineRecords: 10, plans: 10, notifications: 2 } }
    const mockPlan: any = { executable: false, fixes: [], skipped: [], summary: { fixable: 0, manual: 0 } }
    const mockExec: any = { executed: 2, skipped: 1, failed: 0, operations: [] }

    recordHealthExecution({
      runId: 'run-105',
      timestamp: '2026-08-01T12:00:00Z',
      auditResult: mockAudit,
      fixPlan: mockPlan,
      executionResult: mockExec,
    })

    const found = getHealthExecutionByRunId('run-105')
    expect(found?.auditResult?.statistics.petsScanned).toBe(5)
    expect(found?.executionResult?.executed).toBe(2)
  })

  it('9. append-only behavior preserves chronological order', () => {
    recordHealthExecution({ runId: 'run-first', timestamp: '2026-08-01T08:00:00Z' })
    recordHealthExecution({ runId: 'run-second', timestamp: '2026-08-01T09:00:00Z' })
    recordHealthExecution({ runId: 'run-third', timestamp: '2026-08-01T10:00:00Z' })

    const history = getHealthExecutionHistory()
    expect(history.map(h => h.runId)).toEqual(['run-first', 'run-second', 'run-third'])
  })
})

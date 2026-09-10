import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  reserveVisionCall,
  MAX_SESSION_VISION_CALLS,
  MAX_USER_DAILY_VISION_CALLS,
  ROLLING_WINDOW_MS,
  _resetCostGuardMemoryState,
} from '../cost-guard'

describe('Smart Scan Cost Guard', () => {
  beforeEach(() => {
    _resetCostGuardMemoryState()
  })

  it('allows reservation when within session and daily budget limits', async () => {
    const testId = Date.now().toString()
    const res = await reserveVisionCall({
      userId: `user-1-${testId}`,
      sessionId: `sess-1-${testId}`,
    })

    expect(res.allowed).toBe(true)
    expect(res.reason).toBe('OK')
    expect(res.sessionCount).toBe(1)
    expect(res.userCount).toBe(1)
    expect(res.reservationId).toBeDefined()
  })

  it('strictly enforces session limit of max 6 vision calls', async () => {
    const testId = Date.now().toString()
    const userId = `user-limit-${testId}`
    const sessionId = `sess-limit-${testId}`

    expect(MAX_SESSION_VISION_CALLS).toBe(6)

    for (let i = 1; i <= MAX_SESSION_VISION_CALLS; i++) {
      const res = await reserveVisionCall({ userId, sessionId })
      expect(res.allowed).toBe(true)
      expect(res.sessionCount).toBe(i)
    }

    // 7th attempt must be blocked
    const seventh = await reserveVisionCall({ userId, sessionId })
    expect(seventh.allowed).toBe(false)
    expect(seventh.reason).toBe('SESSION_LIMIT_EXCEEDED')
    expect(seventh.sessionCount).toBe(6)
  })

  it('strictly enforces user rolling 24h limit of max 10 vision calls across multiple sessions', async () => {
    const testId = Date.now().toString()
    const userId = `user-daily-limit-${testId}`

    expect(MAX_USER_DAILY_VISION_CALLS).toBe(10)

    // Consume 6 in session 1
    for (let i = 0; i < 6; i++) {
      const res = await reserveVisionCall({ userId, sessionId: `sess-1-${testId}` })
      expect(res.allowed).toBe(true)
    }

    // Consume 4 in session 2 -> total reaches 10
    for (let i = 0; i < 4; i++) {
      const res = await reserveVisionCall({ userId, sessionId: `sess-2-${testId}` })
      expect(res.allowed).toBe(true)
    }

    // 11th call in session 3 must be blocked by user daily limit
    const eleventh = await reserveVisionCall({ userId, sessionId: `sess-3-${testId}` })
    expect(eleventh.allowed).toBe(false)
    expect(eleventh.reason).toBe('USER_DAILY_LIMIT_EXCEEDED')
    expect(eleventh.userCount).toBe(10)
  })

  it('prunes reservations older than 24 hours in the rolling window', async () => {
    const testId = Date.now().toString()
    const userId = `user-rolling-${testId}`
    const now = Date.now()

    // 10 calls made 25 hours ago
    const pastTime = now - (ROLLING_WINDOW_MS + 60 * 1000)
    for (let i = 0; i < 10; i++) {
      const res = await reserveVisionCall({
        userId,
        sessionId: `sess-past-${i}-${testId}`,
        now: pastTime,
      })
      expect(res.allowed).toBe(true)
    }

    // Now, at current time, previous 10 calls should have expired
    const currentRes = await reserveVisionCall({
      userId,
      sessionId: `sess-current-${testId}`,
      now,
    })

    expect(currentRes.allowed).toBe(true)
    expect(currentRes.reason).toBe('OK')
    expect(currentRes.userCount).toBe(1)
  })

  it('handles concurrent reservation attempts without breaching max cap', async () => {
    const testId = Date.now().toString()
    const userId = `user-concurrent-${testId}`
    const sessionId = `sess-concurrent-${testId}`

    // Attempt 10 concurrent reservations for a session with cap = 6
    const promises = Array.from({ length: 10 }).map(() =>
      reserveVisionCall({ userId, sessionId })
    )

    const results = await Promise.all(promises)
    const successful = results.filter(r => r.allowed)
    const rejected = results.filter(r => !r.allowed)

    expect(successful.length).toBe(6)
    expect(rejected.length).toBe(4)
    rejected.forEach(r => {
      expect(r.reason).toBe('SESSION_LIMIT_EXCEEDED')
    })
  })

  it('fails closed when Redis eval throws a network or server error', async () => {
    const mockFailingRedis = {
      eval: vi.fn().mockRejectedValue(new Error('Redis connection timed out')),
    }

    const res = await reserveVisionCall({
      userId: 'user-fail-closed-test',
      sessionId: 'sess-fail-closed-test',
      redisClient: mockFailingRedis,
    })

    expect(res.allowed).toBe(false)
    expect(res.reason).toBe('REDIS_UNAVAILABLE')
    expect(res.sessionCount).toBe(-1)
    expect(res.userCount).toBe(-1)
  })
})

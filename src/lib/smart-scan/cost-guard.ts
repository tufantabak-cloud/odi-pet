import { redis } from '@/lib/security/redis'
import crypto from 'crypto'

export const MAX_SESSION_VISION_CALLS = 6
export const MAX_USER_DAILY_VISION_CALLS = 10
export const ROLLING_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours

export interface CostGuardReservationResult {
  allowed: boolean
  reason: 'OK' | 'SESSION_LIMIT_EXCEEDED' | 'USER_DAILY_LIMIT_EXCEEDED' | 'REDIS_UNAVAILABLE'
  sessionCount: number
  userCount: number
  reservationId: string
}

const COST_GUARD_LUA_SCRIPT = `
local userKey = KEYS[1]
local sessionKey = KEYS[2]
local nowMs = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local maxUserBudget = tonumber(ARGV[3])
local maxSessionCalls = tonumber(ARGV[4])
local reservationId = ARGV[5]

-- 1. Session cap check
local sessionCount = tonumber(redis.call('GET', sessionKey) or '0')
if sessionCount >= maxSessionCalls then
  return {0, 'SESSION_LIMIT_EXCEEDED', sessionCount, 0}
end

-- 2. Prune old user reservations (rolling 24h)
local cutoff = nowMs - windowMs
redis.call('ZREMRANGEBYSCORE', userKey, '-inf', cutoff)

-- 3. User budget check
local userCount = redis.call('ZCARD', userKey)
if userCount >= maxUserBudget then
  return {0, 'USER_DAILY_LIMIT_EXCEEDED', sessionCount, userCount}
end

-- 4. Atomic reservation
local newSessionCount = redis.call('INCR', sessionKey)
if newSessionCount == 1 then
  redis.call('EXPIRE', sessionKey, 7200)
end

redis.call('ZADD', userKey, nowMs, reservationId)
redis.call('EXPIRE', userKey, math.ceil(windowMs / 1000))

return {1, 'OK', newSessionCount, userCount + 1}
`

// In-memory fallback state for mock / test environments without Redis eval support
interface MockUserRecord {
  timestamp: number
  reservationId: string
}
const inMemoryUserZSets = new Map<string, MockUserRecord[]>()
const inMemorySessionCounts = new Map<string, number>()

/**
 * Resets the in-memory fallback state (used in unit tests).
 */
export function _resetCostGuardMemoryState() {
  inMemoryUserZSets.clear()
  inMemorySessionCounts.clear()
}

/**
 * Atomically reserves a Vision call BEFORE calling the AI model.
 * 
 * Invariants:
 * - Session calls <= 4
 * - User rolling 24h calls <= 10
 * - Single atomic Lua script evaluation
 * - Non-refundable on provider errors, timeouts, or failures
 */
export async function reserveVisionCall(params: {
  userId: string
  sessionId: string
  now?: number
  redisClient?: any
}): Promise<CostGuardReservationResult> {
  const { userId, sessionId } = params
  const nowMs = params.now ?? Date.now()
  const reservationId = crypto.randomUUID()

  const client = params.redisClient ?? redis
  const userKey = `smart_scan:cost:user:${userId}`
  const sessionKey = `smart_scan:session:${sessionId}`

  // Check if real Redis client supports eval
  if (typeof client?.eval === 'function') {
    try {
      const result = await client.eval(
        COST_GUARD_LUA_SCRIPT,
        [userKey, sessionKey],
        [nowMs, ROLLING_WINDOW_MS, MAX_USER_DAILY_VISION_CALLS, MAX_SESSION_VISION_CALLS, reservationId]
      ) as [number, string, number, number]

      const [allowedNum, reason, sessionCount, userCount] = result

      return {
        allowed: allowedNum === 1,
        reason: reason as CostGuardReservationResult['reason'],
        sessionCount,
        userCount,
        reservationId,
      }
    } catch (evalErr) {
      console.error('[cost-guard] Redis eval failed. Failing closed:', evalErr)
      return {
        allowed: false,
        reason: 'REDIS_UNAVAILABLE',
        sessionCount: -1,
        userCount: -1,
        reservationId,
      }
    }
  }

  // In production: FAIL CLOSED if Redis eval is not supported or unavailable
  if (process.env.NODE_ENV !== 'test') {
    console.error('[cost-guard] Redis eval is unavailable. Failing closed to prevent unbudgeted Vision calls.')
    return {
      allowed: false,
      reason: 'REDIS_UNAVAILABLE',
      sessionCount: -1,
      userCount: -1,
      reservationId,
    }
  }

  // Safe atomic in-memory fallback ONLY for unit test environments
  const currentSessionCount = inMemorySessionCounts.get(sessionKey) ?? 0
  if (currentSessionCount >= MAX_SESSION_VISION_CALLS) {
    return {
      allowed: false,
      reason: 'SESSION_LIMIT_EXCEEDED',
      sessionCount: currentSessionCount,
      userCount: (inMemoryUserZSets.get(userKey) ?? []).length,
      reservationId,
    }
  }

  // Prune rolling 24h
  const records = inMemoryUserZSets.get(userKey) ?? []
  const cutoff = nowMs - ROLLING_WINDOW_MS
  const activeRecords = records.filter(r => r.timestamp > cutoff)

  if (activeRecords.length >= MAX_USER_DAILY_VISION_CALLS) {
    inMemoryUserZSets.set(userKey, activeRecords)
    return {
      allowed: false,
      reason: 'USER_DAILY_LIMIT_EXCEEDED',
      sessionCount: currentSessionCount,
      userCount: activeRecords.length,
      reservationId,
    }
  }

  // Atomically apply reservation
  const newSessionCount = currentSessionCount + 1
  inMemorySessionCounts.set(sessionKey, newSessionCount)

  activeRecords.push({ timestamp: nowMs, reservationId })
  inMemoryUserZSets.set(userKey, activeRecords)

  return {
    allowed: true,
    reason: 'OK',
    sessionCount: newSessionCount,
    userCount: activeRecords.length,
    reservationId,
  }
}

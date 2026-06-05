import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateRefillRisk,
  computeWeightTrend,
  generateInsights,
  estimateNextRefillDate,
} from './refill-engine'

// ---------------------------------------------------------------------------
// calculateRefillRisk
// ---------------------------------------------------------------------------

describe('Nutrition - calculateRefillRisk', () => {
  it('should return OK when many days of stock remain', () => {
    const result = calculateRefillRisk({ stockGrams: 3000, dailyUsage: 100 })
    // 30 days left → OK
    expect(result.daysLeft).toBe(30)
    expect(result.risk).toBe('OK')
    expect(result.shouldNotify).toBe(false)
    expect(result.shouldSuggestRefill).toBe(false)
    expect(result.shouldUrgentRefill).toBe(false)
  })

  it('should return WARNING when between 3 and threshold days remain', () => {
    // 4 days left, default threshold 5 → WARNING
    const result = calculateRefillRisk({ stockGrams: 400, dailyUsage: 100 })
    expect(result.daysLeft).toBe(4)
    expect(result.risk).toBe('WARNING')
    expect(result.shouldNotify).toBe(true)
    expect(result.shouldSuggestRefill).toBe(true)
    expect(result.shouldUrgentRefill).toBe(false)
  })

  it('should return CRITICAL when 3 or fewer days remain', () => {
    // 2 days left → CRITICAL
    const result = calculateRefillRisk({ stockGrams: 200, dailyUsage: 100 })
    expect(result.daysLeft).toBe(2)
    expect(result.risk).toBe('CRITICAL')
    expect(result.shouldUrgentRefill).toBe(true)
  })

  it('should return CRITICAL at exactly 3 days', () => {
    const result = calculateRefillRisk({ stockGrams: 300, dailyUsage: 100 })
    expect(result.daysLeft).toBe(3)
    expect(result.risk).toBe('CRITICAL')
  })

  it('should return OK and null daysLeft when dailyUsage is 0', () => {
    const result = calculateRefillRisk({ stockGrams: 5000, dailyUsage: 0 })
    expect(result.daysLeft).toBeNull()
    expect(result.risk).toBe('OK')
    expect(result.shouldNotify).toBe(false)
    expect(result.shouldUrgentRefill).toBe(false)
  })

  it('should respect a custom thresholdDays', () => {
    // 8 days left, custom threshold 10 → WARNING
    const result = calculateRefillRisk({ stockGrams: 800, dailyUsage: 100, thresholdDays: 10 })
    expect(result.risk).toBe('WARNING')
  })

  it('should round daysLeft to 1 decimal place', () => {
    // 500 / 150 = 3.333... → should round to 3.3
    const result = calculateRefillRisk({ stockGrams: 500, dailyUsage: 150 })
    expect(result.daysLeft).toBe(3.3)
  })
})

// ---------------------------------------------------------------------------
// estimateNextRefillDate
// ---------------------------------------------------------------------------

describe('Nutrition - estimateNextRefillDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-12'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return today + daysLeft', () => {
    // 10 days left
    const result = estimateNextRefillDate({ stockGrams: 1000, dailyUsage: 100 })
    const expected = new Date('2026-05-22')
    expect(result.toDateString()).toBe(expected.toDateString())
  })

  it('should return null when dailyUsage is 0', () => {
    const result = estimateNextRefillDate({ stockGrams: 1000, dailyUsage: 0 })
    expect(result).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// computeWeightTrend
// ---------------------------------------------------------------------------

describe('Nutrition - computeWeightTrend', () => {
  it('should return null for fewer than 2 entries', () => {
    expect(computeWeightTrend([])).toBeNull()
    expect(computeWeightTrend([{ measured_at: '2026-01-01', weight_kg: 4.5 }])).toBeNull()
  })

  it('should return positive slope for increasing weight', () => {
    const entries = [
      { measured_at: '2026-01-01', weight_kg: 4.0 },
      { measured_at: '2026-01-08', weight_kg: 4.5 },
      { measured_at: '2026-01-15', weight_kg: 5.0 },
    ]
    const trend = computeWeightTrend(entries)
    expect(trend).not.toBeNull()
    expect(trend!).toBeGreaterThan(0)
  })

  it('should return negative slope for decreasing weight', () => {
    const entries = [
      { measured_at: '2026-01-01', weight_kg: 5.0 },
      { measured_at: '2026-01-08', weight_kg: 4.5 },
      { measured_at: '2026-01-15', weight_kg: 4.0 },
    ]
    const trend = computeWeightTrend(entries)
    expect(trend!).toBeLessThan(0)
  })

  it('should return 0 for perfectly flat weight', () => {
    const entries = [
      { measured_at: '2026-01-01', weight_kg: 4.0 },
      { measured_at: '2026-01-08', weight_kg: 4.0 },
      { measured_at: '2026-01-15', weight_kg: 4.0 },
    ]
    expect(computeWeightTrend(entries)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// generateInsights
// ---------------------------------------------------------------------------

describe('Nutrition - generateInsights', () => {
  it('should return a default positive message when everything is fine', () => {
    const result = generateInsights({
      avgAppetite7d: null,
      avgAppetite14d: null,
      weightTrend: null,
      daysLeft: null,
    })
    expect(result).toHaveLength(1)
    expect(result[0]).toContain('normal')
  })

  it('should report appetite decrease (>= 10%)', () => {
    // 14d avg = 100, 7d avg = 85 → -15% change
    const result = generateInsights({
      avgAppetite7d: 85,
      avgAppetite14d: 100,
      weightTrend: null,
      daysLeft: null,
    })
    expect(result.some(s => s.includes('düşüş'))).toBe(true)
  })

  it('should report appetite increase (>= 10%)', () => {
    // 14d avg = 100, 7d avg = 120 → +20% change
    const result = generateInsights({
      avgAppetite7d: 120,
      avgAppetite14d: 100,
      weightTrend: null,
      daysLeft: null,
    })
    expect(result.some(s => s.includes('artış'))).toBe(true)
  })

  it('should NOT report appetite change for small fluctuations (< 10%)', () => {
    // 14d avg = 100, 7d avg = 106 → +6%
    const result = generateInsights({
      avgAppetite7d: 106,
      avgAppetite14d: 100,
      weightTrend: null,
      daysLeft: null,
    })
    expect(result.some(s => s.includes('iştah'))).toBe(false)
  })

  it('should warn about low stock when daysLeft <= 7', () => {
    const result = generateInsights({
      avgAppetite7d: null,
      avgAppetite14d: null,
      weightTrend: null,
      daysLeft: 5,
    })
    expect(result.some(s => s.includes('5 gün'))).toBe(true)
  })

  it('should NOT warn about stock when daysLeft > 7', () => {
    const result = generateInsights({
      avgAppetite7d: null,
      avgAppetite14d: null,
      weightTrend: null,
      daysLeft: 10,
    })
    expect(result.some(s => s.includes('gün içinde bitecek'))).toBe(false)
  })

  it('should report a significant weight trend (>= 0.05)', () => {
    const result = generateInsights({
      avgAppetite7d: null,
      avgAppetite14d: null,
      weightTrend: 0.25,
      daysLeft: null,
    })
    expect(result.some(s => s.includes('Kilo'))).toBe(true)
    expect(result.some(s => s.includes('+0.25'))).toBe(true)
  })

  it('should NOT report a negligible weight trend (< 0.05)', () => {
    const result = generateInsights({
      avgAppetite7d: null,
      avgAppetite14d: null,
      weightTrend: 0.02,
      daysLeft: null,
    })
    expect(result.some(s => s.includes('Kilo'))).toBe(false)
  })

  it('should combine multiple insights into a single array', () => {
    const result = generateInsights({
      avgAppetite7d: 80,
      avgAppetite14d: 100,
      weightTrend: -0.3,
      daysLeft: 3,
    })
    expect(result.length).toBeGreaterThanOrEqual(3)
  })
})

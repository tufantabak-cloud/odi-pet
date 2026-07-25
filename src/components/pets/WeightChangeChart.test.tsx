import { describe, it, expect } from 'vitest'

// Helper logic extracted from WeightChangeChart for testing
export function processWeightPoints(weightLogs: Array<{ weight_kg: number; measured_at: string }>) {
  const sorted = [...weightLogs]
    .filter(r => r.weight_kg != null && Number(r.weight_kg) > 0)
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())

  if (sorted.length === 0) return { points: [], totalGain: 0, totalLoss: 0, netGrams: 0 }

  let totalGain = 0
  let totalLoss = 0

  const points = sorted.map((curr, idx) => {
    const weightKg = Number(curr.weight_kg)
    const isFirst = idx === 0
    const prev = isFirst ? null : sorted[idx - 1]
    const prevWeightKg = prev ? Number(prev.weight_kg) : null

    const diffKg = prevWeightKg !== null ? weightKg - prevWeightKg : 0
    const diffGrams = Math.round(diffKg * 1000)

    if (!isFirst) {
      if (diffGrams > 0) totalGain += diffGrams
      else if (diffGrams < 0) totalLoss += Math.abs(diffGrams)
    }

    return {
      index: idx,
      weightKg,
      prevWeightKg,
      diffGrams,
      isFirst,
      isGain: !isFirst && diffGrams > 0,
      isLoss: !isFirst && diffGrams < 0
    }
  })

  const firstKg = points[0].weightKg
  const lastKg = points[points.length - 1].weightKg
  const netGrams = Math.round((lastKg - firstKg) * 1000)

  return { points, totalGain, totalLoss, netGrams }
}

describe('processWeightPoints', () => {
  it('handles single log correctly', () => {
    const res = processWeightPoints([{ weight_kg: 5.0, measured_at: '2026-07-01' }])
    expect(res.points).toHaveLength(1)
    expect(res.points[0].isFirst).toBe(true)
    expect(res.netGrams).toBe(0)
  })

  it('correctly maps ALL 3 measurements 1-to-1 with history logs', () => {
    const logs = [
      { weight_kg: 4.5, measured_at: '2026-07-24' },
      { weight_kg: 4.5, measured_at: '2026-07-24' }, // Same day, 0g change
      { weight_kg: 4.7, measured_at: '2026-07-25' }  // +200g change
    ]

    const res = processWeightPoints(logs)
    expect(res.points).toHaveLength(3)

    // Point 0 (First baseline measurement)
    expect(res.points[0].isFirst).toBe(true)
    expect(res.points[0].weightKg).toBe(4.5)
    expect(res.points[0].diffGrams).toBe(0)

    // Point 1 (Same day, 0g)
    expect(res.points[1].isFirst).toBe(false)
    expect(res.points[1].weightKg).toBe(4.5)
    expect(res.points[1].diffGrams).toBe(0)

    // Point 2 (+200g gain)
    expect(res.points[2].isFirst).toBe(false)
    expect(res.points[2].weightKg).toBe(4.7)
    expect(res.points[2].diffGrams).toBe(200)
    expect(res.points[2].isGain).toBe(true)

    expect(res.totalGain).toBe(200)
    expect(res.totalLoss).toBe(0)
    expect(res.netGrams).toBe(200)
  })
})

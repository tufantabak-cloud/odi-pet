import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calcAge } from './utils'

describe('Pet Utils - calcAge', () => {
  beforeEach(() => {
    // Tell Vitest to use a mock date for "today"
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-12'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return placeholders for null birth date', () => {
    const result = calcAge(null)
    expect(result).toEqual({ text: '—', label: '—' })
  })

  it('should return Yavru for pets under 1 year', () => {
    // 6 months old
    const result = calcAge('2025-11-12')
    expect(result).toEqual({ text: '6 ay', label: 'Yavru' })
  })

  it('should return Yetişkin for pets between 1 and 7 years', () => {
    // 3 years old
    const result = calcAge('2023-05-12')
    expect(result).toEqual({ text: '3 yıl', label: 'Yetişkin' })
  })

  it('should return Yaşlı for pets between 7 and 12 years', () => {
    // 8 years old
    const result = calcAge('2018-05-12')
    expect(result).toEqual({ text: '8 yıl', label: 'Yaşlı' })
  })

  it('should return Yaşlı (12+) for pets 12 years and older', () => {
    // 13 years old
    const result = calcAge('2013-05-12')
    expect(result).toEqual({ text: '13 yıl', label: 'Yaşlı (12+)' })
  })

  it('should handle boundary case: exactly 1 year', () => {
    const result = calcAge('2025-05-12')
    expect(result).toEqual({ text: '1 yıl', label: 'Yetişkin' })
  })

  it('should handle boundary case: exactly 7 years', () => {
    const result = calcAge('2019-05-12')
    expect(result).toEqual({ text: '7 yıl', label: 'Yaşlı' })
  })

  it('should handle boundary case: exactly 12 years', () => {
    const result = calcAge('2014-05-12')
    expect(result).toEqual({ text: '12 yıl', label: 'Yaşlı (12+)' })
  })

  it('should treat a future birthdate as a newborn (data integrity guard)', () => {
    // birthdate set to 1 month from "today" → totalMonths < 0
    const result = calcAge('2026-06-12')
    expect(result).toEqual({ text: '0 ay', label: 'Yavru' })
  })

  it('should return 0 ay for a newborn (same-day registration)', () => {
    const result = calcAge('2026-05-12')
    expect(result).toEqual({ text: '0 ay', label: 'Yavru' })
  })
})

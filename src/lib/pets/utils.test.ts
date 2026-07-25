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

  it('should return exact months under 1 year', () => {
    // 6 months old
    const result = calcAge('2025-11-12')
    expect(result).toEqual({ text: '6 aylık', label: 'Yavru' })
  })

  it('should return exact years for mixed date with exact match', () => {
    // 3 years old
    const result = calcAge('2023-05-12')
    expect(result).toEqual({ text: '3 yaşında', label: 'Yetişkin' })
  })

  it('should return precise mix of years, months, and days', () => {
    // 4 years, 2 months, 2 days
    const result = calcAge('2022-03-10')
    expect(result).toEqual({ text: '4 yaşında 2 aylık 2 günlük', label: 'Yetişkin' })
  })

  it('should return precise mix with borrow day', () => {
    // Born: 2025-05-15. Today: 2026-05-12.
    // 11 months, 27 days
    const result = calcAge('2025-05-15')
    expect(result).toEqual({ text: '11 aylık 27 günlük', label: 'Yavru' })
  })

  it('should treat a future birthdate as a newborn (0 günlük)', () => {
    const result = calcAge('2026-06-12')
    expect(result).toEqual({ text: '0 günlük', label: 'Yavru' })
  })

  it('should return 0 günlük for a newborn (same-day registration)', () => {
    const result = calcAge('2026-05-12')
    expect(result).toEqual({ text: '0 günlük', label: 'Yavru' })
  })

  it.each([
    ['2025-05-12', 'Yetişkin'],
    ['2019-05-12', 'Yaşlı'],
    ['2014-05-12', 'Yaşlı (12+)'],
  ])('%s doğum tarihini merkezi sınırlarla etiketler', (birthDate, label) => {
    expect(calcAge(birthDate).label).toBe(label)
  })
})


import { describe, it, expect } from 'vitest'
import { getDisplayName } from './utils'

describe('Vaccine Utils - getDisplayName', () => {
  it('should clean dose information from name', () => {
    const result = getDisplayName('Karma (1. Doz)', 'DHPPI')
    // Karma (1. Doz) -> Karma
    // Alias for DHPPI is 'DHPPi'
    // Result: 'Karma DHPPi'
    expect(result).toBe('Karma DHPPi')
  })

  it('should clean year repetition from name', () => {
    const result = getDisplayName('Kuduz (1. Yıl Tekrarı)', 'RABIES')
    // Kuduz (1. Yıl Tekrarı) -> Kuduz
    // Alias for RABIES is 'R'
    // Result: 'Kuduz R'
    expect(result).toBe('Kuduz R')
  })

  it('should not repeat alias if it is already in the name', () => {
    const result = getDisplayName('DHPPi Karma', 'DHPPI')
    // Alias for DHPPI is 'DHPPi'
    // Result: 'DHPPi Karma' (no 'DHPPi Karma DHPPi')
    expect(result).toBe('DHPPi Karma')
  })

  it('should not repeat alias if it is part of the name (case insensitive)', () => {
    const result = getDisplayName('dhppi karma', 'DHPPI')
    expect(result).toBe('dhppi karma')
  })

  it('should append alias if not present', () => {
    const result = getDisplayName('Leptospira', 'LEPTO')
    // Alias for LEPTO is 'L'
    // Result: 'Leptospira L'
    expect(result).toBe('Leptospira L')
  })

  it('should handle names without dose/year info correctly', () => {
    const result = getDisplayName('Karma', 'DHPPI')
    expect(result).toBe('Karma DHPPi')
  })

  it('should handle unknown vaccine codes gracefully', () => {
    const result = getDisplayName('Unknown Vaccine', 'UNKNOWN_CODE')
    expect(result).toBe('Unknown Vaccine')
  })

  it('should keep original parentheses if they do not match dose/year pattern', () => {
    const result = getDisplayName('Bordetella (KC)', 'BORDET')
    // Alias for BORDET is 'Bb/Pi2 - KC'
    // (KC) should probably be kept if it doesn't match the regex
    // Actually, looking at the regex: .replace(/\(\d+\.?\s?(Doz|Yıl|Yıllık).*?\)/gi, '')
    // (KC) does NOT match this.
    // Result: 'Bordetella (KC) Bb/Pi2 - KC'
    expect(result).toBe('Bordetella (KC) Bb/Pi2 - KC')
  })
})

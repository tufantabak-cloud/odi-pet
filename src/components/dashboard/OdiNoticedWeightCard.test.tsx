import { describe, it, expect } from 'vitest'
import { getTurkishGenitive } from '@/lib/utils'

describe('getTurkishGenitive', () => {
  it('correctly adds genitive suffixes for vowel-ending names', () => {
    expect(getTurkishGenitive('Luna')).toBe("Luna'nın")
    expect(getTurkishGenitive('Bella')).toBe("Bella'nın")
    expect(getTurkishGenitive('Şila')).toBe("Şila'nın")
    expect(getTurkishGenitive('Milo')).toBe("Milo'nun")
    expect(getTurkishGenitive('Bobi')).toBe("Bobi'nin")
    expect(getTurkishGenitive('Köfte')).toBe("Köfte'nin")
  })

  it('correctly adds genitive suffixes for consonant-ending names based on last vowel', () => {
    expect(getTurkishGenitive('Max')).toBe("Max'ın")
    expect(getTurkishGenitive('Pamuk')).toBe("Pamuk'un")
    expect(getTurkishGenitive('Çakıl')).toBe("Çakıl'ın")
    expect(getTurkishGenitive('Karamel')).toBe("Karamel'in")
    expect(getTurkishGenitive('Zeytin')).toBe("Zeytin'in")
    expect(getTurkishGenitive('Gofret')).toBe("Gofret'in")
    expect(getTurkishGenitive('Limon')).toBe("Limon'un")
    expect(getTurkishGenitive('Bulut')).toBe("Bulut'un")
  })

  it('handles empty and edge cases', () => {
    expect(getTurkishGenitive('')).toBe('')
  })
})

import { describe, it, expect } from 'vitest'

export function getSliderAlignmentClass(petCount: number): string {
  return petCount === 1 ? 'justify-center' : petCount === 2 ? 'justify-start sm:justify-center' : ''
}

describe('PetSlider Alignment Logic', () => {
  it('centers single pet card on all screen sizes', () => {
    expect(getSliderAlignmentClass(1)).toBe('justify-center')
  })

  it('aligns to start on mobile and centers on tablet/desktop for 2 pets to prevent left-side overflow clipping', () => {
    const alignment = getSliderAlignmentClass(2)
    expect(alignment).toBe('justify-start sm:justify-center')
    expect(alignment).toContain('justify-start')
    expect(alignment).toContain('sm:justify-center')
  })

  it('uses default scrollable flex start for 3 or more pets', () => {
    expect(getSliderAlignmentClass(3)).toBe('')
    expect(getSliderAlignmentClass(4)).toBe('')
    expect(getSliderAlignmentClass(10)).toBe('')
  })
})

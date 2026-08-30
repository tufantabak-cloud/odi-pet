import { describe, it, expect } from 'vitest'
import {
  calculateSidePadding,
  calculateTargetScrollLeft,
  findClosestCardIndex,
} from './PetSlider'

describe('PetSlider Carousel Centering & Responsive Calculations', () => {
  describe('calculateSidePadding across mobile and desktop viewports', () => {
    it('calculates exact centering padding for 320px mobile viewport (iPhone SE 1st gen)', () => {
      const containerWidth = 320
      const cardWidth = 200
      // (320 - 200) / 2 = 60
      expect(calculateSidePadding(containerWidth, cardWidth)).toBe(60)
    })

    it('calculates exact centering padding for 360px mobile viewport (Standard Android)', () => {
      const containerWidth = 360
      const cardWidth = 200
      // (360 - 200) / 2 = 80
      expect(calculateSidePadding(containerWidth, cardWidth)).toBe(80)
    })

    it('calculates exact centering padding for 390px mobile viewport (iPhone 12/13/14/15/16)', () => {
      const containerWidth = 390
      const cardWidth = 200
      // (390 - 200) / 2 = 95
      expect(calculateSidePadding(containerWidth, cardWidth)).toBe(95)
    })

    it('calculates exact centering padding for 414px mobile viewport (iPhone XR / Plus)', () => {
      const containerWidth = 414
      const cardWidth = 200
      // (414 - 200) / 2 = 107
      expect(calculateSidePadding(containerWidth, cardWidth)).toBe(107)
    })

    it('calculates exact centering padding for 430px mobile viewport (iPhone 14/15/16 Pro Max)', () => {
      const containerWidth = 430
      const cardWidth = 200
      // (430 - 200) / 2 = 115
      expect(calculateSidePadding(containerWidth, cardWidth)).toBe(115)
    })

    it('calculates exact centering padding for desktop/tablet viewport with 230px card', () => {
      const containerWidth = 1024
      const cardWidth = 230
      // (1024 - 230) / 2 = 397
      expect(calculateSidePadding(containerWidth, cardWidth)).toBe(397)
    })

    it('enforces minPadding fallback if card is wider than container or container is too small', () => {
      expect(calculateSidePadding(180, 200)).toBe(16)
      expect(calculateSidePadding(0, 200)).toBe(16)
      expect(calculateSidePadding(-100, 200)).toBe(16)
    })
  })

  describe('calculateTargetScrollLeft (Exact Horizontal Center Alignment)', () => {
    it('returns scrollLeft = 0 for the FIRST card when side padding is properly applied', () => {
      const containerWidth = 390
      const cardWidth = 200
      const sidePadding = calculateSidePadding(containerWidth, cardWidth) // 95
      const card0OffsetLeft = sidePadding // 95

      // Target = 95 - 195 + 100 = 0
      const scrollLeft = calculateTargetScrollLeft(card0OffsetLeft, containerWidth, cardWidth)
      expect(scrollLeft).toBe(0)
    })

    it('returns exact centered scrollLeft for subsequent cards', () => {
      const containerWidth = 390
      const cardWidth = 200
      const gap = 16
      const sidePadding = calculateSidePadding(containerWidth, cardWidth) // 95

      // Card 0: offsetLeft = 95
      // Card 1: offsetLeft = 95 + 200 + 16 = 311
      const card1OffsetLeft = sidePadding + cardWidth + gap
      const scrollLeftCard1 = calculateTargetScrollLeft(card1OffsetLeft, containerWidth, cardWidth)
      // Target = 311 - 195 + 100 = 216 (= cardWidth + gap)
      expect(scrollLeftCard1).toBe(cardWidth + gap)

      // Card 2: offsetLeft = 311 + 200 + 16 = 527
      const card2OffsetLeft = card1OffsetLeft + cardWidth + gap
      const scrollLeftCard2 = calculateTargetScrollLeft(card2OffsetLeft, containerWidth, cardWidth)
      // Target = 527 - 195 + 100 = 432 (= 2 * (cardWidth + gap))
      expect(scrollLeftCard2).toBe(2 * (cardWidth + gap))
    })

    it('never returns negative scroll values', () => {
      const scrollLeft = calculateTargetScrollLeft(10, 390, 200)
      expect(scrollLeft).toBe(0)
    })
  })

  describe('findClosestCardIndex on swipe / scroll', () => {
    const cards = [
      { offsetLeft: 95, clientWidth: 200 },   // Card 0 center: 95 + 100 = 195
      { offsetLeft: 311, clientWidth: 200 },  // Card 1 center: 311 + 100 = 411
      { offsetLeft: 527, clientWidth: 200 },  // Card 2 center: 527 + 100 = 627
    ]
    const clientWidth = 390

    it('detects Card 0 when scrollLeft is 0', () => {
      // Container center: 0 + 195 = 195 (exact match for Card 0)
      expect(findClosestCardIndex(0, clientWidth, cards)).toBe(0)
    })

    it('detects Card 0 when slightly scrolled but still closer to Card 0', () => {
      // Container center: 50 + 195 = 245 (closer to 195 than to 411)
      expect(findClosestCardIndex(50, clientWidth, cards)).toBe(0)
    })

    it('detects Card 1 when scrolled closer to Card 1', () => {
      // Container center: 200 + 195 = 395 (distance to 195: 200; distance to 411: 16)
      expect(findClosestCardIndex(200, clientWidth, cards)).toBe(1)
    })

    it('detects Card 2 when scrolled all the way to Card 2', () => {
      // Container center: 432 + 195 = 627 (exact match for Card 2)
      expect(findClosestCardIndex(432, clientWidth, cards)).toBe(2)
    })

    it('handles empty cards safely', () => {
      expect(findClosestCardIndex(100, 390, [])).toBe(0)
    })
  })
})

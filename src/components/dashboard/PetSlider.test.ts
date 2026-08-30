import { describe, it, expect } from 'vitest'
import {
  calculateSidePadding,
  calculateTargetScrollLeft,
  findClosestCardIndex,
} from './PetSlider'

describe('PetSlider Carousel Centering & Responsive Calculations', () => {
  // ─────────────────────────────────────────────────────────────
  // calculateSidePadding
  // ─────────────────────────────────────────────────────────────
  describe('calculateSidePadding — 5 kritik mobil viewport', () => {
    it('320px viewport (iPhone SE)', () => {
      // (320 - 200) / 2 = 60
      expect(calculateSidePadding(320, 200)).toBe(60)
    })

    it('360px viewport (Standart Android)', () => {
      // (360 - 200) / 2 = 80
      expect(calculateSidePadding(360, 200)).toBe(80)
    })

    it('390px viewport (iPhone 12/13/14/15/16)', () => {
      // (390 - 200) / 2 = 95
      expect(calculateSidePadding(390, 200)).toBe(95)
    })

    it('414px viewport (iPhone XR/Plus)', () => {
      // (414 - 200) / 2 = 107
      expect(calculateSidePadding(414, 200)).toBe(107)
    })

    it('430px viewport (iPhone 14/15/16 Pro Max)', () => {
      // (430 - 200) / 2 = 115
      expect(calculateSidePadding(430, 200)).toBe(115)
    })

    it('1024px tablet (230px kart)', () => {
      // (1024 - 230) / 2 = 397
      expect(calculateSidePadding(1024, 230)).toBe(397)
    })

    it('minPadding fallback — kart container\'dan geniş olduğunda 16px döner', () => {
      expect(calculateSidePadding(180, 200)).toBe(16)
      expect(calculateSidePadding(0, 200)).toBe(16)
      expect(calculateSidePadding(-100, 200)).toBe(16)
    })

    it('minPadding fallback — cardWidth sıfır veya negatifse 16px döner', () => {
      expect(calculateSidePadding(390, 0)).toBe(16)
      expect(calculateSidePadding(390, -50)).toBe(16)
    })

    it('özel minPadding değeri dikkate alınır', () => {
      // (390 - 200) / 2 = 95 → max(8, 95) = 95
      expect(calculateSidePadding(390, 200, 8)).toBe(95)
      // (180 - 200) / 2 = -10 → max(8, -10) = 8
      expect(calculateSidePadding(180, 200, 8)).toBe(8)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // calculateTargetScrollLeft
  // ─────────────────────────────────────────────────────────────
  describe('calculateTargetScrollLeft — kesin yatay ortalama', () => {
    it('1. kart için scrollLeft = 0 döner (padding uygulandığında)', () => {
      const containerWidth = 390
      const cardWidth = 200
      const sidePadding = calculateSidePadding(containerWidth, cardWidth) // 95
      const card0OffsetLeft = sidePadding // 95

      // 95 - 195 + 100 = 0
      expect(calculateTargetScrollLeft(card0OffsetLeft, containerWidth, cardWidth)).toBe(0)
    })

    it('2. kart için kesin ortalama scrollLeft hesaplar', () => {
      const containerWidth = 390
      const cardWidth = 200
      const gap = 16
      const sidePadding = calculateSidePadding(containerWidth, cardWidth) // 95
      // Card 1: offsetLeft = 95 + 200 + 16 = 311
      const card1OffsetLeft = sidePadding + cardWidth + gap

      // 311 - 195 + 100 = 216 = cardWidth + gap
      expect(calculateTargetScrollLeft(card1OffsetLeft, containerWidth, cardWidth)).toBe(cardWidth + gap)
    })

    it('3. kart için kesin ortalama scrollLeft hesaplar', () => {
      const containerWidth = 390
      const cardWidth = 200
      const gap = 16
      const sidePadding = calculateSidePadding(containerWidth, cardWidth) // 95
      // Card 2: offsetLeft = 95 + 2*(200+16) = 527
      const card2OffsetLeft = sidePadding + 2 * (cardWidth + gap)

      // 527 - 195 + 100 = 432 = 2*(cardWidth+gap)
      expect(calculateTargetScrollLeft(card2OffsetLeft, containerWidth, cardWidth)).toBe(2 * (cardWidth + gap))
    })

    it('negatif scrollLeft değeri hiçbir zaman döndürülmez (klamp 0)', () => {
      expect(calculateTargetScrollLeft(10, 390, 200)).toBe(0)
      expect(calculateTargetScrollLeft(0, 390, 200)).toBe(0)
    })

    it('320px viewport için doğru scrollLeft hesaplar', () => {
      const containerWidth = 320
      const cardWidth = 200
      const sidePadding = calculateSidePadding(containerWidth, cardWidth) // 60
      // Card 0: offsetLeft = 60 → 60 - 160 + 100 = 0
      expect(calculateTargetScrollLeft(sidePadding, containerWidth, cardWidth)).toBe(0)
      // Card 1: offsetLeft = 60 + 216 = 276 → 276 - 160 + 100 = 216
      expect(calculateTargetScrollLeft(sidePadding + cardWidth + 16, containerWidth, cardWidth)).toBe(cardWidth + 16)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // findClosestCardIndex
  // ─────────────────────────────────────────────────────────────
  describe('findClosestCardIndex — swipe sonrası doğru kart tespiti', () => {
    // 390px container, 200px kart, 16px gap, 95px side padding
    const cards = [
      { offsetLeft: 95, clientWidth: 200 },   // Merkez: 195
      { offsetLeft: 311, clientWidth: 200 },  // Merkez: 411
      { offsetLeft: 527, clientWidth: 200 },  // Merkez: 627
    ]
    const clientWidth = 390

    it('scrollLeft=0 iken 0. kartı tespit eder', () => {
      expect(findClosestCardIndex(0, clientWidth, cards)).toBe(0)
    })

    it('yavaş swipe (scrollLeft=50) — hâlâ 0. kart daha yakın', () => {
      // containerCenter = 50 + 195 = 245; d0=50, d1=166 → Card 0
      expect(findClosestCardIndex(50, clientWidth, cards)).toBe(0)
    })

    it('scrollLeft=200 iken 1. kartı tespit eder', () => {
      // containerCenter = 200 + 195 = 395; d0=200, d1=16 → Card 1
      expect(findClosestCardIndex(200, clientWidth, cards)).toBe(1)
    })

    it('scrollLeft=432 iken 2. kartı tespit eder (son kart)', () => {
      // containerCenter = 432 + 195 = 627 (tam eşleşme Card 2)
      expect(findClosestCardIndex(432, clientWidth, cards)).toBe(2)
    })

    it('tam orta scrollLeft iken de doğru çalışır', () => {
      // containerCenter = 216 + 195 = 411 (tam eşleşme Card 1)
      expect(findClosestCardIndex(216, clientWidth, cards)).toBe(1)
    })

    it('boş kart dizisinde 0 döner', () => {
      expect(findClosestCardIndex(100, 390, [])).toBe(0)
    })

    it('tek kart varken her zaman 0 döner', () => {
      const singleCard = [{ offsetLeft: 95, clientWidth: 200 }]
      expect(findClosestCardIndex(0, 390, singleCard)).toBe(0)
      expect(findClosestCardIndex(500, 390, singleCard)).toBe(0)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 1 Pet edge case — carousel olmadan çalışmalı
  // ─────────────────────────────────────────────────────────────
  describe('1 Pet edge case', () => {
    it('tek kartta calculateSidePadding doğru çalışır', () => {
      // Tek kart durumunda da merkeze hizalamalı
      expect(calculateSidePadding(390, 200)).toBe(95)
    })

    it('tek kartta calculateTargetScrollLeft 0 döner', () => {
      const sidePadding = calculateSidePadding(390, 200) // 95
      // Tek kartın offsetLeft = sidePadding
      expect(calculateTargetScrollLeft(sidePadding, 390, 200)).toBe(0)
    })

    it('tek kartta findClosestCardIndex her zaman 0 döner', () => {
      const singleCard = [{ offsetLeft: 95, clientWidth: 200 }]
      expect(findClosestCardIndex(0, 390, singleCard)).toBe(0)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // 5+ Pet stress test
  // ─────────────────────────────────────────────────────────────
  describe('5 pet carousel (uzman33 test senaryosu)', () => {
    const containerWidth = 390
    const cardWidth = 200
    const gap = 16
    const sidePadding = calculateSidePadding(containerWidth, cardWidth) // 95

    const buildCards = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        offsetLeft: sidePadding + i * (cardWidth + gap),
        clientWidth: cardWidth,
      }))

    it('5 kartta her kartın scrollLeft\'i karşı taraftaki karttan farklı', () => {
      const cards = buildCards(5)
      const scrollLeftValues = cards.map(c =>
        calculateTargetScrollLeft(c.offsetLeft, containerWidth, cardWidth)
      )
      // Tüm değerler benzersiz ve artan sırada olmalı
      for (let i = 1; i < scrollLeftValues.length; i++) {
        expect(scrollLeftValues[i]).toBeGreaterThan(scrollLeftValues[i - 1])
      }
    })

    it('5 kartta findClosestCardIndex tüm kartları doğru tespit eder', () => {
      const cards = buildCards(5)
      for (let i = 0; i < 5; i++) {
        const scrollLeft = calculateTargetScrollLeft(cards[i].offsetLeft, containerWidth, cardWidth)
        expect(findClosestCardIndex(scrollLeft, containerWidth, cards)).toBe(i)
      }
    })
  })
})

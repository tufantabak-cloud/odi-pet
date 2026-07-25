import { describe, expect, it } from 'vitest'

import {
  getCompletedPetAgeYears,
  getPetAgeStage,
  getPetAgeStageFromBirthDate,
} from './age-stage'

describe('merkezi pet yaş skalası', () => {
  it.each([
    [0, 'junior', 'Yavru'],
    [0.999, 'junior', 'Yavru'],
    [1, 'adult', 'Yetişkin'],
    [6.999, 'adult', 'Yetişkin'],
    [7, 'senior', 'Yaşlı'],
    [11.999, 'senior', 'Yaşlı'],
    [12, 'senior_12plus', 'Yaşlı (12+)'],
    [24, 'senior_12plus', 'Yaşlı (12+)'],
  ])('%s yaşını doğru gruba yerleştirir', (age, key, label) => {
    expect(getPetAgeStage(age)).toMatchObject({ key, label })
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'geçersiz %s yaşını reddeder',
    (age) => {
      expect(getPetAgeStage(age)).toBeNull()
    }
  )

  it('tam doğum gününü yıl sınırı olarak kullanır', () => {
    const today = new Date(2026, 6, 24, 12)

    expect(getCompletedPetAgeYears(new Date(2025, 6, 25), today)).toBe(0)
    expect(getCompletedPetAgeYears(new Date(2025, 6, 24), today)).toBe(1)
    expect(getCompletedPetAgeYears(new Date(2019, 6, 24), today)).toBe(7)
    expect(getCompletedPetAgeYears(new Date(2014, 6, 24), today)).toBe(12)
  })

  it('doğum tarihinden 1, 7 ve 12 yaş sınırlarını doğru üretir', () => {
    const today = new Date(2026, 6, 24, 12)

    expect(getPetAgeStageFromBirthDate(new Date(2025, 6, 24), today)?.key).toBe('adult')
    expect(getPetAgeStageFromBirthDate(new Date(2019, 6, 24), today)?.key).toBe('senior')
    expect(getPetAgeStageFromBirthDate(new Date(2014, 6, 24), today)?.key).toBe('senior_12plus')
  })

  it('eksik, geçersiz ve gelecekteki doğum tarihlerini reddeder', () => {
    const today = new Date(2026, 6, 24, 12)

    expect(getPetAgeStageFromBirthDate(null, today)).toBeNull()
    expect(getPetAgeStageFromBirthDate('geçersiz', today)).toBeNull()
    expect(getPetAgeStageFromBirthDate(new Date(2026, 6, 25), today)).toBeNull()
  })
})

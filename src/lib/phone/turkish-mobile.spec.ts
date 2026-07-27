import { describe, expect, it } from 'vitest'
import {
  formatTurkishMobileInput,
  isTurkishMobilePhone,
  normalizeTurkishMobilePhone,
} from './turkish-mobile'

describe('Türkiye cep telefonu yardımcıları', () => {
  it.each([
    ['5554443322', '+905554443322'],
    ['0555 444 33 22', '+905554443322'],
    ['+90 (555) 444 33 22', '+905554443322'],
    ['0090 555 444 33 22', '+905554443322'],
  ])('%s değerini uluslararası biçime dönüştürür', (input, expected) => {
    expect(normalizeTurkishMobilePhone(input)).toBe(expected)
  })

  it.each([
    '',
    '0555 444 33',
    '0555 444 33 222',
    '0212 444 33 22',
    '+90 212 444 33 22',
  ])('%s değerini cep telefonu numarası olarak reddeder', (input) => {
    expect(isTurkishMobilePhone(input)).toBe(false)
  })

  it('girişi kullanıcı yazarken 05XX XXX XX XX biçiminde sınırlar', () => {
    expect(formatTurkishMobileInput('+90 (555) 444-33-22123')).toBe('0555 444 33 22')
  })
})

import { describe, expect, it } from 'vitest'

import { getSafeRelativeRedirect } from './redirect'

describe('getSafeRelativeRedirect', () => {
  it('uygulama içi yolu kabul eder', () => {
    expect(
      getSafeRelativeRedirect('/clinic/dashboard?tab=today#appointments')
    ).toBe('/clinic/dashboard?tab=today#appointments')
  })

  it.each([
    'https://attacker.example/path',
    '//attacker.example/path',
    '/\\attacker.example/path',
    'owner/dashboard',
  ])('güvenli olmayan yönlendirmeyi reddeder: %s', (value) => {
    expect(getSafeRelativeRedirect(value)).toBe('/owner/dashboard')
  })
})

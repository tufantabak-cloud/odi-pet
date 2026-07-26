import { describe, expect, it } from 'vitest'

import { validateSameOriginHeaders } from './request-origin'

describe('validateSameOriginHeaders', () => {
  it('aynı origin isteğini kabul eder', () => {
    const headers = new Headers({
      host: 'odi.pet',
      origin: 'https://odi.pet',
    })

    expect(validateSameOriginHeaders(headers)).toEqual({ valid: true })
  })

  it('referer başlığını destekler', () => {
    const headers = new Headers({
      host: 'odi.pet',
      referer: 'https://odi.pet/owner/dashboard',
    })

    expect(validateSameOriginHeaders(headers)).toEqual({ valid: true })
  })

  it('kaynak başlığı olmayan durumu reddeder', () => {
    expect(
      validateSameOriginHeaders(new Headers({ host: 'odi.pet' }))
    ).toEqual({ valid: false, reason: 'missing' })
  })

  it('farklı ve bozuk kaynakları reddeder', () => {
    expect(
      validateSameOriginHeaders(
        new Headers({ host: 'odi.pet', origin: 'https://evil.example' })
      )
    ).toEqual({ valid: false, reason: 'mismatch' })

    expect(
      validateSameOriginHeaders(
        new Headers({ host: 'odi.pet', origin: 'not a url' })
      )
    ).toEqual({ valid: false, reason: 'malformed' })
  })
})

import { describe, expect, it } from 'vitest'
import {
  applicationDetailsSchema,
  hasApplicationDetails,
} from './application-details'

describe('applicationDetailsSchema', () => {
  it('opsiyonel boş kaydı kabul eder', () => {
    const result = applicationDetailsSchema.parse({})

    expect(result).toEqual({ currency: 'TRY' })
    expect(hasApplicationDetails(result)).toBe(false)
  })

  it('aşı ve parazit uygulama ayrıntılarını doğrular', () => {
    const result = applicationDetailsSchema.parse({
      brand: 'Nobivac',
      lot_number: 'LOT-42',
      product_expiry_at: '2027-12-31',
      administration_place: 'veterinary_clinic',
      amount: 1250.5,
      currency: 'TRY',
      protection_duration_days: 30,
    })

    expect(result.amount).toBe(1250.5)
    expect(hasApplicationDetails(result)).toBe(true)
  })

  it('negatif tutarı reddeder', () => {
    expect(() => applicationDetailsSchema.parse({ amount: -1 })).toThrow()
  })
})

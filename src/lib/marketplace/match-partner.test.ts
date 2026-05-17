import { describe, it, expect } from 'vitest'
import { matchPartner } from './match-partner'

describe('Marketplace - matchPartner', () => {
  it('should return a partner for a known brand (exact match)', () => {
    const result = matchPartner('Royal Canin')
    expect(result).not.toBeNull()
    expect(result?.id).toBe('petshoptr')
    expect(result?.name).toBe('PetshopTR')
  })

  it('should match brands case-insensitively', () => {
    expect(matchPartner('royal canin')).not.toBeNull()
    expect(matchPartner('ROYAL CANIN')).not.toBeNull()
    expect(matchPartner('rOyAl CaNiN')).not.toBeNull()
  })

  it('should match brands with leading/trailing whitespace', () => {
    expect(matchPartner('  Acana  ')).not.toBeNull()
  })

  it('should return the correct partner for Premium Paws brands', () => {
    const result = matchPartner('Orijen')
    expect(result?.id).toBe('premium_paws')
  })

  it('should return null for an unknown brand', () => {
    expect(matchPartner('BrandXYZ')).toBeNull()
  })

  it('should return null for null input', () => {
    expect(matchPartner(null)).toBeNull()
  })

  it('should return null for undefined input', () => {
    expect(matchPartner(undefined)).toBeNull()
  })

  it('should return null for an empty string', () => {
    expect(matchPartner('')).toBeNull()
  })
})

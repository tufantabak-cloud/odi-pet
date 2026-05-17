import { describe, it, expect } from 'vitest'
import { qualifiesForMarketplaceBeta } from './marketplace-gate'

describe('Nutrition - qualifiesForMarketplaceBeta', () => {
  const base = {
    reminderRequested: true,
    snoozed: false,
    escalated: false,
    dismissed: false,
  }

  it('should return false when reminderRequested is false', () => {
    expect(qualifiesForMarketplaceBeta({ ...base, reminderRequested: false })).toBe(false)
  })

  it('should return false when dismissed is true (regardless of other flags)', () => {
    expect(qualifiesForMarketplaceBeta({ ...base, dismissed: true, snoozed: true })).toBe(false)
    expect(qualifiesForMarketplaceBeta({ ...base, dismissed: true, escalated: true })).toBe(false)
  })

  it('should return true when snoozed is true and not dismissed', () => {
    expect(qualifiesForMarketplaceBeta({ ...base, snoozed: true })).toBe(true)
  })

  it('should return true when escalated is true and not dismissed', () => {
    expect(qualifiesForMarketplaceBeta({ ...base, escalated: true })).toBe(true)
  })

  it('should return true when both snoozed and escalated are true', () => {
    expect(qualifiesForMarketplaceBeta({ ...base, snoozed: true, escalated: true })).toBe(true)
  })

  it('should return false when reminded but neither snoozed nor escalated', () => {
    // reminderRequested=true but both snoozed=false and escalated=false → not qualifying yet
    expect(qualifiesForMarketplaceBeta(base)).toBe(false)
  })
})

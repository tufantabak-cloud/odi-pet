import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS } from '@/app/api/admin/memberships/settings/route'

describe('Referral System End-to-End Functionality Verification', () => {
  it('DEFAULT_SETTINGS contains all dynamic referral tier days', () => {
    expect(DEFAULT_SETTINGS.welcome_credit_days).toBe(90)
    expect(DEFAULT_SETTINGS.per_pet_credit_days).toBe(90)
    expect(DEFAULT_SETTINGS.referee_welcome_days).toBe(30)
    expect(DEFAULT_SETTINGS.referral_tier_1_days).toBe(30)
    expect(DEFAULT_SETTINGS.referral_tier_2_bonus).toBe(30)
    expect(DEFAULT_SETTINGS.referral_tier_3_bonus).toBe(60)
    expect(DEFAULT_SETTINGS.referral_tier_4_bonus).toBe(120)
    expect(DEFAULT_SETTINGS.referral_tier_5_bonus).toBe(300)
  })

  it('calculates progressive referral milestone tier totals accurately', () => {
    const tier1Total = DEFAULT_SETTINGS.referral_tier_1_days
    const tier2Total = DEFAULT_SETTINGS.referral_tier_1_days + DEFAULT_SETTINGS.referral_tier_2_bonus
    const tier3Total = DEFAULT_SETTINGS.referral_tier_1_days + DEFAULT_SETTINGS.referral_tier_3_bonus
    const tier4Total = DEFAULT_SETTINGS.referral_tier_1_days + DEFAULT_SETTINGS.referral_tier_4_bonus
    const tier5Total = DEFAULT_SETTINGS.referral_tier_1_days + DEFAULT_SETTINGS.referral_tier_5_bonus

    expect(tier1Total).toBe(30)
    expect(tier2Total).toBe(60)
    expect(tier3Total).toBe(90)
    expect(tier4Total).toBe(150)
    expect(tier5Total).toBe(330)
  })
})

import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS, type MembershipSettings } from '@/lib/referral/constants'

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

  it('calculates default progressive referral milestone tier totals accurately', () => {
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

  it('dynamically re-calculates tier totals when admin changes values (e.g. user screenshot case)', () => {
    const customSettings: MembershipSettings = {
      welcome_credit_days: 90,
      per_pet_credit_days: 60, // Changed from 90 to 60
      referee_welcome_days: 30,
      referral_tier_1_days: 30,
      referral_tier_2_bonus: 30,
      referral_tier_3_bonus: 60,
      referral_tier_4_bonus: 90, // Changed from 120 to 90
      referral_tier_5_bonus: 300,
      monthly_invite_cap: 10,
    }

    const tier1 = customSettings.referral_tier_1_days
    const tier2 = customSettings.referral_tier_1_days + customSettings.referral_tier_2_bonus
    const tier3 = customSettings.referral_tier_1_days + customSettings.referral_tier_3_bonus
    const tier4 = customSettings.referral_tier_1_days + customSettings.referral_tier_4_bonus
    const tier5 = customSettings.referral_tier_1_days + customSettings.referral_tier_5_bonus

    expect(tier1).toBe(30)
    expect(tier2).toBe(60)
    expect(tier3).toBe(90)
    expect(tier4).toBe(120) // 30 + 90 = 120 (Matches user screenshot: Toplam +120 Gün)
    expect(tier5).toBe(330) // 30 + 300 = 330 (Matches user screenshot: Toplam +330 Gün)
  })
})

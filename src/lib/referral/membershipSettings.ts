export interface MembershipSettings {
  welcome_credit_days: number          // Default 90
  per_pet_credit_days: number          // Default 90
  referee_welcome_days: number         // Default 30
  referral_tier_1_days: number         // Default 30 (1. Davet)
  referral_tier_2_bonus: number        // Default 30 (2. Davet Bonusu -> Toplam 60 Gün)
  referral_tier_3_bonus: number        // Default 60 (3. Davet Bonusu -> Toplam 90 Gün)
  referral_tier_4_bonus: number        // Default 120 (4. Davet Bonusu -> Toplam 150 Gün)
  referral_tier_5_bonus: number        // Default 300 (5. Davet Bonusu -> Toplam 330 Gün)
  monthly_invite_cap: number           // Default 10
}

export const DEFAULT_SETTINGS: MembershipSettings = {
  welcome_credit_days: 90,
  per_pet_credit_days: 90,
  referee_welcome_days: 30,
  referral_tier_1_days: 30,
  referral_tier_2_bonus: 30,
  referral_tier_3_bonus: 60,
  referral_tier_4_bonus: 120,
  referral_tier_5_bonus: 300,
  monthly_invite_cap: 10,
}

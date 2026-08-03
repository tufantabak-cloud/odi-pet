import { cache } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export type EntitlementTier = 'free' | 'pro' | 'ai_plus'
export type EntitlementSource = 'paid' | 'credit' | 'none'

export interface Entitlement {
  tier: EntitlementTier
  source: EntitlementSource
  validUntil: Date | null
  daysLeft: number          // 0 = süresiz ödemeli veya hak yok
  isPremium: boolean        // tier !== 'free'
  hasAiPlus: boolean
}

const TIER_RANK: Record<EntitlementTier, number> = {
  free: 0,
  pro: 1,
  ai_plus: 2,
}

export const getEntitlement = cache(async (userId: string): Promise<Entitlement> => {
  if (!userId) {
    return {
      tier: 'free',
      source: 'none',
      validUntil: null,
      daysLeft: 0,
      isPremium: false,
      hasAiPlus: false,
    }
  }

  const supabase = await createServerSupabaseClient()

  // 1. Ödemeli plan kontrolü (user_subscriptions)
  const { data: subData } = await supabase
    .from('user_subscriptions')
    .select('plan, status')
    .eq('profile_id', userId)
    .maybeSingle()

  if (subData) {
    const isPaidActive = subData.status === 'active' || subData.status === 'trialing'
    if (isPaidActive && (subData.plan === 'pro' || subData.plan === 'ai_plus')) {
      const tier: EntitlementTier = subData.plan as EntitlementTier
      return {
        tier,
        source: 'paid',
        validUntil: null,
        daysLeft: 0,
        isPremium: true,
        hasAiPlus: tier === 'ai_plus',
      }
    }
  }

  // 2. Kredi kontrolü (profiles.premium_until & pro_trial_until)
  const { data: profileData } = await supabase
    .from('profiles')
    .select('premium_until, pro_trial_until, premium_tier')
    .eq('id', userId)
    .maybeSingle()

  const rawUntil = profileData?.premium_until || (profileData as any)?.pro_trial_until

  if (rawUntil) {
    const validUntil = new Date(rawUntil)
    const now = new Date()
    if (validUntil > now) {
      const diffMs = validUntil.getTime() - now.getTime()
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      const tier: EntitlementTier = (profileData?.premium_tier as EntitlementTier) || 'pro'

      return {
        tier,
        source: 'credit',
        validUntil,
        daysLeft,
        isPremium: true,
        hasAiPlus: tier === 'ai_plus',
      }
    }
  }

  // 3. Varsayılan Ücretsiz (Free)
  return {
    tier: 'free',
    source: 'none',
    validUntil: null,
    daysLeft: 0,
    isPremium: false,
    hasAiPlus: false,
  }
})

export async function requireTier(userId: string, minTier: EntitlementTier): Promise<boolean> {
  const entitlement = await getEntitlement(userId)
  return TIER_RANK[entitlement.tier] >= TIER_RANK[minTier]
}

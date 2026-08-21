import { FeatureAccessReason, FeatureAccessResult, PlanKey } from './types';
import { FeatureDefinition } from '../types';

export class EntitlementPolicy {
  
  static evaluate(
    featureKey: string,
    featureDef: FeatureDefinition | undefined,
    dbStatus: any,
    planKey: PlanKey,
    limitData: any, // The specific limit record from feature_limits
    usage: number
  ): FeatureAccessResult {

    const effectiveState = featureDef?.state || 'ACTIVE';
    const effectiveStatus = dbStatus?.status || (effectiveState === 'ACTIVE' ? 'active' : 'disabled');

    const baseResult: FeatureAccessResult = {
      allowed: false,
      reason: FeatureAccessReason.ALLOWED, 
      feature: featureDef,
      currentTier: planKey,
      featureStatus: effectiveStatus,
      featureState: effectiveState,
      isUnlimited: false,
      percent: 0,
      status: 'normal',
      nearLimit: false,
      critical: false,
      exceeded: false
    };

    // 1. Feature Definition Check
    if (!featureDef) {
      return { ...baseResult, reason: FeatureAccessReason.FEATURE_NOT_FOUND };
    }

    // 2. LAYER 1: STATE CHECK (Strict Runtime Priority)
    if (effectiveState === 'DISABLED' || effectiveStatus === 'disabled') {
      return { ...baseResult, reason: FeatureAccessReason.DISABLED };
    }
    if (effectiveState === 'COMING_SOON') {
      return { ...baseResult, reason: FeatureAccessReason.DISABLED, featureState: 'COMING_SOON' };
    }
    if (effectiveStatus === 'pending_review') {
      return { ...baseResult, reason: FeatureAccessReason.PENDING_REVIEW };
    }
    if (effectiveStatus === 'deprecated' || effectiveState === 'DEPRECATED') {
      return { ...baseResult, reason: FeatureAccessReason.DEPRECATED };
    }

    // 3. LAYER 2: LIMIT DATA PRESENT IN DB
    if (limitData) {
      if (limitData.limit_type === 'boolean' && limitData.is_enabled === false) {
        return { ...baseResult, reason: FeatureAccessReason.DISABLED };
      }
      if (limitData.limit_type === 'quota' && limitData.limit_value === 0) {
        return { ...baseResult, reason: FeatureAccessReason.DISABLED };
      }

      // Unlimited Access
      if (limitData.limit_type === 'unlimited') {
        return { 
          ...baseResult, 
          allowed: true, 
          reason: FeatureAccessReason.ALLOWED,
          usage,
          isUnlimited: true,
          percent: 0,
          status: 'normal'
        };
      }

      // Quota & Usage Computation
      if (limitData.limit_type === 'quota' && limitData.limit_value !== null) {
        const limit = limitData.limit_value;
        const remaining = Math.max(0, limit - usage);
        const rawPercent = limit > 0 ? (usage / limit) * 100 : 100;
        const percent = Math.min(100, Math.round(rawPercent));

        const exceeded = usage >= limit;
        const critical = !exceeded && rawPercent >= 90;
        const nearLimit = !exceeded && !critical && rawPercent >= 75;

        let status: 'normal' | 'nearLimit' | 'critical' | 'exceeded' = 'normal';
        if (exceeded) status = 'exceeded';
        else if (critical) status = 'critical';
        else if (nearLimit) status = 'nearLimit';

        const resetAt = new Date();
        const addDays = limitData.window_unit === 'month' ? 30 : (limitData.window_value || 30);
        resetAt.setUTCDate(resetAt.getUTCDate() + addDays);

        const usageResult: FeatureAccessResult = {
          ...baseResult,
          usage,
          limit,
          remaining,
          percent,
          status,
          nearLimit,
          critical,
          exceeded,
          resetAt: resetAt.toISOString(),
          isUnlimited: false
        };

        if (exceeded) {
          return { ...usageResult, allowed: false, reason: FeatureAccessReason.USAGE_LIMIT_REACHED };
        }

        return { ...usageResult, allowed: true, reason: FeatureAccessReason.ALLOWED };
      }

      // Boolean / Enabled flag
      if (limitData.limit_type === 'boolean' && limitData.is_enabled === true) {
        return { ...baseResult, allowed: true, reason: FeatureAccessReason.ALLOWED, isUnlimited: true };
      }
    }

    // 4. LAYER 3: FALLBACK WHEN LIMIT DATA IS NOT DEFINED IN DB
    // Premium Tiers (ai_plus, pro, enterprise) get full access to active features by default
    const isPremiumTier = planKey === 'ai_plus' || planKey === 'pro' || planKey === 'enterprise';
    if (isPremiumTier) {
      return { 
        ...baseResult, 
        allowed: true, 
        reason: FeatureAccessReason.ALLOWED, 
        isUnlimited: true,
        usage,
        status: 'normal'
      };
    }

    // Free Tier: If the feature is explicitly tagged as premium or AI, require upgrade
    const isPremiumFeature = featureDef.tags?.includes('premium') || featureDef.category === 'ai' || featureDef.key === 'smart_matching' || featureDef.key === 'breeding_listings';
    if (isPremiumFeature) {
      return { 
        ...baseResult, 
        allowed: false, 
        reason: FeatureAccessReason.TIER_REQUIRED, 
        requiredTier: 'pro' 
      };
    }

    // Free standard feature without limit row defaults to allowed
    return { ...baseResult, allowed: true, isUnlimited: true, reason: FeatureAccessReason.ALLOWED };
  }
}

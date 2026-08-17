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

    const baseResult: FeatureAccessResult = {
      allowed: false,
      reason: FeatureAccessReason.ALLOWED, 
      feature: featureDef,
      currentTier: planKey,
      featureStatus: dbStatus?.status,
      featureState: featureDef?.state,
      isUnlimited: false,
      percent: 0,
      status: 'normal',
      nearLimit: false,
      critical: false,
      exceeded: false
    };

    // 1. Feature Definition Check
    if (!featureDef || !dbStatus) {
      return { ...baseResult, reason: FeatureAccessReason.FEATURE_NOT_FOUND };
    }

    // 2. LAYER 1: STATE CHECK (Strict Runtime Priority)
    if (featureDef.state === 'DISABLED') {
      return { ...baseResult, reason: FeatureAccessReason.DISABLED };
    }
    if (featureDef.state === 'COMING_SOON') {
      return { ...baseResult, reason: FeatureAccessReason.DISABLED, featureState: 'COMING_SOON' };
    }
    if (dbStatus.status === 'pending_review') {
      return { ...baseResult, reason: FeatureAccessReason.PENDING_REVIEW };
    }
    if (dbStatus.status === 'deprecated' || featureDef.state === 'DEPRECATED') {
      return { ...baseResult, reason: FeatureAccessReason.DEPRECATED };
    }

    // 4. LAYER 3: LIMIT RECORD & EXPLICIT DISABLE CHECK
    if (!limitData) {
      return { ...baseResult, reason: FeatureAccessReason.MISSING_LIMIT_RECORD };
    }
    if (limitData.limit_type === 'boolean' && limitData.is_enabled === false) {
      return { ...baseResult, reason: FeatureAccessReason.DISABLED };
    }
    if (limitData.limit_type === 'quota' && limitData.limit_value === 0) {
      return { ...baseResult, reason: FeatureAccessReason.DISABLED };
    }

    // 5. LAYER 4: UNLIMITED ACCESS
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

    // 6. LAYER 5: QUOTA & USAGE COMPUTATION
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

    // 7. Boolean / Enabled flag only
    if (limitData.limit_type === 'boolean' && limitData.is_enabled === true) {
      return { ...baseResult, allowed: true, reason: FeatureAccessReason.ALLOWED, isUnlimited: true };
    }

    return { ...baseResult, reason: FeatureAccessReason.TIER_REQUIRED };
  }
}

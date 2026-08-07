import React from 'react';
import { checkFeatureAccess } from './entitlement/engine';
import { FeatureContext, FeatureAccessResult } from './entitlement/types';
import { PremiumContent } from '../../components/premium/PremiumContent';

export interface ServerFeatureGuardProps {
  featureKey: string;
  userId: string;
  context?: FeatureContext;
  children: React.ReactNode | ((result: FeatureAccessResult) => React.ReactNode);
  fallback?: React.ReactNode | ((result: FeatureAccessResult) => React.ReactNode);
  showInlineUpgrade?: boolean;
}

/**
 * Server-Side Feature Guard.
 * Directly awaits the entitlement engine. No `loading` state needed since it resolves before render.
 */
export async function ServerFeatureGuard({
  featureKey,
  userId,
  context,
  children,
  fallback,
  showInlineUpgrade = true
}: ServerFeatureGuardProps) {
  
  const result = await checkFeatureAccess({ userId, featureKey, context });

  if (result.allowed) {
    return <>{typeof children === 'function' ? children(result) : children}</>;
  }

  if (fallback) {
    return <>{typeof fallback === 'function' ? fallback(result) : fallback}</>;
  }

  if (showInlineUpgrade) {
    // Map internal result to a mock useFeature state for PremiumContent
    const featureState = {
      enabled: false,
      reason: result.reason,
      limit: result.limit,
      remaining: result.remaining,
      plan: result.currentTier,
      upgradePlan: result.requiredTier,
      isUnlimited: result.isUnlimited || false,
      state: result.featureState,
      loading: false,
      refresh: async () => {}, // No-op on server
    };
    
    return (
      <div className="w-full h-full flex items-center justify-center bg-bg-main p-4 rounded-3xl border border-border-main">
        <PremiumContent featureState={featureState} featureName={featureKey} />
      </div>
    );
  }

  return null;
}

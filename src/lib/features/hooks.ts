'use client';

import { useState, useEffect, useCallback } from 'react';
import { checkFeatureAccessAction } from '../../app/actions/checkFeatureAccess';
import { CheckFeatureAccessParams, FeatureAccessResult, FeatureAccessReason } from './entitlement/types';

export interface UseFeatureReturn {
  enabled: boolean;
  remaining?: number;
  used?: number;
  limit?: number;
  plan?: string;
  nextReset?: string;
  reason: FeatureAccessReason;
  upgradePlan?: string;
  isUnlimited: boolean;
  state?: 'ACTIVE' | 'BETA' | 'HIDDEN' | 'COMING_SOON' | 'DEPRECATED' | 'DISABLED';
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useFeature(params: CheckFeatureAccessParams): UseFeatureReturn {
  const [result, setResult] = useState<FeatureAccessResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAccess = useCallback(async () => {
    setLoading(true);
    try {
      const data = await checkFeatureAccessAction(params);
      setResult(data);
    } catch (err) {
      console.error('[useFeature] Error checking access:', err);
    } finally {
      setLoading(false);
    }
  }, [params.userId, params.featureKey, params.context?.petId]);

  useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  const refresh = async () => {
    await fetchAccess();
  };

  return {
    enabled: result?.allowed ?? false,
    remaining: result?.remaining,
    used: result?.usage,
    limit: result?.limit,
    plan: result?.currentTier,
    nextReset: result?.resetAt,
    reason: result?.reason ?? FeatureAccessReason.ALLOWED,
    upgradePlan: result?.requiredTier,
    isUnlimited: result?.isUnlimited ?? false,
    state: result?.featureState,
    loading,
    refresh
  };
}

// Retain legacy interface mapping for ClientFeatureGuard compatibility
export function useFeatureAccess(params: CheckFeatureAccessParams) {
  const [result, setResult] = useState<FeatureAccessResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    checkFeatureAccessAction(params)
      .then((data) => {
        if (isMounted) {
          setResult(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [params.userId, params.featureKey, params.context?.petId]); 
  
  return { result, isLoading, error };
}

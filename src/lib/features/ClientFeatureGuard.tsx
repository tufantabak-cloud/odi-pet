'use client';

import React, { useState } from 'react';
import { useFeature, UseFeatureReturn } from './hooks';
import { FeatureContext } from './entitlement/types';
import { Modal } from '../../components/ui/Modal';
import { PremiumContent } from '../../components/premium/PremiumContent';

export interface ClientFeatureGuardProps {
  featureKey: string;
  userId: string;
  context?: FeatureContext;
  children: React.ReactNode | ((state: UseFeatureReturn) => React.ReactNode);
  fallback?: React.ReactNode | ((state: UseFeatureReturn) => React.ReactNode);
  loading?: React.ReactNode;
  onDenied?: (state: UseFeatureReturn) => void;
  showUpgradeModalOnDeny?: boolean;
}

/**
 * Client-Side Feature Guard.
 * Relies on the `useFeature` hook to resolve authorization state over the network.
 */
export function ClientFeatureGuard({
  featureKey,
  userId,
  context,
  children,
  fallback,
  loading,
  onDenied,
  showUpgradeModalOnDeny = true
}: ClientFeatureGuardProps) {
  const featureState = useFeature({ userId, featureKey, context });
  const [modalOpen, setModalOpen] = useState(false);

  React.useEffect(() => {
    if (!featureState.loading && !featureState.enabled) {
      if (onDenied) {
        onDenied(featureState);
      }
      if (showUpgradeModalOnDeny && !fallback) {
        setModalOpen(true);
      }
    }
  }, [featureState.loading, featureState.enabled, onDenied, showUpgradeModalOnDeny, fallback]);

  if (featureState.loading) {
    return loading || null;
  }

  if (featureState.enabled) {
    return <>{typeof children === 'function' ? children(featureState) : children}</>;
  }

  if (fallback) {
    return <>{typeof fallback === 'function' ? fallback(featureState) : fallback}</>;
  }

  return (
    <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
      <PremiumContent 
        featureState={featureState} 
        featureName={featureKey}
        onUpgrade={() => {
          // Future: Redirect to billing or trigger bottom sheet
          console.log('Redirecting to upgrade page for plan:', featureState.upgradePlan);
          window.location.href = '/settings/subscription';
        }} 
      />
    </Modal>
  );
}

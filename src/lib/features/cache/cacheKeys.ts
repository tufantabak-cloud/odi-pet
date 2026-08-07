const PREFIX = 'fr:v1';

export const CacheKeys = {
  getFeatureKey: (featureKey: string) => `${PREFIX}:feature:${featureKey}`,
  getEntitlementKey: (userId: string, featureKey: string) => `${PREFIX}:entitlement:${userId}:${featureKey}`,
  getUsageKey: (userId: string, featureKey: string) => `${PREFIX}:usage:${userId}:${featureKey}`,
  getRegistryKey: (version: string) => `${PREFIX}:registry:${version}`,
  
  // Tag namespaces for invalidation
  getFeatureTagKey: (featureKey: string) => `${PREFIX}:tag:feature:${featureKey}`,
  getUserTagKey: (userId: string) => `${PREFIX}:tag:user:${userId}`,
};

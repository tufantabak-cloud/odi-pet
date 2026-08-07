import { IMembershipProvider } from './types';

export * from './types';

export function validateProviderImplementation(provider: IMembershipProvider): boolean {
  return (
    typeof provider.assignPlan === 'function' &&
    typeof provider.changePlan === 'function' &&
    typeof provider.startTrial === 'function' &&
    typeof provider.extendMembership === 'function' &&
    typeof provider.cancelMembership === 'function' &&
    typeof provider.resumeMembership === 'function' &&
    typeof provider.grantQuota === 'function' &&
    typeof provider.resetQuota === 'function' &&
    typeof provider.createOverride === 'function' &&
    typeof provider.removeOverride === 'function' &&
    typeof provider.getMembership === 'function' &&
    typeof provider.listMemberships === 'function'
  );
}

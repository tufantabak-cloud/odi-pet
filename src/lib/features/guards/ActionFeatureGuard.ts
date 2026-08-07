import { checkFeatureAccess } from '../entitlement/engine';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';

export type ActionHandler<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

/**
 * Wrapper for Server Actions to enforce Feature Entitlements.
 */
export function withActionFeatureGuard<TInput, TOutput>(
  featureKey: string,
  action: ActionHandler<TInput, TOutput>
): ActionHandler<TInput, TOutput> {
  return async (input: TInput): Promise<TOutput> => {
    const profile = await getCurrentProfile();

    if (!profile) {
      throw new Error('Unauthorized');
    }

    const access = await checkFeatureAccess({
      userId: profile.id,
      featureKey
    });

    if (!access.allowed) {
      throw new Error(`Access denied for feature '${featureKey}'. Reason: ${access.reason}`);
    }

    return action(input);
  };
}

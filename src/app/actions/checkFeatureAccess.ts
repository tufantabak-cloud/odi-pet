'use server';

import { checkFeatureAccess as engineCheck } from '../../lib/features/entitlement/engine';
import { CheckFeatureAccessParams, FeatureAccessResult } from '../../lib/features/entitlement/types';

/**
 * Server Action Wrapper for the Entitlement Engine.
 * Used primarily by Client Components via the `useFeatureAccess` hook.
 */
export async function checkFeatureAccessAction(params: CheckFeatureAccessParams): Promise<FeatureAccessResult> {
  let userId = params.userId;
  if (!userId) {
    try {
      const { getSessionUser } = await import('@/lib/auth/get-current-profile');
      const user = await getSessionUser();
      if (user) {
        userId = user.id;
      }
    } catch {
      // Session unavailable
    }
  }
  
  return await engineCheck({ ...params, userId: userId || '' });
}

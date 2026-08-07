'use server';

import { checkFeatureAccess as engineCheck } from '../../lib/features/entitlement/engine';
import { CheckFeatureAccessParams, FeatureAccessResult } from '../../lib/features/entitlement/types';

/**
 * Server Action Wrapper for the Entitlement Engine.
 * Used primarily by Client Components via the `useFeatureAccess` hook.
 */
export async function checkFeatureAccessAction(params: CheckFeatureAccessParams): Promise<FeatureAccessResult> {
  // In a real implementation, you might want to extract `userId` from the authenticated session 
  // rather than trusting the client payload entirely, but for the universal adapter pattern, 
  // this simply proxies to the core engine.
  
  return await engineCheck(params);
}

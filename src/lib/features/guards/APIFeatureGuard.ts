import { NextRequest, NextResponse } from 'next/server';
import { checkFeatureAccess } from '../entitlement/engine';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';

export type APIHandler = (req: NextRequest, ...args: any[]) => Promise<NextResponse> | NextResponse;

/**
 * Higher-Order Function to protect API Route Handlers with Feature Entitlement checks.
 */
export function withAPIFeatureGuard(featureKey: string, handler: APIHandler): APIHandler {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      const profile = await getCurrentProfile();

      if (!profile) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const access = await checkFeatureAccess({
        userId: profile.id,
        featureKey
      });

      if (!access.allowed) {
        return NextResponse.json({
          error: 'Feature Access Denied',
          reason: access.reason,
          featureKey,
          requiredTier: access.requiredTier || 'pro'
        }, { status: 403 });
      }

      return handler(req, ...args);

    } catch (error: any) {
      console.error(`[APIFeatureGuard] Error checking access for '${featureKey}':`, error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  };
}

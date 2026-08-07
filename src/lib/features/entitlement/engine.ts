import { CheckFeatureAccessParams, FeatureAccessResult } from './types';
import { defaultRepository } from './repository';
import { EntitlementPolicy } from './policy';
import { getTelemetryProvider } from './telemetry';
import { getFeature } from '../registry';

export class EntitlementEngine {
  constructor(private repo = defaultRepository) {}

  async checkAccess(params: CheckFeatureAccessParams): Promise<FeatureAccessResult> {
    const { userId, featureKey, context } = params;

    // 1. Fetch Definition (Build-time Registry)
    const featureDef = getFeature(featureKey);

    // 2. Fetch User Tier
    const tier = await this.repo.getUserTier(userId);

    // 3. Fetch Database Feature Status
    const dbStatus = await this.repo.getFeatureDatabaseStatus(featureKey);

    // 4. Fetch Limit for the specific tier
    const limitData = await this.repo.getFeatureLimit(featureKey, tier);

    // 5. Fetch Usage
    let usage = 0;
    if (limitData && limitData.limit_value !== null && limitData.limit_value > 0) {
      usage = await this.repo.getCurrentUsage(userId, featureKey, context);
    }

    // 6. Evaluate Policy
    const result = EntitlementPolicy.evaluate(
      featureKey,
      featureDef,
      dbStatus,
      tier,
      limitData,
      usage
    );

    // 7. Telemetry Record
    getTelemetryProvider().logAccess({
      feature: featureKey,
      tier: tier,
      reason: result.reason,
      userId: userId,
      context: context,
      timestamp: new Date().toISOString()
    }, result.allowed);

    return result;
  }
}

// Default exportable function for general usage
const defaultEngine = new EntitlementEngine();

export async function checkFeatureAccess(params: CheckFeatureAccessParams): Promise<FeatureAccessResult> {
  return defaultEngine.checkAccess(params);
}

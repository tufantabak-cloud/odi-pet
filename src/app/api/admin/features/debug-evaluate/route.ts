import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { getFeature } from '@/lib/features/registry';
import { defaultRepository } from '@/lib/features/entitlement/repository';
import { EntitlementPolicy } from '@/lib/features/entitlement/policy';

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'founder')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, featureKey } = await req.json();

    if (!userId || !featureKey) {
      return NextResponse.json({ error: 'userId and featureKey are required' }, { status: 400 });
    }

    const trace: Array<{ step: string; passed: boolean; duration_ms: number; details: string }> = [];
    const totalStart = performance.now();

    // Step 1: Definition Check
    let start = performance.now();
    const featureDef = getFeature(featureKey);
    let stepMs = Number((performance.now() - start).toFixed(3));
    trace.push({
      step: 'Registry Definition',
      passed: !!featureDef,
      duration_ms: stepMs,
      details: featureDef ? `Key: ${featureDef.key}, State: ${featureDef.state}` : 'Feature not found in registry'
    });

    // Step 2: User Tier Fetch
    start = performance.now();
    const tier = await defaultRepository.getUserTier(userId);
    stepMs = Number((performance.now() - start).toFixed(3));
    trace.push({
      step: 'User Tier Fetch',
      passed: true,
      duration_ms: stepMs,
      details: `Plan: ${tier}`
    });

    // Step 3: DB Status Fetch
    start = performance.now();
    const dbStatus = await defaultRepository.getFeatureDatabaseStatus(featureKey);
    stepMs = Number((performance.now() - start).toFixed(3));
    trace.push({
      step: 'Database Status',
      passed: !!dbStatus,
      duration_ms: stepMs,
      details: dbStatus ? `Status: ${dbStatus.status}` : 'No DB status record'
    });

    // Step 4: Feature Limit Fetch
    start = performance.now();
    const limitData = await defaultRepository.getFeatureLimit(featureKey, tier);
    stepMs = Number((performance.now() - start).toFixed(3));
    trace.push({
      step: 'Feature Limit Record',
      passed: !!limitData && limitData.is_enabled,
      duration_ms: stepMs,
      details: limitData ? `Type: ${limitData.limit_type}, Enabled: ${limitData.is_enabled}, Limit: ${limitData.limit_value}` : 'No limit record for plan'
    });

    // Step 5: Current Usage Fetch
    start = performance.now();
    const usage = await defaultRepository.getCurrentUsage(userId, featureKey);
    stepMs = Number((performance.now() - start).toFixed(3));
    trace.push({
      step: 'Usage Counter',
      passed: true,
      duration_ms: stepMs,
      details: `Current Usage: ${usage}`
    });

    // Step 6: Policy Evaluation
    start = performance.now();
    const evalResult = EntitlementPolicy.evaluate(
      featureKey,
      featureDef,
      dbStatus,
      tier,
      limitData,
      usage
    );
    stepMs = Number((performance.now() - start).toFixed(3));
    trace.push({
      step: 'Policy Engine Evaluation',
      passed: evalResult.allowed,
      duration_ms: stepMs,
      details: `Allowed: ${evalResult.allowed}, Reason: ${evalResult.reason}`
    });

    const totalDuration = Number((performance.now() - totalStart).toFixed(3));

    return NextResponse.json({
      success: true,
      allowed: evalResult.allowed,
      reason: evalResult.reason,
      total_duration_ms: totalDuration,
      trace,
      result: evalResult
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

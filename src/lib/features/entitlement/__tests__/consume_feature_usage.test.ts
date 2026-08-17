import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

describe('consume_feature_usage RPC Integration', () => {
  const supabase = createAdminSupabaseClient();
  const testProfileId = '00000000-0000-0000-0000-000000000001'; // Mock or test profile UUID
  const testFeatureKey = 'test_feature_rpc';

  beforeAll(async () => {
    // Ensure test profile exists
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: testProfileId,
      email: 'rpc-test@odi.pet',
      first_name: 'RPC',
      last_name: 'Test',
      role: 'owner'
    }, { onConflict: 'id' });
    if (profileError) throw profileError;

    // Ensure feature definition
    const { error: featError } = await supabase.from('app_features').upsert({
      key: testFeatureKey,
      status: 'active',
      label: 'Test Feature',
      description: 'Integration test feature'
    }, { onConflict: 'key' });
    if (featError) throw featError;

    // Ensure limits (Free = Quota 1, AI+ = Quota 5) matching live RPC contract
    const { error: limitsError } = await supabase.from('feature_limits').upsert([
      {
        feature_key: testFeatureKey,
        plan_tier: 'free',
        limit_type: 'quota',
        limit_value: 1,
        window_value: 30,
        window_unit: 'day',
        window_days: 30,
        is_enabled: true
      },
      {
        feature_key: testFeatureKey,
        plan_tier: 'ai_plus',
        limit_type: 'quota',
        limit_value: 5,
        window_value: 30,
        window_unit: 'day',
        window_days: 30,
        is_enabled: true
      }
    ], { onConflict: 'feature_key,plan_tier' });
    if (limitsError) throw limitsError;
    
    // Clear usage
    await supabase.from('feature_usage').delete().eq('profile_id', testProfileId).eq('feature_key', testFeatureKey);
  });

  afterAll(async () => {
    // Cleanup
    await supabase.from('feature_usage').delete().eq('profile_id', testProfileId).eq('feature_key', testFeatureKey);
    await supabase.from('feature_limits').delete().eq('feature_key', testFeatureKey);
    await supabase.from('app_features').delete().eq('key', testFeatureKey);
    await supabase.from('user_subscriptions').delete().eq('profile_id', testProfileId);
    await supabase.from('profiles').delete().eq('id', testProfileId);
  });

  it('should enforce free tier limits', async () => {
    // 1. Ensure user is free
    await supabase.from('user_subscriptions').delete().eq('profile_id', testProfileId);

    // 2. Consume 1 (should succeed)
    const res1 = await supabase.rpc('consume_feature_usage', {
      p_profile_id: testProfileId,
      p_feature_key: testFeatureKey
    });
    expect(res1.error).toBeNull();
    expect(res1.data.allowed).toBe(true);

    // 3. Consume 2 (should fail for free)
    const res2 = await supabase.rpc('consume_feature_usage', {
      p_profile_id: testProfileId,
      p_feature_key: testFeatureKey
    });
    expect(res2.error).toBeNull();
    expect(res2.data.allowed).toBe(false);
    expect(res2.data.reason).toBe('QUOTA_EXCEEDED');
  });

  it('should read ai_plus tier and allow higher limits', async () => {
    // 1. Upgrade user to ai_plus
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const { error: subError } = await supabase.from('user_subscriptions').upsert({
      profile_id: testProfileId,
      plan: 'ai_plus',
      status: 'active',
      ai_plus_until: futureDate.toISOString()
    }, { onConflict: 'profile_id' });
    if (subError) throw subError;

    // 2. Consume 2 (should succeed now, since AI+ limit is 5 and current usage is 1)
    const res3 = await supabase.rpc('consume_feature_usage', {
      p_profile_id: testProfileId,
      p_feature_key: testFeatureKey
    });
    expect(res3.error).toBeNull();
    expect(res3.data.allowed).toBe(true);
    expect(res3.data.used).toBe(2);
  });
});

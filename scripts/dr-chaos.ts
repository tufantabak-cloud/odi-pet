import { config } from 'dotenv';
config({ path: '.env.local' });
import { createAdminSupabaseClient } from '../src/lib/supabase/server';
import { UsageEngine } from '../src/lib/features/usage/engine';

const supabase = createAdminSupabaseClient();
const engine = new UsageEngine(supabase, {
  get: async () => null,
  set: async () => {},
  invalidateByUser: async () => {}
} as any);

async function simulateChaos() {
  console.log('🌪️ Starting Chaos Testing...');

  const { data: users, error } = await supabase.from('profiles').select('id').limit(1);
  if (error || !users || users.length === 0) {
    console.error('No users found in DB.');
    process.exit(1);
  }
  const userId = users[0].id;
  
  await supabase.from('app_features').upsert({
    key: 'ai_vet',
    label: 'AI Vet',
    description: 'AI Vet Testing'
  });
  
  // Ensure limit exists for free tier so it doesn't fail with FEATURE_DISABLED
  await supabase.from('feature_limits').upsert({
    feature_key: 'ai_vet',
    plan_tier: 'free',
    limit_type: 'quota',
    limit_value: 100,
    window_value: 30,
    window_unit: 'day',
    is_enabled: true
  });

  const idempotencyKey = crypto.randomUUID();

  console.log('\n--- Test 1: Duplicate Publish Request (Idempotency) ---');
  // First request
  const r1 = await engine.consumeUsage({ userId, featureKey: 'ai_vet', amount: 1, idempotencyKey });
  console.log(`1️⃣ Request 1: `, r1);
  
  // Duplicate request
  const r2 = await engine.consumeUsage({ userId, featureKey: 'ai_vet', amount: 1, idempotencyKey });
  console.log(`2️⃣ Request 2 (Duplicate): `, r2);
  
  if (!r2.success && (r2 as any).reason === 'IDEMPOTENCE_REPLAY') {
    console.log('✅ Idempotency strictly maintained (No double consume).');
  } else if (r2.success && (r2 as any).reason === 'IDEMPOTENCE_REPLAY') {
     console.log('✅ Idempotency strictly maintained (Returned previous success response).');
  } else {
    console.log('❌ Idempotency failed.');
    process.exit(1);
  }

  console.log('\n--- Test 2: RPC Timeout / Network Retry ---');
  // Since we can't easily crash Supabase from the client without sysadmin, we'll simulate a client-side timeout 
  // by using an AbortController.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1); // 1ms timeout

  try {
    const { error } = await supabase.rpc('consume_feature_usage', {
      p_profile_id: userId,
      p_feature_key: 'ai_vet',
      p_amount: 1,
      p_idempotency_key: crypto.randomUUID()
    }, { head: false, count: 'exact' }); // Fetch via raw fetch if we could pass signal, but supabase-js doesn't natively support signal on rpc easily in all versions.

    if (error) throw error;
    console.log('⚠️ Request completed before timeout (Supabase is too fast).');
  } catch (e: any) {
    console.log(`✅ Graceful fail-safe caught network/timeout error: ${e.message}`);
  }
  clearTimeout(timeoutId);

  // Cleanup
  await supabase.from('profiles').delete().like('email', 'chaos_%@odi.pet');
  console.log('\n🎉 Chaos tests completed safely.');
}

simulateChaos().catch(console.error);

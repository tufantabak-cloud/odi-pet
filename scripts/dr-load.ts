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

const MATRIX = [
  { users: 10, requestsPerUser: 10, total: 100 },
  { users: 100, requestsPerUser: 10, total: 1000 },
  // { users: 250, requestsPerUser: 20, total: 5000 },
  // { users: 500, requestsPerUser: 20, total: 10000 } // Keep this commented for fast iteration, uncomment for full run
];

async function getTestUsers(count: number): Promise<string[]> {
  const { data, error } = await supabase.from('profiles').select('id').limit(count);
  if (error) throw error;
  
  if (!data || data.length === 0) {
    console.warn('No users found in DB. Load test requires at least 1 user in profiles.');
    return [];
  }
  
  // If we need more users than exist, we'll just repeat them to simulate concurrency
  const userIds = [];
  for (let i = 0; i < count; i++) {
    userIds.push(data[i % data.length].id);
  }
  
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
    limit_value: 1000000, // Big limit for load testing
    window_value: 30,
    window_unit: 'day',
    is_enabled: true
  });
  
  return userIds;
}

async function runMatrix(matrixDef: { users: number, requestsPerUser: number, total: number }) {
  console.log(`\n🚀 Starting Load Test Matrix: ${matrixDef.users} Users, ${matrixDef.requestsPerUser} Reqs/User, Total: ${matrixDef.total}`);
  
  const userIds = await getTestUsers(matrixDef.users);
  if (userIds.length === 0) return;

  const startTime = Date.now();
  let successCount = 0;
  let rejectCount = 0;
  let errorCount = 0;
  const latencies: number[] = [];

  const promises: Promise<void>[] = [];

  for (const userId of userIds) {
    for (let i = 0; i < matrixDef.requestsPerUser; i++) {
      // Simulate rapid requests with same idempotency key for every 2 requests to test idempotency
      const idempotencyKey = `req_${userId}_${Math.floor(i / 2)}`; 
      
      promises.push((async () => {
        const reqStart = Date.now();
        try {
          const result = await engine.consumeUsage({
            userId,
            featureKey: 'ai_vet',
            amount: 1,
            idempotencyKey
          });
          
          latencies.push(Date.now() - reqStart);
          
          if (result.success) successCount++;
          else rejectCount++;
        } catch (e) {
          latencies.push(Date.now() - reqStart);
          errorCount++;
        }
      })());
    }
  }

  await Promise.all(promises);

  const duration = Date.now() - startTime;
  latencies.sort((a, b) => a - b);
  
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];

  console.log(`⏱️ Duration: ${duration}ms`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`⛔ Reject: ${rejectCount}`);
  console.log(`❌ Error: ${errorCount}`);
  console.log(`📊 Avg: ${avg.toFixed(2)}ms, P95: ${p95}ms, P99: ${p99}ms`);
}

async function main() {
  for (const matrix of MATRIX) {
    await runMatrix(matrix);
  }
  
  // Cleanup test profiles
  await supabase.from('profiles').delete().like('email', 'loadtest_%@odi.pet');
  console.log('\n🧹 Cleanup complete.');
}

main().catch(console.error);

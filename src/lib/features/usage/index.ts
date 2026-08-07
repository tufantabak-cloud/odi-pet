import { UsageEngine } from './engine';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { MemoryCacheProvider } from '@/lib/features/cache/memory';

/**
 * Lazy-initialized, module-scoped UsageEngine singleton.
 * Uses the admin Supabase client (service-role) for RPC calls
 * and the memory-based CacheProvider for invalidation.
 */
let _instance: UsageEngine | null = null;

export function getUsageEngine(): UsageEngine {
  if (!_instance) {
    const supabase = createAdminSupabaseClient();
    const cache = new MemoryCacheProvider();
    _instance = new UsageEngine(supabase, cache);
  }
  return _instance;
}

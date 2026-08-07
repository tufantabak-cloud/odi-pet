import { Redis } from '@upstash/redis';
import { CacheProvider, CacheConfig } from './types';
import { MemoryCacheProvider } from './memory';
import { RedisCacheProvider } from './redis';
import { MultiTierCacheProvider } from './provider';
import { globalMetrics } from './cacheMetrics';
import { DEFAULT_MAX_MEMORY_ITEMS } from './config';

export function createCacheProvider(config: CacheConfig): CacheProvider {
  if (config.strategy === 'none') {
    // Return a dummy implementation
    return {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
      has: async () => false,
      touch: async () => {},
      getOrSet: async (key, fetcher) => fetcher(),
      invalidateByFeature: async () => {},
      invalidateByUser: async () => {},
      clear: async () => {},
    };
  }

  const l1 = new MemoryCacheProvider(config.maxMemoryItems || DEFAULT_MAX_MEMORY_ITEMS, globalMetrics);

  if (config.strategy === 'memory_only') {
    // Wrap Memory directly in MultiTier to provide centralized deduplication, 
    // even though Memory also has deduplication, MultiTier is the public orchestrator.
    // Or we can just return l1 directly since l1 implements getOrSet itself.
    // However, it's better to keep MultiTier structure consistent for metrics.
    return new MultiTierCacheProvider(l1, null, globalMetrics);
  }

  if (config.strategy === 'multi_tier') {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      console.warn('[CacheFactory] Redis credentials missing. Falling back to memory_only.');
      return new MultiTierCacheProvider(l1, null, globalMetrics);
    }

    const redisClient = new Redis({
      url,
      token,
    });

    const l2 = new RedisCacheProvider(redisClient);
    return new MultiTierCacheProvider(l1, l2, globalMetrics);
  }

  throw new Error(`Unsupported cache strategy: ${config.strategy}`);
}

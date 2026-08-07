import { CacheProvider } from './types';
import { CacheMetricsProvider, globalMetrics } from './cacheMetrics';
import { STAMPEDE_TIMEOUT_MS } from './config';

export class MultiTierCacheProvider implements CacheProvider {
  private l1: CacheProvider;
  private l2: CacheProvider | null;
  private metrics: CacheMetricsProvider;
  
  private inflight = new Map<string, { promise: Promise<any>, timeoutId: ReturnType<typeof setTimeout> }>();

  constructor(l1: CacheProvider, l2: CacheProvider | null = null, metricsProvider: CacheMetricsProvider = globalMetrics) {
    this.l1 = l1;
    this.l2 = l2;
    this.metrics = metricsProvider;
  }

  async get<T>(key: string): Promise<T | null> {
    const l1Result = await this.l1.get<T>(key);
    if (l1Result !== null) {
      this.metrics.recordHit('memory');
      return l1Result;
    }

    if (this.l2) {
      const l2Result = await this.l2.get<T>(key);
      if (l2Result !== null) {
        this.metrics.recordHit('distributed');
        // Backfill L1 without explicit TTL (rely on L2 or touch later)
        // Note: For exact TTL tracking, get() normally doesn't expose TTL. 
        // L1 eviction will handle it eventually, but we can set a short memory fallback or let it live.
        // It's safer to avoid backfilling without knowing the remaining TTL, but for simplicity:
        await this.l1.set(key, l2Result);
        return l2Result;
      }
    }

    this.metrics.recordMiss();
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.l1.set(key, value, ttlSeconds);
    if (this.l2) {
      await this.l2.set(key, value, ttlSeconds);
    }
  }

  async delete(key: string): Promise<void> {
    await this.l1.delete(key);
    if (this.l2) {
      await this.l2.delete(key);
    }
  }

  async has(key: string): Promise<boolean> {
    if (await this.l1.has(key)) return true;
    if (this.l2 && await this.l2.has(key)) return true;
    return false;
  }

  async touch(key: string, ttlSeconds: number): Promise<void> {
    await this.l1.touch(key, ttlSeconds);
    if (this.l2) {
      await this.l2.touch(key, ttlSeconds);
    }
  }

  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    // 1. Try L1 directly to avoid promise overhead if hot
    const l1Result = await this.l1.get<T>(key);
    if (l1Result !== null) {
      this.metrics.recordHit('memory');
      return l1Result;
    }

    // Deduplication across simultaneous misses
    if (this.inflight.has(key)) {
      return this.inflight.get(key)!.promise;
    }

    const promise = (async () => {
      try {
        // 2. Try L2 if configured
        if (this.l2) {
          const l2Result = await this.l2.get<T>(key);
          if (l2Result !== null) {
            this.metrics.recordHit('distributed');
            // Backfill L1
            await this.l1.set(key, l2Result, ttlSeconds);
            return l2Result;
          }
        }

        // 3. Absolute Miss -> Fetch
        this.metrics.recordMiss();
        const result = await fetcher();
        
        // 4. Populate both
        await this.l1.set(key, result, ttlSeconds);
        if (this.l2) {
          await this.l2.set(key, result, ttlSeconds);
        }
        
        return result;
      } finally {
        const inflightData = this.inflight.get(key);
        if (inflightData) {
          clearTimeout(inflightData.timeoutId);
        }
        this.inflight.delete(key);
      }
    })();

    const timeoutId = setTimeout(() => {
      this.inflight.delete(key);
    }, STAMPEDE_TIMEOUT_MS);

    this.inflight.set(key, { promise, timeoutId });

    return promise;
  }

  async invalidateByFeature(featureKey: string): Promise<void> {
    await this.l1.invalidateByFeature(featureKey);
    if (this.l2) {
      await this.l2.invalidateByFeature(featureKey);
    }
  }

  async invalidateByUser(userId: string): Promise<void> {
    await this.l1.invalidateByUser(userId);
    if (this.l2) {
      await this.l2.invalidateByUser(userId);
    }
  }

  async clear(): Promise<void> {
    await this.l1.clear();
    if (this.l2) {
      await this.l2.clear();
    }
    
    for (const { timeoutId } of this.inflight.values()) {
      clearTimeout(timeoutId);
    }
    this.inflight.clear();
  }
}

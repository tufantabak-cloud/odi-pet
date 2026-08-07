import { CacheProvider } from './types';
import { CacheMetricsProvider, globalMetrics } from './cacheMetrics';
import { CacheKeys } from './cacheKeys';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

export class MemoryCacheProvider implements CacheProvider {
  private cache = new Map<string, CacheEntry<any>>();
  private maxItems: number;
  private metrics: CacheMetricsProvider;
  
  // Tag Indexing: Tag Key -> Set of Cache Keys
  private tags = new Map<string, Set<string>>();
  
  // Deduplication: Key -> Promise
  private inflight = new Map<string, { promise: Promise<any>, timeoutId: ReturnType<typeof setTimeout> }>();

  constructor(maxItems: number = 1000, metricsProvider: CacheMetricsProvider = globalMetrics) {
    this.maxItems = maxItems;
    this.metrics = metricsProvider;
  }

  private extractTags(key: string): string[] {
    const tags: string[] = [];
    const parts = key.split(':');
    
    // Example: fr:v1:feature:pdf_export -> parts = ['fr', 'v1', 'feature', 'pdf_export']
    if (parts.length >= 4 && parts[2] === 'feature' && parts[3]) {
      tags.push(CacheKeys.getFeatureTagKey(parts[3]));
    }
    // Example: fr:v1:entitlement:123:pdf_export -> parts = ['fr', 'v1', 'entitlement', '123', 'pdf_export']
    else if (parts.length >= 5 && (parts[2] === 'entitlement' || parts[2] === 'usage')) {
      tags.push(CacheKeys.getUserTagKey(parts[3]));
      tags.push(CacheKeys.getFeatureTagKey(parts[4]));
    }
    
    return tags;
  }

  private addTags(key: string) {
    const tags = this.extractTags(key);
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    }
  }

  private removeTags(key: string) {
    const tags = this.extractTags(key);
    for (const tag of tags) {
      const set = this.tags.get(tag);
      if (set) {
        set.delete(key);
        if (set.size === 0) {
          this.tags.delete(tag);
        }
      }
    }
  }

  private evictLRU() {
    if (this.cache.size >= this.maxItems) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
        this.removeTags(firstKey);
        this.metrics.recordEviction();
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.removeTags(key);
      return null;
    }

    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.evictLRU();
    
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiresAt });
    this.addTags(key);
  }

  async delete(key: string): Promise<void> {
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.removeTags(key);
    }
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== null;
  }

  async touch(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.cache.get(key);
    if (entry && (entry.expiresAt === null || Date.now() <= entry.expiresAt)) {
      entry.expiresAt = Date.now() + ttlSeconds * 1000;
      this.cache.delete(key);
      this.cache.set(key, entry); // refresh LRU
    }
  }

  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Deduplication (Stampede Protection)
    if (this.inflight.has(key)) {
      return this.inflight.get(key)!.promise;
    }

    const promise = (async () => {
      try {
        const result = await fetcher();
        await this.set(key, result, ttlSeconds);
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
    }, 30000); // 30 sec cleanup timeout

    this.inflight.set(key, { promise, timeoutId });

    return promise;
  }

  async invalidateByFeature(featureKey: string): Promise<void> {
    const tag = CacheKeys.getFeatureTagKey(featureKey);
    const keys = this.tags.get(tag);
    if (keys) {
      for (const key of Array.from(keys)) {
        await this.delete(key);
      }
    }
    this.metrics.recordInvalidation();
  }

  async invalidateByUser(userId: string): Promise<void> {
    const tag = CacheKeys.getUserTagKey(userId);
    const keys = this.tags.get(tag);
    if (keys) {
      for (const key of Array.from(keys)) {
        await this.delete(key);
      }
    }
    this.metrics.recordInvalidation();
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.tags.clear();
    for (const { timeoutId } of this.inflight.values()) {
      clearTimeout(timeoutId);
    }
    this.inflight.clear();
  }
}

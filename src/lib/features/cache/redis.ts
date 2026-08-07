import { Redis } from '@upstash/redis';
import { CacheProvider } from './types';
import { CacheKeys } from './cacheKeys';
import { STAMPEDE_TIMEOUT_MS } from './config';

export class RedisCacheProvider implements CacheProvider {
  private redis: Redis;
  private inflight = new Map<string, { promise: Promise<any>, timeoutId: ReturnType<typeof setTimeout> }>();

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  private extractTags(key: string): string[] {
    const tags: string[] = [];
    const parts = key.split(':');
    
    // Example: fr:v1:feature:pdf_export -> parts = ['fr', 'v1', 'feature', 'pdf_export']
    if (parts.length >= 4 && parts[2] === 'feature' && parts[3]) {
      tags.push(CacheKeys.getFeatureTagKey(parts[3]));
    }
    // Example: fr:v1:entitlement:123:pdf_export
    else if (parts.length >= 5 && (parts[2] === 'entitlement' || parts[2] === 'usage')) {
      tags.push(CacheKeys.getUserTagKey(parts[3]));
      tags.push(CacheKeys.getFeatureTagKey(parts[4]));
    }
    
    return tags;
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get<T>(key);
    return data ?? null;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const p = this.redis.pipeline();
    
    if (ttlSeconds) {
      p.set(key, value, { ex: ttlSeconds });
    } else {
      p.set(key, value);
    }

    const tags = this.extractTags(key);
    for (const tag of tags) {
      p.sadd(tag, key);
      // Optional: Give the tag the same TTL to avoid infinite growth, 
      // though typically tag sets are small and managed by delete.
      if (ttlSeconds) {
        // Just as a safety net, set tag expiration longer than the item itself
        p.expire(tag, ttlSeconds + 60); 
      }
    }

    await p.exec();
  }

  async delete(key: string): Promise<void> {
    const p = this.redis.pipeline();
    p.del(key);
    
    const tags = this.extractTags(key);
    for (const tag of tags) {
      p.srem(tag, key);
    }
    
    await p.exec();
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  async touch(key: string, ttlSeconds: number): Promise<void> {
    await this.redis.expire(key, ttlSeconds);
    
    const tags = this.extractTags(key);
    if (tags.length > 0) {
      const p = this.redis.pipeline();
      for (const tag of tags) {
        p.expire(tag, ttlSeconds + 60);
      }
      await p.exec();
    }
  }

  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

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
    }, STAMPEDE_TIMEOUT_MS);

    this.inflight.set(key, { promise, timeoutId });

    return promise;
  }

  async invalidateByFeature(featureKey: string): Promise<void> {
    const tag = CacheKeys.getFeatureTagKey(featureKey);
    await this.invalidateByTag(tag);
  }

  async invalidateByUser(userId: string): Promise<void> {
    const tag = CacheKeys.getUserTagKey(userId);
    await this.invalidateByTag(tag);
  }

  private async invalidateByTag(tag: string): Promise<void> {
    const members = await this.redis.smembers(tag);
    if (members.length > 0) {
      const p = this.redis.pipeline();
      p.del(...members);
      p.del(tag);
      await p.exec();
    }
  }

  async clear(): Promise<void> {
    // Upstash provides FLUSHDB but it might be restricted.
    // As a standard, clear() is rarely used in production on the whole DB.
    await this.redis.flushdb();
    
    for (const { timeoutId } of this.inflight.values()) {
      clearTimeout(timeoutId);
    }
    this.inflight.clear();
  }
}

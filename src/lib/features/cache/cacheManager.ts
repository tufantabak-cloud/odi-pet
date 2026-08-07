import { CacheProvider } from './CacheProvider';
import { MemoryCacheProvider } from './MemoryCacheProvider';
import { RedisCacheProvider } from './RedisCacheProvider';
import { NoCacheProvider } from './NoCacheProvider';

export enum CacheTag {
  REGISTRY = 'cache.registry',
  PLANS = 'cache.plans',
  ENTITLEMENTS = 'cache.entitlements',
  USAGE = 'cache.usage'
}

let activeProvider: CacheProvider = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL
  ? new RedisCacheProvider()
  : new MemoryCacheProvider();

export class CacheManager {
  static getProvider(): CacheProvider {
    return activeProvider;
  }

  static setProvider(provider: CacheProvider): void {
    activeProvider = provider;
  }

  static async invalidate(tag: CacheTag): Promise<void> {
    await activeProvider.invalidateTag(tag);
  }

  static async invalidateEntitlements(): Promise<void> {
    await this.invalidate(CacheTag.ENTITLEMENTS);
  }

  static async invalidateUsage(): Promise<void> {
    await this.invalidate(CacheTag.USAGE);
  }

  static async invalidatePlans(): Promise<void> {
    await this.invalidate(CacheTag.PLANS);
  }

  static async invalidateRegistry(): Promise<void> {
    await this.invalidate(CacheTag.REGISTRY);
  }

  static async invalidateAll(): Promise<void> {
    for (const tag of Object.values(CacheTag)) {
      await this.invalidate(tag);
    }
  }
}

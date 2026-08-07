export interface CacheProvider {
  /** Gets a value from the cache */
  get<T>(key: string): Promise<T | null>;
  
  /** Sets a value in the cache with an optional TTL in seconds */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  
  /** Deletes a specific key from the cache */
  delete(key: string): Promise<void>;
  
  /** Checks if a key exists in the cache */
  has(key: string): Promise<boolean>;
  
  /** Updates the TTL of an existing key */
  touch(key: string, ttlSeconds: number): Promise<void>;
  
  /** 
   * Atomically gets a value, or fetches it and caches it if missing.
   * Internally handles Cache Stampede protection (Promise Deduplication).
   */
  getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds?: number): Promise<T>;
  
  /** Invalidates all cache entries related to a specific feature */
  invalidateByFeature(featureKey: string): Promise<void>;
  
  /** Invalidates all cache entries related to a specific user */
  invalidateByUser(userId: string): Promise<void>;
  
  /** Clears the entire cache (L1 and L2 if applicable) */
  clear(): Promise<void>;
}

export type CacheStrategy = 'memory_only' | 'multi_tier' | 'none';

export interface CacheConfig {
  strategy: CacheStrategy;
  maxMemoryItems?: number;
}

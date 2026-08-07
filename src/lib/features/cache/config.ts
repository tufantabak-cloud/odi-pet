export const CACHE_TTL = {
  registry: 600, // 10 minutes
  entitlement: 120, // 2 minutes
  usage: 30, // 30 seconds
  feature: 600, // 10 minutes
};

// Maximum memory cache items before LRU eviction kicks in
export const DEFAULT_MAX_MEMORY_ITEMS = 1000;

// Maximum time to wait for a duplicated promise before forcefully rejecting
export const STAMPEDE_TIMEOUT_MS = 30000; // 30 seconds

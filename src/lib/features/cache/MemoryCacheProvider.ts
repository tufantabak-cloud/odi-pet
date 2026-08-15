import { CacheProvider } from './CacheProvider';
import { revalidateTag } from 'next/cache';

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

export class MemoryCacheProvider implements CacheProvider {
  name = 'MemoryCacheProvider';
  private store = new Map<string, CacheEntry<any>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async invalidateTag(tag: string): Promise<void> {
    try {
      (revalidateTag as any)(tag);
    } catch (e) {
      // RevalidateTag might throw when outside request context
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

import { CacheProvider } from './CacheProvider';

export class NoCacheProvider implements CacheProvider {
  name = 'NoCacheProvider';

  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {
    // No-op
  }

  async invalidateTag(_tag: string): Promise<void> {
    // No-op
  }

  async clear(): Promise<void> {
    // No-op
  }
}

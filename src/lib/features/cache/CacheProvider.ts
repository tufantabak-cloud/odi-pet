export interface CacheProvider {
  name: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  invalidateTag(tag: string): Promise<void>;
  clear(): Promise<void>;
}

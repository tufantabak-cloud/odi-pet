import { Redis } from '@upstash/redis';

// Simple in-memory mock for Redis if env vars are missing
class MockRedis {
  private store = new Map<string, { value: any; expiresAt?: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set(key: string, value: any, opts?: { ex?: number; px?: number; nx?: boolean }): Promise<'OK' | null> {
    const item = this.store.get(key);
    if (opts?.nx && item) {
      if (!item.expiresAt || Date.now() <= item.expiresAt) {
        return null; // nx constraint failed
      }
    }

    let expiresAt: number | undefined;
    if (opts?.px) {
      expiresAt = Date.now() + opts.px;
    } else if (opts?.ex) {
      expiresAt = Date.now() + opts.ex * 1000;
    }

    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.has(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    let val = await this.get<number>(key) || 0;
    val++;
    await this.set(key, val);
    return val;
  }
}

export const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : new MockRedis() as unknown as Redis;

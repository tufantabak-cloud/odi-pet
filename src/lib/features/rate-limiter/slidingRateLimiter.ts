interface RateLimitEntry {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private storage = new Map<string, RateLimitEntry>();

  constructor(maxRequests: number = 10, windowSeconds: number = 60) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  check(key: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let entry = this.storage.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      this.storage.set(key, entry);
    }

    // Filter out expired timestamps
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

    if (entry.timestamps.length >= this.maxRequests) {
      const oldest = entry.timestamps[0];
      const resetMs = oldest + this.windowMs - now;
      return { allowed: false, remaining: 0, resetMs };
    }

    entry.timestamps.push(now);
    return {
      allowed: true,
      remaining: this.maxRequests - entry.timestamps.length,
      resetMs: this.windowMs
    };
  }

  clear(): void {
    this.storage.clear();
  }
}

export const defaultRateLimiter = new SlidingWindowRateLimiter(20, 60); // 20 req/min default

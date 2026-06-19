import { redis } from './redis';

/**
 * Rate Limiting (Module 1)
 * IP: 10 requests / minute
 * Account: 5 requests / day
 */

export async function checkIpRateLimit(ip: string): Promise<boolean> {
  const key = `ratelimit:ip:${ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    // Set expiry to 60 seconds (1 minute) for the first request
    await redis.set(key, 1, { ex: 60 });
  }
  return count <= 10;
}

export async function checkAccountRateLimit(accountId: string): Promise<boolean> {
  const key = `ratelimit:account:${accountId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    // Set expiry to 86400 seconds (1 day) for the first request
    await redis.set(key, 1, { ex: 86400 });
  }
  return count <= 5;
}

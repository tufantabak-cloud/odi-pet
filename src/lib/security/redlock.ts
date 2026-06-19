import { redis } from './redis';
import crypto from 'crypto';

/**
 * Redlock Algorithm Implementation (Module 3)
 * Used to prevent race conditions during lost pet report creation.
 * TTL is 500ms.
 */
export async function acquireLock(resource: string): Promise<string | null> {
  const lockKey = `lock:${resource}`;
  const lockValue = crypto.randomBytes(16).toString('hex');
  const ttl = 500; // 500ms

  const result = await redis.set(lockKey, lockValue, { px: ttl, nx: true });

  if (result === 'OK') {
    return lockValue;
  }
  return null;
}

export async function releaseLock(resource: string, lockValue: string): Promise<boolean> {
  const lockKey = `lock:${resource}`;
  const currentValue = await redis.get<string>(lockKey);
  
  if (currentValue === lockValue) {
    await redis.del(lockKey);
    return true;
  }
  return false;
}

import crypto from 'crypto';
import { redis } from './redis';

/**
 * Token Management (Module 4)
 * CSPRNG 256-bit Token, 48h TTL, Revoke list.
 */

const TTL_48H_SECONDS = 48 * 60 * 60;

export function generateSecureToken(): string {
  // 256-bit (32 bytes) token
  return crypto.randomBytes(32).toString('hex');
}

export async function storeToken(userId: string, token: string): Promise<void> {
  const tokenKey = `token:${token}`;
  await redis.set(tokenKey, userId, { ex: TTL_48H_SECONDS });
}

export async function verifyToken(token: string): Promise<string | null> {
  const isRevoked = await redis.get(`revoked:${token}`);
  if (isRevoked) {
    return null;
  }
  return await redis.get<string>(`token:${token}`);
}

export async function revokeToken(token: string): Promise<void> {
  // Store the revoked token for its remaining lifetime (or a fixed 48h)
  await redis.set(`revoked:${token}`, 'true', { ex: TTL_48H_SECONDS });
  await redis.del(`token:${token}`);
}

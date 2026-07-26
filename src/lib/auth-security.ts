import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Only instantiate Redis if the env variables are present to avoid crashing at build time if missing
let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  }
} catch (error) {
  console.warn("Failed to initialize Upstash Redis", error);
}

// Fallback to a dummy ratelimiter if Redis is not configured (prevents crashing if user forgets env vars)
// In-memory fallback for when Redis is unavailable (basic protection, not distributed)
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of inMemoryStore) {
    if (now >= v.resetAt) inMemoryStore.delete(k);
  }
}, 60_000).unref();

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const createInMemoryLimiter = (tokens: number, windowMs: number) => ({
  async limit(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = inMemoryStore.get(key);
    if (!entry || now >= entry.resetAt) {
      inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true, limit: tokens, remaining: tokens - 1, reset: now + windowMs };
    }
    entry.count += 1;
    const success = entry.count <= tokens;
    return { success, limit: tokens, remaining: Math.max(0, tokens - entry.count), reset: entry.resetAt };
  },
});

const createRateLimit = (tokens: number, windowStr: string, prefix: string) => {
  const isTest = process.env.PLAYWRIGHT_TEST === 'true' || process.env.NODE_ENV === 'test';
  const finalTokens = isTest ? 1000 : tokens;
  const windowMs = 60_000; // 1 minute default
  if (!redis) {
    console.warn(`Redis unavailable — using in-memory rate limiter for ${prefix}`);
    return createInMemoryLimiter(finalTokens, windowMs);
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(finalTokens, windowStr as any),
    analytics: true,
    prefix,
  });
};

export const loginRateLimit = createRateLimit(5, "1 m", "@upstash/ratelimit/login");
export const registerRateLimit = createRateLimit(3, "1 m", "@upstash/ratelimit/register");
export const logbookRateLimit = createRateLimit(20, "1 m", "@upstash/ratelimit/logbook");
export const resetRateLimit = createRateLimit(2, "1 m", "@upstash/ratelimit/reset");
export const updatePasswordRateLimit = createRateLimit(3, "1 m", "@upstash/ratelimit/update-password");

export const aiVetRateLimit      = createRateLimit(20, "1 m", "@upstash/ratelimit/ai-vet");
export const aiScoreRateLimit    = createRateLimit(30, "1 m", "@upstash/ratelimit/ai-score");
export const scanDocRateLimit    = createRateLimit(10, "1 m", "@upstash/ratelimit/scan-doc");
export const aiSummaryRateLimit  = createRateLimit(10, "1 m", "@upstash/ratelimit/ai-summary");


export async function verifyTurnstile(token: string | null | undefined, ip: string): Promise<boolean> {
  // Allow bypass in test environment
  if (process.env.PLAYWRIGHT_TEST === 'true' || process.env.NODE_ENV === 'test') {
    return true;
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error("TURNSTILE_SECRET_KEY is not set in production.");
      return false;
    }

    console.warn("TURNSTILE_SECRET_KEY is not set. Bypassing check outside production.");
    return true;
  }

  if (!token) {
    return false;
  }

  const formData = new FormData();
  formData.append('secret', secretKey);
  formData.append('response', token);
  formData.append('remoteip', ip);

  try {
    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      body: formData,
      method: 'POST',
    });

    const outcome = await result.json();
    return outcome.success;
  } catch (error) {
    console.error("Turnstile verification error:", error);
    return false;
  }
}

export function getIP(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  return "127.0.0.1";
}

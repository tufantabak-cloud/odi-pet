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
const createRateLimit = (tokens: number, windowStr: string, prefix: string) => {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, windowStr as any),
    analytics: true,
    prefix,
  });
};

export const loginRateLimit = createRateLimit(5, "1 m", "@upstash/ratelimit/login");
export const registerRateLimit = createRateLimit(3, "1 m", "@upstash/ratelimit/register");
export const resetRateLimit = createRateLimit(2, "1 m", "@upstash/ratelimit/reset");

export async function verifyTurnstile(token: string | null | undefined, ip: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.warn("TURNSTILE_SECRET_KEY is not set. Bypassing check.");
    return true; // Bypass if not configured, useful for local dev without keys
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

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';
import { createPlanSchema } from '@/lib/plans/schema';
import { createPlan, getPlans } from '@/lib/plans/service';
import { ZodError } from 'zod';
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Upstash Redis based rate limiter
let ratelimit: Ratelimit | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = Redis.fromEnv();
    ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(60, "1 h"),
      analytics: true,
    });
  }
} catch (e) {
  console.warn('Redis rate limiting not initialized', e);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pet_id = searchParams.get('pet_id');
    const category = searchParams.get('category');

    const plans = await getPlans(user.id, pet_id, category);
    return NextResponse.json({ plans });
  } catch (error: unknown) {
    console.error('[API/Plans GET] Error:', error);
    return NextResponse.json({ error: 'Planlar getirilirken bir hata oluştu.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    let limitHeaders = {};
    if (ratelimit) {
      const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_plans_${user.id}`);
      limitHeaders = {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      };

      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429, headers: limitHeaders }
        );
      }
    }

    const body = await req.json();
    const validatedData = createPlanSchema.parse(body);

    const plan = await createPlan(user.id, validatedData);
    
    return NextResponse.json({ plan }, { status: 201, headers: limitHeaders });
  } catch (error: unknown) {
    console.error('[API/Plans POST] Error:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json({ error: 'Eksik veya hatalı veri gönderildi.', details: error.format() }, { status: 400 });
    }
    
    // Database unique constraint violation error or error code 23505
    if (error && typeof error === 'object' && ('code' in error && (error as any).code === '23505')) {
      return NextResponse.json({ error: 'DUPLICATE_ACTIVE_VACCINE_PLAN' }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : 'Plan oluşturulurken bir hata oluştu.';
    
    if (message.startsWith('DUPLICATE_ACTIVE_VACCINE_PLAN:')) {
      const existingId = message.split(':')[1];
      return NextResponse.json({ error: 'DUPLICATE_ACTIVE_VACCINE_PLAN', plan_id: existingId }, { status: 409 });
    }

    const knownErrors = [
      'VACCINE_PREFERENCE_DISABLED',
      'PARASITE_PREFERENCE_DISABLED',
      'PROTOCOL_NOT_FOUND',
      'INACTIVE_PROTOCOL',
      'PROTOCOL_SPECIES_MISMATCH',
      'PROTOCOL_TYPE_MISMATCH',
      'FORBIDDEN'
    ];
    if (knownErrors.includes(message)) {
      const status = message === 'FORBIDDEN' ? 403 : 400;
      return NextResponse.json({ error: message }, { status });
    }
    
    const status = message.includes('yetkiniz yok') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

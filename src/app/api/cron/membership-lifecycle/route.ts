import { NextResponse } from 'next/server';
import { authorizeCronRequest } from '@/lib/security/cron-auth';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Membership Lifecycle Downgrade Cron
 * Kurallar (AGENTS.md):
 *   AI+ (60 gün) → PRO (60 gün) → FREE
 *   Referral ile gün kazanılır; kazanılmaz ise bir sonraki kademede düşer.
 *
 * Çağrı: GET /api/cron/membership-lifecycle
 * Vercel cron: "0 2 * * *" (gece 02:00 UTC)
 */
export async function GET(req: Request) {
  const authError = authorizeCronRequest(req);
  if (authError) return authError;

  const supabase = createAdminSupabaseClient();
  const now = new Date();
  const nowISO = now.toISOString();

  let aiToPro = 0;
  let proToFree = 0;
  const errors: string[] = [];

  try {
    // ── AŞAMA 1: AI+ süresi biten → PRO'ya düşür ──────────────────────────
    // Koşul: plan = ai_plus VE ai_plus_until < NOW VE pro_until > NOW (hâlâ PRO var)
    const { data: aiExpired, error: aiError } = await supabase
      .from('user_subscriptions')
      .select('id, profile_id, ai_plus_until, pro_until')
      .eq('plan', 'ai_plus')
      .in('status', ['active', 'trialing'])
      .lt('ai_plus_until', nowISO)
      .gt('pro_until', nowISO);

    if (aiError) {
      errors.push(`AI+ query error: ${aiError.message}`);
    } else if (aiExpired && aiExpired.length > 0) {
      for (const sub of aiExpired) {
        const { error: updateErr } = await supabase
          .from('user_subscriptions')
          .update({
            plan: 'pro',
            reason: 'LIFECYCLE_DOWNGRADE_AI_TO_PRO'
          })
          .eq('id', sub.id);

        if (!updateErr) {
          // profiles tablosunu da güncelle
          await supabase
            .from('profiles')
            .update({ tier: 'pro' } as any)
            .eq('id', sub.profile_id);

          // Olay kaydet
          await supabase.from('membership_events').insert({
            profile_id: sub.profile_id,
            event_type: 'DOWNGRADED',
            previous_plan: 'ai_plus',
            new_plan: 'pro',
            provider: 'system',
            metadata: {
              reason: 'AI+ period ended, lifecycle downgrade to PRO',
              ai_plus_until: sub.ai_plus_until,
              pro_until: sub.pro_until
            }
          });

          aiToPro++;
        } else {
          errors.push(`Failed to downgrade ${sub.profile_id}: ${updateErr.message}`);
        }
      }
    }

    // ── AŞAMA 2: PRO süresi de biten → FREE'ye düşür ──────────────────────
    // Koşul: plan IN (ai_plus, pro) VE pro_until < NOW
    const { data: proExpired, error: proError } = await supabase
      .from('user_subscriptions')
      .select('id, profile_id, plan, pro_until')
      .in('plan', ['pro', 'ai_plus'])
      .in('status', ['active', 'trialing'])
      .lt('pro_until', nowISO);

    if (proError) {
      errors.push(`PRO query error: ${proError.message}`);
    } else if (proExpired && proExpired.length > 0) {
      for (const sub of proExpired) {
        const { error: updateErr } = await supabase
          .from('user_subscriptions')
          .update({
            plan: 'free',
            status: 'expired',
            reason: 'LIFECYCLE_DOWNGRADE_PRO_TO_FREE'
          })
          .eq('id', sub.id);

        if (!updateErr) {
          await supabase
            .from('profiles')
            .update({ tier: 'free' } as any)
            .eq('id', sub.profile_id);

          await supabase.from('membership_events').insert({
            profile_id: sub.profile_id,
            event_type: 'EXPIRED',
            previous_plan: sub.plan,
            new_plan: 'free',
            provider: 'system',
            metadata: {
              reason: 'PRO period ended, lifecycle downgrade to FREE',
              pro_until: sub.pro_until
            }
          });

          proToFree++;
        } else {
          errors.push(`Failed to expire ${sub.profile_id}: ${updateErr.message}`);
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Unhandled error: ${msg}`);
  }

  const result = {
    status: errors.length === 0 ? 'ok' : 'partial',
    processed_at: nowISO,
    total_downgraded: aiToPro + proToFree,
    ai_to_pro: aiToPro,
    pro_to_free: proToFree,
    errors: errors.length > 0 ? errors : undefined
  };


  return NextResponse.json(result, { status: errors.length > 0 && aiToPro + proToFree === 0 ? 500 : 200 });
}

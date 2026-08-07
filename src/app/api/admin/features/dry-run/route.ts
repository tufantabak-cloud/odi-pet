import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'founder')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { limits } = await req.json();

    if (!Array.isArray(limits)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const adminSupabase = createAdminSupabaseClient();

    // 1. Get active user counts per plan
    // Using a raw query via RPC or we can just fetch all and reduce if not too many, 
    // but a cleaner way via JS since we can't easily run custom aggregate via JS client without RPC.
    // We'll fetch profiles with premium_tier = pro or ai_plus.
    const { data: activeProfiles, error: profilesError } = await adminSupabase
      .from('user_subscriptions')
      .select('plan')
      .in('status', ['active', 'trialing'])
      .in('plan', ['pro', 'ai_plus']);

    if (profilesError) {
      throw new Error(`Failed to fetch active profiles: ${profilesError.message}`);
    }

    // Map counts per tier
    const userCountByPlan: Record<string, number> = { free: 0 };
    (activeProfiles || []).forEach(p => {
      const tier = p.plan || 'pro';
      userCountByPlan[tier] = (userCountByPlan[tier] || 0) + 1;
    });
    // Add total free users (total - active premium), approximating for free users
    const { count: totalUsers } = await adminSupabase.from('profiles').select('*', { count: 'exact', head: true });
    const totalPremium = (activeProfiles || []).length;
    userCountByPlan['free'] = Math.max(0, (totalUsers || 0) - totalPremium);

    // 2. Get current live limits to compare
    const { data: currentLimits, error: limitsError } = await adminSupabase
      .from('feature_limits')
      .select('*');

    if (limitsError) {
      throw new Error(`Failed to fetch live limits: ${limitsError.message}`);
    }

    // 3. Compare drafts (limits payload) vs live limits
    let totalAccessLost = 0;
    let totalGotUnlimited = 0;
    let totalQuotaIncreased = 0;

    const impacts = limits.map(draft => {
      const live = (currentLimits || []).find(l => l.feature_key === draft.feature_key && l.plan === draft.plan);
      const planUserCount = userCountByPlan[draft.plan] || 0;
      
      let affectedUsers = 0;
      let reason = 'no_change';
      let severity = 'low';

      if (!live) {
        // New limit definition
        if (draft.is_enabled) {
          reason = 'new_feature_enabled';
          if (draft.limit_type === 'unlimited') {
            totalGotUnlimited += planUserCount;
          }
        }
      } else {
        // Compare live vs draft
        if (live.is_enabled && !draft.is_enabled) {
          reason = 'access_lost';
          affectedUsers = planUserCount;
          totalAccessLost += planUserCount;
          severity = 'high';
        } else if (!live.is_enabled && draft.is_enabled) {
          reason = 'access_gained';
        } else if (live.is_enabled && draft.is_enabled) {
          if (live.limit_type !== 'unlimited' && draft.limit_type === 'unlimited') {
            reason = 'got_unlimited';
            totalGotUnlimited += planUserCount;
          } else if (live.limit_type === 'unlimited' && draft.limit_type !== 'unlimited') {
            reason = 'lost_unlimited';
            affectedUsers = planUserCount;
            totalAccessLost += planUserCount;
            severity = 'high';
          } else if (live.limit_type === 'quota' && draft.limit_type === 'quota') {
            if (draft.limit_value < live.limit_value) {
              reason = 'quota_decreased';
              affectedUsers = planUserCount;
              totalAccessLost += planUserCount; // generalized as negative impact
              severity = 'medium';
            } else if (draft.limit_value > live.limit_value) {
              reason = 'quota_increased';
              totalQuotaIncreased += planUserCount;
            }
          }
        }
      }

      return {
        feature_key: draft.feature_key,
        plan: draft.plan,
        affected_users_count: affectedUsers,
        reason,
        severity
      };
    }).filter(i => i.reason !== 'no_change');

    return NextResponse.json({ 
      success: true, 
      impacts,
      summary: {
        total_access_lost: totalAccessLost,
        total_got_unlimited: totalGotUnlimited,
        total_quota_increased: totalQuotaIncreased,
        is_safe: totalAccessLost === 0
      }
    });

  } catch (error: any) {
    console.error('[AdminFeatureMatrix] Dry-Run Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

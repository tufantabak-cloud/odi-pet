import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'founder')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plans, feature_limits } = await req.json();

    if (!Array.isArray(plans) || !Array.isArray(feature_limits)) {
      return NextResponse.json({ error: 'Invalid import payload structure' }, { status: 400 });
    }

    const adminSupabase = createAdminSupabaseClient();
    
    // 1. Import Plans
    // Upsert plans
    const { error: plansError } = await adminSupabase
      .from('app_plans')
      .upsert(plans, { onConflict: 'plan_key' });

    if (plansError) {
      throw new Error(`Failed to import plans: ${plansError.message}`);
    }

    // 2. Import Feature Limits to DRAFTS
    // We don't push directly to live. We push to drafts so admin can dry-run and publish.
    const { error: limitsError } = await adminSupabase
      .from('feature_limits_draft')
      .upsert(feature_limits.map((l: any) => ({
        feature_key: l.feature_key,
        plan: l.plan,
        is_enabled: l.is_enabled,
        limit_type: l.limit_type,
        limit_value: l.limit_value,
        window_value: l.window_value,
        window_unit: l.window_unit,
        carry_over_policy: l.carry_over_policy || 'none',
        burst_limit: l.burst_limit,
        updated_by: profile.id
      })), { onConflict: 'feature_key,plan' });

    if (limitsError) {
      throw new Error(`Failed to import limits to draft: ${limitsError.message}`);
    }

    // 3. Audit log
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    await adminSupabase.from('premium_audit_logs').insert({
      user_id: profile.id,
      action_type: 'JSON_CONFIG_IMPORTED',
      ip_address: ip
    });

    return NextResponse.json({ success: true, message: 'Configuration imported to drafts successfully.' });

  } catch (error: any) {
    console.error('[AdminFeatureMatrix] Import Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

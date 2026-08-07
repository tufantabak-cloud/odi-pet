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
    
    // UPSERT Limits using adminSupabase into feature_limits_draft
    const { error } = await adminSupabase
      .from('feature_limits_draft')
      .upsert(limits.map(l => ({
        feature_key: l.feature_key,
        plan: l.plan,
        is_enabled: l.is_enabled,
        limit_type: l.limit_type,
        limit_value: l.limit_value,
        window_value: l.window_value,
        window_unit: l.window_unit,
        updated_by: profile.id
      })), { onConflict: 'feature_key,plan' });

    if (error) {
      console.error('[AdminFeatureMatrix] Draft Upsert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the audit event
    await adminSupabase.from('premium_audit_logs').insert({
      user_id: profile.id,
      action_type: 'LIMIT_DRAFT_SAVED',
      new_value: limits,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({ success: true, count: limits.length });

  } catch (error: any) {
    console.error('[AdminFeatureMatrix] Draft Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

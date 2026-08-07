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
    
    // UPSERT Limits using adminSupabase
    const { error } = await adminSupabase
      .from('feature_limits')
      .upsert(limits.map(l => ({
        feature_key: l.feature_key,
        plan: l.plan,
        is_enabled: l.is_enabled,
        limit_type: l.limit_type,
        limit_value: l.limit_value,
        window_value: l.window_value,
        window_unit: l.window_unit
      })), { onConflict: 'feature_key,plan' });

    if (error) {
      console.error('[AdminFeatureMatrix] Upsert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: limits.length });

  } catch (error: any) {
    console.error('[AdminFeatureMatrix] Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

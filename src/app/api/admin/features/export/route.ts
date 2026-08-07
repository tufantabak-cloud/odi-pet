import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';

export async function GET(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'founder')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminSupabase = createAdminSupabaseClient();
    
    // Export Plans
    const { data: plans, error: plansError } = await adminSupabase
      .from('app_plans')
      .select('*');

    if (plansError) {
      throw new Error(`Failed to export plans: ${plansError.message}`);
    }

    // Export Feature Limits (Live)
    const { data: limits, error: limitsError } = await adminSupabase
      .from('feature_limits')
      .select('*');

    if (limitsError) {
      throw new Error(`Failed to export limits: ${limitsError.message}`);
    }

    const payload = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      plans,
      feature_limits: limits
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="odi-premium-config-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error: any) {
    console.error('[AdminFeatureMatrix] Export Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { CacheManager } from '@/lib/features/cache/cacheManager';
import { premiumEventBus } from '@/lib/features/events/premiumEventBus';

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'founder')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { featureKey, action, reason } = await req.json();

    if (!featureKey || !['ENABLE_KILL', 'DISABLE_KILL'].includes(action)) {
      return NextResponse.json({ error: 'featureKey and valid action are required' }, { status: 400 });
    }

    const adminSupabase = createAdminSupabaseClient();

    if (action === 'ENABLE_KILL') {
      const { error } = await adminSupabase
        .from('feature_kill_switches')
        .upsert({
          feature_key: featureKey,
          disabled_by: profile.id,
          reason: reason || 'Emergency Shutdown via Admin API'
        });

      if (error) throw new Error(error.message);

      CacheManager.invalidateEntitlements();
      premiumEventBus.emit('FEATURE_DISABLED', {
        userId: profile.id,
        featureKey,
        metadata: { isKillSwitch: true, reason }
      });

      return NextResponse.json({ success: true, message: `Kill switch ENABLED for '${featureKey}'. Feature is globally shut down.` });
    } else {
      const { error } = await adminSupabase
        .from('feature_kill_switches')
        .delete()
        .eq('feature_key', featureKey);

      if (error) throw new Error(error.message);

      CacheManager.invalidateEntitlements();
      premiumEventBus.emit('FEATURE_ENABLED', {
        userId: profile.id,
        featureKey,
        metadata: { isKillSwitchCleared: true }
      });

      return NextResponse.json({ success: true, message: `Kill switch REMOVED for '${featureKey}'. Feature is restored.` });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

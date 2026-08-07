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

    const { version_id, reason } = await req.json().catch(() => ({}));
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    if (!version_id) {
      return NextResponse.json({ error: 'Version ID is required' }, { status: 400 });
    }

    const adminSupabase = createAdminSupabaseClient();
    
    // Perform the rollback via RPC (Atomic Transaction)
    const { data: rpcData, error: rpcError } = await adminSupabase.rpc('rollback_feature_limits', {
      p_version_id: version_id,
      p_published_by: profile.id,
      p_ip: ip,
      p_reason: reason || 'Rollback requested via Admin UI'
    });

    if (rpcError) {
      throw new Error(`Failed to rollback via RPC: ${rpcError.message}`);
    }

    if (rpcData && !rpcData.success) {
      throw new Error(`RPC Rollback failed: ${rpcData.error}`);
    }

    // Decoupled Cache Invalidation & Event Bus Broadcast
    CacheManager.invalidateEntitlements();
    
    premiumEventBus.emit('ROLLBACK_COMPLETED', {
      userId: profile.id,
      versionId: version_id,
      metadata: { reason }
    });

    console.log(`[Rollback] Version ${version_id} restored successfully.`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[AdminFeatureMatrix] Rollback Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth/get-current-profile';
import { featureRegistry } from '@/lib/features/registry';
import { CacheManager } from '@/lib/features/cache/cacheManager';
import { premiumEventBus } from '@/lib/features/events/premiumEventBus';

export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentProfile();
    
    if (!profile || (profile.role !== 'admin' && profile.role !== 'founder')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { description, ticket_no, release, environment, reason } = await req.json().catch(() => ({}));
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    const adminSupabase = createAdminSupabaseClient();
    
    // 1. Fetch current drafts to validate dependencies
    const { data: drafts, error: draftError } = await adminSupabase
      .from('feature_limits_draft')
      .select('*');

    if (draftError) {
      throw new Error(`Failed to fetch drafts: ${draftError.message}`);
    }

    if (!drafts || drafts.length === 0) {
      return NextResponse.json({ error: 'No drafts found to publish' }, { status: 400 });
    }

    // 2. Validate Dependencies (Drafts vs Registry)
    for (const draft of drafts) {
      if (draft.is_enabled) {
        const feature = featureRegistry.get(draft.feature_key);
        if (feature && feature.dependsOn && feature.dependsOn.length > 0) {
          for (const dep of feature.dependsOn) {
            const depDraft = drafts.find(d => d.feature_key === dep && d.plan === draft.plan);
            if (depDraft && !depDraft.is_enabled) {
              return NextResponse.json({ 
                error: `Dependency violation: '${draft.feature_key}' depends on '${dep}', but '${dep}' is disabled for plan '${draft.plan}'.` 
              }, { status: 400 });
            }
          }
        }
      }
    }

    // 3. Perform the publish via RPC with Rich Metadata (Atomic Transaction)
    const { data: rpcData, error: rpcError } = await adminSupabase.rpc('publish_feature_limits', {
      p_published_by: profile.id,
      p_description: description || 'Published via Admin UI',
      p_ip: ip,
      p_ticket_no: ticket_no || null,
      p_release: release || null,
      p_environment: environment || 'production',
      p_reason: reason || null
    });

    if (rpcError) {
      throw new Error(`Failed to publish via RPC: ${rpcError.message}`);
    }

    if (rpcData && !rpcData.success) {
      throw new Error(`RPC Publish failed: ${rpcData.error}`);
    }

    // 4. Decoupled Cache Invalidation & Event Bus Broadcast
    CacheManager.invalidateEntitlements();
    
    premiumEventBus.emit('PUBLISH_COMPLETED', {
      userId: profile.id,
      metadata: { count: rpcData?.count, ticket_no, release, environment }
    });

    return NextResponse.json({ success: true, count: rpcData?.count || drafts.length });

  } catch (error: any) {
    console.error('[AdminFeatureMatrix] Publish Route Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

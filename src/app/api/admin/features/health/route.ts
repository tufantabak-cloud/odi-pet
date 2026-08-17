import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { featureRegistry } from '@/lib/features/registry';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const supabase = createAdminSupabaseClient();
    
    // DB Queries for stats
    const { count: bundlesCount } = await supabase.from('app_bundles').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { count: plansCount } = await supabase.from('app_plans').select('*', { count: 'exact', head: true }).eq('is_active', true);
    const { data: limitsData } = await supabase.from('feature_limits_versions').select('registry_hash, snapshot_hash').order('created_at', { ascending: false }).limit(1).single();

    // Registry / Build-time info
    const indexFilePath = path.join(process.cwd(), 'feature-index.json');
    let registryVersion = 'unknown';
    let localHash = 'unknown';
    
    if (fs.existsSync(indexFilePath)) {
      const idx = JSON.parse(fs.readFileSync(indexFilePath, 'utf8'));
      localHash = crypto.createHash('sha256').update(JSON.stringify(idx)).digest('hex');
      registryVersion = idx.version || '1.0.0';
    }

    const featureCount = Object.keys(featureRegistry).length;

    const healthData = {
      status: 'UP',
      observability: {
        registry: {
          version: registryVersion,
          hash: localHash,
          featureCount: featureCount,
          syncedWithDB: limitsData?.registry_hash === localHash
        },
        database: {
          activeBundles: bundlesCount || 0,
          activePlans: plansCount || 0,
          latestSnapshotHash: limitsData?.snapshot_hash || 'none'
        },
        cache: {
          provider: 'MemoryCache' // Assuming fallback to memory cache if Redis not specified
        }
      }
    };

    return NextResponse.json(healthData);
  } catch (e: any) {
    return NextResponse.json({
      status: 'DOWN',
      error: e.message
    }, { status: 500 });
  }
}

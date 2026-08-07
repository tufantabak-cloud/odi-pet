import { createAdminSupabaseClient } from '../supabase/server';
import { getAllRegisteredFeatures } from './registry';
import { FeatureDefinition } from './types';
import crypto from 'crypto';

export interface SyncResult {
  created: number;
  updated: number;
  deprecated: number;
  unchanged: number;
  errors: number;
  registryVersion?: string;
  syncId?: string;
  affectedFeatures?: string[];
  skippedDueToHash?: boolean;
}

export interface SyncOptions {
  version?: string;
  source?: import('./types').SyncSource;
  changeReason?: string;
  actorType?: import('./types').ActorType;
  actorId?: string;
}

export async function syncFeaturesToDatabase(options: SyncOptions = {}): Promise<SyncResult> {
  const {
    version = '1.0.0',
    source = 'deploy',
    changeReason = 'deployment',
    actorType = 'SYSTEM',
    actorId = undefined
  } = options;
  
  const supabase = createAdminSupabaseClient();
  const allFeatures = getAllRegisteredFeatures();
  
  if (allFeatures.length === 0) {
    console.warn('[FeatureSync] No features found in registry. Sync aborted.');
    return { created: 0, updated: 0, deprecated: 0, unchanged: 0, errors: 0 };
  }

  // Generate SHA256 hash of the payload to prevent redundant processing
  const registryHash = crypto.createHash('sha256').update(JSON.stringify(allFeatures)).digest('hex');

  try {
    const { data, error } = await supabase.rpc('sync_feature_registry', {
      payload_json: allFeatures,
      p_registry_hash: registryHash,
      sync_version: version,
      p_sync_source: source,
      p_change_reason: changeReason,
      p_actor_type: actorType,
      p_actor_id: actorId
    });

    if (error) {
      console.error('[FeatureSync] RPC Execution Error:', error);
      throw error;
    }

    return {
      created: data?.created || 0,
      updated: data?.updated || 0,
      deprecated: data?.deprecated || 0,
      unchanged: data?.unchanged || 0,
      errors: data?.errors || 0,
      registryVersion: data?.registryVersion,
      syncId: data?.syncId,
      affectedFeatures: data?.affectedFeatures || [],
      skippedDueToHash: data?.skipped_due_to_hash || false,
    };
  } catch (err) {
    console.error('[FeatureSync] Sync process failed:', err);
    return { created: 0, updated: 0, deprecated: 0, unchanged: 0, errors: 1 };
  }
}

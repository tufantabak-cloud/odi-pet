'use server';

import { createClient } from '@supabase/supabase-js';
import { AdminFeature, FeatureStatus, FeatureVisibility } from './types';

// Utility for deeply diffing two JSON objects for the audit log
function calculateDiff(before: any, after: any) {
  const diff: any = {};
  
  for (const key in after) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diff[key] = {
        old: before[key],
        new: after[key]
      };
    }
  }
  
  return diff;
}

// Ensure Admin service uses the Service Role key to bypass RLS for mutations
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  
  return createClient(url, key);
}

export async function updateFeatureDetails(
  featureKey: string, 
  updates: Partial<Pick<AdminFeature, 'description' | 'status' | 'visibility' | 'tags' | 'display_order' | 'metadata'>>,
  actorId: string
) {
  const supabase = getAdminClient();

  // 1. Fetch before state
  const { data: beforeState, error: fetchErr } = await supabase
    .from('app_features')
    .select('*')
    .eq('key', featureKey)
    .single();

  if (fetchErr || !beforeState) {
    throw new Error(`Feature not found: ${featureKey}`);
  }

  // 2. Perform Update
  const { data: afterState, error: updateErr } = await supabase
    .from('app_features')
    .update(updates)
    .eq('key', featureKey)
    .select('*')
    .single();

  if (updateErr) {
    throw new Error(`Update failed: ${updateErr.message}`);
  }

  // 3. Create Audit Log (diff generated)
  const diff = calculateDiff(beforeState, afterState);
  
  if (Object.keys(diff).length > 0) {
    await supabase.from('feature_audit_logs').insert({
      action: 'feature_updated',
      actor_id: actorId,
      feature_key: featureKey,
      before_state: beforeState,
      after_state: afterState,
      diff: diff
    });
  }

  return { success: true, feature: afterState };
}

export async function cloneFeature(
  originalKey: string,
  newKey: string,
  newLabel: string,
  actorId: string
) {
  const supabase = getAdminClient();

  const { data: original, error: fetchErr } = await supabase
    .from('app_features')
    .select('*')
    .eq('key', originalKey)
    .single();

  if (fetchErr || !original) {
    throw new Error(`Original feature not found: ${originalKey}`);
  }

  const newFeature = {
    ...original,
    key: newKey,
    label: newLabel,
    status: 'pending_review' as FeatureStatus,
    created_at: undefined,
    updated_at: undefined,
    feature_version: '1.0.0'
  };

  const { data: created, error: insertErr } = await supabase
    .from('app_features')
    .insert(newFeature)
    .select('*')
    .single();

  if (insertErr) {
    throw new Error(`Clone failed: ${insertErr.message}`);
  }

  await supabase.from('feature_audit_logs').insert({
    action: 'feature_created',
    actor_id: actorId,
    feature_key: newKey,
    before_state: null,
    after_state: created,
    diff: { event: 'cloned_from', source: originalKey }
  });

  return { success: true, feature: created };
}

export async function bulkUpdateFeatures(
  keys: string[],
  action: 'activate' | 'disable' | 'deprecate' | 'hidden' | 'public',
  actorId: string
) {
  const supabase = getAdminClient();

  const updates: any = {};
  
  if (action === 'activate') updates.status = 'active';
  if (action === 'disable') updates.status = 'disabled';
  if (action === 'deprecate') updates.status = 'deprecated';
  if (action === 'hidden') updates.visibility = 'hidden';
  if (action === 'public') updates.visibility = 'public';

  for (const key of keys) {
    await updateFeatureDetails(key, updates, actorId);
  }

  return { success: true, count: keys.length };
}

export async function exportFeaturesToJSON() {
  const supabase = getAdminClient();

  const { data: features } = await supabase.from('app_features').select('*');
  const { data: limits } = await supabase.from('feature_limits').select('*');
  
  // Try fetching version history if it exists
  let version_history = [];
  try {
    const { data: history } = await supabase.from('feature_version_history').select('*');
    version_history = history || [];
  } catch (e) {
    // Ignore if table doesn't exist yet
  }

  return {
    success: true,
    snapshot: {
      exported_at: new Date().toISOString(),
      app_features: features || [],
      feature_limits: limits || [],
      feature_version_history: version_history
    }
  };
}

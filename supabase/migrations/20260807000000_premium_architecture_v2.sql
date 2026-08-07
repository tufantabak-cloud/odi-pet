-- =============================================================================
-- Feature Registry - Phase 6: Premium Architecture V2
-- Migration : 20260807000000_premium_architecture_v2.sql
-- =============================================================================

BEGIN;

-- 1. Alter feature_limits safely
ALTER TABLE public.feature_limits
  ADD COLUMN IF NOT EXISTS limit_type TEXT,
  ADD COLUMN IF NOT EXISTS window_value INTEGER,
  ADD COLUMN IF NOT EXISTS window_unit TEXT,
  ADD COLUMN IF NOT EXISTS carry_over_policy TEXT,
  ADD COLUMN IF NOT EXISTS burst_limit INTEGER;

-- Migrate existing data cleanly
UPDATE public.feature_limits
SET 
  window_value = window_days,
  window_unit = 'day',
  limit_type = CASE WHEN limit_value IS NULL THEN 'unlimited' ELSE 'quota' END,
  carry_over_policy = 'none'
WHERE limit_type IS NULL;

-- Now add strict checks
ALTER TABLE public.feature_limits
  ALTER COLUMN limit_type SET NOT NULL,
  ADD CONSTRAINT chk_limit_type CHECK (limit_type IN ('unlimited', 'quota', 'boolean')),
  ADD CONSTRAINT chk_window_unit CHECK (window_unit IN ('minute', 'hour', 'day', 'week', 'month', 'year', 'lifetime')),
  ADD CONSTRAINT chk_carry_over CHECK (carry_over_policy IN ('none', 'full', 'partial', 'cap50'));

-- 2. Create app_bundles
CREATE TABLE IF NOT EXISTS public.app_bundles (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_app_bundles_updated_at ON public.app_bundles;
CREATE TRIGGER trg_app_bundles_updated_at
  BEFORE UPDATE ON public.app_bundles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.app_bundles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_bundles_auth_select" ON public.app_bundles;
CREATE POLICY "app_bundles_auth_select" ON public.app_bundles FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.app_bundles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_bundles TO service_role;

-- 3. Create bundle_features
CREATE TABLE IF NOT EXISTS public.bundle_features (
  bundle_key TEXT REFERENCES public.app_bundles(key) ON DELETE CASCADE,
  feature_key TEXT REFERENCES public.app_features(key) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (bundle_key, feature_key)
);

ALTER TABLE public.bundle_features ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bundle_features_auth_select" ON public.bundle_features;
CREATE POLICY "bundle_features_auth_select" ON public.bundle_features FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.bundle_features TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bundle_features TO service_role;

-- 4. Create plan_bundles
CREATE TABLE IF NOT EXISTS public.plan_bundles (
  plan_key TEXT NOT NULL,
  bundle_key TEXT REFERENCES public.app_bundles(key) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_key, bundle_key)
);

ALTER TABLE public.plan_bundles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "plan_bundles_auth_select" ON public.plan_bundles;
CREATE POLICY "plan_bundles_auth_select" ON public.plan_bundles FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.plan_bundles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_bundles TO service_role;

-- 5. Sync Tracking
CREATE TABLE IF NOT EXISTS public.feature_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registry_hash TEXT NOT NULL,
  sync_source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_sync_runs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_sync_runs TO service_role;

-- 6. Replace Sync RPC to only update metadata, never delete features, never touch limits
CREATE OR REPLACE FUNCTION public.sync_feature_registry(
  payload_json JSONB,
  p_registry_hash TEXT,
  sync_version TEXT DEFAULT '1.0.0',
  p_sync_source TEXT DEFAULT 'deploy',
  p_change_reason TEXT DEFAULT 'deployment',
  p_actor_type TEXT DEFAULT 'SYSTEM',
  p_actor_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_feature JSONB;
  v_key TEXT;
  v_feature_version TEXT;
  v_existing RECORD;
  v_new_metadata JSONB;
  
  v_created INTEGER := 0;
  v_updated INTEGER := 0;
  v_unchanged INTEGER := 0;
  v_affected_keys TEXT[] := ARRAY[]::TEXT[];
  
  v_sync_id UUID := gen_random_uuid();
  v_now TIMESTAMPTZ := now();
  v_inserted_id UUID;
  
  v_hash_exists BOOLEAN;
BEGIN
  -- Check registry hash to prevent duplicate syncs
  SELECT EXISTS(
    SELECT 1 FROM public.feature_sync_runs WHERE registry_hash = p_registry_hash
  ) INTO v_hash_exists;

  IF v_hash_exists THEN
    RETURN jsonb_build_object(
      'created', 0, 'updated', 0, 'deprecated', 0, 'unchanged', jsonb_array_length(payload_json),
      'errors', 0, 'registryVersion', sync_version, 'syncId', v_sync_id,
      'affectedFeatures', ARRAY[]::TEXT[], 'skipped_due_to_hash', true
    );
  END IF;
  
  FOR v_feature IN SELECT * FROM jsonb_array_elements(payload_json)
  LOOP
    v_key := v_feature->>'key';
    v_feature_version := v_feature->>'version';
    
    SELECT * INTO v_existing FROM public.app_features WHERE key = v_key;
    
    -- We store all the arbitrary fields strictly inside `metadata`
    -- key, name, description, category, tags, version, visibility, display_order, icon, module, beta, deprecated, requiresAuth, requiresPet
    v_new_metadata := v_feature - 'key' - 'name' - 'description' - 'version';
    
    IF NOT FOUND THEN
      -- Create new feature
      INSERT INTO public.app_features (
        key,
        label,
        description,
        scope,
        status,
        metadata,
        feature_version,
        registry_version,
        introduced_in_version,
        last_sync_id,
        last_synced_at
      ) VALUES (
        v_key,
        v_feature->>'name',
        v_feature->>'description',
        'global',
        'active',
        v_new_metadata,
        v_feature_version,
        sync_version,
        sync_version,
        v_sync_id,
        v_now
      ) RETURNING id INTO v_inserted_id;
      
      -- Insert History
      INSERT INTO public.feature_version_history (
        feature_id, feature_key, old_version, new_version, 
        sync_id, sync_source, change_reason, actor_type, actor_id
      ) VALUES (
        v_inserted_id, v_key, NULL, v_feature_version,
        v_sync_id, p_sync_source::public.sync_source_enum, p_change_reason, p_actor_type::public.actor_type_enum, p_actor_id
      );
      
      v_created := v_created + 1;
      v_affected_keys := array_append(v_affected_keys, v_key);
      
    ELSE
      -- Existing feature
      -- Update strictly metadata/labels, do not touch feature_limits.
      IF (v_existing.label IS DISTINCT FROM (v_feature->>'name')) OR
         (v_existing.description IS DISTINCT FROM (v_feature->>'description')) OR
         (v_existing.feature_version IS DISTINCT FROM v_feature_version) OR
         (v_existing.metadata IS DISTINCT FROM v_new_metadata) THEN
         
        UPDATE public.app_features
        SET 
          label = v_feature->>'name',
          description = v_feature->>'description',
          metadata = v_new_metadata,
          feature_version = v_feature_version,
          registry_version = sync_version,
          last_sync_id = v_sync_id,
          last_synced_at = v_now
        WHERE key = v_key;
        
        -- Record history if version changed
        IF v_existing.feature_version IS DISTINCT FROM v_feature_version THEN
          INSERT INTO public.feature_version_history (
            feature_id, feature_key, old_version, new_version, 
            sync_id, sync_source, change_reason, actor_type, actor_id
          ) VALUES (
            v_existing.id, v_key, v_existing.feature_version, v_feature_version,
            v_sync_id, p_sync_source::public.sync_source_enum, p_change_reason, p_actor_type::public.actor_type_enum, p_actor_id
          );
        END IF;
        
        v_updated := v_updated + 1;
        v_affected_keys := array_append(v_affected_keys, v_key);
      ELSE
        -- Unchanged, just bump timestamps
        UPDATE public.app_features
        SET last_sync_id = v_sync_id, last_synced_at = v_now, registry_version = sync_version
        WHERE key = v_key;
        
        v_unchanged := v_unchanged + 1;
      END IF;
    END IF;
    
  END LOOP;
  
  -- Record the sync run hash
  INSERT INTO public.feature_sync_runs (id, registry_hash, sync_source, created_at)
  VALUES (v_sync_id, p_registry_hash, p_sync_source, v_now);

  -- We do NOT deprecate missing features anymore (as requested: Feature silinmeyecek).
  
  RETURN jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'deprecated', 0,
    'unchanged', v_unchanged,
    'errors', 0,
    'registryVersion', sync_version,
    'syncId', v_sync_id,
    'affectedFeatures', COALESCE(v_affected_keys, ARRAY[]::TEXT[])
  );
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

COMMIT;

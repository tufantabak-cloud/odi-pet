-- =============================================================================
-- Feature Registry - Phase 5A: Versioning
-- Migration : 20260806240000_feature_registry_versioning.sql
-- =============================================================================

BEGIN;

-- 1. Create ENUMs for auditing
CREATE TYPE public.sync_source_enum AS ENUM (
  'deploy',
  'manual',
  'cli',
  'cron',
  'rollback'
);

CREATE TYPE public.actor_type_enum AS ENUM (
  'SYSTEM',
  'USER',
  'CLI',
  'DEPLOY',
  'CRON'
);

-- 2. Alter `app_features` to add versioning columns
ALTER TABLE public.app_features 
  ADD COLUMN IF NOT EXISTS feature_version TEXT NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS registry_version TEXT NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS introduced_in_version TEXT,
  ADD COLUMN IF NOT EXISTS deprecated_in_version TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sync_id UUID;

-- 3. Create `feature_version_history` table
CREATE TABLE IF NOT EXISTS public.feature_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES public.app_features(id) ON DELETE RESTRICT,
  feature_key TEXT NOT NULL,
  old_version TEXT,
  new_version TEXT NOT NULL,
  sync_id UUID NOT NULL,
  sync_source public.sync_source_enum NOT NULL,
  change_reason TEXT,
  actor_type public.actor_type_enum NOT NULL,
  actor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast history lookups
CREATE INDEX IF NOT EXISTS idx_feature_version_history_feature_id ON public.feature_version_history(feature_id);
CREATE INDEX IF NOT EXISTS idx_feature_version_history_feature_key ON public.feature_version_history(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_version_history_sync_id ON public.feature_version_history(sync_id);

-- 4. Replace the sync_feature_registry RPC to handle history
CREATE OR REPLACE FUNCTION public.sync_feature_registry(
  payload_json JSONB,
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
  v_admin_preserved JSONB;
  
  v_limit_amount INTEGER;
  v_limit_window INTEGER;
  v_limit_type TEXT;
  v_default_tier TEXT;
  
  v_created INTEGER := 0;
  v_updated INTEGER := 0;
  v_deprecated INTEGER := 0;
  v_unchanged INTEGER := 0;
  
  v_incoming_keys TEXT[] := ARRAY[]::TEXT[];
  v_affected_keys TEXT[] := ARRAY[]::TEXT[];
  
  v_sync_id UUID := gen_random_uuid();
  v_now TIMESTAMPTZ := now();
  v_inserted_id UUID;
BEGIN
  
  FOR v_feature IN SELECT * FROM jsonb_array_elements(payload_json)
  LOOP
    v_key := v_feature->>'key';
    v_feature_version := v_feature->>'version';
    v_incoming_keys := array_append(v_incoming_keys, v_key);
    
    SELECT * INTO v_existing FROM public.app_features WHERE key = v_key;
    
    IF NOT FOUND THEN
      -- Create new feature
      v_new_metadata := v_feature - 'key' - 'name' - 'description' - 'category' - 'limits' - 'defaultTier' - 'version';
      
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
        'pending_review',
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
      v_admin_preserved := jsonb_build_object();
      IF v_existing.metadata ? 'visibility' THEN
        v_admin_preserved := jsonb_set(v_admin_preserved, '{visibility}', v_existing.metadata->'visibility');
      END IF;
      IF v_existing.metadata ? 'reviewed_by' THEN
        v_admin_preserved := jsonb_set(v_admin_preserved, '{reviewed_by}', v_existing.metadata->'reviewed_by');
      END IF;
      IF v_existing.metadata ? 'reviewed_at' THEN
        v_admin_preserved := jsonb_set(v_admin_preserved, '{reviewed_at}', v_existing.metadata->'reviewed_at');
      END IF;
      IF v_existing.metadata ? 'created_by' THEN
        v_admin_preserved := jsonb_set(v_admin_preserved, '{created_by}', v_existing.metadata->'created_by');
      END IF;

      v_new_metadata := v_feature - 'key' - 'name' - 'description' - 'category' - 'limits' - 'defaultTier' - 'version';
      v_new_metadata := v_new_metadata || v_admin_preserved;
      
      -- If something changed (metadata, label, description, or version)
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
        
        -- If version specifically changed, record history
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
        -- Just update the sync timestamp/id since we visited it
        UPDATE public.app_features
        SET last_sync_id = v_sync_id, last_synced_at = v_now, registry_version = sync_version
        WHERE key = v_key;
        
        v_unchanged := v_unchanged + 1;
      END IF;
    END IF;
    
    -- Sync Default Limits
    v_default_tier := v_feature->>'defaultTier';
    IF v_default_tier IS NOT NULL AND v_feature ? 'limits' THEN
      v_limit_type := v_feature->'limits'->>'type';
      
      IF v_limit_type = 'quota' THEN
        v_limit_amount := (v_feature->'limits'->>'amount')::INTEGER;
        v_limit_window := CASE v_feature->'limits'->>'resetPeriod'
          WHEN 'daily' THEN 1
          WHEN 'weekly' THEN 7
          WHEN 'monthly' THEN 30
          WHEN 'yearly' THEN 365
          ELSE 30
        END;
      ELSIF v_limit_type = 'boolean' THEN
        v_limit_amount := NULL; 
        v_limit_window := 30;   
      ELSE
        v_limit_amount := NULL;
        v_limit_window := 30;
      END IF;
      
      INSERT INTO public.feature_limits (
        feature_key, plan_tier, limit_value, window_days, is_enabled
      ) VALUES (
        v_key, v_default_tier::public.plan_tier_enum, v_limit_amount, v_limit_window, true
      )
      ON CONFLICT (feature_key, plan_tier) DO NOTHING;
    END IF;
    
  END LOOP;
  
  -- Deprecate missing features
  WITH deprecated_rows AS (
    UPDATE public.app_features
    SET 
      status = 'deprecated',
      deprecated_in_version = sync_version,
      last_sync_id = v_sync_id,
      last_synced_at = v_now
    WHERE status <> 'deprecated'
      AND key != ALL(v_incoming_keys)
    RETURNING key
  )
  SELECT 
    count(*), array_agg(key)
  INTO 
    v_deprecated, v_affected_keys
  FROM (
    SELECT key FROM deprecated_rows
    UNION ALL
    SELECT unnest(v_affected_keys)
  ) sub;

  RETURN jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'deprecated', v_deprecated,
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

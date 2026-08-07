-- =============================================================================
-- Feature Registry — Phase 3: Sync RPC
-- Migration : 20260806230000_feature_registry_sync_rpc.sql
-- =============================================================================

BEGIN;

-- 1. Extend feature_status_enum to include 'pending_review' if it doesn't exist.
-- PostgreSQL does not allow ALTER TYPE ADD VALUE inside a transaction block in older versions,
-- but since Postgres 12 it is allowed under certain conditions. 
-- To be absolutely safe in all Supabase versions, we commit and open a new transaction if needed,
-- but typically Supabase uses PG15+ which supports this inside a transaction block if not used immediately.
-- A safer approach for idempotency:
COMMIT;

DO $$ BEGIN
  ALTER TYPE public.feature_status_enum ADD VALUE IF NOT EXISTS 'pending_review';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

BEGIN;

-- 2. Create the synchronization RPC
CREATE OR REPLACE FUNCTION public.sync_feature_registry(
  payload_json JSONB,
  sync_version TEXT DEFAULT '1.0.0'
) RETURNS JSONB
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_feature JSONB;
  v_key TEXT;
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
BEGIN
  -- We assume payload_json is a JSON array of FeatureDefinition objects.
  
  FOR v_feature IN SELECT * FROM jsonb_array_elements(payload_json)
  LOOP
    v_key := v_feature->>'key';
    v_incoming_keys := array_append(v_incoming_keys, v_key);
    
    -- Does this feature exist in the DB?
    SELECT * INTO v_existing FROM public.app_features WHERE key = v_key;
    
    IF NOT FOUND THEN
      -- Create new feature
      v_new_metadata := v_feature || jsonb_build_object(
        'last_sync_version', sync_version,
        'last_sync_at', now()
      );
      
      -- Remove duplicate root fields and relational fields from metadata
      v_new_metadata := v_new_metadata - 'key' - 'name' - 'description' - 'category' - 'limits' - 'defaultTier';
      
      INSERT INTO public.app_features (
        key,
        label,
        description,
        scope,
        status,
        metadata
      ) VALUES (
        v_key,
        v_feature->>'name',
        v_feature->>'description',
        'global', -- We can map scope later or default to global
        'pending_review',
        v_new_metadata
      );
      
      v_created := v_created + 1;
      
    ELSE
      -- Existing feature: Update code-owned fields, preserve admin fields
      v_admin_preserved := jsonb_build_object();
      
      -- Extract known admin fields from existing metadata to preserve them
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

      -- Construct new metadata
      v_new_metadata := v_feature || jsonb_build_object(
        'last_sync_version', sync_version,
        'last_sync_at', now()
      );
      
      -- Strip relational/core fields to prevent duplication
      v_new_metadata := v_new_metadata - 'key' - 'name' - 'description' - 'category' - 'limits' - 'defaultTier';
      
      -- Overlay preserved admin fields back on top
      v_new_metadata := v_new_metadata || v_admin_preserved;
      
      -- Idempotency check: only update if something actually changed (ignoring last_sync_at for diff)
      IF (v_existing.label IS DISTINCT FROM (v_feature->>'name')) OR
         (v_existing.description IS DISTINCT FROM (v_feature->>'description')) OR
         ((v_existing.metadata - 'last_sync_at' - 'last_sync_version') IS DISTINCT FROM (v_new_metadata - 'last_sync_at' - 'last_sync_version')) THEN
         
        UPDATE public.app_features
        SET 
          label = v_feature->>'name',
          description = v_feature->>'description',
          metadata = v_new_metadata
        WHERE key = v_key;
        
        v_updated := v_updated + 1;
      ELSE
        v_unchanged := v_unchanged + 1;
      END IF;
    END IF;
    
    -- 3. Synchronize Default Limits into the relational table
    v_default_tier := v_feature->>'defaultTier';
    IF v_default_tier IS NOT NULL AND v_feature ? 'limits' THEN
      v_limit_type := v_feature->'limits'->>'type';
      
      IF v_limit_type = 'quota' THEN
        v_limit_amount := (v_feature->'limits'->>'amount')::INTEGER;
        
        -- Map resetPeriod to window_days
        v_limit_window := CASE v_feature->'limits'->>'resetPeriod'
          WHEN 'daily' THEN 1
          WHEN 'weekly' THEN 7
          WHEN 'monthly' THEN 30
          WHEN 'yearly' THEN 365
          ELSE 30
        END;
        
      ELSIF v_limit_type = 'boolean' THEN
        v_limit_amount := NULL; -- Represents unlimited/enabled
        v_limit_window := 30;   -- Arbitrary for boolean
      ELSE
        -- type = 'none' means feature is globally unlocked, or logic is handled elsewhere.
        -- We can set amount to NULL (unlimited).
        v_limit_amount := NULL;
        v_limit_window := 30;
      END IF;
      
      -- Insert default limit, but NEVER overwrite if it already exists (preserves admin modifications)
      INSERT INTO public.feature_limits (
        feature_key,
        plan_tier,
        limit_value,
        window_days,
        is_enabled
      ) VALUES (
        v_key,
        v_default_tier::public.plan_tier_enum,
        v_limit_amount,
        v_limit_window,
        true
      )
      ON CONFLICT (feature_key, plan_tier) DO NOTHING;
    END IF;
    
  END LOOP;
  
  -- Deprecate missing features (status != 'deprecated' and key NOT IN incoming keys)
  WITH deprecated_rows AS (
    UPDATE public.app_features
    SET status = 'deprecated'
    WHERE status <> 'deprecated'
      AND key != ALL(v_incoming_keys)
    RETURNING key
  )
  SELECT count(*) INTO v_deprecated FROM deprecated_rows;

  RETURN jsonb_build_object(
    'created', v_created,
    'updated', v_updated,
    'deprecated', v_deprecated,
    'unchanged', v_unchanged,
    'errors', 0
  );
EXCEPTION WHEN OTHERS THEN
  -- Let Postgres roll back automatically.
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_feature_registry(JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_feature_registry(JSONB, TEXT) TO service_role;

COMMIT;

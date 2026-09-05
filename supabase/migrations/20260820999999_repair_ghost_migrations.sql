-- =============================================================================
-- GHOST MIGRATION REPAIR
-- Migration : 20260820999999_repair_ghost_migrations.sql
-- Description: Recovers missing DDLs from ghost migrations 230000, 240000, 260000
-- Rules: Single transaction, Additive only, IF NOT EXISTS used where possible
-- =============================================================================

-- Note: No explicit BEGIN/COMMIT blocks. The Supabase CLI migration runner handles transactions.

-- ---------------------------------------------------------------------------
-- 1. ENUM ENHANCEMENTS
-- ---------------------------------------------------------------------------

-- feature_status_enum (from 230000/260000)
ALTER TYPE public.feature_status_enum ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE public.feature_status_enum ADD VALUE IF NOT EXISTS 'disabled';

-- sync_source_enum (from 240000)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'sync_source_enum'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.sync_source_enum AS ENUM (
      'deploy',
      'manual',
      'cli',
      'cron',
      'rollback'
    );
  END IF;
END $$;

-- actor_type_enum (from 240000)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'actor_type_enum'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.actor_type_enum AS ENUM (
      'SYSTEM',
      'USER',
      'CLI',
      'DEPLOY',
      'CRON'
    );
  END IF;
END $$;

-- visibility_enum (from 260000)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'visibility_enum'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.visibility_enum AS ENUM (
      'public',
      'hidden',
      'internal'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLE ALTERATIONS
-- ---------------------------------------------------------------------------

-- app_features (Versioning + Visibility + Tags + Display Order)
-- 7 columns from 240000, 3 columns from 260000
ALTER TABLE public.app_features 
  ADD COLUMN IF NOT EXISTS feature_version TEXT NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS registry_version TEXT NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS introduced_in_version TEXT,
  ADD COLUMN IF NOT EXISTS deprecated_in_version TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_sync_id UUID,
  ADD COLUMN IF NOT EXISTS visibility public.visibility_enum NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Indexes for app_features (from 260000)
CREATE INDEX IF NOT EXISTS app_features_display_order_idx
  ON public.app_features (display_order);

CREATE INDEX IF NOT EXISTS app_features_visibility_idx
  ON public.app_features (visibility);

CREATE INDEX IF NOT EXISTS app_features_tags_gin_idx
  ON public.app_features USING GIN (tags);

-- feature_audit_logs.diff (from 260000)
ALTER TABLE public.feature_audit_logs
  ADD COLUMN IF NOT EXISTS diff JSONB;

-- ---------------------------------------------------------------------------
-- 3. NEW TABLES
-- ---------------------------------------------------------------------------

-- feature_version_history (from 240000)
CREATE TABLE IF NOT EXISTS public.feature_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL REFERENCES public.app_features(key) ON DELETE RESTRICT,
  old_version TEXT,
  new_version TEXT NOT NULL,
  sync_id UUID NOT NULL,
  sync_source public.sync_source_enum NOT NULL,
  change_reason TEXT,
  actor_type public.actor_type_enum NOT NULL,
  actor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for feature_version_history
CREATE INDEX IF NOT EXISTS idx_feature_version_history_feature_key ON public.feature_version_history(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_version_history_sync_id ON public.feature_version_history(sync_id);

-- =============================================================================
-- Feature Registry — Phase 7: Admin Enhancements
-- Migration : 20260806260000_feature_admin_enhancements.sql
-- Author    : Antigravity / Odi.Pet Architecture Team
-- Created   : 2026-08-06
--
-- Scope
--   • Alter feature_status_enum (pending_review, disabled)
--   • Create visibility_enum (public, hidden, internal)
--   • Alter app_features to add visibility, tags, display_order
--   • Alter feature_audit_logs to add diff
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- §1. ENUM Enhancements
-- ---------------------------------------------------------------------------

-- 1a. Add new values to feature_status_enum (Idempotent via PostgreSQL 9.1+ IF NOT EXISTS)
ALTER TYPE public.feature_status_enum ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE public.feature_status_enum ADD VALUE IF NOT EXISTS 'disabled';

-- 1b. CREATE visibility_enum
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

COMMENT ON TYPE public.visibility_enum IS 'Visibility level of a feature in the UI/Admin.';

-- ---------------------------------------------------------------------------
-- §2. Table Alterations
-- ---------------------------------------------------------------------------

-- 2a. app_features (Visibility, Tags, Display Order)
ALTER TABLE public.app_features
  ADD COLUMN IF NOT EXISTS visibility public.visibility_enum NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS app_features_display_order_idx
  ON public.app_features (display_order);

CREATE INDEX IF NOT EXISTS app_features_visibility_idx
  ON public.app_features (visibility);

-- GIN index for fast array searching on tags
CREATE INDEX IF NOT EXISTS app_features_tags_gin_idx
  ON public.app_features USING GIN (tags);

-- 2b. feature_audit_logs (Diff storage)
ALTER TABLE public.feature_audit_logs
  ADD COLUMN IF NOT EXISTS diff JSONB;

COMMENT ON COLUMN public.feature_audit_logs.diff IS 'Delta of changes between before_state and after_state';

COMMIT;

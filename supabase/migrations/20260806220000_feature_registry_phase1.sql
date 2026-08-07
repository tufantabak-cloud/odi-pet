-- =============================================================================
-- Feature Registry — Phase 1: Database Foundation
-- Migration : 20260806220000_feature_registry_phase1.sql
-- Author    : Antigravity / Odi.Pet Architecture Team
-- Created   : 2026-08-06
--
-- Scope
--   • PostgreSQL ENUM types (plan_tier, feature_scope, feature_status, audit_action)
--   • app_features          — canonical feature catalogue
--   • feature_limits        — per-plan quotas
--   • feature_usage         — per-user rolling counters
--   • feature_audit_logs    — append-only change history
--
-- Non-goals (Phase 2+)
--   • FeatureGuard component, Admin UI, Feature Registry service
--   • Clinic / vet / partner plan tiers (added via future ALTER TYPE)
--
-- Design decisions
--   • All DDL wrapped in DO $$ blocks → idempotent re-runs
--   • ENUM values: free | pro | ai_plus | enterprise
--     (compatible with profiles.premium_tier TEXT; new tiers via ALTER TYPE ADD VALUE)
--   • feature_usage uniqueness: two partial indexes (pet_id IS NULL / IS NOT NULL)
--   • feature_audit_logs: append-only enforced by RLS; no updated_at
--   • Hard deletes blocked on health / catalogue tables per OPOS Cilt 5
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- §0. Shared helper: set_updated_at()
--     CREATE OR REPLACE so subsequent migrations don't error.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Generic BEFORE UPDATE trigger that stamps updated_at = now().';

-- ---------------------------------------------------------------------------
-- §1. ENUM Types
--     All wrapped in DO blocks → safe to run multiple times.
-- ---------------------------------------------------------------------------

-- 1a. plan_tier_enum
--     Extensible: new tiers are added via ALTER TYPE plan_tier_enum ADD VALUE
--     without touching existing rows or constraints.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'plan_tier_enum'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.plan_tier_enum AS ENUM (
      'free',
      'pro',
      'ai_plus',
      'enterprise'
    );
  END IF;
END $$;

COMMENT ON TYPE public.plan_tier_enum IS
  'Subscription tier used by Feature Registry limits. '
  'Extend via: ALTER TYPE public.plan_tier_enum ADD VALUE ''new_tier'';';

-- 1b. feature_scope_enum
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'feature_scope_enum'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.feature_scope_enum AS ENUM (
      'global',    -- quota shared across all pets of a user
      'per_pet'    -- quota is counted independently per pet
    );
  END IF;
END $$;

COMMENT ON TYPE public.feature_scope_enum IS
  'Determines whether a feature limit is user-global or per-pet.';

-- 1c. feature_status_enum
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'feature_status_enum'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.feature_status_enum AS ENUM (
      'active',
      'beta',
      'deprecated'
    );
  END IF;
END $$;

COMMENT ON TYPE public.feature_status_enum IS
  'Lifecycle state of a feature entry in app_features.';

-- 1d. audit_action_enum
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'audit_action_enum'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.audit_action_enum AS ENUM (
      'feature_created',
      'feature_updated',
      'feature_deprecated',
      'limit_created',
      'limit_updated',
      'usage_recorded',
      'usage_reset'
    );
  END IF;
END $$;

COMMENT ON TYPE public.audit_action_enum IS
  'Discrete actions tracked in feature_audit_logs.';

-- ---------------------------------------------------------------------------
-- §2. app_features — Canonical Feature Catalogue
--     Single source of truth for every toggleable feature.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_features (
  key         TEXT                        PRIMARY KEY,
  label       TEXT                        NOT NULL,
  description TEXT,
  scope       public.feature_scope_enum   NOT NULL DEFAULT 'global',
  status      public.feature_status_enum  NOT NULL DEFAULT 'active',
  metadata    JSONB                        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ                 NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ                 NOT NULL DEFAULT now(),

  CONSTRAINT app_features_key_format CHECK (
    key ~ '^[a-z][a-z0-9_]{1,62}[a-z0-9]$'
  )
);

COMMENT ON TABLE  public.app_features          IS 'Canonical catalogue of all Feature Registry entries.';
COMMENT ON COLUMN public.app_features.key      IS 'snake_case identifier, e.g. ai_vet_assistant. Immutable after creation.';
COMMENT ON COLUMN public.app_features.scope    IS 'global = per-user quota; per_pet = quota counted per pet.';
COMMENT ON COLUMN public.app_features.metadata IS 'Arbitrary extensibility bag (icon, docs_url, flags, etc.).';

-- Indexes
CREATE INDEX IF NOT EXISTS app_features_status_idx
  ON public.app_features (status);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_app_features_updated_at ON public.app_features;
CREATE TRIGGER trg_app_features_updated_at
  BEFORE UPDATE ON public.app_features
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.app_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_features_authenticated_select" ON public.app_features;
CREATE POLICY "app_features_authenticated_select"
  ON public.app_features
  FOR SELECT
  TO authenticated
  USING (status <> 'deprecated');

-- Grants
REVOKE ALL ON TABLE public.app_features FROM anon, authenticated;
GRANT SELECT                        ON TABLE public.app_features TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_features TO service_role;

-- ---------------------------------------------------------------------------
-- §3. feature_limits — Per-Plan Quotas
--     NULL limit_value means unlimited for that plan+feature combination.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.feature_limits (
  id           UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key  TEXT                      NOT NULL
                 REFERENCES public.app_features(key) ON DELETE CASCADE ON UPDATE CASCADE,
  plan_tier    public.plan_tier_enum     NOT NULL,
  limit_value  INTEGER                   CHECK (limit_value IS NULL OR limit_value >= 0),
  window_days  INTEGER                   NOT NULL DEFAULT 30
                 CHECK (window_days BETWEEN 1 AND 366),
  is_enabled   BOOLEAN                   NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ               NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ               NOT NULL DEFAULT now(),

  CONSTRAINT feature_limits_unique_feature_plan UNIQUE (feature_key, plan_tier)
);

COMMENT ON TABLE  public.feature_limits              IS 'Quota definitions per feature × plan tier.';
COMMENT ON COLUMN public.feature_limits.limit_value  IS 'NULL = unlimited. 0 = feature disabled for this tier.';
COMMENT ON COLUMN public.feature_limits.window_days  IS 'Rolling window length in days (1–366).';

-- Indexes
CREATE INDEX IF NOT EXISTS feature_limits_feature_plan_idx
  ON public.feature_limits (feature_key, plan_tier);

CREATE INDEX IF NOT EXISTS feature_limits_plan_enabled_idx
  ON public.feature_limits (plan_tier)
  WHERE is_enabled = true;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_feature_limits_updated_at ON public.feature_limits;
CREATE TRIGGER trg_feature_limits_updated_at
  BEFORE UPDATE ON public.feature_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.feature_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_limits_authenticated_select" ON public.feature_limits;
CREATE POLICY "feature_limits_authenticated_select"
  ON public.feature_limits
  FOR SELECT
  TO authenticated
  USING (is_enabled = true);

-- Grants
REVOKE ALL ON TABLE public.feature_limits FROM anon, authenticated;
GRANT SELECT                        ON TABLE public.feature_limits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.feature_limits TO service_role;

-- ---------------------------------------------------------------------------
-- §4. feature_usage — Per-User Rolling Counters
--
--     Uniqueness strategy: two partial unique indexes instead of one composite
--     index with nullable pet_id (NULL ≠ NULL in standard SQL unique indexes).
--
--     • global features → pet_id IS NULL  → index A
--     • per_pet features → pet_id IS NOT NULL → index B
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.feature_usage (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   UUID         NOT NULL
                 REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key  TEXT         NOT NULL
                 REFERENCES public.app_features(key) ON DELETE CASCADE ON UPDATE CASCADE,
  pet_id       UUID
                 REFERENCES public.pets(id) ON DELETE CASCADE,
  window_start DATE         NOT NULL,
  count        INTEGER      NOT NULL DEFAULT 0 CHECK (count >= 0),
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.feature_usage              IS 'Rolling usage counters per user (and optionally per pet) per window.';
COMMENT ON COLUMN public.feature_usage.window_start IS 'Start date of the rolling window (e.g. first day of usage in the period).';
COMMENT ON COLUMN public.feature_usage.count        IS 'Number of times feature was used in this window. Never goes negative.';
COMMENT ON COLUMN public.feature_usage.pet_id       IS 'NULL for global-scope features; set for per_pet-scope features.';

-- Partial unique indexes (uniqueness without NULL-equality problem)
CREATE UNIQUE INDEX IF NOT EXISTS feature_usage_global_unique_idx
  ON public.feature_usage (profile_id, feature_key, window_start)
  WHERE pet_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS feature_usage_per_pet_unique_idx
  ON public.feature_usage (profile_id, feature_key, pet_id, window_start)
  WHERE pet_id IS NOT NULL;

-- Supporting indexes
CREATE INDEX IF NOT EXISTS feature_usage_profile_feature_window_idx
  ON public.feature_usage (profile_id, feature_key, window_start DESC);

CREATE INDEX IF NOT EXISTS feature_usage_pet_idx
  ON public.feature_usage (pet_id)
  WHERE pet_id IS NOT NULL;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_feature_usage_updated_at ON public.feature_usage;
CREATE TRIGGER trg_feature_usage_updated_at
  BEFORE UPDATE ON public.feature_usage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_usage_owner_select" ON public.feature_usage;
CREATE POLICY "feature_usage_owner_select"
  ON public.feature_usage
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "feature_usage_owner_insert" ON public.feature_usage;
CREATE POLICY "feature_usage_owner_insert"
  ON public.feature_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "feature_usage_owner_update" ON public.feature_usage;
CREATE POLICY "feature_usage_owner_update"
  ON public.feature_usage
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- No DELETE policy for authenticated → enforces soft-delete / archival pattern
-- (hard delete available only via service_role, per OPOS Cilt 5)

-- Grants
REVOKE ALL ON TABLE public.feature_usage FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.feature_usage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.feature_usage TO service_role;

-- ---------------------------------------------------------------------------
-- §5. feature_audit_logs — Append-Only Change History
--
--     • No updated_at column — records are immutable by design.
--     • Append enforced via RLS: authenticated cannot INSERT/UPDATE/DELETE.
--     • All writes go through service_role (RPCs/Edge Functions).
--     • BRIN index on created_at for efficient time-range scans.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.feature_audit_logs (
  id           UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  action       public.audit_action_enum   NOT NULL,
  actor_id     UUID
                 REFERENCES public.profiles(id) ON DELETE SET NULL,
  feature_key  TEXT,   -- intentionally no FK: logs survive feature deletion
  before_state JSONB,
  after_state  JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ                NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.feature_audit_logs              IS 'Immutable audit log for Feature Registry changes. Written only via service_role.';
COMMENT ON COLUMN public.feature_audit_logs.feature_key  IS 'Denormalised key (no FK) so logs survive feature deletion.';
COMMENT ON COLUMN public.feature_audit_logs.before_state IS 'JSONB snapshot of the row before the action.';
COMMENT ON COLUMN public.feature_audit_logs.after_state  IS 'JSONB snapshot of the row after the action.';
COMMENT ON COLUMN public.feature_audit_logs.ip_address   IS 'Optional: caller IP for security-sensitive changes.';

-- Indexes
CREATE INDEX IF NOT EXISTS feature_audit_logs_feature_key_idx
  ON public.feature_audit_logs (feature_key);

CREATE INDEX IF NOT EXISTS feature_audit_logs_actor_idx
  ON public.feature_audit_logs (actor_id)
  WHERE actor_id IS NOT NULL;

-- BRIN index for time-range queries (efficient for append-heavy tables)
CREATE INDEX IF NOT EXISTS feature_audit_logs_created_at_brin_idx
  ON public.feature_audit_logs USING BRIN (created_at);

-- RLS
ALTER TABLE public.feature_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin / founder can read all logs
DROP POLICY IF EXISTS "feature_audit_logs_admin_select" ON public.feature_audit_logs;
CREATE POLICY "feature_audit_logs_admin_select"
  ON public.feature_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role::text IN ('admin', 'founder')
    )
  );

-- All other write operations denied for authenticated (service_role bypasses RLS)
DROP POLICY IF EXISTS "feature_audit_logs_deny_mutate" ON public.feature_audit_logs;
CREATE POLICY "feature_audit_logs_deny_mutate"
  ON public.feature_audit_logs
  FOR ALL  -- INSERT, UPDATE, DELETE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Grants
REVOKE ALL ON TABLE public.feature_audit_logs FROM anon, authenticated;
GRANT SELECT                        ON TABLE public.feature_audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.feature_audit_logs TO service_role;

-- ---------------------------------------------------------------------------
-- §6. Sequence grants (needed by Supabase PostgREST for INSERT returning id)
-- ---------------------------------------------------------------------------
-- Tables use gen_random_uuid() so no sequences to grant.
-- Explicit note for future maintainers.

-- ---------------------------------------------------------------------------
-- §7. Final integrity check (will RAISE if something is wrong)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_missing TEXT[];
BEGIN
  SELECT array_agg(t) INTO v_missing
  FROM unnest(ARRAY[
    'app_features',
    'feature_limits',
    'feature_usage',
    'feature_audit_logs'
  ]) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = t
  );

  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Feature Registry Phase 1 integrity check FAILED — missing tables: %', v_missing;
  END IF;

  RAISE NOTICE 'Feature Registry Phase 1: all tables present. Migration complete.';
END $$;

COMMIT;

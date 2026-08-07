-- =============================================================================
-- Feature Registry - Phase 17.5: Ensure missing tables are created
-- Migration : 20260807080000_create_missing_tables.sql
-- =============================================================================

BEGIN;

-- 1. Idempotency Log Store for full response replay
CREATE TABLE IF NOT EXISTS public.feature_idempotency_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  response_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  CONSTRAINT uq_idempotency_key_feature UNIQUE (idempotency_key, feature_key, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_lookup ON public.feature_idempotency_logs (idempotency_key, profile_id);

-- 2. Emergency Global Kill Switches Table
CREATE TABLE IF NOT EXISTS public.feature_kill_switches (
  feature_key TEXT PRIMARY KEY,
  disabled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  disabled_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT
);



COMMIT;

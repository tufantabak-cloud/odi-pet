-- =============================================================================
-- Feature Registry - Phase 7: Enterprise Premium System V3
-- Migration : 20260807013400_enterprise_premium_v3.sql
-- =============================================================================

BEGIN;

-- 1. Create app_plans Table
CREATE TABLE IF NOT EXISTS public.app_plans (
  plan_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial plans
INSERT INTO public.app_plans (plan_key, name, description, display_order)
VALUES 
  ('free', 'Ücretsiz (Free)', 'Standart temel erişim.', 1),
  ('pro', 'Pro Plan', 'Tüm temel ve premium özellikler.', 2),
  ('ai_plus', 'AI+ Plan', 'Gelişmiş AI özellikleri.', 3)
ON CONFLICT (plan_key) DO NOTHING;

-- 2. Create feature_limits_draft Table
CREATE TABLE IF NOT EXISTS public.feature_limits_draft (
  feature_key TEXT NOT NULL,
  plan TEXT NOT NULL, -- references app_plans(plan_key) ideally, but we keep it TEXT to be flexible for now
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  limit_type TEXT NOT NULL,
  limit_value INTEGER,
  window_value INTEGER,
  window_unit TEXT,
  carry_over_policy TEXT DEFAULT 'none',
  burst_limit INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID, -- which admin updated this
  PRIMARY KEY (feature_key, plan),
  CONSTRAINT chk_limit_type_draft CHECK (limit_type IN ('unlimited', 'quota', 'boolean')),
  CONSTRAINT chk_window_unit_draft CHECK (window_unit IN ('minute', 'hour', 'day', 'week', 'month', 'year', 'lifetime')),
  CONSTRAINT chk_carry_over_draft CHECK (carry_over_policy IN ('none', 'full', 'partial', 'cap50'))
);

-- 3. Create feature_limits_versions Table
CREATE TABLE IF NOT EXISTS public.feature_limits_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number SERIAL,
  published_by UUID NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  limits_snapshot JSONB NOT NULL,
  description TEXT
);

-- 4. Create premium_audit_logs Table
CREATE TABLE IF NOT EXISTS public.premium_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- e.g. 'LIMIT_DRAFT_SAVED', 'LIMITS_PUBLISHED', 'REGISTRY_SYNC'
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_plans_auth_select" ON public.app_plans;
CREATE POLICY "app_plans_auth_select" ON public.app_plans FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.app_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_plans TO service_role;

ALTER TABLE public.feature_limits_draft ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_limits_draft TO service_role;

ALTER TABLE public.feature_limits_versions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feature_limits_versions TO service_role;

ALTER TABLE public.premium_audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_audit_logs TO service_role;

COMMIT;

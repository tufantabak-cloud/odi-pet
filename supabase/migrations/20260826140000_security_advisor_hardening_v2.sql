-- =============================================================================
-- ODI.PET — SUPABASE SECURITY HARDENING PATCH v2
-- Migration: 20260826140000_security_advisor_hardening_v2.sql
-- =============================================================================

BEGIN;

-- =========================================================================
-- STEP 0: REMEDIATE DOWNSTREAM DEPENDENCY (security_audit_logs)
-- Replace the policy that depends on public.users with public.profiles
-- =========================================================================
DROP POLICY IF EXISTS "Super admins can read audit logs" ON public.security_audit_logs;
CREATE POLICY "Super admins can read audit logs" ON public.security_audit_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT profiles.id
      FROM public.profiles profiles
      WHERE profiles.role = 'admin'::user_role
    )
  );

-- =========================================================================
-- STEP 1: DROP orphan test table
-- =========================================================================
DROP TABLE IF EXISTS public.test_orchestrator_check;

-- =========================================================================
-- STEP 2: DROP orphan views
-- =========================================================================
DROP VIEW IF EXISTS public.nutrition_overview;
DROP VIEW IF EXISTS public.daily_user_metrics;

-- =========================================================================
-- STEP 3: DROP orphan table
-- =========================================================================
DROP TABLE IF EXISTS public.app_users;

-- =========================================================================
-- STEP 4: DROP legacy auth.users bridge view (Dependency resolved in STEP 0)
-- =========================================================================
DROP VIEW IF EXISTS public.users;

-- =========================================================================
-- STEP 5: feature_kill_switches — Server-Only Lockdown
-- =========================================================================
ALTER TABLE public.feature_kill_switches ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feature_kill_switches FROM PUBLIC;
REVOKE ALL ON public.feature_kill_switches FROM anon;
REVOKE ALL ON public.feature_kill_switches FROM authenticated;

-- =========================================================================
-- STEP 6: feature_idempotency_logs — Server-Only Lockdown
-- =========================================================================
ALTER TABLE public.feature_idempotency_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feature_idempotency_logs FROM PUBLIC;
REVOKE ALL ON public.feature_idempotency_logs FROM anon;
REVOKE ALL ON public.feature_idempotency_logs FROM authenticated;

-- =========================================================================
-- STEP 7: content_source_verification_audits — RLS & Grants
-- =========================================================================
ALTER TABLE public.content_source_verification_audits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_source_verification_audits FROM PUBLIC;
REVOKE ALL ON public.content_source_verification_audits FROM anon;
GRANT SELECT, INSERT ON public.content_source_verification_audits TO authenticated;

-- =========================================================================
-- STEP 8: SECURITY DEFINER Hardening (Search Path)
-- =========================================================================
ALTER FUNCTION public.consume_feature_usage(uuid, text, uuid, integer, text) 
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.verify_job_source_atomic(uuid, uuid, text, boolean, boolean, text) 
  SET search_path = public, pg_catalog;

COMMIT;

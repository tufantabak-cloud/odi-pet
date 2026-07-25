-- Migration: Harden referrals and outreach_pipeline authorization boundaries.
-- Safety:
--   * Forward-only and transactional.
--   * Does not mutate or delete table data.
--   * Fails closed if an unexpected policy exists.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin_or_founder()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'founder')
  );
$function$;

REVOKE ALL PRIVILEGES
ON FUNCTION public.is_admin_or_founder()
FROM PUBLIC;

REVOKE ALL PRIVILEGES
ON FUNCTION public.is_admin_or_founder()
FROM anon;

GRANT EXECUTE
ON FUNCTION public.is_admin_or_founder()
TO authenticated, service_role;

ALTER TABLE public.outreach_pipeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access outreach"
ON public.outreach_pipeline;

DROP POLICY IF EXISTS "authenticated full access outreach"
ON public.outreach_pipeline;

DROP POLICY IF EXISTS "Enable full access for authenticated users"
ON public.outreach_pipeline;

DROP POLICY IF EXISTS "Sadece service_role erişebilir"
ON public.outreach_pipeline;

CREATE POLICY "outreach_admin_founder_all"
ON public.outreach_pipeline
FOR ALL
TO authenticated
USING (public.is_admin_or_founder())
WITH CHECK (public.is_admin_or_founder());

REVOKE ALL PRIVILEGES
ON TABLE public.outreach_pipeline
FROM anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.outreach_pipeline
TO authenticated, service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can manage referrals"
ON public.referrals;

DROP POLICY IF EXISTS "Users can manage referrals"
ON public.referrals;

DROP POLICY IF EXISTS "Users can view their referrals"
ON public.referrals;

DROP POLICY IF EXISTS "referrals_select_own"
ON public.referrals;

DROP POLICY IF EXISTS "referrals_insert_own"
ON public.referrals;

DROP POLICY IF EXISTS "Kullanıcılar sadece kendi referanslarını görebilir"
ON public.referrals;

CREATE POLICY "referrals_select_own"
ON public.referrals
FOR SELECT
TO authenticated
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "referrals_insert_self"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = referred_id
  AND referrer_id <> referred_id
);

REVOKE ALL PRIVILEGES
ON TABLE public.referrals
FROM anon, authenticated, service_role;

GRANT SELECT, INSERT
ON TABLE public.referrals
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.referrals
TO service_role;

DO $policy_invariant$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'outreach_pipeline'
      AND policyname <> 'outreach_admin_founder_all'
  ) THEN
    RAISE EXCEPTION
      'Unexpected outreach_pipeline policy remains after hardening';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'referrals'
      AND policyname NOT IN (
        'referrals_select_own',
        'referrals_insert_self'
      )
  ) THEN
    RAISE EXCEPTION
      'Unexpected referrals policy remains after hardening';
  END IF;
END;
$policy_invariant$;

COMMIT;

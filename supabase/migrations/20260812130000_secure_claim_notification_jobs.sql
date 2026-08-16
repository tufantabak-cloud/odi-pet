-- Migration: Secure claim_notification_jobs authorization boundary (P0 remediation)
-- Date: 2026-08-12
-- Forensic finding: public.claim_notification_jobs(INT) is SECURITY DEFINER,
-- bypasses RLS on notification_jobs/plans, contains no auth.uid() authorization
-- check, and was GRANTed to `authenticated` (and, by Postgres default at CREATE
-- FUNCTION time, implicitly to PUBLIC, which includes `anon`). Any signed-in
-- (and possibly anonymous) caller could invoke the RPC directly via
-- supabase.rpc('claim_notification_jobs', ...) and receive/lock other users'
-- notification_jobs metadata (plan_id, user_id, pet_id, category, scheduled_at).
--
-- Verified sole legitimate caller: supabase/functions/dispatch-notifications/index.ts
-- via a service-role Supabase client (createClient(SUPABASE_URL, SERVICE_ROLE_KEY)).
-- No other caller exists anywhere in the repository (src/**, supabase/functions/**).
-- This confirms claim_notification_jobs is a service-role-only infrastructure RPC,
-- not something authenticated end users are meant to call.
--
-- Fix: revoke EXECUTE from PUBLIC/anon/authenticated, keep it service_role-only
-- (same established pattern already used by public.complete_recurring_plan in
-- 20260723170000_rpc_idempotency_order_fix.sql). Also pin a fixed, safe
-- search_path on the SECURITY DEFINER function (the original CREATE in
-- 20260811200000_fix_plan_push_reminders.sql did not set one), matching the
-- convention already established for other hardened functions in this project
-- (see e.g. execute_ddl/execute_sql in dynamic_sql_helpers_privileges.test.sql).
--
-- This migration does not alter the function body, its SKIP LOCKED / locking
-- behavior, its dedup/lock semantics, or the notification dispatch pipeline.

REVOKE EXECUTE ON FUNCTION public.claim_notification_jobs(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_notification_jobs(INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_notification_jobs(INT) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.claim_notification_jobs(INT) TO service_role;

ALTER FUNCTION public.claim_notification_jobs(INT) SET search_path = public, pg_temp;

-- ============================================================================
-- P0 Security Regression: public.claim_notification_jobs(INT) authorization
-- Verifies the 20260812130000_secure_claim_notification_jobs.sql remediation:
--   - PUBLIC / anon / authenticated cannot execute the RPC (confidentiality +
--     integrity: no cross-user notification_jobs metadata read, no cross-user
--     job locking).
--   - service_role retains EXECUTE (legitimate dispatch-notifications caller
--     keeps working).
--   - the function has a fixed, safe search_path (SECURITY DEFINER hardening).
--   - an authenticated end user attempting to call the RPC is rejected by
--     Postgres at the permission layer (42501), before any row can be read
--     or locked — i.e. the leakage vector is closed by construction, not by
--     hiding the RPC from frontend code.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(8);

-- 1. PUBLIC cannot execute
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc AS proc
    CROSS JOIN LATERAL aclexplode(
      COALESCE(proc.proacl, acldefault('f', proc.proowner))
    ) AS privilege
    WHERE proc.oid = to_regprocedure('public.claim_notification_jobs(integer)')
      AND privilege.grantee = 0
      AND privilege.privilege_type = 'EXECUTE'
  ),
  'PUBLIC cannot execute claim_notification_jobs'
);

-- 2. anon cannot execute
SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.claim_notification_jobs(integer)',
    'EXECUTE'
  ),
  'anon cannot execute claim_notification_jobs'
);

-- 3. authenticated cannot execute
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.claim_notification_jobs(integer)',
    'EXECUTE'
  ),
  'authenticated cannot execute claim_notification_jobs'
);

-- 4. service_role retains EXECUTE (legitimate dispatch-notifications caller)
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.claim_notification_jobs(integer)',
    'EXECUTE'
  ),
  'service_role can still execute claim_notification_jobs (dispatch pipeline preserved)'
);

-- 5. Fixed, safe search_path on the SECURITY DEFINER function
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc AS proc
    CROSS JOIN LATERAL unnest(COALESCE(proc.proconfig, ARRAY[]::text[])) AS setting
    WHERE proc.oid = to_regprocedure('public.claim_notification_jobs(integer)')
      AND setting = 'search_path=public, pg_temp'
  ),
  'claim_notification_jobs has a fixed, safe search_path'
);

-- 6. Still SECURITY DEFINER (dispatch pipeline needs it to bypass RLS as service_role)
SELECT ok(
  (SELECT prosecdef FROM pg_proc WHERE oid = to_regprocedure('public.claim_notification_jobs(integer)')),
  'claim_notification_jobs remains SECURITY DEFINER'
);

-- 7. A real authenticated session is rejected at the permission layer (not just
--    hidden from frontend code) -- this is the actual exploit path from the
--    forensic finding: supabase.rpc('claim_notification_jobs', {p_limit: 50})
--    called directly by a signed-in user.
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"73000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT throws_ok(
  $$ SELECT * FROM public.claim_notification_jobs(50) $$,
  '42501',
  NULL,
  'authenticated end user cannot claim/read other users'' notification_jobs metadata'
);

RESET ROLE;

-- 8. service_role execution still succeeds (no rows required -- only proving
--    no exception is raised, i.e. the dispatch pipeline is not broken).
SET LOCAL ROLE service_role;

SELECT lives_ok(
  $$ SELECT * FROM public.claim_notification_jobs(1) $$,
  'service_role (the real notification dispatcher) can still call claim_notification_jobs'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;

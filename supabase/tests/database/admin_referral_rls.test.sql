-- ============================================================================
-- Admin outreach and referral RLS pgTAP test suite
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(22);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'outreach_pipeline'
  ),
  1,
  'outreach_pipeline has exactly one policy'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'outreach_pipeline'
      AND policyname = 'outreach_admin_founder_all'
      AND cmd = 'ALL'
      AND roles = ARRAY['authenticated']::name[]
  ),
  'outreach policy is limited to authenticated admin/founder checks'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'referrals'
  ),
  2,
  'referrals has exactly two policies'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'referrals'
      AND (
        cmd = 'ALL'
        OR coalesce(qual, '') = 'true'
        OR coalesce(with_check, '') = 'true'
      )
  ),
  'referrals has no broad ALL or true policy'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.is_admin_or_founder()',
    'EXECUTE'
  )
  AND has_function_privilege(
    'authenticated',
    'public.is_admin_or_founder()',
    'EXECUTE'
  ),
  'admin role helper is unavailable to anon and available to authenticated'
);

SET LOCAL ROLE postgres;

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.outreach_pipeline TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.referrals TO authenticated;

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  aud,
  role
) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'owner-a@test.local',
    'password',
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'owner-b@test.local',
    'password',
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'owner-c@test.local',
    'password',
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'owner-d@test.local',
    'password',
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'admin@test.local',
    'password',
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'founder@test.local',
    'password',
    now(),
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, first_name, role) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Owner A', 'owner'),
  ('10000000-0000-0000-0000-000000000002', 'Owner B', 'owner'),
  ('10000000-0000-0000-0000-000000000003', 'Owner C', 'owner'),
  ('10000000-0000-0000-0000-000000000004', 'Owner D', 'owner'),
  ('20000000-0000-0000-0000-000000000001', 'Admin', 'admin'),
  ('30000000-0000-0000-0000-000000000001', 'Founder', 'founder')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.outreach_pipeline (id, name, type, stage)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  'RLS Test Contact',
  'pet_owner',
  'sourced'
);

INSERT INTO public.referrals (
  id,
  referrer_id,
  referred_id,
  referral_code
) VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    'ODI-RLS-A'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    'ODI-RLS-C'
  );

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::integer FROM public.outreach_pipeline),
  0,
  'owner cannot read outreach_pipeline'
);

SELECT throws_ok(
  $$
    INSERT INTO public.outreach_pipeline (name, type)
    VALUES ('Unauthorized Contact', 'pet_owner')
  $$,
  '42501',
  NULL,
  'owner cannot insert outreach_pipeline'
);

SET LOCAL ROLE postgres;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::integer FROM public.outreach_pipeline),
  1,
  'admin can read outreach_pipeline'
);

SELECT lives_ok(
  $$
    INSERT INTO public.outreach_pipeline (id, name, type)
    VALUES (
      '40000000-0000-0000-0000-000000000002',
      'Admin Contact',
      'creator'
    )
  $$,
  'admin can insert outreach_pipeline'
);

SELECT lives_ok(
  $$
    UPDATE public.outreach_pipeline
    SET stage = 'contacted'
    WHERE id = '40000000-0000-0000-0000-000000000002'
  $$,
  'admin can update outreach_pipeline'
);

SET LOCAL ROLE postgres;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::integer FROM public.outreach_pipeline),
  2,
  'founder can read outreach_pipeline'
);

SELECT lives_ok(
  $$
    DELETE FROM public.outreach_pipeline
    WHERE id = '40000000-0000-0000-0000-000000000002'
  $$,
  'founder can delete outreach_pipeline'
);

SET LOCAL ROLE postgres;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT is(
  (SELECT count(*)::integer FROM public.referrals),
  1,
  'referrer sees only own referral'
);

SELECT is_empty(
  $$
    UPDATE public.referrals
    SET referral_code = 'ODI-TAMPER'
    WHERE id = '50000000-0000-0000-0000-000000000001'
    RETURNING id
  $$,
  'authenticated user cannot update referral'
);

SELECT is_empty(
  $$
    DELETE FROM public.referrals
    WHERE id = '50000000-0000-0000-0000-000000000001'
    RETURNING id
  $$,
  'authenticated user cannot delete referral'
);

SET LOCAL ROLE postgres;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.referrals
    WHERE id = '50000000-0000-0000-0000-000000000001'
  ),
  1,
  'referred user can read own referral'
);

SET LOCAL ROLE postgres;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.referrals
    WHERE id = '50000000-0000-0000-0000-000000000001'
  ),
  0,
  'unrelated user cannot read another referral'
);

SELECT throws_ok(
  $$
    INSERT INTO public.referrals (
      referrer_id,
      referred_id,
      referral_code
    ) VALUES (
      '10000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000003',
      'ODI-SELF'
    )
  $$,
  '42501',
  NULL,
  'user cannot refer self'
);

SELECT lives_ok(
  $$
    INSERT INTO public.referrals (
      referrer_id,
      referred_id,
      referral_code
    ) VALUES (
      '10000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000003',
      'ODI-VALID'
    )
  $$,
  'user can create referral only for self as referred user'
);

SELECT throws_ok(
  $$
    INSERT INTO public.referrals (
      referrer_id,
      referred_id,
      referral_code
    ) VALUES (
      '10000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      'ODI-OTHER'
    )
  $$,
  '42501',
  NULL,
  'user cannot create referral for another user'
);

SET LOCAL ROLE postgres;

REVOKE UPDATE, DELETE
  ON public.referrals FROM authenticated;

SELECT ok(
  has_table_privilege(
    'authenticated',
    'public.outreach_pipeline',
    'SELECT'
  )
  AND has_table_privilege(
    'authenticated',
    'public.outreach_pipeline',
    'INSERT'
  )
  AND has_table_privilege(
    'authenticated',
    'public.outreach_pipeline',
    'UPDATE'
  )
  AND has_table_privilege(
    'authenticated',
    'public.outreach_pipeline',
    'DELETE'
  ),
  'authenticated has outreach DML grants constrained by RLS'
);

SELECT ok(
  has_table_privilege(
    'authenticated',
    'public.referrals',
    'SELECT'
  )
  AND has_table_privilege(
    'authenticated',
    'public.referrals',
    'INSERT'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.referrals',
    'UPDATE'
  )
  AND NOT has_table_privilege(
    'authenticated',
    'public.referrals',
    'DELETE'
  ),
  'authenticated referral grants are select and insert only'
);

SELECT * FROM finish();

ROLLBACK;

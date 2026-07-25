-- ============================================================================
-- Dynamic SQL Helper Privilege pgTAP Test Suite
-- A removed helper is safe; an existing helper must be service_role-only and
-- must use a fixed, caller-independent search_path.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(10);

-- public.execute_ddl(text)
SELECT ok(
  CASE
    WHEN to_regprocedure('public.execute_ddl(text)') IS NULL THEN true
    ELSE NOT EXISTS (
      SELECT 1
      FROM pg_proc AS proc
      CROSS JOIN LATERAL aclexplode(
        COALESCE(proc.proacl, acldefault('f', proc.proowner))
      ) AS privilege
      WHERE proc.oid = to_regprocedure('public.execute_ddl(text)')
        AND privilege.grantee = 0
        AND privilege.privilege_type = 'EXECUTE'
    )
  END,
  'PUBLIC cannot execute execute_ddl'
);

SELECT ok(
  CASE
    WHEN to_regprocedure('public.execute_ddl(text)') IS NULL THEN true
    ELSE NOT has_function_privilege(
      'anon',
      to_regprocedure('public.execute_ddl(text)'),
      'EXECUTE'
    )
  END,
  'anon cannot execute execute_ddl'
);

SELECT ok(
  CASE
    WHEN to_regprocedure('public.execute_ddl(text)') IS NULL THEN true
    ELSE NOT has_function_privilege(
      'authenticated',
      to_regprocedure('public.execute_ddl(text)'),
      'EXECUTE'
    )
  END,
  'authenticated owners cannot execute execute_ddl'
);

SELECT ok(
  CASE
    WHEN to_regprocedure('public.execute_ddl(text)') IS NULL THEN true
    ELSE has_function_privilege(
      'service_role',
      to_regprocedure('public.execute_ddl(text)'),
      'EXECUTE'
    )
  END,
  'execute_ddl is absent or executable by service_role'
);

SELECT ok(
  CASE
    WHEN to_regprocedure('public.execute_ddl(text)') IS NULL THEN true
    ELSE EXISTS (
      SELECT 1
      FROM pg_proc AS proc
      CROSS JOIN LATERAL unnest(COALESCE(proc.proconfig, ARRAY[]::text[]))
        AS setting
      WHERE proc.oid = to_regprocedure('public.execute_ddl(text)')
        AND setting = 'search_path=pg_catalog, pg_temp'
    )
  END,
  'execute_ddl is absent or has a fixed safe search_path'
);

-- public.execute_sql(text)
SELECT ok(
  CASE
    WHEN to_regprocedure('public.execute_sql(text)') IS NULL THEN true
    ELSE NOT EXISTS (
      SELECT 1
      FROM pg_proc AS proc
      CROSS JOIN LATERAL aclexplode(
        COALESCE(proc.proacl, acldefault('f', proc.proowner))
      ) AS privilege
      WHERE proc.oid = to_regprocedure('public.execute_sql(text)')
        AND privilege.grantee = 0
        AND privilege.privilege_type = 'EXECUTE'
    )
  END,
  'PUBLIC cannot execute execute_sql'
);

SELECT ok(
  CASE
    WHEN to_regprocedure('public.execute_sql(text)') IS NULL THEN true
    ELSE NOT has_function_privilege(
      'anon',
      to_regprocedure('public.execute_sql(text)'),
      'EXECUTE'
    )
  END,
  'anon cannot execute execute_sql'
);

SELECT ok(
  CASE
    WHEN to_regprocedure('public.execute_sql(text)') IS NULL THEN true
    ELSE NOT has_function_privilege(
      'authenticated',
      to_regprocedure('public.execute_sql(text)'),
      'EXECUTE'
    )
  END,
  'authenticated owners cannot execute execute_sql'
);

SELECT ok(
  CASE
    WHEN to_regprocedure('public.execute_sql(text)') IS NULL THEN true
    ELSE has_function_privilege(
      'service_role',
      to_regprocedure('public.execute_sql(text)'),
      'EXECUTE'
    )
  END,
  'execute_sql is absent or executable by service_role'
);

SELECT ok(
  CASE
    WHEN to_regprocedure('public.execute_sql(text)') IS NULL THEN true
    ELSE EXISTS (
      SELECT 1
      FROM pg_proc AS proc
      CROSS JOIN LATERAL unnest(COALESCE(proc.proconfig, ARRAY[]::text[]))
        AS setting
      WHERE proc.oid = to_regprocedure('public.execute_sql(text)')
        AND setting = 'search_path=pg_catalog, pg_temp'
    )
  END,
  'execute_sql is absent or has a fixed safe search_path'
);

SELECT * FROM finish();

ROLLBACK;

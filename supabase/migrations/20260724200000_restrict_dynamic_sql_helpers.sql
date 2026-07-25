-- Migration: Restrict dynamic SQL helper functions to service_role only.
-- Safety:
--   * Forward-only and idempotent.
--   * Does not recreate a helper that was already removed.
--   * Does not drop functions or mutate application data.

BEGIN;

DO $migration$
DECLARE
  helper_signature regprocedure;
  helper_name text;
BEGIN
  FOREACH helper_name IN ARRAY ARRAY['execute_ddl', 'execute_sql']
  LOOP
    helper_signature := to_regprocedure(
      format('public.%I(text)', helper_name)
    );

    IF helper_signature IS NULL THEN
      RAISE NOTICE 'Skipping public.%(text): function does not exist.', helper_name;
      CONTINUE;
    END IF;

    -- SECURITY DEFINER functions must not inherit caller-controlled schemas.
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = pg_catalog, pg_temp',
      helper_signature
    );

    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON FUNCTION %s FROM PUBLIC',
      helper_signature
    );

    IF to_regrole('anon') IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON FUNCTION %s FROM anon',
        helper_signature
      );
    END IF;

    IF to_regrole('authenticated') IS NOT NULL THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON FUNCTION %s FROM authenticated',
        helper_signature
      );
    END IF;

    IF to_regrole('service_role') IS NOT NULL THEN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION %s TO service_role',
        helper_signature
      );
    END IF;
  END LOOP;
END;
$migration$;

COMMIT;

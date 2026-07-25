BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(3);

SELECT ok(
  position(
    'source_plan_item_id' IN (
    SELECT prosrc
    FROM pg_proc
    WHERE oid = 'public.fn_validate_parasite_record()'::regprocedure
    )
  ) = 0,
  'parasite record trigger does not reference removed source_plan_item_id'
);

SELECT ok(
  position(
    'parasite_plan_items' IN (
    SELECT prosrc
    FROM pg_proc
    WHERE oid = 'public.fn_validate_parasite_record()'::regprocedure
    )
  ) = 0,
  'parasite record trigger does not reference removed legacy table'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.fn_validate_parasite_record()',
    'EXECUTE'
  )
  AND has_function_privilege(
    'service_role',
    'public.fn_validate_parasite_record()',
    'EXECUTE'
  ),
  'trigger function is not directly executable by client roles'
);

SELECT * FROM finish();

ROLLBACK;

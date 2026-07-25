BEGIN;

SELECT plan(3);

SELECT has_column(
  'public',
  'weight_logs',
  'height_cm',
  'weight_logs.height_cm should exist'
);

SELECT col_type_is(
  'public',
  'weight_logs',
  'height_cm',
  'numeric(5,2)',
  'weight_logs.height_cm should be numeric(5,2)'
);

SELECT col_is_null(
  'public',
  'weight_logs',
  'height_cm',
  'weight_logs.height_cm should remain optional'
);

SELECT * FROM finish();

ROLLBACK;

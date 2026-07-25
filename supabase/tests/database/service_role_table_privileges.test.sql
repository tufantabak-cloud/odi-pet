BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(4);

SELECT ok(
  has_table_privilege('service_role', 'public.pets', 'SELECT, INSERT, UPDATE, DELETE'),
  'service_role has pets CRUD privileges'
);

SELECT ok(
  has_table_privilege('service_role', 'public.profiles', 'SELECT, INSERT, UPDATE, DELETE'),
  'service_role has profiles CRUD privileges'
);

SELECT ok(
  has_table_privilege(
    'service_role',
    'public.parasite_products',
    'SELECT, INSERT, UPDATE, DELETE'
  ),
  'service_role has parasite product CRUD privileges'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.parasite_products', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.parasite_products', 'INSERT'),
  'catalog write privileges are not broadened to client roles'
);

SELECT * FROM finish();

ROLLBACK;

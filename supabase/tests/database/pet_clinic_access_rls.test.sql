BEGIN;

SELECT plan(8);

SELECT ok(
  (
    SELECT relrowsecurity
    FROM pg_class
    WHERE oid = 'public.pet_clinic_access'::regclass
  ),
  'pet_clinic_access RLS etkin olmalı'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.pet_clinic_access', 'SELECT'),
  'authenticated yetkili klinik erişimini okuyabilmeli'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.pet_clinic_access', 'INSERT'),
  'authenticated pet sahibi klinik erişimi verebilmeli'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.pet_clinic_access', 'UPDATE'),
  'authenticated pet sahibi klinik erişimini güncelleyebilmeli'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.pet_clinic_access', 'DELETE'),
  'authenticated pet sahibi klinik erişimini kaldırabilmeli'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.pet_clinic_access', 'SELECT'),
  'anon klinik erişim kayıtlarını okuyamamalı'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pet_clinic_access'
      AND cmd = 'SELECT'
      AND 'authenticated' = ANY(roles)
  ),
  1,
  'authenticated için tek bir SELECT politikası olmalı'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pet_clinic_access'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
      AND 'authenticated' = ANY(roles)
  ),
  3,
  'authenticated yazma işlemleri ayrı dar kapsamlı politikalara sahip olmalı'
);

SELECT * FROM finish();
ROLLBACK;

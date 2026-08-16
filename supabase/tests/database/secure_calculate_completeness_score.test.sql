-- FORENSIC DÜZELTME testi: public.calculate_completeness_score(uuid)
--
-- Amaç: 20260812170000_secure_calculate_completeness_score.sql migration'ının
-- gerçekten uygulandığını kanıtlamak: anon/PUBLIC artık EXECUTE hakkına
-- sahip değil, authenticated hâlâ çağırabiliyor (salt-okunur, düşük
-- hassasiyetli yardımcı olduğu için authenticated'e açık kalması bilinçli).

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(3);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.calculate_completeness_score(uuid)',
    'EXECUTE'
  ),
  'calculate_completeness_score anon tarafından artık çağrılamaz'
);

SELECT ok(
  NOT has_function_privilege(
    'PUBLIC',
    'public.calculate_completeness_score(uuid)',
    'EXECUTE'
  ),
  'calculate_completeness_score PUBLIC üzerinden dolaylı olarak da açık değildir'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.calculate_completeness_score(uuid)',
    'EXECUTE'
  ),
  'calculate_completeness_score salt-okunur yardımcı olarak authenticated''e açık kalır (bilinçli, diğer okuma-yardımcılarıyla tutarlı)'
);

SELECT * FROM finish();
ROLLBACK;

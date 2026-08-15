-- FORENSIC DÜZELTME testi: public.grant_membership_credit(uuid, int, text, text, jsonb)
--
-- Amaç: 20260812140000_secure_grant_membership_credit.sql migration'ının
-- gerçekten uygulandığını ve `authenticated`/`anon`/PUBLIC'in bu RPC'yi
-- artık doğrudan çağıramadığını, `service_role`'ün ise hâlâ çağırabildiğini
-- kanıtlamak. Bu, aynı repo'da increment_care_points için zaten kullanılan
-- (supabase/tests/database/security_hardening.test.sql, satır 37-49) desenin
-- birebir aynısıdır.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(4);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.grant_membership_credit(uuid, integer, text, text, jsonb)',
    'EXECUTE'
  ),
  'grant_membership_credit artık authenticated tarafından doğrudan çağrılamaz'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.grant_membership_credit(uuid, integer, text, text, jsonb)',
    'EXECUTE'
  ),
  'grant_membership_credit anon tarafından hiçbir zaman çağrılamaz'
);

SELECT ok(
  NOT has_function_privilege(
    'PUBLIC',
    'public.grant_membership_credit(uuid, integer, text, text, jsonb)',
    'EXECUTE'
  ),
  'grant_membership_credit PUBLIC üzerinden dolaylı olarak da açık değildir'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.grant_membership_credit(uuid, integer, text, text, jsonb)',
    'EXECUTE'
  ),
  'grant_membership_credit güvenilir service_role tarafından hâlâ çağrılabilir (mevcut 3 route + trigger + backfill kırılmaz)'
);

SELECT * FROM finish();
ROLLBACK;

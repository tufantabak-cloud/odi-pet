-- FORENSIC DÜZELTME testi: public.create_pet_notification(uuid, uuid, text, text, text, text, uuid)
--
-- Amaç: 20260812150000_secure_create_pet_notification.sql migration'ının
-- gerçekten uygulandığını ve `authenticated`/`anon`/PUBLIC'in bu internal
-- bildirim yardımcısını artık doğrudan çağıramadığını, `service_role`'ün
-- (dolayısıyla SECURITY DEFINER trigger'ların — on_task_assigned,
-- run_escalation_check) hâlâ çağırabildiğini kanıtlamak.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(4);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.create_pet_notification(uuid, uuid, text, text, text, text, uuid)',
    'EXECUTE'
  ),
  'create_pet_notification artık authenticated tarafından doğrudan çağrılamaz (bildirim spoofing kapatıldı)'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.create_pet_notification(uuid, uuid, text, text, text, text, uuid)',
    'EXECUTE'
  ),
  'create_pet_notification anon tarafından hiçbir zaman çağrılamaz'
);

SELECT ok(
  NOT has_function_privilege(
    'PUBLIC',
    'public.create_pet_notification(uuid, uuid, text, text, text, text, uuid)',
    'EXECUTE'
  ),
  'create_pet_notification PUBLIC üzerinden dolaylı olarak da açık değildir'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.create_pet_notification(uuid, uuid, text, text, text, text, uuid)',
    'EXECUTE'
  ),
  'create_pet_notification güvenilir service_role tarafından hâlâ çağrılabilir (on_task_assigned / run_escalation_check trigger''ları kırılmaz)'
);

SELECT * FROM finish();
ROLLBACK;

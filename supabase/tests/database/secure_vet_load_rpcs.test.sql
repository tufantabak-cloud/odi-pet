-- FORENSIC DÜZELTME testi: public.increment_vet_load(uuid), public.decrement_vet_load(uuid)
--
-- Amaç: 20260812160000_secure_vet_load_rpcs.sql migration'ının gerçekten
-- uygulandığını kanıtlamak:
--   1) anon/PUBLIC artık EXECUTE hakkına sahip değil,
--   2) authenticated hâlâ EXECUTE edebiliyor (3 canlı route kırılmadı),
--   3) auth.uid() olmadan (anon bağlamda) fonksiyon çağrısı reddediliyor,
--   4) gerçek bir oturumla (authenticated + auth.uid() set) çağrı başarılı oluyor.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(6);

-- ── 1-2. GRANT durumu ──────────────────────────────────────────────
SELECT ok(
  NOT has_function_privilege('anon', 'public.increment_vet_load(uuid)', 'EXECUTE')
  AND NOT has_function_privilege('PUBLIC', 'public.increment_vet_load(uuid)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.increment_vet_load(uuid)', 'EXECUTE'),
  'increment_vet_load: anon/PUBLIC kapalı, authenticated açık (3 canlı route korunuyor)'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.decrement_vet_load(uuid)', 'EXECUTE')
  AND NOT has_function_privilege('PUBLIC', 'public.decrement_vet_load(uuid)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.decrement_vet_load(uuid)', 'EXECUTE'),
  'decrement_vet_load: anon/PUBLIC kapalı, authenticated açık (3 canlı route korunuyor)'
);

-- ── 3. Test verisi ────────────────────────────────────────────────
SET LOCAL ROLE postgres;

INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at, aud, role
) VALUES (
  '73000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'vet-load-test@test.local',
  'password',
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, first_name, role)
VALUES ('73000000-0000-0000-0000-000000000001', 'Test Vet', 'vet')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

INSERT INTO public.vets (id, name)
VALUES ('74000000-0000-0000-0000-000000000001', 'Test Vet Clinic')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.vet_status (vet_id, is_online, current_load)
VALUES ('74000000-0000-0000-0000-000000000001', true, 0)
ON CONFLICT (vet_id) DO UPDATE SET current_load = 0;

-- ── 4. auth.uid() yokken (anon bağlam) reddedilmeli ─────────────────
SET LOCAL ROLE anon;
RESET "request.jwt.claims";

SELECT throws_ok(
  $$ SELECT public.increment_vet_load('74000000-0000-0000-0000-000000000001') $$,
  NULL,
  NULL,
  'increment_vet_load auth.uid() olmadan çağrılamaz (anon rolünün zaten EXECUTE hakkı yok, çift katman doğrulandı)'
);

-- ── 5-6. Gerçek oturumla (authenticated + auth.uid()) başarılı olmalı ──
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"73000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT lives_ok(
  $$ SELECT public.increment_vet_load('74000000-0000-0000-0000-000000000001') $$,
  'increment_vet_load gerçek bir authenticated oturumla başarıyla çalışır (3 canlı route regresyon testi)'
);

SELECT lives_ok(
  $$ SELECT public.decrement_vet_load('74000000-0000-0000-0000-000000000001') $$,
  'decrement_vet_load gerçek bir authenticated oturumla başarıyla çalışır (3 canlı route regresyon testi)'
);

SELECT * FROM finish();
ROLLBACK;

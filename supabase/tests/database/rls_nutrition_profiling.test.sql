BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

-- ══════════════════════════════════════════════════════════════════════════════
-- Test paketi: pet_nutrition_logs ve profiling_prompts RLS politikaları
-- Faz 5 kısmi — kanonik capability modeli doğrulaması
--
-- Kullanıcılar:
--   83..001  rls-owner     → primary_owner
--   83..002  rls-editor    → care_editor (doğrudan membership)
--   83..003  rls-viewer    → viewer (doğrudan membership)
--   83..004  rls-unrelated → hiç üyeliği yok
--
-- Pet: 84..001 (rls-test-pet)
-- ══════════════════════════════════════════════════════════════════════════════

SELECT plan(23);

-- ─── Statik privilege testleri ────────────────────────────────────────────────

-- T1: authenticated DELETE yetkisi profiling_prompts'tan kaldırıldı (REVOKE)
SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.profiling_prompts',
    'DELETE'
  ),
  'authenticated rolü profiling_prompts DELETE yetkisine sahip değil (REVOKE)'
);

-- T2: authenticated hâlâ profiling_prompts SELECT yetkisine sahip (RLS filtreler)
SELECT ok(
  has_table_privilege(
    'authenticated',
    'public.profiling_prompts',
    'SELECT'
  ),
  'authenticated profiling_prompts okuma yetkisine sahip (RLS satır filtreler)'
);

-- T3: authenticated pet_nutrition_logs DELETE yetkisine sahip (RLS own-row filtreler)
SELECT ok(
  has_table_privilege(
    'authenticated',
    'public.pet_nutrition_logs',
    'DELETE'
  ),
  'authenticated pet_nutrition_logs DELETE yetkisine sahip (RLS own-row ile kısıtlı)'
);

-- Yardımcı fonksiyonlar: Dinamik SQL çalıştırıp etkilenen satır sayısını döner
CREATE OR REPLACE FUNCTION _test_run_dml(q text) RETURNS integer AS $$
DECLARE c integer;
BEGIN
  EXECUTE q;
  GET DIAGNOSTICS c = ROW_COUNT;
  RETURN c;
END;
$$ LANGUAGE plpgsql;

-- ─── Fixture kurulumu ─────────────────────────────────────────────────────────

SET LOCAL ROLE postgres;

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role)
VALUES
  ('83000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','rls-owner@test.local',   'password',now(),'authenticated','authenticated'),
  ('83000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','rls-editor@test.local',  'password',now(),'authenticated','authenticated'),
  ('83000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','rls-viewer@test.local',  'password',now(),'authenticated','authenticated'),
  ('83000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','rls-unrelated@test.local','password',now(),'authenticated','authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, first_name, email, role, care_points)
VALUES
  ('83000000-0000-0000-0000-000000000001','RLS Owner',    'rls-owner@test.local',    'owner',0),
  ('83000000-0000-0000-0000-000000000002','RLS Editor',   'rls-editor@test.local',   'owner',0),
  ('83000000-0000-0000-0000-000000000003','RLS Viewer',   'rls-viewer@test.local',   'owner',0),
  ('83000000-0000-0000-0000-000000000004','RLS Unrelated','rls-unrelated@test.local','owner',0)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email, care_points = 0;

-- Pet — trigger primary_owner üyeliğini kurar
INSERT INTO public.pets (id, owner_id, name, species, breed)
VALUES ('84000000-0000-0000-0000-000000000001','83000000-0000-0000-0000-000000000001','RLS Test Pet','dog','Mixed')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, owner_id = EXCLUDED.owner_id;

-- care_editor üyeliği (doğrudan)
INSERT INTO public.pet_memberships (pet_id, profile_id, role, status, source, accepted_at)
VALUES (
  '84000000-0000-0000-0000-000000000001',
  '83000000-0000-0000-0000-000000000002',
  'care_editor',
  'active',
  'invitation',
  now()
);

-- viewer üyeliği (doğrudan)
INSERT INTO public.pet_memberships (pet_id, profile_id, role, status, source, accepted_at)
VALUES (
  '84000000-0000-0000-0000-000000000001',
  '83000000-0000-0000-0000-000000000003',
  'viewer',
  'active',
  'admin_recovery',
  now()
);

-- ─── Senaryo 1: Owner beslenme kaydı yazabilir ────────────────────────────────

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"83000000-0000-0000-0000-000000000001","role":"authenticated","email":"rls-owner@test.local"}';

-- T4: Owner INSERT
SELECT lives_ok(
  $$
    INSERT INTO public.pet_nutrition_logs (pet_id, profile_id, food_brand, meal_time, logged_at)
    VALUES (
      '84000000-0000-0000-0000-000000000001',
      '83000000-0000-0000-0000-000000000001',
      'Royal Canin',
      'morning',
      now()
    )
  $$,
  'owner pet_nutrition_logs INSERT yapabilir'
);

-- ─── Senaryo 2: care_editor beslenme kaydı yazabilir ─────────────────────────

SET LOCAL "request.jwt.claims" =
  '{"sub":"83000000-0000-0000-0000-000000000002","role":"authenticated","email":"rls-editor@test.local"}';

-- T5: Editor INSERT
SELECT lives_ok(
  $$
    INSERT INTO public.pet_nutrition_logs (pet_id, profile_id, food_brand, meal_time, logged_at)
    VALUES (
      '84000000-0000-0000-0000-000000000001',
      '83000000-0000-0000-0000-000000000002',
      'Purina',
      'evening',
      now()
    )
  $$,
  'care_editor pet_nutrition_logs INSERT yapabilir'
);

-- T6: Editor tüm kayıtları okuyabilir (can_view_pet SELECT)
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.pet_nutrition_logs
    WHERE pet_id = '84000000-0000-0000-0000-000000000001'
  ),
  2,
  'care_editor tüm beslenme kayıtlarını okuyabilir (can_view_pet SELECT)'
);

-- ─── Senaryo 3: viewer yalnızca okuyabilir, INSERT → hata ────────────────────

SET LOCAL "request.jwt.claims" =
  '{"sub":"83000000-0000-0000-0000-000000000003","role":"authenticated","email":"rls-viewer@test.local"}';

-- T7: Viewer SELECT başarılı
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.pet_nutrition_logs
    WHERE pet_id = '84000000-0000-0000-0000-000000000001'
  ),
  2,
  'viewer beslenme kayıtlarını okuyabilir'
);

-- T8: Viewer INSERT hata (can_manage_pet_care yok)
SELECT throws_ok(
  $$
    INSERT INTO public.pet_nutrition_logs (pet_id, profile_id, food_brand, meal_time, logged_at)
    VALUES (
      '84000000-0000-0000-0000-000000000001',
      '83000000-0000-0000-0000-000000000003',
      'Hills',
      'noon',
      now()
    )
  $$,
  '42501',
  NULL,
  'viewer beslenme kaydı ekleyemez (can_manage_pet_care yok)'
);

-- ─── Senaryo 4: Kullanıcı başkasının kaydını UPDATE/DELETE yapamaz ─────────────

SET LOCAL "request.jwt.claims" =
  '{"sub":"83000000-0000-0000-0000-000000000002","role":"authenticated","email":"rls-editor@test.local"}';

-- T9: Editor sahibin kaydını UPDATE edemez — RLS own-row filtreler, 0 satır
SELECT is(
  _test_run_dml($$
    UPDATE public.pet_nutrition_logs
    SET food_brand = 'Hacked'
    WHERE pet_id   = '84000000-0000-0000-0000-000000000001'
      AND profile_id = '83000000-0000-0000-0000-000000000001'
  $$),
  0,
  'care_editor sahibin beslenme kaydını güncelleyemez (own-row koruması)'
);

-- T10: Editor sahibin kaydını DELETE edemez — RLS own-row filtreler, 0 satır
SELECT is(
  _test_run_dml($$
    DELETE FROM public.pet_nutrition_logs
    WHERE pet_id   = '84000000-0000-0000-0000-000000000001'
      AND profile_id = '83000000-0000-0000-0000-000000000001'
  $$),
  0,
  'care_editor sahibin beslenme kaydını silemez (own-row koruması)'
);

-- ─── Senaryo 5: Yetkisiz kullanıcı hiçbir satır okuyamaz ────────────────────

SET LOCAL "request.jwt.claims" =
  '{"sub":"83000000-0000-0000-0000-000000000004","role":"authenticated","email":"rls-unrelated@test.local"}';

-- T11: Yetkisiz SELECT sıfır satır döner
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.pet_nutrition_logs
    WHERE pet_id = '84000000-0000-0000-0000-000000000001'
  ),
  0,
  'üye olmayan kullanıcı hiçbir beslenme kaydı göremez (RLS filtre)'
);

-- T12: Yetkisiz INSERT hata
SELECT throws_ok(
  $$
    INSERT INTO public.pet_nutrition_logs (pet_id, profile_id, food_brand, meal_time, logged_at)
    VALUES (
      '84000000-0000-0000-0000-000000000001',
      '83000000-0000-0000-0000-000000000004',
      'Attacker',
      'noon',
      now()
    )
  $$,
  '42501',
  NULL,
  'üye olmayan kullanıcı pet_nutrition_logs INSERT yapamaz'
);

-- ─── Senaryo 6: profiling_prompts cevapları kullanıcı-satır-bazlıdır ─────────

SET LOCAL ROLE postgres;

INSERT INTO public.profiling_prompts (id, profile_id, pet_id, field_name, trigger_context, response_value)
VALUES
  (
    'b5000000-0000-0000-0000-000000000001',
    '83000000-0000-0000-0000-000000000001',
    '84000000-0000-0000-0000-000000000001',
    'weight', 'onboarding', 'sahip yanıtı'
  ),
  (
    'b5000000-0000-0000-0000-000000000002',
    '83000000-0000-0000-0000-000000000002',
    '84000000-0000-0000-0000-000000000001',
    'weight', 'onboarding', 'editor yanıtı'
  );

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"83000000-0000-0000-0000-000000000002","role":"authenticated","email":"rls-editor@test.local"}';

-- T13: Editor yalnızca kendi profiling_prompts satırını görür
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.profiling_prompts
    WHERE pet_id = '84000000-0000-0000-0000-000000000001'
  ),
  1,
  'care_editor yalnızca kendi profiling_prompts satırını görür (kullanıcı-satır-bazlı SELECT)'
);

-- T14: Gördüğü satır kendi profile_id'sidir
SELECT is(
  (
    SELECT profile_id::text
    FROM public.profiling_prompts
    WHERE pet_id = '84000000-0000-0000-0000-000000000001'
    LIMIT 1
  ),
  '83000000-0000-0000-0000-000000000002',
  'care_editor profiling_prompts SELECT sonucunda yalnızca kendi satırını alır'
);

-- T15: Editor kendi yanıtını güncelleyebilir
SELECT lives_ok(
  $$
    UPDATE public.profiling_prompts
    SET response_value = 'güncellenmiş yanıt', completed_at = now()
    WHERE id = 'b5000000-0000-0000-0000-000000000002'
  $$,
  'care_editor kendi profiling_prompts yanıtını güncelleyebilir'
);

-- T16: Editor sahibin yanıtını güncelleyemez (own-row koruması) — 0 satır
SELECT is(
  _test_run_dml($$
    UPDATE public.profiling_prompts
    SET response_value = 'kötü niyetli'
    WHERE id = 'b5000000-0000-0000-0000-000000000001'
  $$),
  0,
  'care_editor sahibin profiling_prompts satırını güncelleyemez'
);

-- ─── Senaryo 7: authenticated DELETE → runtime REVOKE davranışı ───────────────

-- T17: authenticated kullanıcı profiling_prompts DELETE yapamaz
SELECT throws_ok(
  $$
    DELETE FROM public.profiling_prompts
    WHERE id = 'b5000000-0000-0000-0000-000000000002'
  $$,
  '42501',
  NULL,
  'authenticated kullanıcı profiling_prompts DELETE yapamaz (REVOKE)'
);

-- ─── Senaryo 8: UPDATE sırasında profile_id / pet_id taşınamaz ─────────────────

SET LOCAL "request.jwt.claims" =
  '{"sub":"83000000-0000-0000-0000-000000000001","role":"authenticated","email":"rls-owner@test.local"}';

-- T18: pet_nutrition_logs UPDATE'de profile_id değiştirilemez (WITH CHECK)
SELECT throws_ok(
  $$
    UPDATE public.pet_nutrition_logs
    SET profile_id = '83000000-0000-0000-0000-000000000004'
    WHERE pet_id   = '84000000-0000-0000-0000-000000000001'
      AND profile_id = '83000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  NULL,
  'pet_nutrition_logs UPDATE: profile_id başka kullanıcıya taşınamaz (WITH CHECK)'
);

-- T19: profiling_prompts UPDATE'de pet_id taşınamaz (can_view_pet false → WITH CHECK)
SET LOCAL "request.jwt.claims" =
  '{"sub":"83000000-0000-0000-0000-000000000002","role":"authenticated","email":"rls-editor@test.local"}';

SELECT throws_ok(
  $$
    UPDATE public.profiling_prompts
    SET pet_id = '00000000-0000-0000-0000-000000000099'
    WHERE id = 'b5000000-0000-0000-0000-000000000002'
  $$,
  '42501',
  NULL,
  'profiling_prompts UPDATE: pet_id yabancı bir pete taşınamaz (WITH CHECK can_view_pet)'
);

-- ─── service_role profiling_prompts DELETE yapabilir ─────────────────────────

SET LOCAL ROLE postgres;

-- T20: postgres/service_role REVOKE'dan muaf — silme başarılı
SELECT lives_ok(
  $$
    DELETE FROM public.profiling_prompts
    WHERE id = 'b5000000-0000-0000-0000-000000000001'
  $$,
  'service_role (postgres) profiling_prompts satırını silebilir'
);

-- ─── Ek: Editor kendi pet_nutrition_logs kaydını silebilir ────────────────────

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"83000000-0000-0000-0000-000000000002","role":"authenticated","email":"rls-editor@test.local"}';

-- T21: Editor kendi kaydını silebilir (own-row DELETE)
SELECT is(
  _test_run_dml($$
    DELETE FROM public.pet_nutrition_logs
    WHERE pet_id   = '84000000-0000-0000-0000-000000000001'
      AND profile_id = '83000000-0000-0000-0000-000000000002'
  $$),
  1,
  'care_editor kendi beslenme kaydını silebilir (own-row DELETE)'
);

-- ─── Ek: Owner kendi pet_nutrition_logs kaydını güncelleyebilir ──────────────

SET LOCAL "request.jwt.claims" =
  '{"sub":"83000000-0000-0000-0000-000000000001","role":"authenticated","email":"rls-owner@test.local"}';

-- T22: Owner kendi kaydını güncelleyebilir (own-row UPDATE)
SELECT is(
  _test_run_dml($$
    UPDATE public.pet_nutrition_logs
    SET food_brand = 'Royal Canin Mini'
    WHERE pet_id   = '84000000-0000-0000-0000-000000000001'
      AND profile_id = '83000000-0000-0000-0000-000000000001'
  $$),
  1,
  'owner kendi beslenme kaydını güncelleyebilir (own-row UPDATE)'
);

-- ─── Ek: Viewer profiling_prompts görüntüleyemez (kendi satırı yok) ──────────

SET LOCAL "request.jwt.claims" =
  '{"sub":"83000000-0000-0000-0000-000000000003","role":"authenticated","email":"rls-viewer@test.local"}';

-- T23: Viewer kendi profiling_prompts satırı olmadığında hiçbir kayıt göremez
SELECT is(
  (
    SELECT count(*)::integer
    FROM public.profiling_prompts
    WHERE pet_id = '84000000-0000-0000-0000-000000000001'
  ),
  0,
  'viewer kendi profiling_prompts satırı olmadığında hiçbir kayıt göremez'
);

SELECT * FROM finish();

ROLLBACK;

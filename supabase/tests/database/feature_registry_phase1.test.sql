-- =============================================================================
-- pgTAP Tests: Feature Registry Phase 1
-- File: supabase/tests/database/feature_registry_phase1.test.sql
--
-- Coverage
--   1. ENUM types varlığı
--   2. Tablo varlığı (4 tablo)
--   3. RLS aktif mi?
--   4. Kolon varlığı (kritik kolonlar)
--   5. Index varlığı
--   6. updated_at trigger çalışıyor mu?
--   7. UNIQUE constraint ihlali (feature_limits)
--   8. feature_usage partial unique index (global + per_pet)
--   9. feature_usage.count CHECK (< 0 → hata)
--  10. feature_audit_logs: authenticated INSERT/UPDATE/DELETE reddedilir
--  11. GRANT doğruluğu: authenticated yalnızca SELECT (feature_audit_logs)
--  12. app_features key format CHECK constraint
--  13. feature_limits.window_days sınır CHECK
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(47);

-- =============================================================================
-- §1. ENUM Types
-- =============================================================================

SELECT has_type('public', 'plan_tier_enum',       'plan_tier_enum ENUM mevcuttur');
SELECT has_type('public', 'feature_scope_enum',   'feature_scope_enum ENUM mevcuttur');
SELECT has_type('public', 'feature_status_enum',  'feature_status_enum ENUM mevcuttur');
SELECT has_type('public', 'audit_action_enum',    'audit_action_enum ENUM mevcuttur');

-- ENUM değerleri
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'plan_tier_enum'
      AND e.enumlabel = 'free'
  ),
  'plan_tier_enum: free değeri mevcut'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'plan_tier_enum'
      AND e.enumlabel = 'enterprise'
  ),
  'plan_tier_enum: enterprise değeri mevcut'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'plan_tier_enum'
      AND e.enumlabel IN ('clinic', 'vet', 'partner')
  ),
  'plan_tier_enum: kapsam dışı değerler (clinic/vet/partner) mevcut değil'
);

-- =============================================================================
-- §2. Tablo Varlığı
-- =============================================================================

SELECT has_table('public', 'app_features',       'app_features tablosu mevcuttur');
SELECT has_table('public', 'feature_limits',     'feature_limits tablosu mevcuttur');
SELECT has_table('public', 'feature_usage',      'feature_usage tablosu mevcuttur');
SELECT has_table('public', 'feature_audit_logs', 'feature_audit_logs tablosu mevcuttur');

-- =============================================================================
-- §3. RLS Aktif mi?
-- =============================================================================

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'app_features' AND relnamespace = 'public'::regnamespace),
  'app_features: RLS aktif'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'feature_limits' AND relnamespace = 'public'::regnamespace),
  'feature_limits: RLS aktif'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'feature_usage' AND relnamespace = 'public'::regnamespace),
  'feature_usage: RLS aktif'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'feature_audit_logs' AND relnamespace = 'public'::regnamespace),
  'feature_audit_logs: RLS aktif'
);

-- =============================================================================
-- §4. Kritik Kolon Varlığı
-- =============================================================================

SELECT has_column('public', 'app_features', 'key',        'app_features.key kolonu mevcut');
SELECT has_column('public', 'app_features', 'scope',      'app_features.scope kolonu mevcut');
SELECT has_column('public', 'app_features', 'status',     'app_features.status kolonu mevcut');
SELECT has_column('public', 'app_features', 'updated_at', 'app_features.updated_at kolonu mevcut');

SELECT has_column('public', 'feature_limits', 'limit_value',  'feature_limits.limit_value kolonu mevcut');
SELECT has_column('public', 'feature_limits', 'window_days',  'feature_limits.window_days kolonu mevcut');
SELECT has_column('public', 'feature_limits', 'is_enabled',   'feature_limits.is_enabled kolonu mevcut');

SELECT has_column('public', 'feature_usage', 'pet_id',      'feature_usage.pet_id kolonu mevcut (per_pet scope için)');
SELECT has_column('public', 'feature_usage', 'window_start', 'feature_usage.window_start kolonu mevcut');
SELECT has_column('public', 'feature_usage', 'count',        'feature_usage.count kolonu mevcut');

SELECT has_column('public', 'feature_audit_logs', 'action',       'feature_audit_logs.action kolonu mevcut');
SELECT has_column('public', 'feature_audit_logs', 'before_state', 'feature_audit_logs.before_state kolonu mevcut');
SELECT has_column('public', 'feature_audit_logs', 'after_state',  'feature_audit_logs.after_state kolonu mevcut');

-- feature_audit_logs'da updated_at OLMAMALI (append-only)
SELECT hasnt_column('public', 'feature_audit_logs', 'updated_at',
  'feature_audit_logs: updated_at kolonu olmamalı (append-only tablo)');

-- =============================================================================
-- §5. Index Varlığı
-- =============================================================================

SELECT ok(
  EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'app_features_status_idx'),
  'app_features_status_idx mevcut'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'feature_limits_feature_plan_idx'),
  'feature_limits_feature_plan_idx mevcut'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'feature_usage_global_unique_idx'),
  'feature_usage_global_unique_idx (partial) mevcut'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'feature_usage_per_pet_unique_idx'),
  'feature_usage_per_pet_unique_idx (partial) mevcut'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'feature_audit_logs_created_at_brin_idx'),
  'feature_audit_logs_created_at_brin_idx (BRIN) mevcut'
);

-- =============================================================================
-- §6–13. Veri ve Kısıt Testleri — service_role bağlamında çalışır
-- =============================================================================

SET LOCAL ROLE postgres;

-- Seed: test özelliği ekle
INSERT INTO public.app_features (key, label, description, scope, status)
VALUES
  ('ai_vet_assistant',  'AI Veteriner Yardımcısı', 'Yapay zeka destekli vet danışma', 'global',  'active'),
  ('smart_scanner',     'Akıllı Belge Tarayıcı',   'OCR bazlı belge analizi',         'global',  'beta'),
  ('weight_log_export', 'Kilo Kaydı Dışa Aktarım', 'CSV / PDF export',                'per_pet', 'active')
ON CONFLICT (key) DO NOTHING;

-- §6. updated_at trigger
UPDATE public.app_features
SET label = 'AI Veteriner Yardımcısı (güncel)'
WHERE key = 'ai_vet_assistant';

SELECT ok(
  (
    SELECT updated_at > created_at
    FROM public.app_features
    WHERE key = 'ai_vet_assistant'
  ),
  'updated_at trigger: UPDATE sonrası updated_at > created_at'
);

-- §7. UNIQUE constraint: feature_limits (feature_key, plan_tier)
INSERT INTO public.feature_limits (feature_key, plan_tier, limit_value, window_days)
VALUES ('ai_vet_assistant', 'free', 3, 30)
ON CONFLICT (feature_key, plan_tier) DO NOTHING;

SELECT throws_ok(
  $$
    INSERT INTO public.feature_limits (feature_key, plan_tier, limit_value, window_days)
    VALUES ('ai_vet_assistant', 'free', 99, 30)
  $$,
  '23505',
  NULL,
  'feature_limits: (feature_key, plan_tier) tekrar edildiğinde unique constraint ihlali atar'
);

-- Diğer tier'lar INSERT edilebilir
INSERT INTO public.feature_limits (feature_key, plan_tier, limit_value, window_days)
VALUES
  ('ai_vet_assistant', 'pro',        NULL, 30),
  ('ai_vet_assistant', 'ai_plus',    NULL, 30),
  ('ai_vet_assistant', 'enterprise', NULL, 30)
ON CONFLICT (feature_key, plan_tier) DO NOTHING;

SELECT ok(
  (SELECT count(*) FROM public.feature_limits WHERE feature_key = 'ai_vet_assistant') = 4,
  'feature_limits: 4 farklı tier için limit kaydı oluşturulabilir'
);

-- §8. feature_usage partial unique index
-- Önce test kullanıcısı oluştur
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role)
VALUES (
  'bf000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'feature-test@test.local',
  'password',
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, first_name, email, role, care_points)
VALUES ('bf000000-0000-0000-0000-000000000001', 'Feature Tester', 'feature-test@test.local', 'owner', 0)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Test pet
INSERT INTO public.pets (id, owner_id, name, species, breed)
VALUES ('bf100000-0000-0000-0000-000000000001', 'bf000000-0000-0000-0000-000000000001', 'TestPet', 'dog', 'Mixed')
ON CONFLICT (id) DO NOTHING;

-- Global scope: ilk kayıt
INSERT INTO public.feature_usage (profile_id, feature_key, pet_id, window_start, count)
VALUES ('bf000000-0000-0000-0000-000000000001', 'ai_vet_assistant', NULL, CURRENT_DATE, 1);

-- Global scope: aynı pencere → unique violation
SELECT throws_ok(
  $$
    INSERT INTO public.feature_usage (profile_id, feature_key, pet_id, window_start, count)
    VALUES ('bf000000-0000-0000-0000-000000000001', 'ai_vet_assistant', NULL, CURRENT_DATE, 1)
  $$,
  '23505',
  NULL,
  'feature_usage global: aynı (profile_id, feature_key, window_start, NULL) ikinci kez eklenemez'
);

-- Per-pet scope: ilk kayıt
INSERT INTO public.feature_usage (profile_id, feature_key, pet_id, window_start, count)
VALUES ('bf000000-0000-0000-0000-000000000001', 'weight_log_export', 'bf100000-0000-0000-0000-000000000001', CURRENT_DATE, 1);

-- Per-pet scope: aynı pet + aynı pencere → unique violation
SELECT throws_ok(
  $$
    INSERT INTO public.feature_usage (profile_id, feature_key, pet_id, window_start, count)
    VALUES ('bf000000-0000-0000-0000-000000000001', 'weight_log_export', 'bf100000-0000-0000-0000-000000000001', CURRENT_DATE, 1)
  $$,
  '23505',
  NULL,
  'feature_usage per_pet: aynı (profile_id, feature_key, pet_id, window_start) ikinci kez eklenemez'
);

-- §9. feature_usage.count CHECK (count >= 0)
SELECT throws_ok(
  $$
    INSERT INTO public.feature_usage (profile_id, feature_key, pet_id, window_start, count)
    VALUES ('bf000000-0000-0000-0000-000000000001', 'smart_scanner', NULL, CURRENT_DATE - 1, -1)
  $$,
  '23514',
  NULL,
  'feature_usage.count: negatif değer CHECK constraint ile reddedilir'
);

-- §10–11. feature_audit_logs: authenticated kullanıcı INSERT/UPDATE/DELETE yapamaz
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"bf000000-0000-0000-0000-000000000001","role":"authenticated","email":"feature-test@test.local"}';

-- authenticated INSERT → RLS deny politikası
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.feature_audit_logs', 'INSERT'),
  'feature_audit_logs: authenticated INSERT yetkisi yok (GRANT seviyesi)'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.feature_audit_logs', 'UPDATE'),
  'feature_audit_logs: authenticated UPDATE yetkisi yok (GRANT seviyesi)'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.feature_audit_logs', 'DELETE'),
  'feature_audit_logs: authenticated DELETE yetkisi yok (GRANT seviyesi)'
);

-- §12. app_features key format CHECK constraint
SET LOCAL ROLE postgres;

SELECT throws_ok(
  $$
    INSERT INTO public.app_features (key, label)
    VALUES ('InvalidKey', 'Test')
  $$,
  '23514',
  NULL,
  'app_features.key: büyük harf içeren anahtar CHECK constraint ile reddedilir'
);

SELECT throws_ok(
  $$
    INSERT INTO public.app_features (key, label)
    VALUES ('bad-key-with-hyphen', 'Test')
  $$,
  '23514',
  NULL,
  'app_features.key: tire içeren anahtar CHECK constraint ile reddedilir'
);

-- §13. feature_limits.window_days sınır CHECK
SELECT throws_ok(
  $$
    INSERT INTO public.feature_limits (feature_key, plan_tier, limit_value, window_days)
    VALUES ('smart_scanner', 'free', 5, 0)
  $$,
  '23514',
  NULL,
  'feature_limits.window_days: 0 değeri CHECK constraint ile reddedilir'
);

SELECT throws_ok(
  $$
    INSERT INTO public.feature_limits (feature_key, plan_tier, limit_value, window_days)
    VALUES ('smart_scanner', 'free', 5, 367)
  $$,
  '23514',
  NULL,
  'feature_limits.window_days: 367 değeri CHECK constraint ile reddedilir'
);

SELECT * FROM finish();
ROLLBACK;

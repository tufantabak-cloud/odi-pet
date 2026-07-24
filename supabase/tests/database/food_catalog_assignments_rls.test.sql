-- ============================================================================
-- Supabase Runtime RLS, Trigger and Backfill pgTAP Test Suite
-- File: supabase/tests/database/food_catalog_assignments_rls.test.sql
-- ============================================================================

BEGIN;

-- Enable pgTAP extension if not already present
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Plan count for TAP runner (11 tests)
SELECT plan(11);

-- ─── 1. KATALOG TABLO, INDEX, PRIVILEGE VE FUNCTION KONTROLLERİ ───────────────

-- Test 1: Function execute privilege checks
SELECT ok(
  NOT has_function_privilege('public', 'public.backfill_pet_nutrition_profiles_to_assignments()', 'EXECUTE') AND
  NOT has_function_privilege('anon', 'public.backfill_pet_nutrition_profiles_to_assignments()', 'EXECUTE') AND
  NOT has_function_privilege('authenticated', 'public.backfill_pet_nutrition_profiles_to_assignments()', 'EXECUTE') AND
  has_function_privilege('service_role', 'public.backfill_pet_nutrition_profiles_to_assignments()', 'EXECUTE'),
  'Backfill function execute privilege is revoked from public/anon/auth and granted only to service_role'
);


-- ─── 2. TEST VERİSİ HAZIRLAMA (SERVICE_ROLE / POSTGRES BAĞLAMI) ─────────────

SET LOCAL ROLE postgres;

-- Tablo Yetkileri (RLS testlerinde role erişim izni vermek için)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- auth.users Fixture (Foreign Key gereksinimi için)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role) VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'ownera@test.local', 'password', now(), 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'ownerb@test.local', 'password', now(), 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'vet@test.local', 'password', now(), 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'admin@test.local', 'password', now(), 'authenticated', 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'founder@test.local', 'password', now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- public.profiles Fixture
INSERT INTO public.profiles (id, first_name, last_name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Owner', 'A', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'Owner', 'B', 'owner'),
  ('33333333-3333-3333-3333-333333333333', 'Vet', 'User', 'vet'),
  ('44444444-4444-4444-4444-444444444444', 'Admin', 'User', 'admin'),
  ('55555555-5555-5555-5555-555555555555', 'Founder', 'User', 'founder')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

-- Test Petleri (owner_id ile birlikte)
INSERT INTO public.pets (id, owner_id, name, species, gender) VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Kedi Pamuk', 'cat', 'female'),
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Köpek Karabaş', 'dog', 'male')
ON CONFLICT (id) DO NOTHING;

-- Pet Sahiplikleri
INSERT INTO public.pet_owners (pet_id, profile_id, role) VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'owner')
ON CONFLICT DO NOTHING;

-- Test Üretici & Markaları (Geçerli Hex UUID'ler)
INSERT INTO public.food_manufacturers (id, legal_name, verification_status, is_active) VALUES
  ('10000000-1111-1111-1111-111111111111', 'Verified Manufacturer SA', 'verified', true),
  ('20000000-2222-2222-2222-222222222222', 'Pending Manufacturer A/S', 'pending', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.food_brands (id, manufacturer_id, display_name, normalized_name, verification_status, is_active) VALUES
  ('ba111111-1111-1111-1111-111111111111', '10000000-1111-1111-1111-111111111111', 'Verified Cat Brand', 'verified_cat_brand', 'verified', true),
  ('ba222222-2222-2222-2222-222222222222', '10000000-1111-1111-1111-111111111111', 'Verified Dog Brand', 'verified_dog_brand', 'verified', true),
  ('ba333333-3333-3333-3333-333333333333', '10000000-1111-1111-1111-111111111111', 'Pending Brand', 'pending_brand', 'pending', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.food_product_families (id, brand_id, official_name, normalized_name, species, food_form, nutritional_role, life_stage, verification_status, is_active) VALUES
  ('fa111111-1111-1111-1111-111111111111', 'ba111111-1111-1111-1111-111111111111', 'Cat Salmon Formula', 'cat_salmon_formula', 'cat', 'dry', 'complete', 'adult', 'verified', true),
  ('fa222222-2222-2222-2222-222222222222', 'ba222222-2222-2222-2222-222222222222', 'Dog Beef Formula', 'dog_beef_formula', 'dog', 'dry', 'complete', 'adult', 'verified', true),
  ('fa333333-3333-3333-3333-333333333333', 'ba111111-1111-1111-1111-111111111111', 'Pending Cat Formula', 'pending_cat_formula', 'cat', 'wet_pate', 'complete', 'adult', 'pending', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.food_skus (id, product_family_id, gtin, package_size_grams, market_status, verification_status) VALUES
  ('ea111111-1111-1111-1111-111111111111', 'fa111111-1111-1111-1111-111111111111', '8690000000001', 1500, 'active', 'verified'),
  ('ea222222-2222-2222-2222-222222222222', 'fa222222-2222-2222-2222-222222222222', '8690000000002', 3000, 'active', 'verified'),
  ('ea333333-3333-3333-3333-333333333333', 'fa111111-1111-1111-1111-111111111111', '8690000000003', 400, 'inactive', 'verified')
ON CONFLICT (id) DO NOTHING;


-- ─── 3. GERÇEK RLS VE TRIGGER ENTEGRASYON TESTLERİ ────────────────────────

-- Test 2: Authenticated Kullanıcı Katalog Okuma
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

SELECT is(
  (SELECT COUNT(*)::int FROM public.food_product_families),
  2,
  'Authenticated users can only see 2 active verified product families'
);

-- Test 3: Authenticated Katalog Yazma Engeli
SELECT throws_ok(
  $$ INSERT INTO public.food_brands (display_name, normalized_name, verification_status) VALUES ('Unauthorized Brand', 'unauthorized_brand', 'verified') $$,
  '42501',
  NULL,
  'Authenticated users cannot write to catalog tables'
);

-- Test 4: Owner A Kendi Petine Assignment Ekleme (Başarılı)
SELECT lives_ok(
  $$ INSERT INTO public.pet_food_assignments (pet_id, food_product_family_id, food_sku_id, food_form, daily_target_grams, started_at, is_primary, measurement_method, source) VALUES ('a1111111-1111-1111-1111-111111111111', 'fa111111-1111-1111-1111-111111111111', 'ea111111-1111-1111-1111-111111111111', 'dry', 150, CURRENT_DATE, true, 'owner_confirmed', 'catalog') $$,
  'Owner A can insert food assignment for their own pet'
);

-- Test 5: Owner A'nın Owner B Petine Assignment Ekleyememesi (RLS Engeli)
SELECT throws_ok(
  $$ INSERT INTO public.pet_food_assignments (pet_id, brand_free_text, food_form, started_at, is_primary, measurement_method, source) VALUES ('b2222222-2222-2222-2222-222222222222', 'Unauthorized Feed', 'dry', CURRENT_DATE, true, 'owner_confirmed', 'manual') $$,
  '42501',
  NULL,
  'Owner A cannot insert assignment for Owner B pet'
);

-- Test 6: Trigger Testi: Kediye Köpek Mamasının Atanamaması (Species Mismatch)
SELECT throws_ok(
  $$ INSERT INTO public.pet_food_assignments (pet_id, food_product_family_id, food_form, started_at, is_primary, measurement_method, source) VALUES ('a1111111-1111-1111-1111-111111111111', 'fa222222-2222-2222-2222-222222222222', 'dry', CURRENT_DATE, false, 'owner_confirmed', 'catalog') $$,
  'P0001',
  NULL,
  'Trigger rejects dog food assignment to cat pet (Species Mismatch)'
);

-- Test 7: Single Active Primary Mama Constraint Testi (İkinci Primary Reddi)
SELECT throws_ok(
  $$ INSERT INTO public.pet_food_assignments (pet_id, brand_free_text, food_form, started_at, is_primary, measurement_method, source) VALUES ('a1111111-1111-1111-1111-111111111111', 'Second Primary Brand', 'wet_pate', CURRENT_DATE, true, 'owner_confirmed', 'manual') $$,
  '23505',
  NULL,
  'Single active primary constraint rejects second active primary assignment'
);

-- Test 8: Birden Fazla Aktif Secondary Mama Kabul Testi
SELECT lives_ok(
  $$ INSERT INTO public.pet_food_assignments (pet_id, brand_free_text, food_form, daily_target_grams, started_at, is_primary, measurement_method, source) VALUES ('a1111111-1111-1111-1111-111111111111', 'Secondary Wet Food', 'wet_pate', 50, CURRENT_DATE, false, 'owner_confirmed', 'manual') $$,
  'Multiple active secondary food assignments are allowed'
);


-- ─── 4. TARİHSEL BACKFILL HANE VE KAPANIS TESTLERİ ──────────────────────────

SET LOCAL ROLE postgres;

-- Test legacy profili (Önceden aktif primary maması olan pet için)
INSERT INTO public.pet_nutrition_profiles (id, pet_id, food_brand, food_product, food_type, daily_grams, created_at) VALUES
  ('da111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Legacy Brand', 'Legacy Product', 'dry', 100, CURRENT_DATE - INTERVAL '10 days')
ON CONFLICT (id) DO NOTHING;

-- Test 9: Backfill 1. Çalıştırma
SELECT is(
  public.backfill_pet_nutrition_profiles_to_assignments(),
  1,
  'Backfill inserts exactly 1 row for the new legacy profile'
);

-- Test 10: Legacy Profile Ended_at check
SELECT ok(
  (SELECT ended_at FROM public.pet_food_assignments WHERE legacy_profile_id = 'da111111-1111-1111-1111-111111111111') IS NOT NULL,
  'Legacy profile assignment ended_at is NOT NULL when active primary exists'
);

-- Test 11: Backfill Idempotency Testi (0 Yeni Kayıt)
SELECT is(
  public.backfill_pet_nutrition_profiles_to_assignments(),
  0,
  'Second run of backfill function inserts 0 rows (idempotent)'
);

SELECT * FROM finish();

ROLLBACK;

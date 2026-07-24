BEGIN;

SELECT plan(10);

-- 1. SETUP
-- Create a mock user
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000001', 'test_user1@example.com') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000002', 'test_user2@example.com') ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id) VALUES ('00000000-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;

-- Create a mock pet
INSERT INTO public.pets (id, owner_id, name, species) VALUES ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'Test Pet', 'dog') ON CONFLICT DO NOTHING;

-- Create pet ownership (User 1 is owner)
INSERT INTO public.pet_owners (pet_id, profile_id, role) VALUES ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'owner') ON CONFLICT DO NOTHING;

-- Insert an initial active assignment
INSERT INTO public.pet_food_assignments (id, pet_id, brand_free_text, product_free_text, food_form, daily_target_grams, meals_per_day, started_at, is_primary, source, measurement_method)
VALUES ('00000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000100', 'Old Brand', 'Old Product', 'dry', 100, 2, '2025-01-01', true, 'manual', 'owner_confirmed') ON CONFLICT DO NOTHING;

-- Insert initial inventory
INSERT INTO public.food_inventory (pet_id, current_stock_grams, last_refill_date)
VALUES ('00000000-0000-0000-0000-000000000100', 500, NOW());

-- 2. TESTS
-- Set user 2 (NOT owner)
SET request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000002", "role": "authenticated"}';

-- Test 1: Başka kullanıcı değişim yapamaz (Unauthorized user fails)
SELECT throws_like(
  $$
    SELECT swap_pet_food_assignment(
      '00000000-0000-0000-0000-000000000100', 
      '00000000-0000-0000-0000-000000000200', 
      '{"brand_free_text": "New", "food_form": "dry"}'::jsonb, 
      NULL
    );
  $$,
  '%Bu petin beslenme planını%',
  'Başka kullanıcı değişim yapamaz'
);

-- Reset user to actual owner
SET request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';

-- Test 2: Hatalı yeni mama verisinde transaction geri alınır (Trigger validation failure)
SELECT throws_like(
  $$
    SELECT swap_pet_food_assignment(
      '00000000-0000-0000-0000-000000000100', 
      '00000000-0000-0000-0000-000000000200', 
      '{"brand_free_text": "New", "food_form": "invalid_form", "daily_target_grams": -10}'::jsonb, 
      NULL
    );
  $$,
  '%pet_food_assignments_daily_target_grams_check%',
  'Hatalı mama verisinde (invalid form/grams) transaction rollback yapar'
);

-- Test 3: Başarılı değişim, stok siliniyor
SELECT lives_ok(
  $$
    SELECT swap_pet_food_assignment(
      '00000000-0000-0000-0000-000000000100', 
      '00000000-0000-0000-0000-000000000200', 
      '{"brand_free_text": "New Brand", "product_free_text": "New Product", "food_form": "wet_pate", "daily_target_grams": 200, "meals_per_day": 3}'::jsonb, 
      '{"action": "delete"}'::jsonb
    );
  $$,
  'Başarılı değişimde fonksiyon başarıyla döner'
);

-- Test 4: Eski plan kapanır
SELECT results_eq(
  $$ SELECT ended_at IS NOT NULL FROM public.pet_food_assignments WHERE id = '00000000-0000-0000-0000-000000000200' $$,
  $$ VALUES (true) $$,
  'Eski plan kapandı (ended_at = CURRENT_DATE)'
);

-- Test 5: Yeni plan aktif olur
SELECT results_eq(
  $$ SELECT COUNT(*)::INT FROM public.pet_food_assignments WHERE pet_id = '00000000-0000-0000-0000-000000000100' AND is_primary = true AND ended_at IS NULL $$,
  $$ VALUES (1) $$,
  'Yeni plan aktif oldu (yalnızca 1 aktif is_primary)'
);

-- Test 6: Yeni stok bilinmiyor durumu ayrışır (delete action was sent)
SELECT results_eq(
  $$ SELECT COUNT(*)::INT FROM public.food_inventory WHERE pet_id = '00000000-0000-0000-0000-000000000100' $$,
  $$ VALUES (0) $$,
  'Yeni stok bilinmiyor seçimi (delete) envanteri sildi'
);

-- We need the ID of the new active assignment to test the next swap
CREATE TEMP TABLE temp_assignment_id AS 
SELECT id FROM public.pet_food_assignments WHERE pet_id = '00000000-0000-0000-0000-000000000100' AND is_primary = true AND ended_at IS NULL;

-- Test 7: Yeni stok sıfır durumu
SELECT lives_ok(
  $$
    SELECT swap_pet_food_assignment(
      '00000000-0000-0000-0000-000000000100', 
      (SELECT id FROM temp_assignment_id), 
      '{"brand_free_text": "Brand 3", "product_free_text": "Product 3", "food_form": "dry", "daily_target_grams": 300, "meals_per_day": 2}'::jsonb, 
      '{"action": "set", "grams": 0}'::jsonb
    );
  $$,
  'İkinci değişim (yeni stok sıfır) başarıyla döner'
);

SELECT results_eq(
  $$ SELECT current_stock_grams FROM public.food_inventory WHERE pet_id = '00000000-0000-0000-0000-000000000100' $$,
  $$ VALUES (0) $$,
  'Yeni stok 0 gram olarak kaydedildi'
);

-- Update temp table for third swap
DELETE FROM temp_assignment_id;
INSERT INTO temp_assignment_id 
SELECT id FROM public.pet_food_assignments WHERE pet_id = '00000000-0000-0000-0000-000000000100' AND is_primary = true AND ended_at IS NULL;

-- Test 8: Yeni stok biliniyor durumu (exact amount)
SELECT lives_ok(
  $$
    SELECT swap_pet_food_assignment(
      '00000000-0000-0000-0000-000000000100', 
      (SELECT id FROM temp_assignment_id), 
      '{"brand_free_text": "Brand 4", "product_free_text": "Product 4", "food_form": "dry", "daily_target_grams": 400, "meals_per_day": 2}'::jsonb, 
      '{"action": "set", "grams": 1500}'::jsonb
    );
  $$,
  'Üçüncü değişim (yeni stok 1500) başarıyla döner'
);

SELECT results_eq(
  $$ SELECT current_stock_grams FROM public.food_inventory WHERE pet_id = '00000000-0000-0000-0000-000000000100' $$,
  $$ VALUES (1500) $$,
  'Yeni stok 1500 gram olarak kaydedildi'
);

SELECT * FROM finish();
ROLLBACK;

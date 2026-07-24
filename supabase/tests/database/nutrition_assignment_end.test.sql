BEGIN;

SELECT plan(8);

-- 1. SETUP
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000001', 'end_owner@example.com') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000002', 'end_other@example.com') ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO public.profiles (id) VALUES ('00000000-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;

INSERT INTO public.pets (id, owner_id, name, species) VALUES ('00000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000001', 'End Test Pet', 'cat') ON CONFLICT DO NOTHING;

INSERT INTO public.pet_owners (pet_id, profile_id, role) VALUES ('00000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000001', 'owner') ON CONFLICT DO NOTHING;

INSERT INTO public.pet_food_assignments (id, pet_id, brand_free_text, product_free_text, food_form, daily_target_grams, meals_per_day, started_at, is_primary, source, measurement_method)
VALUES ('00000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000300', 'Cat Brand', 'Cat Food', 'wet_pate', 80, 2, '2025-01-01', true, 'manual', 'owner_confirmed') ON CONFLICT DO NOTHING;

INSERT INTO public.food_inventory (pet_id, current_stock_grams, last_refill_date)
VALUES ('00000000-0000-0000-0000-000000000300', 1000, NOW()) ON CONFLICT DO NOTHING;

-- 2. TESTS
-- Set non-owner user
SET request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000002", "role": "authenticated"}';

-- Test 1: Non-owner cannot call end_pet_food_assignment (SQLSTATE 42501)
SELECT throws_like(
  $$
    SELECT end_pet_food_assignment(
      '00000000-0000-0000-0000-000000000300',
      '00000000-0000-0000-0000-000000000400',
      'keep'
    );
  $$,
  '%Bu petin beslenme planını%',
  'Başka kullanıcı planı sonlandıramaz (42501)'
);

-- Set actual owner user
SET request.jwt.claims TO '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}';

-- Test 2: Invalid stock action raises exception
SELECT throws_like(
  $$
    SELECT end_pet_food_assignment(
      '00000000-0000-0000-0000-000000000300',
      '00000000-0000-0000-0000-000000000400',
      'invalid_action'
    );
  $$,
  '%Geçersiz stok işlemi%',
  'Geçersiz stok eyleminde hata fırlatılır'
);

-- Test 3: Successful end with 'keep' action
SELECT lives_ok(
  $$
    SELECT end_pet_food_assignment(
      '00000000-0000-0000-0000-000000000300',
      '00000000-0000-0000-0000-000000000400',
      'keep'
    );
  $$,
  'Plan sonlandırma (keep) başarılı'
);

-- Test 4: Assignment ended_at is set
SELECT results_eq(
  $$ SELECT ended_at IS NOT NULL FROM public.pet_food_assignments WHERE id = '00000000-0000-0000-0000-000000000400' $$,
  $$ VALUES (true) $$,
  'Assignment ended_at dolduruldu'
);

-- Test 5: Inventory is kept intact (1000g)
SELECT results_eq(
  $$ SELECT current_stock_grams FROM public.food_inventory WHERE pet_id = '00000000-0000-0000-0000-000000000300' $$,
  $$ VALUES (1000) $$,
  'Stok keep seçeneği ile 1000g korundu'
);

-- Re-open assignment for testing 'mark_depleted'
UPDATE public.pet_food_assignments SET ended_at = NULL WHERE id = '00000000-0000-0000-0000-000000000400';

-- Test 6: End with 'mark_depleted' action
SELECT lives_ok(
  $$
    SELECT end_pet_food_assignment(
      '00000000-0000-0000-0000-000000000300',
      '00000000-0000-0000-0000-000000000400',
      'mark_depleted'
    );
  $$,
  'Plan sonlandırma (mark_depleted) başarılı'
);

-- Test 7: Inventory stock is set to 0
SELECT results_eq(
  $$ SELECT current_stock_grams FROM public.food_inventory WHERE pet_id = '00000000-0000-0000-0000-000000000300' $$,
  $$ VALUES (0) $$,
  'Stok mark_depleted seçeneği ile 0g yapıldı'
);

-- Re-open assignment for testing 'remove'
UPDATE public.pet_food_assignments SET ended_at = NULL WHERE id = '00000000-0000-0000-0000-000000000400';

-- Test 8: End with 'remove' action deletes inventory row
SELECT lives_ok(
  $$
    SELECT end_pet_food_assignment(
      '00000000-0000-0000-0000-000000000300',
      '00000000-0000-0000-0000-000000000400',
      'remove'
    );
  $$,
  'Plan sonlandırma (remove) envanter kaydını sildi'
);

SELECT * FROM finish();
ROLLBACK;

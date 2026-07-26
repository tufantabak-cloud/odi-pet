BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(13);

SELECT ok(
  NOT has_column_privilege(
    'authenticated',
    'public.profiles',
    'role',
    'UPDATE'
  ),
  'authenticated kendi global rolünü değiştiremez'
);

SELECT ok(
  NOT has_column_privilege(
    'authenticated',
    'public.profiles',
    'care_points',
    'UPDATE'
  ),
  'authenticated bakım puanını doğrudan değiştiremez'
);

SELECT ok(
  has_column_privilege(
    'authenticated',
    'public.profiles',
    'first_name',
    'UPDATE'
  ),
  'authenticated güvenli profil alanını güncelleyebilir'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.increment_care_points(uuid, integer)',
    'EXECUTE'
  )
  AND has_function_privilege(
    'service_role',
    'public.increment_care_points(uuid, integer)',
    'EXECUTE'
  ),
  'bakım puanı RPC fonksiyonu yalnızca service_role tarafından çağrılabilir'
);

SELECT has_column(
  'public',
  'clinic_memberships',
  'is_clinic_admin',
  'klinik yöneticiliği global rolden ayrı tutulur'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.user_owns_pet(uuid, uuid)',
    'EXECUTE'
  )
  AND NOT has_function_privilege(
    'anon',
    'public.user_owns_pet(uuid, uuid)',
    'EXECUTE'
  ),
  'pet sahipliği yardımcısı yalnızca oturumlu kullanıcıya açıktır'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.shared_pet_cards',
    'INSERT, UPDATE, DELETE'
  ),
  'paylaşım kartı mutasyonları doğrudan tarayıcıya kapalıdır'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.clinic_memberships',
    'INSERT, UPDATE, DELETE'
  ),
  'klinik üyeliği ve yönetici bayrağı doğrudan değiştirilemez'
);

SET LOCAL ROLE postgres;

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  aud,
  role
) VALUES
  (
    '71000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'security-owner-a@test.local',
    'password',
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '71000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'security-owner-b@test.local',
    'password',
    now(),
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, first_name, role)
VALUES
  ('71000000-0000-0000-0000-000000000001', 'Owner A', 'owner'),
  ('71000000-0000-0000-0000-000000000002', 'Owner B', 'owner')
ON CONFLICT (id) DO UPDATE
SET first_name = EXCLUDED.first_name, role = EXCLUDED.role;

INSERT INTO public.pets (id, owner_id, name, species)
VALUES
  (
    '72000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    'Pet A',
    'dog'
  ),
  (
    '72000000-0000-0000-0000-000000000002',
    '71000000-0000-0000-0000-000000000002',
    'Pet B',
    'cat'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.pet_owners (pet_id, profile_id, role)
VALUES
  (
    '72000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001',
    'owner'
  ),
  (
    '72000000-0000-0000-0000-000000000002',
    '71000000-0000-0000-0000-000000000002',
    'owner'
  )
ON CONFLICT DO NOTHING;

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT lives_ok(
  $$
    UPDATE public.profiles
    SET first_name = 'Updated Owner'
    WHERE id = '71000000-0000-0000-0000-000000000001'
  $$,
  'kullanıcı güvenli profil alanını güncelleyebilir'
);

SELECT throws_ok(
  $$
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = '71000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  NULL,
  'kullanıcı kendi rolünü admin yapamaz'
);

SELECT ok(
  public.user_owns_pet(
    '72000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000001'
  ),
  'sahiplik yardımcısı gerçek sahibi doğrular'
);

SELECT ok(
  NOT public.user_owns_pet(
    '72000000-0000-0000-0000-000000000002',
    '71000000-0000-0000-0000-000000000001'
  ),
  'sahiplik yardımcısı başka kullanıcının petini reddeder'
);

SET LOCAL ROLE postgres;
GRANT INSERT ON TABLE public.shared_pet_cards TO authenticated;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT throws_ok(
  $$
    INSERT INTO public.shared_pet_cards (
      owner_user_id,
      pet_id,
      share_token
    ) VALUES (
      '71000000-0000-0000-0000-000000000001',
      '72000000-0000-0000-0000-000000000002',
      'abcdefghijklmnopqrstuvwxyz123456'
    )
  $$,
  '42501',
  NULL,
  'RLS başka kullanıcıya ait pet için paylaşım kartını reddeder'
);

SELECT * FROM finish();
ROLLBACK;

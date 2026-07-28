DO $$
DECLARE
  u1_id uuid := '83000000-0000-0000-0000-000000000001';
  u2_id uuid := '83000000-0000-0000-0000-000000000002';
  p1_id uuid := '84000000-0000-0000-0000-000000000001';
  encrypted_pw text := crypt('att1472o', gen_salt('bf'));
BEGIN
  -- 1. Kullanıcılar (auth.users)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
  ) VALUES
  (u1_id, '00000000-0000-0000-0000-000000000000', 'tufan.tabak@gmail.com', encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Tufan","last_name":"Tabak"}', now(), now(), 'authenticated', 'authenticated'),
  (u2_id, '00000000-0000-0000-0000-000000000000', 'test-caregiver@odi.pet', encrypted_pw, now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Ayşe","last_name":"Demir"}', now(), now(), 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Auth Identities
  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  VALUES
  (u1_id, u1_id::text, u1_id, json_build_object('sub', u1_id::text, 'email', 'tufan.tabak@gmail.com')::jsonb, 'email', now(), now(), now()),
  (u2_id, u2_id::text, u2_id, json_build_object('sub', u2_id::text, 'email', 'test-caregiver@odi.pet')::jsonb, 'email', now(), now(), now())
  ON CONFLICT (provider_id, provider) DO NOTHING;

  -- 3. Public Profiles
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES
  (u1_id, 'Tufan', 'Tabak', 'tufan.tabak@gmail.com'),
  (u2_id, 'Ayşe', 'Demir', 'test-caregiver@odi.pet')
  ON CONFLICT (id) DO NOTHING;

  -- 4. Pet ekle
  INSERT INTO public.pets (id, owner_id, name, species, breed, gender, is_neutered)
  VALUES (p1_id, u1_id, 'Pamuk', 'dog', 'Golden Retriever', 'male', true)
  ON CONFLICT (id) DO NOTHING;

  -- 5. Primary Owner üyelik kaydı ekle
  INSERT INTO public.pet_members (pet_id, profile_id, role)
  VALUES (p1_id, u1_id, 'owner')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pet_memberships (pet_id, profile_id, role, status, source)
  VALUES (p1_id, u1_id, 'primary_owner', 'active', 'migration')
  ON CONFLICT DO NOTHING;

  -- 6. Ortak Sahip (co_owner) Ekle
  INSERT INTO public.pet_members (pet_id, profile_id, role)
  VALUES (p1_id, u2_id, 'owner')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pet_memberships (pet_id, profile_id, role, status, source)
  VALUES (p1_id, u2_id, 'co_owner', 'active', 'migration')
  ON CONFLICT DO NOTHING;

END $$;

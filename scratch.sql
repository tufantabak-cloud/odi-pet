INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES (
  'd842db13-7de9-408a-b851-968af1e89ce3',
  '00000000-0000-0000-0000-000000000000',
  'test@odipet.com',
  crypt('123456', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(),
  now(),
  'authenticated',
  '',
  '',
  '',
  ''
);

INSERT INTO public.profiles (id, full_name, email, created_at)
VALUES ('d842db13-7de9-408a-b851-968af1e89ce3', 'Test User', 'test@odipet.com', now());

INSERT INTO public.pets (id, owner_id, name, species, gender, created_at)
VALUES ('11b747b8-b719-4fe3-a782-7cd4cad70bc7', 'd842db13-7de9-408a-b851-968af1e89ce3', 'Odi', 'dog', 'male', now());

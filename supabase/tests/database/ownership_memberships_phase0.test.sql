BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(38);

SELECT has_table(
  'public',
  'pet_memberships',
  'kanonik pet_memberships tablosu mevcuttur'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.pet_owners',
    'INSERT, UPDATE, DELETE'
  ),
  'legacy pet_owners mutasyonları doğrudan istemciye kapalıdır'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.pet_members',
    'INSERT, UPDATE, DELETE'
  ),
  'legacy pet_members mutasyonları doğrudan istemciye kapalıdır'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.pet_invites',
    'INSERT, UPDATE, DELETE'
  ),
  'pet_invites mutasyonları doğrudan istemciye kapalıdır'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.pet_owners',
    'TRUNCATE'
  ),
  'legacy pet_owners toplu silme yetkisi istemciye kapalıdır'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.pet_members',
    'TRUNCATE'
  ),
  'legacy pet_members toplu silme yetkisi istemciye kapalıdır'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.pet_invites',
    'TRUNCATE'
  ),
  'pet_invites toplu silme yetkisi istemciye kapalıdır'
);

SELECT ok(
  NOT has_column_privilege(
    'authenticated',
    'public.pets',
    'owner_id',
    'UPDATE'
  ),
  'pets.owner_id doğrudan istemci güncellemesine kapalıdır'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.pets',
    'DELETE'
  ),
  'pets silme işlemi yalnızca atomik RPC üzerinden yapılabilir'
);

SELECT ok(
  NOT has_table_privilege(
    'authenticated',
    'public.pets',
    'TRUNCATE'
  ),
  'pets toplu silme yetkisi istemciye kapalıdır'
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
    '81000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'membership-owner@test.local',
    'password',
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '81000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'membership-caregiver@test.local',
    'password',
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '81000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'membership-viewer@test.local',
    'password',
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '81000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'membership-unrelated@test.local',
    'password',
    now(),
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, first_name, email, role, care_points)
VALUES
  (
    '81000000-0000-0000-0000-000000000001',
    'Membership Owner',
    'membership-owner@test.local',
    'owner',
    0
  ),
  (
    '81000000-0000-0000-0000-000000000002',
    'Membership Caregiver',
    'membership-caregiver@test.local',
    'owner',
    0
  ),
  (
    '81000000-0000-0000-0000-000000000003',
    'Membership Viewer',
    'membership-viewer@test.local',
    'owner',
    0
  ),
  (
    '81000000-0000-0000-0000-000000000004',
    'Membership Unrelated',
    'membership-unrelated@test.local',
    'owner',
    0
  )
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  care_points = 0;

INSERT INTO public.user_subscriptions (profile_id, plan, status)
VALUES (
  '81000000-0000-0000-0000-000000000001',
  'pro',
  'active'
)
ON CONFLICT (profile_id) DO UPDATE
SET plan = 'pro', status = 'active';

INSERT INTO public.pets (id, owner_id, name, species, breed)
VALUES (
  '82000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000001',
  'Membership Pet',
  'dog',
  'Mixed'
);

SELECT throws_ok(
  $$
    UPDATE public.pets
    SET owner_id = '81000000-0000-0000-0000-000000000004'
    WHERE id = '82000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  'OWNER_ID_CHANGE_REQUIRES_TRANSFER_RPC',
  'service rolü dahi owner_id alanını transfer RPC dışında değiştiremez'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.pet_memberships
    WHERE pet_id = '82000000-0000-0000-0000-000000000001'
      AND profile_id = '81000000-0000-0000-0000-000000000001'
      AND role = 'primary_owner'
      AND status = 'active'
  ),
  1,
  'pet oluşturma tam bir kanonik primary owner üretir'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.pet_owners
    WHERE pet_id = '82000000-0000-0000-0000-000000000001'
      AND profile_id = '81000000-0000-0000-0000-000000000001'
      AND role = 'owner'
  ),
  1,
  'pet oluşturma legacy pet_owners yansımasını üretir'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.pet_members
    WHERE pet_id = '82000000-0000-0000-0000-000000000001'
      AND profile_id = '81000000-0000-0000-0000-000000000001'
      AND role = 'owner'
  ),
  1,
  'pet oluşturma legacy pet_members yansımasını üretir'
);

INSERT INTO public.pet_memberships (
  pet_id,
  profile_id,
  role,
  status,
  source,
  accepted_at
)
VALUES (
  '82000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000003',
  'viewer',
  'active',
  'admin_recovery',
  now()
);

INSERT INTO public.pet_members (
  pet_id,
  profile_id,
  role,
  joined_at
)
VALUES (
  '82000000-0000-0000-0000-000000000001',
  '81000000-0000-0000-0000-000000000003',
  'viewer',
  now()
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated","email":"membership-owner@test.local"}';

SELECT ok(
  public.can_edit_pet_profile(
    '82000000-0000-0000-0000-000000000001'
  ),
  'primary owner pet profilini düzenleyebilir'
);

SELECT ok(
  public.can_manage_pet_caregivers(
    '82000000-0000-0000-0000-000000000001'
  ),
  'primary owner bakıcıları yönetebilir'
);

SET LOCAL "request.jwt.claims" =
  '{"sub":"81000000-0000-0000-0000-000000000003","role":"authenticated","email":"membership-viewer@test.local"}';

SELECT ok(
  public.can_view_pet(
    '82000000-0000-0000-0000-000000000001'
  ),
  'viewer peti görüntüleyebilir'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.pets
    WHERE id = '82000000-0000-0000-0000-000000000001'
  ),
  1,
  'viewer can read the pet row through the canonical SELECT policy'
);

SELECT ok(
  NOT public.can_manage_pet_care(
    '82000000-0000-0000-0000-000000000001'
  ),
  'viewer bakım verisi yazamaz'
);

SELECT ok(
  NOT public.can_manage_pet_caregivers(
    '82000000-0000-0000-0000-000000000001'
  ),
  'viewer bakıcıları yönetemez'
);

SET LOCAL "request.jwt.claims" =
  '{"sub":"81000000-0000-0000-0000-000000000004","role":"authenticated","email":"membership-unrelated@test.local"}';

SELECT ok(
  NOT public.can_view_pet(
    '82000000-0000-0000-0000-000000000001'
  ),
  'ilişkisiz kullanıcı peti görüntüleyemez'
);

SELECT ok(
  NOT public.user_owns_pet(
    '82000000-0000-0000-0000-000000000001',
    '81000000-0000-0000-0000-000000000001'
  ),
  'authenticated kullanıcı başka kullanıcı adına sahiplik sorgulayamaz'
);

SET LOCAL "request.jwt.claims" =
  '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated","email":"membership-owner@test.local"}';

SELECT is(
  (
    public.create_pet_caregiver_invite(
      '82000000-0000-0000-0000-000000000001',
      'membership-caregiver@test.local',
      'editor'
    )
  )->>'ok',
  'true',
  'primary owner güvenli RPC ile davet oluşturabilir'
);

SET LOCAL "request.jwt.claims" =
  '{"sub":"81000000-0000-0000-0000-000000000002","role":"authenticated","email":"membership-caregiver@test.local"}';

SELECT is(
  (
    public.accept_pet_caregiver_invite(
      (
        SELECT token
        FROM public.pet_invites
        WHERE pet_id = '82000000-0000-0000-0000-000000000001'
          AND email = 'membership-caregiver@test.local'
      )
    )
  )->>'ok',
  'true',
  'davet edilen kullanıcı daveti atomik RPC ile kabul eder'
);

SELECT is(
  (
    public.accept_pet_caregiver_invite(
      (
        SELECT token
        FROM public.pet_invites
        WHERE pet_id = '82000000-0000-0000-0000-000000000001'
          AND email = 'membership-caregiver@test.local'
      )
    )
  )->>'code',
  'ALREADY_USED',
  'aynı davetin tekrar kullanımı reddedilir'
);

SET LOCAL ROLE postgres;

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.pet_memberships
    WHERE pet_id = '82000000-0000-0000-0000-000000000001'
      AND profile_id = '81000000-0000-0000-0000-000000000002'
      AND role = 'care_editor'
      AND status = 'active'
  ),
  1,
  'davet kabulü tek aktif kanonik üyelik üretir'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.pet_membership_events
    WHERE pet_id = '82000000-0000-0000-0000-000000000001'
      AND profile_id = '81000000-0000-0000-0000-000000000002'
      AND event_type = 'invite_accepted'
  ),
  1,
  'davet kabulü tek audit olayı üretir'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.referral_rewards
    WHERE invite_id = (
      SELECT id
      FROM public.pet_invites
      WHERE pet_id = '82000000-0000-0000-0000-000000000001'
        AND email = 'membership-caregiver@test.local'
    )
  ),
  2,
  'davet kabulü iki idempotent referral ödülü üretir'
);

SELECT is(
  (
    SELECT care_points
    FROM public.profiles
    WHERE id = '81000000-0000-0000-0000-000000000001'
  ),
  50,
  'davet eden bakım puanını tam bir kez alır'
);

SELECT is(
  (
    SELECT care_points
    FROM public.profiles
    WHERE id = '81000000-0000-0000-0000-000000000002'
  ),
  25,
  'davet edilen bakım puanını tam bir kez alır'
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated","email":"membership-owner@test.local"}';

SELECT is(
  (
    public.change_pet_caregiver_role(
      '82000000-0000-0000-0000-000000000001',
      '81000000-0000-0000-0000-000000000002',
      'owner'
    )
  )->>'ok',
  'true',
  'primary owner bakıcıyı doğrulanmış ortak sahip yapabilir'
);

SELECT is(
  (
    public.transfer_pet_primary_owner(
      '82000000-0000-0000-0000-000000000001',
      '81000000-0000-0000-0000-000000000002'
    )
  )->>'ok',
  'true',
  'birincil sahiplik atomik transfer RPC ile devredilebilir'
);

SET LOCAL ROLE postgres;

SELECT is(
  (
    SELECT owner_id
    FROM public.pets
    WHERE id = '82000000-0000-0000-0000-000000000001'
  ),
  '81000000-0000-0000-0000-000000000002'::uuid,
  'transfer pets.owner_id uyumluluk aynasını günceller'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.pet_memberships
    WHERE pet_id = '82000000-0000-0000-0000-000000000001'
      AND role = 'primary_owner'
      AND status = 'active'
  ),
  1,
  'transfer sonrasında tam bir aktif primary owner kalır'
);

SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" =
  '{"sub":"81000000-0000-0000-0000-000000000002","role":"authenticated","email":"membership-caregiver@test.local"}';

SELECT is(
  (
    public.transfer_pet_primary_owner(
      '82000000-0000-0000-0000-000000000001',
      '81000000-0000-0000-0000-000000000001'
    )
  )->>'ok',
  'true',
  'yeni primary owner sahipliği önceki ortak sahibe geri devredebilir'
);

SET LOCAL "request.jwt.claims" =
  '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated","email":"membership-owner@test.local"}';

SELECT is(
  (
    public.delete_pet_with_memberships(
      '82000000-0000-0000-0000-000000000001'
    )
  )->>'ok',
  'true',
  'primary owner peti atomik RPC ile silebilir'
);

SET LOCAL ROLE postgres;

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.pets
    WHERE id = '82000000-0000-0000-0000-000000000001'
  ),
  0,
  'atomik silme pet kaydını kaldırır'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM public.pet_membership_events
    WHERE pet_id = '82000000-0000-0000-0000-000000000001'
      AND event_type = 'pet_deleted'
  ),
  1,
  'pet silinse de audit olayı korunur'
);

SELECT * FROM finish();
ROLLBACK;

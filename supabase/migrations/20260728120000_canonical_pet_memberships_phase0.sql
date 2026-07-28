-- Canonical pet ownership foundation and Phase 0 mutation hardening.
-- This migration is additive: legacy ownership columns/tables remain available
-- for compatibility while writes move behind transaction-safe RPCs.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'pet_membership_role'
  ) THEN
    CREATE TYPE public.pet_membership_role AS ENUM (
      'primary_owner',
      'co_owner',
      'care_admin',
      'care_editor',
      'viewer'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'pet_membership_status'
  ) THEN
    CREATE TYPE public.pet_membership_status AS ENUM ('active', 'revoked');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'pet_membership_source'
  ) THEN
    CREATE TYPE public.pet_membership_source AS ENUM (
      'pet_creation',
      'invitation',
      'ownership_transfer',
      'migration',
      'admin_recovery'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.pet_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  role public.pet_membership_role NOT NULL,
  status public.pet_membership_status NOT NULL DEFAULT 'active',
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  invite_id uuid REFERENCES public.pet_invites(id) ON DELETE SET NULL,
  source public.pet_membership_source NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pet_memberships_pet_profile_key UNIQUE (pet_id, profile_id),
  CONSTRAINT pet_memberships_status_timestamps_check CHECK (
    (status = 'active' AND revoked_at IS NULL)
    OR
    (status = 'revoked' AND revoked_at IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS pet_memberships_one_active_primary_idx
  ON public.pet_memberships (pet_id)
  WHERE role = 'primary_owner' AND status = 'active';

CREATE INDEX IF NOT EXISTS pet_memberships_profile_status_pet_idx
  ON public.pet_memberships (profile_id, status, pet_id);

CREATE INDEX IF NOT EXISTS pet_memberships_pet_status_role_idx
  ON public.pet_memberships (pet_id, status, role);

CREATE TABLE IF NOT EXISTS public.pet_membership_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid,
  pet_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  event_type text NOT NULL,
  old_role public.pet_membership_role,
  new_role public.pet_membership_role,
  actor_profile_id uuid,
  reason text,
  source public.pet_membership_source NOT NULL,
  request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pet_membership_events_request_idx
  ON public.pet_membership_events (
    request_id,
    event_type,
    profile_id
  )
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pet_membership_events_pet_created_idx
  ON public.pet_membership_events (pet_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.pet_membership_migration_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type text NOT NULL,
  pet_id uuid,
  profile_id uuid,
  source_table text NOT NULL,
  source_record_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  resolution_status text NOT NULL DEFAULT 'pending'
    CHECK (resolution_status IN ('pending', 'resolved', 'ignored')),
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pet_membership_migration_issues_source_idx
  ON public.pet_membership_migration_issues (
    issue_type,
    source_table,
    source_record_id
  )
  WHERE source_record_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_pet_membership_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_pet_membership_updated_at
  ON public.pet_memberships;
CREATE TRIGGER touch_pet_membership_updated_at
  BEFORE UPDATE ON public.pet_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_pet_membership_updated_at();

-- pets.owner_id is the only trusted automatic primary-owner backfill source.
INSERT INTO public.pet_memberships (
  pet_id,
  profile_id,
  role,
  status,
  source,
  accepted_at
)
SELECT
  pet.id,
  pet.owner_id,
  'primary_owner'::public.pet_membership_role,
  'active'::public.pet_membership_status,
  'migration'::public.pet_membership_source,
  COALESCE(pet.created_at, now())
FROM public.pets AS pet
WHERE pet.owner_id IS NOT NULL
ON CONFLICT (pet_id, profile_id) DO UPDATE
SET
  role = 'primary_owner'::public.pet_membership_role,
  status = 'active'::public.pet_membership_status,
  source = 'migration'::public.pet_membership_source,
  revoked_at = NULL,
  updated_at = now();

INSERT INTO public.pet_membership_events (
  membership_id,
  pet_id,
  profile_id,
  event_type,
  new_role,
  source,
  reason
)
SELECT
  membership.id,
  membership.pet_id,
  membership.profile_id,
  'trusted_primary_backfill',
  membership.role,
  'migration'::public.pet_membership_source,
  'pets.owner_id trusted primary-owner backfill'
FROM public.pet_memberships AS membership
WHERE membership.source = 'migration'
  AND membership.role = 'primary_owner'
  AND NOT EXISTS (
    SELECT 1
    FROM public.pet_membership_events AS event
    WHERE event.membership_id = membership.id
      AND event.event_type = 'trusted_primary_backfill'
  );

-- Quarantine unsupported legacy owner claims instead of promoting them.
INSERT INTO public.pet_membership_migration_issues (
  issue_type,
  pet_id,
  profile_id,
  source_table,
  source_record_id,
  details
)
SELECT
  'unverified_legacy_owner',
  legacy.pet_id,
  legacy.profile_id,
  'pet_owners',
  legacy.id,
  jsonb_build_object(
    'role', legacy.role,
    'created_at', legacy.created_at
  )
FROM public.pet_owners AS legacy
JOIN public.pets AS pet
  ON pet.id = legacy.pet_id
WHERE legacy.pet_id IS NOT NULL
  AND legacy.profile_id IS NOT NULL
  AND legacy.profile_id IS DISTINCT FROM pet.owner_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.pet_invites AS invite
    JOIN public.profiles AS invited_profile
      ON lower(invited_profile.email) = lower(invite.email)
    WHERE invite.pet_id = legacy.pet_id
      AND invited_profile.id = legacy.profile_id
      AND invite.status = 'accepted'
  )
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.current_pet_role(p_pet_id uuid)
RETURNS public.pet_membership_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_role public.pet_membership_role;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT membership.role
  INTO v_role
  FROM public.pet_memberships AS membership
  WHERE membership.pet_id = p_pet_id
    AND membership.profile_id = v_user_id
    AND membership.status = 'active'
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pets AS pet
    WHERE pet.id = p_pet_id
      AND pet.owner_id = v_user_id
  ) THEN
    RETURN 'primary_owner'::public.pet_membership_role;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pet_owners AS legacy_owner
    WHERE legacy_owner.pet_id = p_pet_id
      AND legacy_owner.profile_id = v_user_id
      AND legacy_owner.role = 'owner'
  ) THEN
    RETURN 'co_owner'::public.pet_membership_role;
  END IF;

  SELECT CASE legacy_member.role
    WHEN 'owner' THEN 'co_owner'::public.pet_membership_role
    WHEN 'admin' THEN 'care_admin'::public.pet_membership_role
    WHEN 'editor' THEN 'care_editor'::public.pet_membership_role
    WHEN 'viewer' THEN 'viewer'::public.pet_membership_role
    ELSE NULL
  END
  INTO v_role
  FROM public.pet_members AS legacy_member
  WHERE legacy_member.pet_id = p_pet_id
    AND legacy_member.profile_id = v_user_id
  LIMIT 1;

  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_pet(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_pet_role(p_pet_id) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_pet_profile(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_pet_role(p_pet_id)
    IN ('primary_owner', 'co_owner');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_pet_care(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_pet_role(p_pet_id)
    IN ('primary_owner', 'co_owner', 'care_admin', 'care_editor');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_pet_caregivers(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_pet_role(p_pet_id)
    IN ('primary_owner', 'co_owner', 'care_admin');
$$;

CREATE OR REPLACE FUNCTION public.can_publish_pet_lost_report(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_pet_role(p_pet_id)
    IN ('primary_owner', 'co_owner');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_pet_ownership(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_pet_role(p_pet_id) = 'primary_owner';
$$;

CREATE OR REPLACE FUNCTION public.can_delete_pet(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_pet_role(p_pet_id) = 'primary_owner';
$$;

CREATE OR REPLACE FUNCTION public.can_manage_pet_billing(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_pet_role(p_pet_id) = 'primary_owner';
$$;

CREATE OR REPLACE FUNCTION public.is_primary_pet_owner(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_pet_role(p_pet_id) = 'primary_owner';
$$;

-- Keep legacy helper signatures stable while routing them through the
-- canonical capability model. user_has_pet_access historically guarded writes,
-- therefore viewer access is intentionally excluded here.
CREATE OR REPLACE FUNCTION public.user_has_pet_access(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.can_manage_pet_care(p_pet_id);
$$;

CREATE OR REPLACE FUNCTION public.user_is_pet_member(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.can_view_pet(p_pet_id);
$$;

CREATE OR REPLACE FUNCTION public.user_pet_role(p_pet_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE public.current_pet_role(p_pet_id)
    WHEN 'primary_owner' THEN 'owner'
    WHEN 'co_owner' THEN 'owner'
    WHEN 'care_admin' THEN 'admin'
    WHEN 'care_editor' THEN 'editor'
    WHEN 'viewer' THEN 'viewer'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_owns_pet(
  p_pet_id uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (
      p_user_id = auth.uid()
      OR auth.role() = 'service_role'
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.pet_memberships AS membership
        WHERE membership.pet_id = p_pet_id
          AND membership.profile_id = p_user_id
          AND membership.status = 'active'
          AND membership.role IN ('primary_owner', 'co_owner')
      )
      OR EXISTS (
        SELECT 1
        FROM public.pets AS pet
        WHERE pet.id = p_pet_id
          AND pet.owner_id = p_user_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.pet_owners AS legacy_owner
        WHERE legacy_owner.pet_id = p_pet_id
          AND legacy_owner.profile_id = p_user_id
          AND legacy_owner.role = 'owner'
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.on_pet_created_add_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_membership_id uuid;
BEGIN
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.pet_memberships (
    pet_id,
    profile_id,
    role,
    status,
    source,
    accepted_at
  )
  VALUES (
    NEW.id,
    NEW.owner_id,
    'primary_owner',
    'active',
    'pet_creation',
    now()
  )
  ON CONFLICT (pet_id, profile_id) DO UPDATE
  SET
    role = 'primary_owner',
    status = 'active',
    source = 'pet_creation',
    accepted_at = COALESCE(
      public.pet_memberships.accepted_at,
      EXCLUDED.accepted_at
    ),
    revoked_at = NULL,
    updated_at = now()
  RETURNING id INTO v_membership_id;

  INSERT INTO public.pet_owners (pet_id, profile_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (pet_id, profile_id) DO UPDATE
  SET role = 'owner';

  INSERT INTO public.pet_members (pet_id, profile_id, role, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', now())
  ON CONFLICT (pet_id, profile_id) DO UPDATE
  SET role = 'owner';

  INSERT INTO public.pet_membership_events (
    membership_id,
    pet_id,
    profile_id,
    event_type,
    new_role,
    actor_profile_id,
    source,
    reason
  )
  VALUES (
    v_membership_id,
    NEW.id,
    NEW.owner_id,
    'membership_created',
    'primary_owner',
    NEW.owner_id,
    'pet_creation',
    'Atomic primary membership created with pet'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_pet_created_add_owner ON public.pets;
CREATE TRIGGER on_pet_created_add_owner
  AFTER INSERT ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION public.on_pet_created_add_owner();

-- pets.owner_id is a compatibility mirror, not an independent write surface.
-- Only the transaction-safe ownership transfer RPC may change it.
CREATE OR REPLACE FUNCTION public.guard_pet_primary_owner_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.owner_id IS DISTINCT FROM NEW.owner_id
    AND COALESCE(
      current_setting('app.pet_primary_owner_transfer', true),
      ''
    ) <> 'allowed'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'OWNER_ID_CHANGE_REQUIRES_TRANSFER_RPC';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_pet_primary_owner_change ON public.pets;
CREATE TRIGGER guard_pet_primary_owner_change
  BEFORE UPDATE OF owner_id ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_pet_primary_owner_change();

CREATE OR REPLACE FUNCTION public.create_pet_with_primary_membership(
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_name text := NULLIF(btrim(p_payload->>'name'), '');
  v_species text := NULLIF(btrim(p_payload->>'species'), '');
  v_breed text := NULLIF(btrim(p_payload->>'breed'), '');
  v_pet public.pets%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'AUTH_REQUIRED';
  END IF;

  IF v_name IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'PET_NAME_REQUIRED';
  END IF;

  IF v_species IS NULL OR v_species NOT IN ('cat', 'dog') THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'INVALID_PET_SPECIES';
  END IF;

  IF v_breed IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'PET_BREED_REQUIRED';
  END IF;

  INSERT INTO public.pets (
    owner_id,
    name,
    species,
    breed,
    avatar_url,
    cover_url,
    cover_position,
    birth_date,
    gender,
    color,
    microchip_no,
    passport_no,
    tattoo_no,
    pedigree_sire,
    pedigree_dam,
    vet_name,
    vet_company,
    vet_phone,
    vet_email,
    city,
    district,
    is_neutered,
    lifestyle,
    size,
    is_demo
  )
  VALUES (
    v_actor_id,
    v_name,
    v_species,
    v_breed,
    NULLIF(p_payload->>'avatar_url', ''),
    NULLIF(p_payload->>'cover_url', ''),
    COALESCE(NULLIF(p_payload->>'cover_position', ''), 'center'),
    CASE
      WHEN NULLIF(p_payload->>'birth_date', '') IS NULL THEN NULL
      ELSE (p_payload->>'birth_date')::date
    END,
    NULLIF(p_payload->>'gender', ''),
    NULLIF(p_payload->>'color', ''),
    NULLIF(p_payload->>'microchip_no', ''),
    NULLIF(p_payload->>'passport_no', ''),
    NULLIF(p_payload->>'tattoo_no', ''),
    NULLIF(p_payload->>'pedigree_sire', ''),
    NULLIF(p_payload->>'pedigree_dam', ''),
    NULLIF(p_payload->>'vet_name', ''),
    NULLIF(p_payload->>'vet_company', ''),
    NULLIF(p_payload->>'vet_phone', ''),
    NULLIF(p_payload->>'vet_email', ''),
    NULLIF(p_payload->>'city', ''),
    NULLIF(p_payload->>'district', ''),
    COALESCE((p_payload->>'is_neutered')::boolean, false),
    NULLIF(p_payload->>'lifestyle', ''),
    NULLIF(p_payload->>'size', ''),
    COALESCE((p_payload->>'is_demo')::boolean, false)
  )
  RETURNING * INTO v_pet;

  RETURN jsonb_build_object(
    'id', v_pet.id,
    'name', v_pet.name
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_pet_caregiver_invite(
  p_pet_id uuid,
  p_email text,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role public.pet_membership_role;
  v_email text := lower(NULLIF(btrim(p_email), ''));
  v_plan text;
  v_limit integer;
  v_member_count integer;
  v_invite public.pet_invites%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'AUTH_REQUIRED';
  END IF;

  v_actor_role := public.current_pet_role(p_pet_id);
  IF v_actor_role NOT IN ('primary_owner', 'co_owner', 'care_admin') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  IF p_role NOT IN ('admin', 'editor', 'viewer') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_ROLE');
  END IF;

  IF v_actor_role = 'care_admin' AND p_role = 'admin' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ROLE_ESCALATION');
  END IF;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EMAIL_REQUIRED');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = v_actor_id
      AND lower(profile.email) = v_email
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'SELF_INVITE');
  END IF;

  SELECT subscription.plan::text
  INTO v_plan
  FROM public.user_subscriptions AS subscription
  WHERE subscription.profile_id = v_actor_id
  LIMIT 1;

  v_limit := CASE v_plan
    WHEN 'ai_plus' THEN 999
    WHEN 'pro' THEN 5
    ELSE 2
  END;

  SELECT count(DISTINCT accessible.profile_id)
  INTO v_member_count
  FROM (
    SELECT membership.profile_id
    FROM public.pet_memberships AS membership
    WHERE membership.pet_id = p_pet_id
      AND membership.status = 'active'
    UNION
    SELECT legacy_member.profile_id
    FROM public.pet_members AS legacy_member
    WHERE legacy_member.pet_id = p_pet_id
  ) AS accessible;

  IF v_member_count >= v_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'PLAN_LIMIT',
      'limit', v_limit
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pet_memberships AS membership
    JOIN public.profiles AS profile
      ON profile.id = membership.profile_id
    WHERE membership.pet_id = p_pet_id
      AND membership.status = 'active'
      AND lower(profile.email) = v_email
  ) OR EXISTS (
    SELECT 1
    FROM public.pet_members AS legacy_member
    JOIN public.profiles AS profile
      ON profile.id = legacy_member.profile_id
    WHERE legacy_member.pet_id = p_pet_id
      AND lower(profile.email) = v_email
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_MEMBER');
  END IF;

  INSERT INTO public.pet_invites (
    pet_id,
    invited_by,
    email,
    role,
    token,
    status,
    expires_at
  )
  VALUES (
    p_pet_id,
    v_actor_id,
    v_email,
    p_role,
    encode(extensions.gen_random_bytes(32), 'hex'),
    'pending',
    now() + interval '7 days'
  )
  ON CONFLICT (pet_id, email) DO UPDATE
  SET
    invited_by = EXCLUDED.invited_by,
    role = EXCLUDED.role,
    token = EXCLUDED.token,
    status = 'pending',
    expires_at = EXCLUDED.expires_at
  RETURNING * INTO v_invite;

  INSERT INTO public.pet_activity_log (
    pet_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    description
  )
  VALUES (
    p_pet_id,
    v_actor_id,
    'invited_member',
    'pet_invite',
    v_invite.id,
    v_email || ' adresine ' || p_role || ' rolüyle davet gönderildi'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'invite', to_jsonb(v_invite)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_pet_caregiver_invite(
  p_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_email text;
  v_email_verified boolean;
  v_invite public.pet_invites%ROWTYPE;
  v_membership public.pet_memberships%ROWTYPE;
  v_membership_role public.pet_membership_role;
  v_reward_id uuid;
  v_pet jsonb;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  END IF;

  SELECT lower(user_row.email), user_row.email_confirmed_at IS NOT NULL
  INTO v_actor_email, v_email_verified
  FROM auth.users AS user_row
  WHERE user_row.id = v_actor_id;

  IF NOT COALESCE(v_email_verified, false) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EMAIL_NOT_VERIFIED');
  END IF;

  SELECT *
  INTO v_invite
  FROM public.pet_invites AS invite
  WHERE invite.token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_TOKEN');
  END IF;

  IF v_invite.status = 'accepted' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_USED');
  END IF;

  IF v_invite.status = 'revoked' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'REVOKED');
  END IF;

  IF v_invite.status = 'expired' OR v_invite.expires_at < now() THEN
    UPDATE public.pet_invites
    SET status = 'expired'
    WHERE id = v_invite.id;
    RETURN jsonb_build_object('ok', false, 'code', 'EXPIRED');
  END IF;

  IF lower(v_invite.email) <> v_actor_email THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EMAIL_MISMATCH');
  END IF;

  IF v_invite.invited_by = v_actor_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'SELF_INVITE');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pets AS pet
    WHERE pet.id = v_invite.pet_id
      AND pet.owner_id = v_actor_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'OWN_PET');
  END IF;

  v_membership_role := CASE v_invite.role
    WHEN 'admin' THEN 'care_admin'::public.pet_membership_role
    WHEN 'editor' THEN 'care_editor'::public.pet_membership_role
    WHEN 'viewer' THEN 'viewer'::public.pet_membership_role
    ELSE NULL
  END;

  IF v_membership_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_ROLE');
  END IF;

  SELECT *
  INTO v_membership
  FROM public.pet_memberships AS membership
  WHERE membership.pet_id = v_invite.pet_id
    AND membership.profile_id = v_actor_id
  FOR UPDATE;

  IF FOUND AND v_membership.status = 'active' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'ALREADY_MEMBER',
      'pet_id', v_invite.pet_id
    );
  END IF;

  IF v_membership.id IS NULL THEN
    INSERT INTO public.pet_memberships (
      pet_id,
      profile_id,
      role,
      status,
      invited_by,
      invite_id,
      source,
      accepted_at
    )
    VALUES (
      v_invite.pet_id,
      v_actor_id,
      v_membership_role,
      'active',
      v_invite.invited_by,
      v_invite.id,
      'invitation',
      now()
    )
    RETURNING * INTO v_membership;
  ELSE
    UPDATE public.pet_memberships
    SET
      role = v_membership_role,
      status = 'active',
      invited_by = v_invite.invited_by,
      invite_id = v_invite.id,
      source = 'invitation',
      accepted_at = now(),
      revoked_at = NULL
    WHERE id = v_membership.id
    RETURNING * INTO v_membership;
  END IF;

  INSERT INTO public.pet_members (
    pet_id,
    profile_id,
    role,
    invited_by,
    joined_at
  )
  VALUES (
    v_invite.pet_id,
    v_actor_id,
    v_invite.role,
    v_invite.invited_by,
    now()
  )
  ON CONFLICT (pet_id, profile_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    invited_by = EXCLUDED.invited_by,
    joined_at = EXCLUDED.joined_at;

  UPDATE public.pet_invites
  SET status = 'accepted'
  WHERE id = v_invite.id;

  INSERT INTO public.pet_membership_events (
    membership_id,
    pet_id,
    profile_id,
    event_type,
    old_role,
    new_role,
    actor_profile_id,
    source,
    request_id,
    reason
  )
  VALUES (
    v_membership.id,
    v_membership.pet_id,
    v_membership.profile_id,
    'invite_accepted',
    NULL,
    v_membership.role,
    v_actor_id,
    'invitation',
    v_invite.id,
    'Caregiver invite accepted atomically'
  )
  ON CONFLICT DO NOTHING;

  INSERT INTO public.pet_activity_log (
    pet_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    description
  )
  VALUES (
    v_invite.pet_id,
    v_actor_id,
    'joined_family',
    'pet_membership',
    v_membership.id,
    'Bakım ekibine katıldı (' || v_invite.role || ' olarak)'
  );

  INSERT INTO public.referral_rewards (
    invite_id,
    rewarded_profile_id,
    reward_type,
    amount
  )
  VALUES (
    v_invite.id,
    v_invite.invited_by,
    'care_points',
    50
  )
  ON CONFLICT (invite_id, rewarded_profile_id) DO NOTHING
  RETURNING id INTO v_reward_id;

  IF v_reward_id IS NOT NULL THEN
    UPDATE public.profiles
    SET care_points = COALESCE(care_points, 0) + 50
    WHERE id = v_invite.invited_by;
  END IF;

  v_reward_id := NULL;

  INSERT INTO public.referral_rewards (
    invite_id,
    rewarded_profile_id,
    reward_type,
    amount
  )
  VALUES (
    v_invite.id,
    v_actor_id,
    'care_points',
    25
  )
  ON CONFLICT (invite_id, rewarded_profile_id) DO NOTHING
  RETURNING id INTO v_reward_id;

  IF v_reward_id IS NOT NULL THEN
    UPDATE public.profiles
    SET care_points = COALESCE(care_points, 0) + 25
    WHERE id = v_actor_id;
  END IF;

  SELECT jsonb_build_object(
    'id', pet.id,
    'name', pet.name,
    'owner_id', pet.owner_id,
    'species', pet.species,
    'breed', pet.breed
  )
  INTO v_pet
  FROM public.pets AS pet
  WHERE pet.id = v_invite.pet_id;

  RETURN jsonb_build_object(
    'ok', true,
    'pet', v_pet,
    'role', v_invite.role,
    'rewards', jsonb_build_object('inviter', 50, 'invited', 25)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_pet_caregiver(
  p_pet_id uuid,
  p_legacy_member_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role public.pet_membership_role;
  v_legacy_member public.pet_members%ROWTYPE;
  v_membership public.pet_memberships%ROWTYPE;
BEGIN
  v_actor_role := public.current_pet_role(p_pet_id);
  IF v_actor_id IS NULL
    OR v_actor_role NOT IN ('primary_owner', 'co_owner', 'care_admin') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  SELECT *
  INTO v_legacy_member
  FROM public.pet_members AS member
  WHERE member.id = p_legacy_member_id
    AND member.pet_id = p_pet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'MEMBER_NOT_FOUND');
  END IF;

  SELECT *
  INTO v_membership
  FROM public.pet_memberships AS membership
  WHERE membership.pet_id = p_pet_id
    AND membership.profile_id = v_legacy_member.profile_id
  FOR UPDATE;

  IF v_legacy_member.role = 'owner'
    OR v_membership.role IN ('primary_owner', 'co_owner') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_CANNOT_BE_REMOVED');
  END IF;

  IF v_actor_role = 'care_admin'
    AND (
      v_legacy_member.role = 'admin'
      OR v_membership.role = 'care_admin'
    ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ROLE_ESCALATION');
  END IF;

  IF v_membership.id IS NOT NULL THEN
    UPDATE public.pet_memberships
    SET
      status = 'revoked',
      revoked_at = now()
    WHERE id = v_membership.id;
  END IF;

  DELETE FROM public.pet_members
  WHERE id = v_legacy_member.id;

  INSERT INTO public.pet_membership_events (
    membership_id,
    pet_id,
    profile_id,
    event_type,
    old_role,
    actor_profile_id,
    source,
    reason
  )
  VALUES (
    v_membership.id,
    p_pet_id,
    v_legacy_member.profile_id,
    'membership_revoked',
    v_membership.role,
    v_actor_id,
    'invitation',
    'Caregiver removed'
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.change_pet_caregiver_role(
  p_pet_id uuid,
  p_profile_id uuid,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role public.pet_membership_role;
  v_old_role public.pet_membership_role;
  v_new_role public.pet_membership_role;
  v_membership_id uuid;
BEGIN
  v_actor_role := public.current_pet_role(p_pet_id);
  IF v_actor_id IS NULL
    OR v_actor_role NOT IN ('primary_owner', 'co_owner', 'care_admin') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  v_new_role := CASE p_role
    WHEN 'owner' THEN 'co_owner'::public.pet_membership_role
    WHEN 'admin' THEN 'care_admin'::public.pet_membership_role
    WHEN 'editor' THEN 'care_editor'::public.pet_membership_role
    WHEN 'viewer' THEN 'viewer'::public.pet_membership_role
    ELSE NULL
  END;

  IF v_new_role IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_ROLE');
  END IF;

  IF v_actor_role = 'care_admin' AND v_new_role = 'care_admin' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ROLE_ESCALATION');
  END IF;

  IF v_new_role = 'co_owner' AND v_actor_role <> 'primary_owner' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ROLE_ESCALATION');
  END IF;

  SELECT membership.role, membership.id
  INTO v_old_role, v_membership_id
  FROM public.pet_memberships AS membership
  WHERE membership.pet_id = p_pet_id
    AND membership.profile_id = p_profile_id
  FOR UPDATE;

  IF v_old_role IN ('primary_owner', 'co_owner') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'OWNER_ROLE_PROTECTED');
  END IF;

  INSERT INTO public.pet_memberships (
    pet_id,
    profile_id,
    role,
    status,
    source,
    accepted_at
  )
  VALUES (
    p_pet_id,
    p_profile_id,
    v_new_role,
    'active',
    'admin_recovery',
    now()
  )
  ON CONFLICT (pet_id, profile_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    status = 'active',
    revoked_at = NULL,
    updated_at = now()
  RETURNING id INTO v_membership_id;

  INSERT INTO public.pet_members (
    pet_id,
    profile_id,
    role,
    joined_at
  )
  VALUES (
    p_pet_id,
    p_profile_id,
    p_role,
    now()
  )
  ON CONFLICT (pet_id, profile_id) DO UPDATE
  SET role = EXCLUDED.role;

  IF v_new_role = 'co_owner' THEN
    INSERT INTO public.pet_owners (pet_id, profile_id, role)
    VALUES (p_pet_id, p_profile_id, 'owner')
    ON CONFLICT (pet_id, profile_id) DO UPDATE
    SET role = 'owner';
  END IF;

  INSERT INTO public.pet_membership_events (
    membership_id,
    pet_id,
    profile_id,
    event_type,
    old_role,
    new_role,
    actor_profile_id,
    source,
    reason
  )
  VALUES (
    v_membership_id,
    p_pet_id,
    p_profile_id,
    'role_changed',
    v_old_role,
    v_new_role,
    v_actor_id,
    'admin_recovery',
    'Caregiver role changed'
  );

  RETURN jsonb_build_object('ok', true, 'role', p_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_pet_primary_owner(
  p_pet_id uuid,
  p_new_profile_id uuid,
  p_request_id uuid DEFAULT gen_random_uuid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_old_membership_id uuid;
  v_new_membership_id uuid;
BEGIN
  PERFORM 1
  FROM public.pets AS pet
  WHERE pet.id = p_pet_id
    AND pet.owner_id = v_actor_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.is_primary_pet_owner(p_pet_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  IF p_new_profile_id = v_actor_id THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_PRIMARY');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pet_memberships AS membership
    WHERE membership.pet_id = p_pet_id
      AND membership.profile_id = p_new_profile_id
      AND membership.status = 'active'
      AND membership.role = 'co_owner'
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.pet_owners AS legacy_owner
    WHERE legacy_owner.pet_id = p_pet_id
      AND legacy_owner.profile_id = p_new_profile_id
      AND legacy_owner.role = 'owner'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NEW_OWNER_NOT_CO_OWNER');
  END IF;

  SELECT membership.id
  INTO v_old_membership_id
  FROM public.pet_memberships AS membership
  WHERE membership.pet_id = p_pet_id
    AND membership.profile_id = v_actor_id
  FOR UPDATE;

  INSERT INTO public.pet_memberships (
    pet_id,
    profile_id,
    role,
    status,
    source,
    accepted_at
  )
  VALUES (
    p_pet_id,
    p_new_profile_id,
    'co_owner',
    'active',
    'ownership_transfer',
    now()
  )
  ON CONFLICT (pet_id, profile_id) DO UPDATE
  SET
    status = 'active',
    revoked_at = NULL,
    updated_at = now()
  RETURNING id INTO v_new_membership_id;

  UPDATE public.pet_memberships
  SET
    role = 'co_owner',
    source = 'ownership_transfer'
  WHERE id = v_old_membership_id;

  UPDATE public.pet_memberships
  SET
    role = 'primary_owner',
    source = 'ownership_transfer'
  WHERE id = v_new_membership_id;

  PERFORM set_config(
    'app.pet_primary_owner_transfer',
    'allowed',
    true
  );

  UPDATE public.pets
  SET owner_id = p_new_profile_id
  WHERE id = p_pet_id;

  INSERT INTO public.pet_owners (pet_id, profile_id, role)
  VALUES
    (p_pet_id, v_actor_id, 'owner'),
    (p_pet_id, p_new_profile_id, 'owner')
  ON CONFLICT (pet_id, profile_id) DO UPDATE
  SET role = 'owner';

  INSERT INTO public.pet_members (pet_id, profile_id, role, joined_at)
  VALUES
    (p_pet_id, v_actor_id, 'owner', now()),
    (p_pet_id, p_new_profile_id, 'owner', now())
  ON CONFLICT (pet_id, profile_id) DO UPDATE
  SET role = 'owner';

  INSERT INTO public.pet_membership_events (
    membership_id,
    pet_id,
    profile_id,
    event_type,
    old_role,
    new_role,
    actor_profile_id,
    source,
    request_id,
    reason
  )
  VALUES
    (
      v_old_membership_id,
      p_pet_id,
      v_actor_id,
      'primary_transferred',
      'primary_owner',
      'co_owner',
      v_actor_id,
      'ownership_transfer',
      p_request_id,
      'Previous primary owner demoted'
    ),
    (
      v_new_membership_id,
      p_pet_id,
      p_new_profile_id,
      'primary_transferred',
      'co_owner',
      'primary_owner',
      v_actor_id,
      'ownership_transfer',
      p_request_id,
      'New primary owner promoted'
    )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'pet_id', p_pet_id,
    'primary_owner_id', p_new_profile_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_pet_with_memberships(
  p_pet_id uuid,
  p_request_id uuid DEFAULT gen_random_uuid()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_membership_id uuid;
BEGIN
  PERFORM 1
  FROM public.pets AS pet
  WHERE pet.id = p_pet_id
    AND pet.owner_id = v_actor_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.can_delete_pet(p_pet_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  SELECT membership.id
  INTO v_membership_id
  FROM public.pet_memberships AS membership
  WHERE membership.pet_id = p_pet_id
    AND membership.profile_id = v_actor_id
    AND membership.status = 'active'
    AND membership.role = 'primary_owner'
  LIMIT 1;

  INSERT INTO public.pet_membership_events (
    membership_id,
    pet_id,
    profile_id,
    event_type,
    old_role,
    actor_profile_id,
    source,
    request_id,
    reason
  )
  VALUES (
    v_membership_id,
    p_pet_id,
    v_actor_id,
    'pet_deleted',
    'primary_owner',
    v_actor_id,
    'admin_recovery',
    p_request_id,
    'Pet deleted atomically by primary owner'
  )
  ON CONFLICT DO NOTHING;

  DELETE FROM public.pets
  WHERE id = p_pet_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

ALTER TABLE public.pet_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_membership_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_membership_migration_issues ENABLE ROW LEVEL SECURITY;

-- A viewer/editor/co-owner can load the pet shell through the canonical
-- capability model. More privileged mutations remain protected separately.
DROP POLICY IF EXISTS pets_select_own ON public.pets;
CREATE POLICY pets_select_own
  ON public.pets
  FOR SELECT
  TO authenticated
  USING (public.can_view_pet(id));

DROP POLICY IF EXISTS pet_memberships_select_authorized
  ON public.pet_memberships;
CREATE POLICY pet_memberships_select_authorized
  ON public.pet_memberships
  FOR SELECT
  TO authenticated
  USING (public.can_view_pet(pet_id));

-- The immutable audit and migration-review tables are service-side only.
REVOKE ALL ON TABLE public.pet_membership_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.pet_membership_migration_issues FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.pet_membership_events TO service_role;
GRANT ALL ON TABLE public.pet_membership_migration_issues TO service_role;

REVOKE ALL ON TABLE public.pet_memberships FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.pet_memberships TO authenticated;
GRANT ALL ON TABLE public.pet_memberships TO service_role;

-- Replace insecure legacy direct-mutation policies only after RPCs exist in
-- this same transaction.
DROP POLICY IF EXISTS pet_owners_insert ON public.pet_owners;
DROP POLICY IF EXISTS pet_owners_delete ON public.pet_owners;
DROP POLICY IF EXISTS pet_owners_select ON public.pet_owners;
DROP POLICY IF EXISTS "pet_owners_insert" ON public.pet_owners;
DROP POLICY IF EXISTS "pet_owners_delete" ON public.pet_owners;
DROP POLICY IF EXISTS "pet_owners_select" ON public.pet_owners;

CREATE POLICY pet_owners_select_authorized
  ON public.pet_owners
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR public.can_manage_pet_caregivers(pet_id)
  );

DROP POLICY IF EXISTS "Owner/admin can manage members" ON public.pet_members;
DROP POLICY IF EXISTS "Allow self-insert on accept" ON public.pet_members;
DROP POLICY IF EXISTS "Members can view fellow members" ON public.pet_members;

CREATE POLICY pet_members_select_authorized
  ON public.pet_members
  FOR SELECT
  TO authenticated
  USING (public.can_view_pet(pet_id));

DROP POLICY IF EXISTS "Owner/admin can manage invites" ON public.pet_invites;
DROP POLICY IF EXISTS "Members can view invites" ON public.pet_invites;

CREATE POLICY pet_invites_select_authorized
  ON public.pet_invites
  FOR SELECT
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR lower(email) = lower(COALESCE(auth.jwt()->>'email', ''))
    OR public.can_manage_pet_caregivers(pet_id)
  );

REVOKE ALL
  ON TABLE public.pet_owners, public.pet_members, public.pet_invites
  FROM PUBLIC, anon, authenticated;

GRANT SELECT
  ON TABLE public.pet_owners, public.pet_members, public.pet_invites
  TO authenticated;

GRANT ALL
  ON TABLE public.pet_owners, public.pet_members, public.pet_invites
  TO service_role;

-- Pet creation remains backward compatible and is mirrored by the insert
-- trigger. Destructive changes and primary-owner edits are RPC-only.
REVOKE DELETE ON TABLE public.pets FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON TABLE public.pets FROM PUBLIC, anon, authenticated;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE public.pets
  FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  v_columns text;
BEGIN
  SELECT string_agg(quote_ident(attribute.attname), ', ')
  INTO v_columns
  FROM pg_attribute AS attribute
  WHERE attribute.attrelid = 'public.pets'::regclass
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped
    AND attribute.attname NOT IN (
      'id',
      'owner_id',
      'created_at',
      'health_score',
      'data_quality_score',
      'engagement_score',
      'last_interaction_at',
      'weekly_log_count',
      'is_demo'
    );

  IF v_columns IS NOT NULL THEN
    EXECUTE format(
      'GRANT UPDATE (%s) ON TABLE public.pets TO authenticated',
      v_columns
    );
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public.touch_pet_membership_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_pet_created_add_owner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_pet_primary_owner_change() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.current_pet_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_pet(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_pet_profile(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_pet_care(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_pet_caregivers(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_publish_pet_lost_report(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_pet_ownership(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_delete_pet(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage_pet_billing(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_primary_pet_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_has_pet_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_is_pet_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_pet_role(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_owns_pet(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_pet_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_pet(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_pet_profile(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_pet_care(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_pet_caregivers(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_publish_pet_lost_report(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_pet_ownership(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_delete_pet(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_pet_billing(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_primary_pet_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_pet_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_is_pet_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_pet_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_owns_pet(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_pet_with_primary_membership(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_pet_caregiver_invite(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_pet_caregiver_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_pet_caregiver(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.change_pet_caregiver_role(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_pet_primary_owner(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_pet_with_memberships(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_pet_with_primary_membership(jsonb)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_pet_caregiver_invite(uuid, text, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_pet_caregiver_invite(text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_pet_caregiver(uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.change_pet_caregiver_role(uuid, uuid, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transfer_pet_primary_owner(uuid, uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_pet_with_memberships(uuid, uuid)
  TO authenticated, service_role;

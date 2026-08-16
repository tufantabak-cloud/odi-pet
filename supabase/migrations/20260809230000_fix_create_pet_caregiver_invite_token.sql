-- Fix create_pet_caregiver_invite token generation, capability functions, pet_memberships tables, and QR invite handling
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'pet_membership_role'
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
    SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'pet_membership_status'
  ) THEN
    CREATE TYPE public.pet_membership_status AS ENUM ('active', 'revoked');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'pet_membership_source'
  ) THEN
    CREATE TYPE public.pet_membership_source AS ENUM (
      'pet_creation',
      'invitation',
      'ownership_transfer',
      'migration',
      'admin_recovery'
    );
  END IF;
END $$;

-- 1. Canonical tables
CREATE TABLE IF NOT EXISTS public.pet_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  role public.pet_membership_role NOT NULL,
  status public.pet_membership_status NOT NULL DEFAULT 'active',
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  invite_id uuid REFERENCES public.pet_invites(id) ON DELETE SET NULL,
  source public.pet_membership_source NOT NULL DEFAULT 'invitation',
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
  source public.pet_membership_source NOT NULL DEFAULT 'invitation',
  request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Schema drift fix for pet_membership_events
ALTER TABLE public.pet_membership_events 
  ADD COLUMN IF NOT EXISTS request_id uuid,
  ADD COLUMN IF NOT EXISTS old_role public.pet_membership_role;

CREATE UNIQUE INDEX IF NOT EXISTS pet_membership_events_request_idx
  ON public.pet_membership_events (
    request_id,
    event_type,
    profile_id
  )
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS pet_membership_events_pet_created_idx
  ON public.pet_membership_events (pet_id, created_at DESC);

-- 2. Helper function to determine user's role for a pet
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

-- 3. Capability functions
CREATE OR REPLACE FUNCTION public.can_view_pet(p_pet_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_pet_role(p_pet_id) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_pet_profile(p_pet_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_pet_role(p_pet_id) IN ('primary_owner', 'co_owner');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_pet_care(p_pet_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_pet_role(p_pet_id) IN ('primary_owner', 'co_owner', 'care_admin', 'care_editor');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_pet_caregivers(p_pet_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_pet_role(p_pet_id) IN ('primary_owner', 'co_owner', 'care_admin');
$$;

CREATE OR REPLACE FUNCTION public.can_publish_pet_lost_report(p_pet_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_pet_role(p_pet_id) IN ('primary_owner', 'co_owner');
$$;

CREATE OR REPLACE FUNCTION public.can_manage_pet_ownership(p_pet_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_pet_role(p_pet_id) = 'primary_owner';
$$;

CREATE OR REPLACE FUNCTION public.can_delete_pet(p_pet_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_pet_role(p_pet_id) = 'primary_owner';
$$;

CREATE OR REPLACE FUNCTION public.can_manage_pet_billing(p_pet_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_pet_role(p_pet_id) = 'primary_owner';
$$;

CREATE OR REPLACE FUNCTION public.is_primary_pet_owner(p_pet_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_pet_role(p_pet_id) = 'primary_owner';
$$;

CREATE OR REPLACE FUNCTION public.user_has_pet_access(p_pet_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_pet_role(p_pet_id) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.user_is_pet_member(p_pet_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.current_pet_role(p_pet_id) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.user_pet_role(p_pet_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE public.current_pet_role(p_pet_id)
    WHEN 'primary_owner' THEN 'owner'
    WHEN 'co_owner' THEN 'owner'
    WHEN 'care_admin' THEN 'admin'
    WHEN 'care_editor' THEN 'editor'
    WHEN 'viewer' THEN 'viewer'
    ELSE NULL
  END;
$$;

-- 4. Create caregiver invite RPC
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

  IF p_role NOT IN ('admin', 'editor', 'viewer', 'co_owner') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_ROLE');
  END IF;

  IF v_actor_role = 'care_admin' AND p_role IN ('admin', 'co_owner') THEN
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
    replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
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

-- 5. Accept caregiver invite RPC with QR code support
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

  -- Allow QR code invitations (qr-davet-*@odipet.local) to be accepted by any logged-in user
  IF lower(v_invite.email) <> v_actor_email AND lower(v_invite.email) NOT LIKE 'qr-davet-%@odipet.local' THEN
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
    WHEN 'co_owner' THEN 'co_owner'::public.pet_membership_role
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

-- 6. Grants & Permissions
ALTER TABLE public.pet_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_membership_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.pet_memberships TO authenticated;
GRANT ALL ON TABLE public.pet_memberships TO service_role;
GRANT SELECT ON TABLE public.pet_membership_events TO authenticated;
GRANT ALL ON TABLE public.pet_membership_events TO service_role;

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
GRANT EXECUTE ON FUNCTION public.create_pet_caregiver_invite(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_pet_caregiver_invite(text) TO authenticated, service_role;

-- 7. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';

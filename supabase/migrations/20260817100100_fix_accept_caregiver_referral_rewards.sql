-- Clean up dead referral_rewards inserts from accept_pet_caregiver_invite

CREATE OR REPLACE FUNCTION public.accept_pet_caregiver_invite(
  p_token TEXT,
  p_profile_id UUID
)
RETURNS jsonb AS $$
DECLARE
  v_invite RECORD;
  v_membership RECORD;
  v_pet RECORD;
  v_actor_id UUID;
  v_membership_role TEXT;
BEGIN
  -- 1. Validate inputs
  IF p_token IS NULL OR p_token = '' THEN
    RAISE EXCEPTION 'invalid_input' USING ERRCODE = 'P0001', MESSAGE = 'Davet kodu boş olamaz';
  END IF;

  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'P0002', MESSAGE = 'Kullanıcı kimliği doğrulanamadı';
  END IF;
  
  v_actor_id := p_profile_id;

  -- 2. Find and lock the invite
  SELECT *
  INTO v_invite
  FROM public.pet_invites
  WHERE token = p_token
  FOR UPDATE;

  -- 3. Validate invite status
  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0003', MESSAGE = 'Davet bulunamadı veya geçersiz';
  END IF;

  IF v_invite.status = 'accepted' THEN
    RAISE EXCEPTION 'already_accepted' USING ERRCODE = 'P0004', MESSAGE = 'Bu davet zaten kabul edilmiş';
  END IF;

  IF v_invite.status = 'revoked' THEN
    RAISE EXCEPTION 'revoked' USING ERRCODE = 'P0005', MESSAGE = 'Bu davet iptal edilmiş';
  END IF;

  IF v_invite.expires_at < now() THEN
    UPDATE public.pet_invites
    SET status = 'expired'
    WHERE id = v_invite.id;
    
    RAISE EXCEPTION 'expired' USING ERRCODE = 'P0006', MESSAGE = 'Bu davetin süresi dolmuş';
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.uses >= v_invite.max_uses THEN
    RAISE EXCEPTION 'max_uses_reached' USING ERRCODE = 'P0007', MESSAGE = 'Bu davetin kullanım limiti dolmuş';
  END IF;

  -- 4. Check if the user is the owner
  IF v_actor_id = v_invite.invited_by THEN
    RAISE EXCEPTION 'invalid_action' USING ERRCODE = 'P0008', MESSAGE = 'Kendi davetinizi kabul edemezsiniz';
  END IF;

  -- 5. Determine Role
  v_membership_role := v_invite.role;
  IF v_membership_role IS NULL THEN
    v_membership_role := 'caregiver';
  END IF;

  -- 6. Check existing membership
  SELECT *
  INTO v_membership
  FROM public.pet_memberships
  WHERE pet_id = v_invite.pet_id AND profile_id = v_actor_id
  FOR UPDATE;

  IF v_membership IS NOT NULL AND v_membership.status = 'active' THEN
    RAISE EXCEPTION 'already_member' USING ERRCODE = 'P0009', MESSAGE = 'Bu evcil hayvanın bakım ekibinde zaten varsınız';
  END IF;

  -- 7. Execute modifications
  UPDATE public.pet_invites
  SET uses = COALESCE(uses, 0) + 1
  WHERE id = v_invite.id;

  IF v_membership IS NULL THEN
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

  -- DIRECT CARE POINTS UPDATES (Replaced dead referral_rewards inserts)
  UPDATE public.profiles
  SET care_points = COALESCE(care_points, 0) + 50
  WHERE id = v_invite.invited_by;

  UPDATE public.profiles
  SET care_points = COALESCE(care_points, 0) + 25
  WHERE id = v_actor_id;

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
    'success', true,
    'membership', jsonb_build_object(
      'id', v_membership.id,
      'role', v_membership.role,
      'status', v_membership.status
    ),
    'pet', v_pet
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

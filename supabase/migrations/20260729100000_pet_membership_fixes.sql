-- smart_scanner_records ON DELETE CASCADE düzeltmesi
ALTER TABLE public.smart_scanner_records 
  DROP CONSTRAINT IF EXISTS smart_scanner_records_pet_id_fkey;

ALTER TABLE public.smart_scanner_records 
  ADD CONSTRAINT smart_scanner_records_pet_id_fkey 
  FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;

-- Davet iptali RPC'si
CREATE OR REPLACE FUNCTION public.revoke_pet_invite(
  p_invite_id uuid,
  p_pet_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_invite public.pet_invites%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  END IF;

  -- Yetki kontrolü (sadece yöneticiler)
  IF NOT public.can_manage_pet_caregivers(p_pet_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  END IF;

  -- Daveti FOR UPDATE ile kilitliyoruz
  SELECT *
  INTO v_invite
  FROM public.pet_invites
  WHERE id = p_invite_id AND pet_id = p_pet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  -- Idempotent: zaten iptal edilmiş veya kabul edilmişse
  IF v_invite.status IN ('revoked', 'accepted') THEN
    RETURN jsonb_build_object('ok', true, 'code', 'ALREADY_PROCESSED');
  END IF;

  -- İptal et
  UPDATE public.pet_invites
  SET status = 'revoked', updated_at = now()
  WHERE id = p_invite_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_pet_invite(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_pet_invite(uuid, uuid) TO authenticated, service_role;

-- Ekipten ayrılma RPC'si
CREATE OR REPLACE FUNCTION public.leave_pet_team(
  p_pet_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_membership public.pet_memberships%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'AUTH_REQUIRED');
  END IF;

  -- Kanonik üyeliği bul ve kilitle
  SELECT *
  INTO v_membership
  FROM public.pet_memberships
  WHERE pet_id = p_pet_id AND profile_id = v_actor_id AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'MEMBER_NOT_FOUND');
  END IF;

  -- Primary owner ayrılamaz
  IF v_membership.role = 'primary_owner' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PRIMARY_OWNER_CANNOT_LEAVE');
  END IF;

  -- Kanonik kaydı revoke et
  UPDATE public.pet_memberships
  SET 
    status = 'revoked', 
    revoked_at = now(),
    updated_at = now()
  WHERE id = v_membership.id;

  -- Audit log kaydı
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
  ) VALUES (
    v_membership.id,
    p_pet_id,
    v_actor_id,
    'member_left',
    v_membership.role,
    NULL,
    v_actor_id,
    'migration',
    'User left the team voluntarily'
  );

  -- Legacy kaydı tamamen sil (RPC içinde güvenli)
  DELETE FROM public.pet_members
  WHERE pet_id = p_pet_id AND profile_id = v_actor_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.leave_pet_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_pet_team(uuid) TO authenticated, service_role;

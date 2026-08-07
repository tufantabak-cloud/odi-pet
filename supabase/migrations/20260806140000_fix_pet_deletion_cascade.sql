-- Migration: Fix pet deletion cascade constraints and RPC permission checks
-- Date: 2026-08-06

-- 1. Ensure foreign key from smart_scanner_records to pets has ON DELETE CASCADE
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'smart_scanner_records_pet_id_fkey'
  ) THEN
    ALTER TABLE public.smart_scanner_records
      DROP CONSTRAINT smart_scanner_records_pet_id_fkey;
  END IF;

  ALTER TABLE public.smart_scanner_records
    ADD CONSTRAINT smart_scanner_records_pet_id_fkey
    FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;

-- 2. Update delete_pet_with_memberships RPC to safely lock pet row and clean up memberships
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

  IF v_membership_id IS NOT NULL THEN
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
  END IF;

  DELETE FROM public.smart_scanner_records WHERE pet_id = p_pet_id;
  DELETE FROM public.pet_memberships WHERE pet_id = p_pet_id;
  DELETE FROM public.pet_owners WHERE pet_id = p_pet_id;
  DELETE FROM public.pet_members WHERE pet_id = p_pet_id;

  DELETE FROM public.pets
  WHERE id = p_pet_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Migration: 20260731180000_create_pet_atomic_rpc.sql
-- Description: Create atomic pet creation RPC ensuring atomic pet + membership + owner mirror creation

CREATE OR REPLACE FUNCTION public.create_pet_atomic(
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
  v_weight numeric;
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

  -- 1. Insert Pet
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
    registration_city,
    registration_district,
    agriculture_directorate,
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
    NULLIF(p_payload->>'registration_city', ''),
    NULLIF(p_payload->>'registration_district', ''),
    NULLIF(p_payload->>'agriculture_directorate', ''),
    COALESCE((p_payload->>'is_neutered')::boolean, false),
    NULLIF(p_payload->>'lifestyle', ''),
    NULLIF(p_payload->>'size', ''),
    COALESCE((p_payload->>'is_demo')::boolean, false)
  )
  RETURNING * INTO v_pet;

  -- 2. Ensure Primary Membership
  INSERT INTO public.pet_memberships (
    pet_id,
    profile_id,
    role,
    status
  )
  VALUES (
    v_pet.id,
    v_actor_id,
    'owner',
    'active'
  )
  ON CONFLICT (pet_id, profile_id) DO UPDATE
  SET role = 'owner', status = 'active';

  -- 3. Ensure Legacy Mirror
  INSERT INTO public.pet_owners (
    pet_id,
    profile_id,
    role
  )
  VALUES (
    v_pet.id,
    v_actor_id,
    'owner'
  )
  ON CONFLICT (pet_id, profile_id) DO UPDATE
  SET role = 'owner';

  -- 4. Initial Weight Log if provided
  IF NULLIF(p_payload->>'weight_kg', '') IS NOT NULL THEN
    BEGIN
      v_weight := (p_payload->>'weight_kg')::numeric;
      IF v_weight > 0 THEN
        INSERT INTO public.weight_logs (pet_id, weight_kg)
        VALUES (v_pet.id, v_weight);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore weight parsing failure silently to preserve pet creation
      NULL;
    END;
  END IF;

  RETURN jsonb_build_object(
    'id', v_pet.id,
    'name', v_pet.name,
    'species', v_pet.species
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_pet_atomic(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pet_atomic(jsonb) TO authenticated, service_role;

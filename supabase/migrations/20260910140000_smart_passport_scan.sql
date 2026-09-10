-- Migration: 20260910140000_smart_passport_scan.sql
-- Description: Smart Passport Scan session tracking and atomic pet creation RPC with idempotency and entitlement

-- 1. Register smart_passport_scan feature in canonical app_features (idempotent)
INSERT INTO public.app_features (key, label, description, scope, status)
VALUES (
  'smart_passport_scan',
  'Akıllı Pasaport Taraması',
  'T.C. Evcil Hayvan Pasaportu ile otomatik kayıt',
  'global',
  'active'
)
ON CONFLICT (key) DO NOTHING;

-- 1b. Seed default feature_limits (Unlimited across free, pro, ai_plus in Phase 1)
INSERT INTO public.feature_limits (feature_key, plan_tier, limit_type, limit_value, window_days, is_enabled)
VALUES
  ('smart_passport_scan', 'free'::public.plan_tier_enum, 'unlimited', NULL, 30, true),
  ('smart_passport_scan', 'pro'::public.plan_tier_enum, 'unlimited', NULL, 30, true),
  ('smart_passport_scan', 'ai_plus'::public.plan_tier_enum, 'unlimited', NULL, 30, true)
ON CONFLICT (feature_key, plan_tier) DO UPDATE SET
  limit_type = 'unlimited',
  limit_value = NULL,
  is_enabled = true;

-- 2. Create smart_scan_sessions table
CREATE TABLE IF NOT EXISTS public.smart_scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'failed')),
  idempotency_key TEXT UNIQUE,
  pages_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  vision_call_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_smart_scan_sessions_user_id ON public.smart_scan_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_scan_sessions_idempotency ON public.smart_scan_sessions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Enable RLS
ALTER TABLE public.smart_scan_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own smart scan sessions" ON public.smart_scan_sessions;
CREATE POLICY "Users can view own smart scan sessions"
  ON public.smart_scan_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own smart scan sessions" ON public.smart_scan_sessions;
CREATE POLICY "Users can create own smart scan sessions"
  ON public.smart_scan_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own smart scan sessions" ON public.smart_scan_sessions;
CREATE POLICY "Users can update own smart scan sessions"
  ON public.smart_scan_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Ensure canonical create_pet_atomic RPC uses valid pet_membership_role 'primary_owner'
CREATE OR REPLACE FUNCTION public.create_pet_atomic(
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

  -- 2. Ensure Primary Membership (Using valid enum value primary_owner and source pet_creation)
  INSERT INTO public.pet_memberships (
    pet_id,
    profile_id,
    role,
    status,
    source
  )
  VALUES (
    v_pet.id,
    v_actor_id,
    'primary_owner'::public.pet_membership_role,
    'active',
    'pet_creation'::public.pet_membership_source
  )
  ON CONFLICT (pet_id, profile_id) DO UPDATE
  SET role = 'primary_owner'::public.pet_membership_role, status = 'active';

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

-- 4. Atomic and Idempotent Pet Creation Wrapper RPC with Entitlement Integration
CREATE OR REPLACE FUNCTION public.create_pet_from_smart_scan(
  p_session_id UUID,
  p_idempotency_key TEXT,
  p_pet_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_session RECORD;
  v_existing_idempotent RECORD;
  v_usage_result JSONB;
  v_created_result JSONB;
  v_pet_id UUID;
BEGIN
  -- 1. Ensure authenticated
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'AUTH_REQUIRED';
  END IF;

  -- 2. Idempotency Check: if key was already processed and completed, return existing pet_id
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, pet_id, status INTO v_existing_idempotent
    FROM public.smart_scan_sessions
    WHERE idempotency_key = p_idempotency_key
      AND user_id = v_actor_id;

    IF FOUND AND v_existing_idempotent.pet_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'pet_id', v_existing_idempotent.pet_id,
        'idempotent_replay', true,
        'session_id', v_existing_idempotent.id
      );
    END IF;
  END IF;

  -- 3. Lock and validate session
  SELECT * INTO v_session
  FROM public.smart_scan_sessions
  WHERE id = p_session_id
    AND user_id = v_actor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'SMART_SCAN_SESSION_NOT_FOUND';
  END IF;

  IF v_session.status = 'completed' AND v_session.pet_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'pet_id', v_session.pet_id,
      'idempotent_replay', true,
      'session_id', v_session.id
    );
  END IF;

  -- 4. Consume entitlement via canonical Feature Engine (Atomic in same transaction)
  v_usage_result := public.consume_feature_usage(
    v_actor_id,
    'smart_passport_scan',
    NULL,
    1,
    p_idempotency_key
  );

  IF (v_usage_result->>'allowed')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0003',
      MESSAGE = COALESCE(v_usage_result->>'reason', 'ENTITLEMENT_LIMIT_EXCEEDED');
  END IF;

  -- 5. Invoke canonical atomic pet creation
  v_created_result := public.create_pet_atomic(p_pet_payload);
  v_pet_id := (v_created_result->>'id')::UUID;

  IF v_pet_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = 'XX000',
      MESSAGE = 'PET_CREATION_FAILED';
  END IF;

  -- 6. Commit session status & link pet
  UPDATE public.smart_scan_sessions
  SET
    status = 'completed',
    pet_id = v_pet_id,
    idempotency_key = COALESCE(p_idempotency_key, idempotency_key),
    updated_at = now()
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'pet_id', v_pet_id,
    'idempotent_replay', false,
    'session_id', p_session_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_pet_from_smart_scan(UUID, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pet_from_smart_scan(UUID, TEXT, JSONB) TO authenticated, service_role;

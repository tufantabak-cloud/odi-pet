-- ==============================================================================
-- Migration: 20260910160000_smart_scan_owner_and_vet.sql
-- Description: Extends create_pet_from_smart_scan RPC to accept p_owner_payload
--              with Zero-Overwrite (COALESCE safe-fill) for public.profiles,
--              and connects vet/tattoo metadata to canonical pet & profile tables.
-- Drop legacy 3-parameter overload to prevent PostgREST PGRST203 ambiguity
DROP FUNCTION IF EXISTS public.create_pet_from_smart_scan(UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.create_pet_from_smart_scan(
  p_session_id UUID,
  p_idempotency_key TEXT,
  p_pet_payload JSONB,
  p_owner_payload JSONB DEFAULT '{}'::jsonb
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
  -- 1. Security Invariant: Require Authenticated Actor
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED: Operation requires an authenticated session'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Verify and Lock Session
  SELECT * INTO v_session
  FROM public.smart_scan_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND: Smart scan session does not exist'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_session.user_id <> v_actor_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: User does not own this smart scan session'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Idempotency Check
  SELECT * INTO v_existing_idempotent
  FROM public.smart_scan_sessions
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND AND v_existing_idempotent.status = 'completed' AND v_existing_idempotent.pet_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'pet_id', v_existing_idempotent.pet_id,
      'session_id', v_existing_idempotent.id,
      'idempotent_replay', true
    );
  END IF;

  -- 4. Consume Entitlement via Canonical Engine
  v_usage_result := public.consume_feature_usage(
    p_profile_id => v_actor_id,
    p_feature_key => 'smart_passport_scan',
    p_pet_id => NULL,
    p_amount => 1,
    p_idempotency_key => p_idempotency_key
  );

  IF v_usage_result->>'allowed' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'ENTITLEMENT_LIMIT_EXCEEDED: %', COALESCE(v_usage_result->>'reason', 'Feature limit reached')
      USING ERRCODE = 'P0003';
  END IF;

  -- 5. Conditional Safe Fill (Zero Overwrite) for Owner Profile
  IF p_owner_payload IS NOT NULL AND p_owner_payload <> '{}'::jsonb THEN
    UPDATE public.profiles
    SET
      first_name   = COALESCE(NULLIF(first_name, ''),   NULLIF(p_owner_payload->>'first_name', '')),
      last_name    = COALESCE(NULLIF(last_name, ''),    NULLIF(p_owner_payload->>'last_name', '')),
      phone        = COALESCE(NULLIF(phone, ''),        NULLIF(p_owner_payload->>'phone', '')),
      city         = COALESCE(NULLIF(city, ''),         NULLIF(p_owner_payload->>'city', '')),
      district     = COALESCE(NULLIF(district, ''),     NULLIF(p_owner_payload->>'district', '')),
      neighborhood = COALESCE(NULLIF(neighborhood, ''), NULLIF(p_owner_payload->>'neighborhood', '')),
      postal_code  = COALESCE(NULLIF(postal_code, ''),  NULLIF(p_owner_payload->>'postal_code', ''))
    WHERE id = v_actor_id;
  END IF;

  -- Prefill preferred_vet_name on profile if empty
  IF NULLIF(p_pet_payload->>'vet_name', '') IS NOT NULL THEN
    UPDATE public.profiles
    SET preferred_vet_name = COALESCE(NULLIF(preferred_vet_name, ''), NULLIF(p_pet_payload->>'vet_name', ''))
    WHERE id = v_actor_id;
  END IF;

  -- 6. Atomic Pet Creation
  v_created_result := public.create_pet_atomic(p_pet_payload);
  v_pet_id := (v_created_result->>'id')::UUID;

  IF v_pet_id IS NULL THEN
    RAISE EXCEPTION 'PET_CREATION_FAILED: Failed to create canonical pet record'
      USING ERRCODE = 'P0001';
  END IF;

  -- 7. Update Session State to Completed
  UPDATE public.smart_scan_sessions
  SET
    status = 'completed',
    pet_id = v_pet_id,
    idempotency_key = p_idempotency_key,
    updated_at = now()
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'pet_id', v_pet_id,
    'session_id', p_session_id,
    'idempotent_replay', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_pet_from_smart_scan(UUID, TEXT, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pet_from_smart_scan(UUID, TEXT, JSONB, JSONB) TO authenticated, service_role;

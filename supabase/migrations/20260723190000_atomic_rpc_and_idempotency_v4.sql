-- ═══════════════════════════════════════════════════════════════
-- Odi.Pet Migration Package V4
-- Tarih: 2026-07-23T15:00:00+03:00
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. SÜTUN EKLEMELERİ ───────────────────────────────────────
ALTER TABLE public.vaccine_records_v2
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

ALTER TABLE public.parasite_records
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

-- ─── 2. UNIQUE INDEX'LER ──────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_vaccine_records_v2_plan_id_unique
  ON public.vaccine_records_v2(plan_id) WHERE plan_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_parasite_records_plan_id_unique
  ON public.parasite_records(plan_id) WHERE plan_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vaccine_records_v2_pet_idem_unique
  ON public.vaccine_records_v2(pet_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_parasite_records_pet_idem_unique
  ON public.parasite_records(pet_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_parent_occurrence_unique
  ON public.plans(parent_plan_id, occurrence_scheduled_at)
  WHERE parent_plan_id IS NOT NULL
    AND occurrence_scheduled_at IS NOT NULL;

-- ─── 3. ESKİ OVERLOAD TEMİZLİĞİ (RESTRICT + FORMAT) ─────────
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'complete_vaccine_plan_and_record'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s RESTRICT', r.sig);
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'complete_parasite_plan_and_record'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s RESTRICT', r.sig);
  END LOOP;
END $$;

-- ─── 4. ATOMİK AŞI RPC (V4) ───────────────────────────────────
CREATE FUNCTION public.complete_vaccine_plan_and_record(
  p_pet_id                  UUID,
  p_main_plan_id            UUID,
  p_actual_date              TIMESTAMPTZ,
  p_occurrence_scheduled_at  TIMESTAMPTZ,
  p_vaccine_code            TEXT,
  p_vaccine_name            TEXT,
  p_dose_number             INT,
  p_next_scheduled_at       TIMESTAMPTZ,
  p_close_series            BOOLEAN,
  p_idempotency_key         UUID,
  p_notes                   TEXT DEFAULT NULL,
  p_brand_id                UUID DEFAULT NULL,
  p_brand_free_text         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_rec RECORD;
  v_existing_child RECORD;
  v_main_plan    RECORD;
  v_child_id     UUID;
  v_record_id    UUID;
  v_plan_code    TEXT;
  v_plan_dose    INT;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED';
  END IF;

  IF p_vaccine_code IS NULL OR TRIM(p_vaccine_code) = '' THEN
    RAISE EXCEPTION 'VACCINE_CODE_REQUIRED';
  END IF;

  IF p_dose_number IS NULL OR p_dose_number <= 0 THEN
    RAISE EXCEPTION 'DOSE_NUMBER_REQUIRED';
  END IF;

  IF p_close_series = FALSE AND p_next_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'NEXT_SCHEDULED_AT_REQUIRED_WHEN_SERIES_CONTINUES';
  END IF;

  IF p_next_scheduled_at IS NOT NULL AND p_next_scheduled_at <= p_occurrence_scheduled_at THEN
    RAISE EXCEPTION 'NEXT_SCHEDULED_AT_MUST_BE_AFTER_OCCURRENCE';
  END IF;

  SELECT vr.id AS rec_id, vr.plan_id, cp.parent_plan_id
  INTO v_existing_rec
  FROM public.vaccine_records_v2 vr
  JOIN public.plans cp ON cp.id = vr.plan_id
  WHERE vr.pet_id = p_pet_id AND vr.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_rec.parent_plan_id != p_main_plan_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_CONTEXT_CONFLICT';
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'idempotent_already_processed', true,
      'record_id', v_existing_rec.rec_id,
      'completed_plan_id', v_existing_rec.plan_id,
      'main_plan_id', p_main_plan_id
    );
  END IF;

  SELECT * INTO v_main_plan
  FROM public.plans
  WHERE id = p_main_plan_id
    AND pet_id = p_pet_id
    AND status IN ('active', 'overdue')
    AND parent_plan_id IS NULL
    AND category = 'asi'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MAIN_PLAN_NOT_FOUND_OR_INVALID';
  END IF;

  SELECT vr.id AS rec_id, vr.plan_id, cp.parent_plan_id
  INTO v_existing_rec
  FROM public.vaccine_records_v2 vr
  JOIN public.plans cp ON cp.id = vr.plan_id
  WHERE vr.pet_id = p_pet_id AND vr.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_rec.parent_plan_id != p_main_plan_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_CONTEXT_CONFLICT';
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'idempotent_already_processed', true,
      'record_id', v_existing_rec.rec_id,
      'completed_plan_id', v_existing_rec.plan_id,
      'main_plan_id', p_main_plan_id
    );
  END IF;

  IF v_main_plan.scheduled_at != p_occurrence_scheduled_at THEN
    RAISE EXCEPTION 'INVALID_OCCURRENCE';
  END IF;

  v_plan_code := UPPER(COALESCE(v_main_plan.extra_data->>'vaccine_code', v_main_plan.extra_data->'vaccine'->>'code', ''));
  IF v_plan_code != '' AND v_plan_code != UPPER(p_vaccine_code) THEN
    RAISE EXCEPTION 'PLAN_RECORD_IDENTITY_MISMATCH';
  END IF;

  v_plan_dose := (v_main_plan.extra_data->>'dose_number')::INT;
  IF v_plan_dose IS NOT NULL AND v_plan_dose != p_dose_number THEN
    RAISE EXCEPTION 'PLAN_RECORD_IDENTITY_MISMATCH';
  END IF;

  SELECT * INTO v_existing_child
  FROM public.plans
  WHERE parent_plan_id = p_main_plan_id
    AND occurrence_scheduled_at = p_occurrence_scheduled_at
    AND status = 'completed';

  IF FOUND THEN
    SELECT id INTO v_record_id
    FROM public.vaccine_records_v2
    WHERE plan_id = v_existing_child.id;

    IF v_record_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_already_processed', true,
        'record_id', v_record_id,
        'completed_plan_id', v_existing_child.id,
        'main_plan_id', p_main_plan_id
      );
    ELSE
      RAISE EXCEPTION 'ORPHAN_COMPLETED_OCCURRENCE';
    END IF;
  END IF;

  INSERT INTO public.plans (
    pet_id, user_id, category, sub_type,
    scheduled_at, completed_at, occurrence_scheduled_at,
    parent_plan_id, extra_data, status
  )
  VALUES (
    p_pet_id, v_main_plan.user_id, 'asi', v_main_plan.sub_type,
    p_actual_date, p_actual_date, p_occurrence_scheduled_at,
    p_main_plan_id,
    COALESCE(v_main_plan.extra_data, '{}'::jsonb) || jsonb_build_object(
      'vaccine_code', p_vaccine_code,
      'vaccine', jsonb_build_object('code', p_vaccine_code, 'name', p_vaccine_name),
      'dose_number', p_dose_number,
      'is_past_done', true
    ),
    'completed'
  )
  RETURNING id INTO v_child_id;

  INSERT INTO public.vaccine_records_v2 (
    pet_id, vaccine_code, vaccine_name,
    dose_number, administered_at,
    notes, brand_id, brand_free_text,
    plan_id, status, source, idempotency_key
  )
  VALUES (
    p_pet_id, p_vaccine_code, p_vaccine_name,
    p_dose_number, p_actual_date,
    p_notes, p_brand_id, p_brand_free_text,
    v_child_id, 'completed', 'user_detailed', p_idempotency_key
  )
  RETURNING id INTO v_record_id;

  IF p_close_series THEN
    UPDATE public.plans
    SET status = 'completed', completed_at = NOW(), updated_at = NOW()
    WHERE id = p_main_plan_id;
  ELSIF p_next_scheduled_at IS NOT NULL THEN
    UPDATE public.plans
    SET scheduled_at = p_next_scheduled_at, status = 'active', updated_at = NOW()
    WHERE id = p_main_plan_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_already_processed', false,
    'record_id', v_record_id,
    'completed_plan_id', v_child_id,
    'main_plan_id', p_main_plan_id,
    'next_scheduled_at', p_next_scheduled_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_vaccine_plan_and_record(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INT, TIMESTAMPTZ, BOOLEAN, UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_vaccine_plan_and_record(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INT, TIMESTAMPTZ, BOOLEAN, UUID, TEXT, UUID, TEXT) TO service_role;

-- ─── 5. ATOMİK PARAZİT RPC (V4) ───────────────────────────────
CREATE FUNCTION public.complete_parasite_plan_and_record(
  p_pet_id                  UUID,
  p_main_plan_id            UUID,
  p_actual_date              TIMESTAMPTZ,
  p_occurrence_scheduled_at  TIMESTAMPTZ,
  p_parasite_type           TEXT,
  p_parasite_code           TEXT,
  p_application_method      TEXT,
  p_protection_duration_days INT,
  p_next_scheduled_at       TIMESTAMPTZ,
  p_idempotency_key         UUID,
  p_brand_free_text         TEXT DEFAULT NULL,
  p_product_free_text       TEXT DEFAULT NULL,
  p_notes                   TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_rec RECORD;
  v_existing_child RECORD;
  v_main_plan    RECORD;
  v_child_id     UUID;
  v_record_id    UUID;
  v_calc_next    TIMESTAMPTZ;
BEGIN
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_REQUIRED';
  END IF;

  IF p_parasite_type IS NULL OR TRIM(p_parasite_type) = '' THEN
    RAISE EXCEPTION 'PARASITE_TYPE_REQUIRED';
  END IF;

  IF p_parasite_code IS NULL OR TRIM(p_parasite_code) = '' THEN
    RAISE EXCEPTION 'PARASITE_CODE_REQUIRED';
  END IF;

  IF p_application_method IS NULL OR TRIM(p_application_method) = '' THEN
    RAISE EXCEPTION 'APPLICATION_METHOD_REQUIRED';
  END IF;

  IF p_protection_duration_days IS NULL OR p_protection_duration_days <= 0 THEN
    RAISE EXCEPTION 'INVALID_PROTECTION_DURATION';
  END IF;

  IF p_next_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'NEXT_SCHEDULED_AT_REQUIRED';
  END IF;

  IF p_next_scheduled_at <= p_occurrence_scheduled_at OR p_next_scheduled_at <= p_actual_date THEN
    RAISE EXCEPTION 'NEXT_SCHEDULED_AT_MUST_BE_AFTER_OCCURRENCE';
  END IF;

  v_calc_next := p_actual_date + (p_protection_duration_days || ' days')::INTERVAL;
  IF ABS(EXTRACT(EPOCH FROM (p_next_scheduled_at - v_calc_next))) > 60 THEN
    RAISE EXCEPTION 'NEXT_SCHEDULED_AT_MISMATCH_WITH_DURATION';
  END IF;

  SELECT pr.id AS rec_id, pr.plan_id, cp.parent_plan_id
  INTO v_existing_rec
  FROM public.parasite_records pr
  JOIN public.plans cp ON cp.id = pr.plan_id
  WHERE pr.pet_id = p_pet_id AND pr.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_rec.parent_plan_id != p_main_plan_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_CONTEXT_CONFLICT';
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'idempotent_already_processed', true,
      'record_id', v_existing_rec.rec_id,
      'completed_plan_id', v_existing_rec.plan_id,
      'main_plan_id', p_main_plan_id
    );
  END IF;

  SELECT * INTO v_main_plan
  FROM public.plans
  WHERE id = p_main_plan_id
    AND pet_id = p_pet_id
    AND status IN ('active', 'overdue')
    AND parent_plan_id IS NULL
    AND category = 'parazit'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MAIN_PLAN_NOT_FOUND_OR_INVALID';
  END IF;

  SELECT pr.id AS rec_id, pr.plan_id, cp.parent_plan_id
  INTO v_existing_rec
  FROM public.parasite_records pr
  JOIN public.plans cp ON cp.id = pr.plan_id
  WHERE pr.pet_id = p_pet_id AND pr.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_rec.parent_plan_id != p_main_plan_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_CONTEXT_CONFLICT';
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'idempotent_already_processed', true,
      'record_id', v_existing_rec.rec_id,
      'completed_plan_id', v_existing_rec.plan_id,
      'main_plan_id', p_main_plan_id
    );
  END IF;

  IF v_main_plan.scheduled_at != p_occurrence_scheduled_at THEN
    RAISE EXCEPTION 'INVALID_OCCURRENCE';
  END IF;

  IF v_main_plan.extra_data->>'parasite_type' IS NOT NULL AND LOWER(v_main_plan.extra_data->>'parasite_type') != LOWER(p_parasite_type) THEN
    RAISE EXCEPTION 'PLAN_RECORD_IDENTITY_MISMATCH';
  END IF;

  SELECT * INTO v_existing_child
  FROM public.plans
  WHERE parent_plan_id = p_main_plan_id
    AND occurrence_scheduled_at = p_occurrence_scheduled_at
    AND status = 'completed';

  IF FOUND THEN
    SELECT id INTO v_record_id
    FROM public.parasite_records
    WHERE plan_id = v_existing_child.id;

    IF v_record_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_already_processed', true,
        'record_id', v_record_id,
        'completed_plan_id', v_existing_child.id,
        'main_plan_id', p_main_plan_id
      );
    ELSE
      RAISE EXCEPTION 'ORPHAN_COMPLETED_OCCURRENCE';
    END IF;
  END IF;

  INSERT INTO public.plans (
    pet_id, user_id, category, sub_type,
    scheduled_at, completed_at, occurrence_scheduled_at,
    parent_plan_id, extra_data, status
  )
  VALUES (
    p_pet_id, v_main_plan.user_id, 'parazit', v_main_plan.sub_type,
    p_actual_date, p_actual_date, p_occurrence_scheduled_at,
    p_main_plan_id,
    COALESCE(v_main_plan.extra_data, '{}'::jsonb) || jsonb_build_object(
      'parasite_type', p_parasite_type,
      'parasite_code', p_parasite_code,
      'protection_duration_days', p_protection_duration_days,
      'is_past_done', true
    ),
    'completed'
  )
  RETURNING id INTO v_child_id;

  INSERT INTO public.parasite_records (
    pet_id, created_by, parasite_type, parasite_code,
    administered_at, protection_duration_days,
    application_method, brand_free_text, product_free_text,
    notes, source, plan_id, idempotency_key
  )
  VALUES (
    p_pet_id, v_main_plan.user_id, p_parasite_type, p_parasite_code,
    (p_actual_date AT TIME ZONE 'Europe/Istanbul')::DATE, p_protection_duration_days,
    p_application_method, p_brand_free_text, p_product_free_text,
    p_notes, 'user_manual', v_child_id, p_idempotency_key
  )
  RETURNING id INTO v_record_id;

  UPDATE public.plans
  SET scheduled_at = p_next_scheduled_at, status = 'active', updated_at = NOW()
  WHERE id = p_main_plan_id;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_already_processed', false,
    'record_id', v_record_id,
    'completed_plan_id', v_child_id,
    'main_plan_id', p_main_plan_id,
    'next_scheduled_at', p_next_scheduled_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_parasite_plan_and_record(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, INT, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_parasite_plan_and_record(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, INT, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT) TO service_role;

COMMIT;

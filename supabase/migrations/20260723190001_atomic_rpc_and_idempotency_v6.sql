-- ═══════════════════════════════════════════════════════════════
-- Odi.Pet Migration Package V6 FINAL PATCH
-- Tarih: 2026-07-23T15:20:00+03:00
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

-- ─── 4. ATOMİK AŞI RPC (V6 FINAL) ────────────────────────────
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
  p_brand_free_text         TEXT DEFAULT NULL,
  p_species                 TEXT DEFAULT NULL,
  p_protocol_id             UUID DEFAULT NULL,
  p_protocol_stage          INT DEFAULT NULL
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
  v_plan_species TEXT;
  v_plan_proto   UUID;
  v_plan_stage   INT;
  v_raw_proto    TEXT;
  v_raw_dose     TEXT;
  v_raw_stage    TEXT;
BEGIN
  -- 0. Zorunlu NULL Parametre Kontrolleri
  IF p_pet_id IS NULL OR p_main_plan_id IS NULL OR p_actual_date IS NULL OR p_occurrence_scheduled_at IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_PARAMETER_NULL';
  END IF;

  IF p_close_series IS NULL THEN
    RAISE EXCEPTION 'CLOSE_SERIES_DECISION_REQUIRED';
  END IF;

  IF p_vaccine_code IS NULL OR TRIM(p_vaccine_code) = '' THEN
    RAISE EXCEPTION 'VACCINE_CODE_REQUIRED';
  END IF;

  IF p_dose_number IS NULL OR p_dose_number <= 0 THEN
    RAISE EXCEPTION 'DOSE_NUMBER_REQUIRED';
  END IF;

  IF p_close_series = FALSE THEN
    IF p_next_scheduled_at IS NULL THEN
      RAISE EXCEPTION 'NEXT_SCHEDULED_AT_REQUIRED_WHEN_SERIES_CONTINUES';
    END IF;

    IF p_next_scheduled_at <= p_occurrence_scheduled_at OR p_next_scheduled_at <= p_actual_date THEN
      RAISE EXCEPTION 'NEXT_SCHEDULED_AT_MUST_BE_AFTER_OCCURRENCE_AND_ACTUAL';
    END IF;
  ELSE
    p_next_scheduled_at := NULL;
  END IF;

  -- 1. ILK IDEMPOTENCY KONTROLÜ
  SELECT vr.id AS rec_id, vr.plan_id, cp.parent_plan_id
  INTO v_existing_rec
  FROM public.vaccine_records_v2 vr
  LEFT JOIN public.plans cp ON cp.id = vr.plan_id
  WHERE vr.pet_id = p_pet_id AND vr.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_rec.plan_id IS NULL OR v_existing_rec.parent_plan_id IS NULL THEN
      RAISE EXCEPTION 'IDEMPOTENCY_RECORD_ORPHANED';
    END IF;

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

  -- 2. Ana planı STATUS FİLTRESİZ kilitle
  SELECT * INTO v_main_plan
  FROM public.plans
  WHERE id = p_main_plan_id
    AND pet_id = p_pet_id
    AND parent_plan_id IS NULL
    AND category = 'asi'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MAIN_PLAN_NOT_FOUND_OR_INVALID';
  END IF;

  -- 3. KILIT SONRASI İKİNCİ IDEMPOTENCY KONTROLÜ
  SELECT vr.id AS rec_id, vr.plan_id, cp.parent_plan_id
  INTO v_existing_rec
  FROM public.vaccine_records_v2 vr
  LEFT JOIN public.plans cp ON cp.id = vr.plan_id
  WHERE vr.pet_id = p_pet_id AND vr.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_rec.plan_id IS NULL OR v_existing_rec.parent_plan_id IS NULL THEN
      RAISE EXCEPTION 'IDEMPOTENCY_RECORD_ORPHANED';
    END IF;

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

  -- 4. STATUS Kontrolü
  IF v_main_plan.status NOT IN ('active', 'overdue') THEN
    RAISE EXCEPTION 'MAIN_PLAN_NOT_ACTIVE_OR_OVERDUE';
  END IF;

  -- 5. Occurrence Zamanı (IS DISTINCT FROM)
  IF v_main_plan.scheduled_at IS DISTINCT FROM p_occurrence_scheduled_at THEN
    RAISE EXCEPTION 'INVALID_OCCURRENCE';
  END IF;

  -- 6. Strict Kimlik & MALFORMED IDENTITY Fail-Closed Kontrolü
  v_plan_code := UPPER(COALESCE(v_main_plan.extra_data->>'vaccine_code', v_main_plan.extra_data->'vaccine'->>'code', ''));
  IF v_plan_code = '' OR v_plan_code != UPPER(p_vaccine_code) THEN
    RAISE EXCEPTION 'PLAN_RECORD_IDENTITY_MISMATCH';
  END IF;

  v_raw_dose := v_main_plan.extra_data->>'dose_number';
  IF v_raw_dose IS NOT NULL AND TRIM(v_raw_dose) != '' THEN
    IF v_raw_dose ~ '^[0-9]+$' THEN
      v_plan_dose := v_raw_dose::INT;
      IF p_dose_number IS NULL OR v_plan_dose != p_dose_number THEN
        RAISE EXCEPTION 'PLAN_RECORD_IDENTITY_MISMATCH';
      END IF;
    ELSE
      RAISE EXCEPTION 'PLAN_IDENTITY_MALFORMED';
    END IF;
  END IF;

  v_plan_species := v_main_plan.extra_data->>'species';
  IF v_plan_species IS NOT NULL AND TRIM(v_plan_species) != '' THEN
    IF p_species IS NULL OR LOWER(v_plan_species) != LOWER(p_species) THEN
      RAISE EXCEPTION 'PLAN_RECORD_IDENTITY_MISMATCH';
    END IF;
  END IF;

  v_raw_proto := v_main_plan.extra_data->>'protocol_id';
  IF v_raw_proto IS NOT NULL AND TRIM(v_raw_proto) != '' THEN
    IF v_raw_proto ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_plan_proto := v_raw_proto::UUID;
      IF p_protocol_id IS NULL OR v_plan_proto != p_protocol_id THEN
        RAISE EXCEPTION 'PLAN_RECORD_IDENTITY_MISMATCH';
      END IF;
    ELSE
      RAISE EXCEPTION 'PLAN_IDENTITY_MALFORMED';
    END IF;
  END IF;

  v_raw_stage := v_main_plan.extra_data->>'protocol_stage';
  IF v_raw_stage IS NOT NULL AND TRIM(v_raw_stage) != '' THEN
    IF v_raw_stage ~ '^[0-9]+$' THEN
      v_plan_stage := v_raw_stage::INT;
      IF p_protocol_stage IS NULL OR v_plan_stage != p_protocol_stage THEN
        RAISE EXCEPTION 'PLAN_RECORD_IDENTITY_MISMATCH';
      END IF;
    ELSE
      RAISE EXCEPTION 'PLAN_IDENTITY_MALFORMED';
    END IF;
  END IF;

  -- 7. Occurrence Child Tamamlanmış mı?
  SELECT * INTO v_existing_child
  FROM public.plans
  WHERE parent_plan_id = p_main_plan_id
    AND occurrence_scheduled_at = p_occurrence_scheduled_at;

  IF FOUND THEN
    IF v_existing_child.status != 'completed' THEN
      RAISE EXCEPTION 'OCCURRENCE_STATUS_CONFLICT';
    END IF;

    IF EXISTS (SELECT 1 FROM public.parasite_records WHERE plan_id = v_existing_child.id) THEN
      RAISE EXCEPTION 'OCCURRENCE_RECORD_CONFLICT';
    END IF;

    SELECT * INTO v_existing_rec
    FROM public.vaccine_records_v2
    WHERE plan_id = v_existing_child.id;

    IF v_existing_rec.id IS NOT NULL THEN
      IF UPPER(v_existing_rec.vaccine_code) != UPPER(p_vaccine_code) OR v_existing_rec.dose_number != p_dose_number THEN
        RAISE EXCEPTION 'OCCURRENCE_RECORD_CONFLICT';
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'idempotent_already_processed', true,
        'record_id', v_existing_rec.id,
        'completed_plan_id', v_existing_child.id,
        'main_plan_id', p_main_plan_id
      );
    ELSE
      RAISE EXCEPTION 'ORPHAN_COMPLETED_OCCURRENCE';
    END IF;
  END IF;

  -- 8. Completed Child Plan Oluştur
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

  -- 9. Gerçek Tıbbi Kayıt Oluştur
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

  -- 10. Ana Seriyi İlerlet veya Kapat
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

REVOKE ALL ON FUNCTION public.complete_vaccine_plan_and_record(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INT, TIMESTAMPTZ, BOOLEAN, UUID, TEXT, UUID, TEXT, TEXT, UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_vaccine_plan_and_record(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, INT, TIMESTAMPTZ, BOOLEAN, UUID, TEXT, UUID, TEXT, TEXT, UUID, INT) TO service_role;

-- ─── 5. ATOMİK PARAZİT RPC (V6 FINAL) ─────────────────────────
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
  p_notes                   TEXT DEFAULT NULL,
  p_parasite_protocol_id    UUID DEFAULT NULL
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
  v_plan_proto   UUID;
  v_plan_code    TEXT;
  v_plan_type    TEXT;
  v_raw_proto    TEXT;
BEGIN
  -- 0. Zorunlu NULL Parametre Kontrolleri
  IF p_pet_id IS NULL OR p_main_plan_id IS NULL OR p_actual_date IS NULL OR p_occurrence_scheduled_at IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'REQUIRED_PARAMETER_NULL';
  END IF;

  IF p_parasite_type IS NULL OR TRIM(p_parasite_type) = '' THEN
    RAISE EXCEPTION 'PARASITE_TYPE_REQUIRED';
  END IF;

  IF p_parasite_code IS NULL OR TRIM(p_parasite_code) = '' THEN
    RAISE EXCEPTION 'PARASITE_CODE_REQUIRED';
  END IF;

  -- KANONİK LİSTE DOĞRULAMASI (Yalnızca: spot_on, oral, collar, injection)
  IF p_application_method IS NULL OR LOWER(TRIM(p_application_method)) NOT IN ('spot_on', 'oral', 'collar', 'injection') THEN
    RAISE EXCEPTION 'INVALID_APPLICATION_METHOD';
  END IF;

  IF p_protection_duration_days IS NULL OR p_protection_duration_days <= 0 THEN
    RAISE EXCEPTION 'INVALID_PROTECTION_DURATION';
  END IF;

  IF p_next_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'NEXT_SCHEDULED_AT_REQUIRED';
  END IF;

  IF p_next_scheduled_at <= p_occurrence_scheduled_at OR p_next_scheduled_at <= p_actual_date THEN
    RAISE EXCEPTION 'NEXT_SCHEDULED_AT_MUST_BE_AFTER_OCCURRENCE_AND_ACTUAL';
  END IF;

  v_calc_next := p_actual_date + (p_protection_duration_days || ' days')::INTERVAL;
  IF ABS(EXTRACT(EPOCH FROM (p_next_scheduled_at - v_calc_next))) > 60 THEN
    RAISE EXCEPTION 'NEXT_SCHEDULED_AT_MISMATCH_WITH_DURATION';
  END IF;

  -- 1. ILK IDEMPOTENCY KONTROLÜ
  SELECT pr.id AS rec_id, pr.plan_id, cp.parent_plan_id
  INTO v_existing_rec
  FROM public.parasite_records pr
  LEFT JOIN public.plans cp ON cp.id = pr.plan_id
  WHERE pr.pet_id = p_pet_id AND pr.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_rec.plan_id IS NULL OR v_existing_rec.parent_plan_id IS NULL THEN
      RAISE EXCEPTION 'IDEMPOTENCY_RECORD_ORPHANED';
    END IF;

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

  -- 2. Ana planı STATUS FİLTRESİZ kilitle
  SELECT * INTO v_main_plan
  FROM public.plans
  WHERE id = p_main_plan_id
    AND pet_id = p_pet_id
    AND parent_plan_id IS NULL
    AND category = 'parazit'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MAIN_PLAN_NOT_FOUND_OR_INVALID';
  END IF;

  -- 3. KILIT SONRASI İKİNCİ IDEMPOTENCY KONTROLÜ
  SELECT pr.id AS rec_id, pr.plan_id, cp.parent_plan_id
  INTO v_existing_rec
  FROM public.parasite_records pr
  LEFT JOIN public.plans cp ON cp.id = pr.plan_id
  WHERE pr.pet_id = p_pet_id AND pr.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_rec.plan_id IS NULL OR v_existing_rec.parent_plan_id IS NULL THEN
      RAISE EXCEPTION 'IDEMPOTENCY_RECORD_ORPHANED';
    END IF;

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

  -- 4. STATUS Kontrolü
  IF v_main_plan.status NOT IN ('active', 'overdue') THEN
    RAISE EXCEPTION 'MAIN_PLAN_NOT_ACTIVE_OR_OVERDUE';
  END IF;

  -- 5. Occurrence Zamanı (IS DISTINCT FROM)
  IF v_main_plan.scheduled_at IS DISTINCT FROM p_occurrence_scheduled_at THEN
    RAISE EXCEPTION 'INVALID_OCCURRENCE';
  END IF;

  -- 6. Safe JSON & Parazit Strict Identity & MALFORMED IDENTITY Kontrolü
  v_raw_proto := v_main_plan.extra_data->>'parasite_protocol_id';
  IF v_raw_proto IS NOT NULL AND TRIM(v_raw_proto) != '' THEN
    IF v_raw_proto ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      v_plan_proto := v_raw_proto::UUID;
      IF p_parasite_protocol_id IS NULL OR v_plan_proto != p_parasite_protocol_id THEN
        RAISE EXCEPTION 'PLAN_RECORD_IDENTITY_MISMATCH';
      END IF;
    ELSE
      RAISE EXCEPTION 'PLAN_IDENTITY_MALFORMED';
    END IF;
  END IF;

  v_plan_code := v_main_plan.extra_data->>'parasite_code';
  IF v_plan_code IS NOT NULL AND v_plan_code != '' THEN
    IF UPPER(v_plan_code) != UPPER(p_parasite_code) THEN
      RAISE EXCEPTION 'PLAN_RECORD_IDENTITY_MISMATCH';
    END IF;
  END IF;

  v_plan_type := v_main_plan.extra_data->>'parasite_type';
  IF v_plan_type IS NULL OR v_plan_type = '' OR LOWER(v_plan_type) != LOWER(p_parasite_type) THEN
    RAISE EXCEPTION 'PLAN_RECORD_IDENTITY_MISMATCH';
  END IF;

  IF v_plan_proto IS NULL AND (v_plan_code IS NULL OR v_plan_code = '') THEN
    RAISE EXCEPTION 'PLAN_PARASITE_IDENTITY_MISSING';
  END IF;

  -- 7. Occurrence Child ve EXISTING PARASITE RECORD CONFLICT Kontrolü
  SELECT * INTO v_existing_child
  FROM public.plans
  WHERE parent_plan_id = p_main_plan_id
    AND occurrence_scheduled_at = p_occurrence_scheduled_at;

  IF FOUND THEN
    IF v_existing_child.status != 'completed' THEN
      RAISE EXCEPTION 'OCCURRENCE_STATUS_CONFLICT';
    END IF;

    -- Cross-Table Check
    IF EXISTS (SELECT 1 FROM public.vaccine_records_v2 WHERE plan_id = v_existing_child.id) THEN
      RAISE EXCEPTION 'OCCURRENCE_RECORD_CONFLICT';
    END IF;

    SELECT * INTO v_existing_rec
    FROM public.parasite_records
    WHERE plan_id = v_existing_child.id;

    IF v_existing_rec.id IS NOT NULL THEN
      -- Existing parasite record identity and application_method conflict check
      IF LOWER(v_existing_rec.parasite_type) != LOWER(p_parasite_type)
         OR UPPER(v_existing_rec.parasite_code) != UPPER(p_parasite_code)
         OR LOWER(v_existing_rec.application_method) != LOWER(p_application_method) THEN
        RAISE EXCEPTION 'OCCURRENCE_RECORD_CONFLICT';
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'idempotent_already_processed', true,
        'record_id', v_existing_rec.id,
        'completed_plan_id', v_existing_child.id,
        'main_plan_id', p_main_plan_id
      );
    ELSE
      RAISE EXCEPTION 'ORPHAN_COMPLETED_OCCURRENCE';
    END IF;
  END IF;

  -- 8. Completed Child Plan Oluştur
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

  -- 9. Gerçek Parazit Kaydı Oluştur
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
    p_notes, 'migration', v_child_id, p_idempotency_key
  )
  RETURNING id INTO v_record_id;

  -- 10. Ana Seriyi İlerlet
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

REVOKE ALL ON FUNCTION public.complete_parasite_plan_and_record(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, INT, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_parasite_plan_and_record(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, INT, TIMESTAMPTZ, UUID, TEXT, TEXT, TEXT, UUID) TO service_role;

COMMIT;

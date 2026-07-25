-- Keep parasite record validation compatible with the unified plans model.
-- Legacy parasite_plan_items and source_plan_item_id were removed in
-- 20260723180000_remove_legacy_health_structures.sql.

CREATE OR REPLACE FUNCTION public.fn_validate_parasite_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_pet_species text;
  v_protocol_species text;
  v_protocol_code text;
  v_protocol_type text;
  v_allowed_methods text[];
  v_protocol_active boolean;
  v_plan_pet_id uuid;
  v_plan_category text;
  v_plan_sub_type text;
BEGIN
  SELECT species
  INTO v_pet_species
  FROM public.pets
  WHERE id = NEW.pet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PET_NOT_FOUND';
  END IF;

  IF v_pet_species IS NULL OR v_pet_species NOT IN ('cat', 'dog') THEN
    RAISE EXCEPTION 'INVALID_PET_SPECIES';
  END IF;

  IF TG_OP = 'UPDATE' AND auth.role() = 'authenticated' THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.pet_id IS DISTINCT FROM OLD.pet_id
       OR NEW.source IS DISTINCT FROM OLD.source
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.plan_id IS DISTINCT FROM OLD.plan_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'IMMUTABLE_PARASITE_RECORD_FIELDS';
    END IF;
  END IF;

  IF NEW.source = 'user_manual' AND NEW.plan_id IS NOT NULL THEN
    RAISE EXCEPTION 'USER_MANUAL_PLAN_ID_MUST_BE_NULL';
  ELSIF NEW.source = 'plan_completion' AND NEW.plan_id IS NULL THEN
    RAISE EXCEPTION 'PLAN_COMPLETION_PLAN_ID_REQUIRED';
  END IF;

  IF NEW.parasite_protocol_id IS NOT NULL THEN
    SELECT
      species,
      parasite_code,
      parasite_type,
      allowed_application_methods,
      is_active
    INTO
      v_protocol_species,
      v_protocol_code,
      v_protocol_type,
      v_allowed_methods,
      v_protocol_active
    FROM public.parasite_protocols
    WHERE id = NEW.parasite_protocol_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PARASITE_PROTOCOL_NOT_FOUND';
    END IF;

    IF v_pet_species <> v_protocol_species THEN
      RAISE EXCEPTION 'PROTOCOL_SPECIES_MISMATCH';
    END IF;

    IF NEW.parasite_code <> v_protocol_code THEN
      RAISE EXCEPTION 'PROTOCOL_CODE_MISMATCH';
    END IF;

    IF NEW.parasite_type <> v_protocol_type THEN
      RAISE EXCEPTION 'PROTOCOL_TYPE_MISMATCH';
    END IF;

    IF NEW.source IN ('user_manual', 'plan_completion') THEN
      IF NOT (
        NEW.application_method = ANY(
          COALESCE(v_allowed_methods, ARRAY[]::text[])
        )
      ) THEN
        RAISE EXCEPTION 'INVALID_APPLICATION_METHOD';
      END IF;

      IF (
        TG_OP = 'INSERT'
        OR (
          TG_OP = 'UPDATE'
          AND OLD.parasite_protocol_id IS DISTINCT FROM NEW.parasite_protocol_id
        )
      )
      AND NOT v_protocol_active
      AND NEW.source = 'user_manual' THEN
        RAISE EXCEPTION 'INACTIVE_PROTOCOL_FOR_MANUAL_RECORD';
      END IF;
    END IF;
  END IF;

  IF NEW.plan_id IS NOT NULL THEN
    SELECT pet_id, category, sub_type
    INTO v_plan_pet_id, v_plan_category, v_plan_sub_type
    FROM public.plans
    WHERE id = NEW.plan_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PLAN_NOT_FOUND';
    END IF;

    IF v_plan_pet_id <> NEW.pet_id THEN
      RAISE EXCEPTION 'PLAN_PET_MISMATCH';
    END IF;

    IF v_plan_category <> 'parazit' THEN
      RAISE EXCEPTION 'PLAN_CATEGORY_MISMATCH';
    END IF;

    CASE v_plan_sub_type
      WHEN 'İç Parazit' THEN
        IF NEW.parasite_type <> 'internal' THEN
          RAISE EXCEPTION 'PLAN_PARASITE_TYPE_MISMATCH';
        END IF;
      WHEN 'Dış Parazit' THEN
        IF NEW.parasite_type <> 'external' THEN
          RAISE EXCEPTION 'PLAN_PARASITE_TYPE_MISMATCH';
        END IF;
      WHEN 'Parazit Tasması' THEN
        IF NEW.parasite_type <> 'collar' THEN
          RAISE EXCEPTION 'PLAN_PARASITE_TYPE_MISMATCH';
        END IF;
      WHEN 'Birleşik Parazit', 'Kombine Parazit' THEN
        IF NEW.parasite_type <> 'combined' THEN
          RAISE EXCEPTION 'PLAN_PARASITE_TYPE_MISMATCH';
        END IF;
      ELSE
        RAISE EXCEPTION 'UNKNOWN_PARASITE_PLAN_SUB_TYPE';
    END CASE;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL PRIVILEGES
  ON FUNCTION public.fn_validate_parasite_record()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
  ON FUNCTION public.fn_validate_parasite_record()
  TO service_role;

-- Migration: 20260914213000_phase2_planning_core_database_hardening.sql
-- Description: Phase 2 Database Hardening for Planning Core
-- Objects: plans, plan_occurrences, notification_jobs
-- Transaction-Safe, Idempotent, Zero Data Loss, Fail-Fast Catalog Validation

-- ============================================================================
-- 1. PREFLIGHT ASSERTIONS
-- ============================================================================
DO $$
DECLARE
  v_invalid_count INT;
BEGIN
  -- Validate plan_occurrences.record_table contains no unapproved values
  SELECT COUNT(*) INTO v_invalid_count
  FROM public.plan_occurrences
  WHERE record_table IS NOT NULL
    AND record_table NOT IN (
      'vaccine_records_v2',
      'parasite_records',
      'weight_logs',
      'health_medication_courses',
      'nutrition_logs',
      'appointments'
    );

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'PREFLIGHT_FAILED: plan_occurrences contains % rows with unapproved record_table values', v_invalid_count;
  END IF;
END $$;

-- ============================================================================
-- 2. ADD NULLABLE COLUMNS (WITHOUT INLINE FK OR DEFAULTS TO PREVENT SKEW)
-- ============================================================================

-- A. public.plans
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS title TEXT NULL;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS assigned_to UUID NULL;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS source TEXT NULL;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS policy TEXT NULL;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN NULL;

-- B. public.plan_occurrences
ALTER TABLE public.plan_occurrences ADD COLUMN IF NOT EXISTS original_scheduled_at TIMESTAMPTZ NULL;
ALTER TABLE public.plan_occurrences ADD COLUMN IF NOT EXISTS assigned_to UUID NULL;
ALTER TABLE public.plan_occurrences ADD COLUMN IF NOT EXISTS notes TEXT NULL;
ALTER TABLE public.plan_occurrences ADD COLUMN IF NOT EXISTS extra_data JSONB NULL;

-- ============================================================================
-- 3. DETERMINISTIC BACKFILL FOR EXISTING DATA
-- ============================================================================

-- Step 3a: System plans (Kilo & Growth Tracking)
UPDATE public.plans
SET source = 'system', policy = 'required'
WHERE source IS NULL
  AND (
    (extra_data->>'source' = 'system')
    OR (extra_data->>'auto_generated' = 'true' AND (sub_type ILIKE '%kilo%' OR sub_type ILIKE '%boy%'))
  );

-- Step 3b: Clinical & Protocol plans (Vaccine & Parasite Protocols)
UPDATE public.plans
SET source = 'protocol', policy = 'recommended'
WHERE source IS NULL
  AND (
    extra_data->>'parasite_protocol_id' IS NOT NULL
    OR extra_data->>'vaccine_code' IS NOT NULL
    OR (category IN ('asi', 'parazit') AND extra_data->>'auto_generated' = 'true')
  );

-- Step 3c: AI & OCR Assisted Plans
UPDATE public.plans
SET source = 'ai', policy = 'recommended'
WHERE source IS NULL
  AND (
    extra_data->>'source' = 'ai'
    OR extra_data->>'ocr_confidence' IS NOT NULL
  );

-- Step 3d: Manual User Plans (Catch-All)
UPDATE public.plans
SET source = 'user', policy = 'optional'
WHERE source IS NULL;

-- Step 3e: Operational is_active Invariant Backfill
UPDATE public.plans
SET is_active = CASE
  WHEN status IN ('active', 'overdue') THEN TRUE
  ELSE FALSE
END
WHERE is_active IS NULL;

-- Step 3f: plan_occurrences extra_data backfill
UPDATE public.plan_occurrences
SET extra_data = '{}'::jsonb
WHERE extra_data IS NULL;

-- ============================================================================
-- 4. POST-BACKFILL ASSERTIONS (SAFETY GATES)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.plans WHERE source IS NULL) THEN
    RAISE EXCEPTION 'POST_BACKFILL_ASSERTION_FAILED: plans.source contains NULL values';
  END IF;

  IF EXISTS (SELECT 1 FROM public.plans WHERE policy IS NULL) THEN
    RAISE EXCEPTION 'POST_BACKFILL_ASSERTION_FAILED: plans.policy contains NULL values';
  END IF;

  IF EXISTS (SELECT 1 FROM public.plans WHERE is_active IS NULL) THEN
    RAISE EXCEPTION 'POST_BACKFILL_ASSERTION_FAILED: plans.is_active contains NULL values';
  END IF;

  IF EXISTS (SELECT 1 FROM public.plan_occurrences WHERE extra_data IS NULL) THEN
    RAISE EXCEPTION 'POST_BACKFILL_ASSERTION_FAILED: plan_occurrences.extra_data contains NULL values';
  END IF;
END $$;

-- ============================================================================
-- 5. TRIGGER CREATION (LIFECYCLE INVARIANT & IMMUTABILITY)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_plan_lifecycle_and_immutability()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- 1. UPDATE Immutability Guards
  IF TG_OP = 'UPDATE' THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'CANNOT_MUTATE_PLAN_CREATOR: user_id is immutable';
    END IF;
    IF NEW.pet_id IS DISTINCT FROM OLD.pet_id THEN
      RAISE EXCEPTION 'CANNOT_MUTATE_PLAN_PET: pet_id is immutable';
    END IF;
  END IF;

  -- 2. Operational is_active Invariant Synchronization
  IF NEW.status IN ('active', 'overdue') THEN
    NEW.is_active := TRUE;
  ELSIF NEW.status IN ('completed', 'cancelled', 'deleted') THEN
    NEW.is_active := FALSE;
  ELSE
    NEW.is_active := FALSE;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_plan_lifecycle ON public.plans;
CREATE TRIGGER trg_sync_plan_lifecycle
  BEFORE INSERT OR UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_plan_lifecycle_and_immutability();

-- ============================================================================
-- 6. SET COLUMN DEFAULTS AND NOT NULL CONSTRAINTS
-- ============================================================================

-- plans defaults
ALTER TABLE public.plans ALTER COLUMN source SET DEFAULT 'user';
ALTER TABLE public.plans ALTER COLUMN policy SET DEFAULT 'optional';
ALTER TABLE public.plans ALTER COLUMN is_active SET DEFAULT TRUE;

-- plans NOT NULL
ALTER TABLE public.plans ALTER COLUMN source SET NOT NULL;
ALTER TABLE public.plans ALTER COLUMN policy SET NOT NULL;
ALTER TABLE public.plans ALTER COLUMN is_active SET NOT NULL;

-- plan_occurrences defaults & NOT NULL
ALTER TABLE public.plan_occurrences ALTER COLUMN extra_data SET DEFAULT '{}'::jsonb;
ALTER TABLE public.plan_occurrences ALTER COLUMN extra_data SET NOT NULL;

-- ============================================================================
-- 7. FAIL-FAST FOREIGN KEYS & TWO-PHASE CONSTRAINTS WITH CONVALIDATED AUDIT
-- ============================================================================
DO $$
DECLARE
  v_type "char";
  v_validated BOOLEAN;
  v_def TEXT;
BEGIN
  -- --------------------------------------------------------------------------
  -- 7a. plans.assigned_to -> public.profiles(id) ON DELETE SET NULL
  -- --------------------------------------------------------------------------
  v_type := NULL; v_validated := NULL; v_def := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid) 
  INTO v_type, v_validated, v_def
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND t.relname = 'plans' 
    AND c.conname = 'plans_assigned_to_fkey';

  IF v_def IS NULL THEN
    -- Case A: Constraint does not exist -> CREATE NOT VALID and VALIDATE
    EXECUTE 'ALTER TABLE public.plans ADD CONSTRAINT plans_assigned_to_fkey
             FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID';
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_assigned_to_fkey';
  ELSIF v_type = 'f' AND v_def ILIKE '%(assigned_to)%REFERENCES%profiles(id)%ON DELETE SET NULL%' AND v_validated = TRUE THEN
    -- Case B: Canonical definition and validated -> NO-OP
    NULL;
  ELSIF v_type = 'f' AND v_def ILIKE '%(assigned_to)%REFERENCES%profiles(id)%ON DELETE SET NULL%' AND v_validated = FALSE THEN
    -- Case C: Canonical definition but unvalidated -> VALIDATE
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_assigned_to_fkey';
  ELSE
    -- Case D: Unexpected definition -> FAIL FAST
    RAISE EXCEPTION 'FAIL_FAST: plans_assigned_to_fkey exists with unexpected definition: type=%, validated=%, def=%', v_type, v_validated, v_def;
  END IF;

  -- --------------------------------------------------------------------------
  -- 7b. plan_occurrences.assigned_to -> public.profiles(id) ON DELETE SET NULL
  -- --------------------------------------------------------------------------
  v_type := NULL; v_validated := NULL; v_def := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid) 
  INTO v_type, v_validated, v_def
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND t.relname = 'plan_occurrences' 
    AND c.conname = 'plan_occurrences_assigned_to_fkey';

  IF v_def IS NULL THEN
    EXECUTE 'ALTER TABLE public.plan_occurrences ADD CONSTRAINT plan_occurrences_assigned_to_fkey
             FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID';
    EXECUTE 'ALTER TABLE public.plan_occurrences VALIDATE CONSTRAINT plan_occurrences_assigned_to_fkey';
  ELSIF v_type = 'f' AND v_def ILIKE '%(assigned_to)%REFERENCES%profiles(id)%ON DELETE SET NULL%' AND v_validated = TRUE THEN
    NULL;
  ELSIF v_type = 'f' AND v_def ILIKE '%(assigned_to)%REFERENCES%profiles(id)%ON DELETE SET NULL%' AND v_validated = FALSE THEN
    EXECUTE 'ALTER TABLE public.plan_occurrences VALIDATE CONSTRAINT plan_occurrences_assigned_to_fkey';
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plan_occurrences_assigned_to_fkey exists with unexpected definition: type=%, validated=%, def=%', v_type, v_validated, v_def;
  END IF;

  -- --------------------------------------------------------------------------
  -- 7c. plans_status_check
  -- --------------------------------------------------------------------------
  v_type := NULL; v_validated := NULL; v_def := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid) 
  INTO v_type, v_validated, v_def
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND t.relname = 'plans' 
    AND c.conname = 'plans_status_check';

  IF v_def IS NULL THEN
    EXECUTE 'ALTER TABLE public.plans ADD CONSTRAINT plans_status_check
             CHECK (status IN (''active'', ''completed'', ''cancelled'', ''overdue'', ''deleted'')) NOT VALID';
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_status_check';
  ELSIF v_type = 'c' AND (
    v_def ILIKE '%active%' AND v_def ILIKE '%completed%' AND v_def ILIKE '%cancelled%' AND v_def ILIKE '%overdue%' AND v_def ILIKE '%deleted%'
  ) AND v_validated = TRUE THEN
    NULL; -- Matches canonical definition and validated
  ELSIF v_type = 'c' AND (
    v_def ILIKE '%active%' AND v_def ILIKE '%completed%' AND v_def ILIKE '%cancelled%' AND v_def ILIKE '%overdue%' AND v_def ILIKE '%deleted%'
  ) AND v_validated = FALSE THEN
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_status_check';
  ELSIF v_type = 'c' AND (
    v_def ILIKE '%active%' AND v_def ILIKE '%completed%' AND v_def ILIKE '%cancelled%' AND v_def ILIKE '%overdue%' AND NOT (v_def ILIKE '%deleted%')
  ) THEN
    -- Known legacy migration upgrade path (20260710000003)
    EXECUTE 'ALTER TABLE public.plans DROP CONSTRAINT plans_status_check';
    EXECUTE 'ALTER TABLE public.plans ADD CONSTRAINT plans_status_check
             CHECK (status IN (''active'', ''completed'', ''cancelled'', ''overdue'', ''deleted'')) NOT VALID';
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_status_check';
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_status_check exists with unexpected definition: type=%, validated=%, def=%', v_type, v_validated, v_def;
  END IF;

  -- --------------------------------------------------------------------------
  -- 7d. plans_source_check
  -- --------------------------------------------------------------------------
  v_type := NULL; v_validated := NULL; v_def := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid) 
  INTO v_type, v_validated, v_def
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND t.relname = 'plans' 
    AND c.conname = 'plans_source_check';

  IF v_def IS NULL THEN
    EXECUTE 'ALTER TABLE public.plans ADD CONSTRAINT plans_source_check
             CHECK (source IN (''user'', ''system'', ''protocol'', ''clinical'', ''ai'')) NOT VALID';
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_source_check';
  ELSIF v_type = 'c' AND (
    v_def ILIKE '%user%' AND v_def ILIKE '%system%' AND v_def ILIKE '%protocol%' AND v_def ILIKE '%clinical%' AND v_def ILIKE '%ai%'
  ) AND v_validated = TRUE THEN
    NULL;
  ELSIF v_type = 'c' AND (
    v_def ILIKE '%user%' AND v_def ILIKE '%system%' AND v_def ILIKE '%protocol%' AND v_def ILIKE '%clinical%' AND v_def ILIKE '%ai%'
  ) AND v_validated = FALSE THEN
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_source_check';
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_source_check exists with unexpected definition: type=%, validated=%, def=%', v_type, v_validated, v_def;
  END IF;

  -- --------------------------------------------------------------------------
  -- 7e. plans_policy_check
  -- --------------------------------------------------------------------------
  v_type := NULL; v_validated := NULL; v_def := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid) 
  INTO v_type, v_validated, v_def
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND t.relname = 'plans' 
    AND c.conname = 'plans_policy_check';

  IF v_def IS NULL THEN
    EXECUTE 'ALTER TABLE public.plans ADD CONSTRAINT plans_policy_check
             CHECK (policy IN (''optional'', ''recommended'', ''required'')) NOT VALID';
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_policy_check';
  ELSIF v_type = 'c' AND (
    v_def ILIKE '%optional%' AND v_def ILIKE '%recommended%' AND v_def ILIKE '%required%'
  ) AND v_validated = TRUE THEN
    NULL;
  ELSIF v_type = 'c' AND (
    v_def ILIKE '%optional%' AND v_def ILIKE '%recommended%' AND v_def ILIKE '%required%'
  ) AND v_validated = FALSE THEN
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_policy_check';
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_policy_check exists with unexpected definition: type=%, validated=%, def=%', v_type, v_validated, v_def;
  END IF;

  -- --------------------------------------------------------------------------
  -- 7f. plans_status_is_active_invariant
  -- --------------------------------------------------------------------------
  v_type := NULL; v_validated := NULL; v_def := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid) 
  INTO v_type, v_validated, v_def
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND t.relname = 'plans' 
    AND c.conname = 'plans_status_is_active_invariant';

  IF v_def IS NULL THEN
    EXECUTE 'ALTER TABLE public.plans ADD CONSTRAINT plans_status_is_active_invariant
             CHECK (
               (status IN (''active'', ''overdue'') AND is_active = TRUE)
               OR
               (status IN (''completed'', ''cancelled'', ''deleted'') AND is_active = FALSE)
             ) NOT VALID';
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_status_is_active_invariant';
  ELSIF v_type = 'c' AND (
    v_def ILIKE '%is_active%' AND v_def ILIKE '%overdue%' AND v_def ILIKE '%deleted%'
  ) AND v_validated = TRUE THEN
    NULL;
  ELSIF v_type = 'c' AND (
    v_def ILIKE '%is_active%' AND v_def ILIKE '%overdue%' AND v_def ILIKE '%deleted%'
  ) AND v_validated = FALSE THEN
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_status_is_active_invariant';
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_status_is_active_invariant exists with unexpected definition: type=%, validated=%, def=%', v_type, v_validated, v_def;
  END IF;

  -- --------------------------------------------------------------------------
  -- 7g. plan_occurrences_record_table_check
  -- --------------------------------------------------------------------------
  v_type := NULL; v_validated := NULL; v_def := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid) 
  INTO v_type, v_validated, v_def
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' 
    AND t.relname = 'plan_occurrences' 
    AND c.conname = 'plan_occurrences_record_table_check';

  IF v_def IS NULL THEN
    EXECUTE 'ALTER TABLE public.plan_occurrences ADD CONSTRAINT plan_occurrences_record_table_check
             CHECK (
               record_table IS NULL OR record_table IN (
                 ''vaccine_records_v2'',
                 ''parasite_records'',
                 ''weight_logs'',
                 ''health_medication_courses'',
                 ''nutrition_logs'',
                 ''appointments''
               )
             ) NOT VALID';
    EXECUTE 'ALTER TABLE public.plan_occurrences VALIDATE CONSTRAINT plan_occurrences_record_table_check';
  ELSIF v_type = 'c' AND (
    v_def ILIKE '%vaccine_records_v2%' AND v_def ILIKE '%parasite_records%' AND v_def ILIKE '%weight_logs%' AND v_def ILIKE '%health_medication_courses%' AND v_def ILIKE '%nutrition_logs%' AND v_def ILIKE '%appointments%'
  ) AND v_validated = TRUE THEN
    NULL;
  ELSIF v_type = 'c' AND (
    v_def ILIKE '%vaccine_records_v2%' AND v_def ILIKE '%parasite_records%' AND v_def ILIKE '%weight_logs%' AND v_def ILIKE '%health_medication_courses%' AND v_def ILIKE '%nutrition_logs%' AND v_def ILIKE '%appointments%'
  ) AND v_validated = FALSE THEN
    EXECUTE 'ALTER TABLE public.plan_occurrences VALIDATE CONSTRAINT plan_occurrences_record_table_check';
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plan_occurrences_record_table_check exists with unexpected definition: type=%, validated=%, def=%', v_type, v_validated, v_def;
  END IF;
END $$;

-- ============================================================================
-- 8. EVIDENCE-BASED INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_plans_pet_active 
  ON public.plans (pet_id, is_active);

CREATE INDEX IF NOT EXISTS idx_plan_occurrences_pet_scheduled 
  ON public.plan_occurrences (pet_id, scheduled_at DESC);

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES WITH FULL SEMANTIC IDENTITY VALIDATION
-- ============================================================================

-- Ensure RLS enabled on all targets
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

-- Clean up legacy user_id-only policies
DROP POLICY IF EXISTS "kullanici_kendi_planlarini_gorur" ON public.plans;
DROP POLICY IF EXISTS "kullanici_kendi_planlarini_olusturur" ON public.plans;
DROP POLICY IF EXISTS "kullanici_kendi_planlarini_gunceller" ON public.plans;
DROP POLICY IF EXISTS "kullanici_kendi_planlarini_siler" ON public.plans;
DROP POLICY IF EXISTS "Owners manage plan_occurrences" ON public.plan_occurrences;
DROP POLICY IF EXISTS "kullanici_kendi_bildirimlerini_yonetir" ON public.notification_jobs;

DO $$
DECLARE
  v_cmd "char";
  v_permissive BOOLEAN;
  v_roles oid[];
  v_qual TEXT;
  v_check TEXT;
BEGIN
  -- --------------------------------------------------------------------------
  -- 9a. public.plans policies
  -- --------------------------------------------------------------------------

  -- plans_select_policy (SELECT, PERMISSIVE, PUBLIC)
  v_cmd := NULL; v_permissive := NULL; v_roles := NULL; v_qual := NULL; v_check := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles, 
         pg_get_expr(pol.polqual, pol.polrelid), 
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_permissive, v_roles, v_qual, v_check
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plans' AND pol.polname = 'plans_select_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plans_select_policy" ON public.plans FOR SELECT USING (public.can_view_pet(pet_id))';
  ELSIF v_cmd = 'r' 
    AND v_permissive = TRUE 
    AND v_roles = '{0}'::oid[] 
    AND v_qual ILIKE '%can_view_pet(pet_id)%' 
    AND v_check IS NULL THEN
    NULL; -- Fully matching canonical semantic identity
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_select_policy semantic mismatch: cmd=%, permissive=%, roles=%, qual=%, check=%', 
                    v_cmd, v_permissive, v_roles, v_qual, v_check;
  END IF;

  -- plans_insert_policy (INSERT, PERMISSIVE, PUBLIC)
  v_cmd := NULL; v_permissive := NULL; v_roles := NULL; v_qual := NULL; v_check := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles, 
         pg_get_expr(pol.polqual, pol.polrelid), 
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_permissive, v_roles, v_qual, v_check
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plans' AND pol.polname = 'plans_insert_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plans_insert_policy" ON public.plans FOR INSERT WITH CHECK (public.can_manage_pet_care(pet_id) AND auth.uid() = user_id)';
  ELSIF v_cmd = 'a' 
    AND v_permissive = TRUE 
    AND v_roles = '{0}'::oid[] 
    AND v_qual IS NULL 
    AND v_check ILIKE '%can_manage_pet_care(pet_id)%' 
    AND v_check ILIKE '%user_id%' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_insert_policy semantic mismatch: cmd=%, permissive=%, roles=%, qual=%, check=%', 
                    v_cmd, v_permissive, v_roles, v_qual, v_check;
  END IF;

  -- plans_update_policy (UPDATE, PERMISSIVE, PUBLIC)
  v_cmd := NULL; v_permissive := NULL; v_roles := NULL; v_qual := NULL; v_check := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles, 
         pg_get_expr(pol.polqual, pol.polrelid), 
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_permissive, v_roles, v_qual, v_check
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plans' AND pol.polname = 'plans_update_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plans_update_policy" ON public.plans FOR UPDATE USING (public.can_manage_pet_care(pet_id)) WITH CHECK (public.can_manage_pet_care(pet_id))';
  ELSIF v_cmd = 'w' 
    AND v_permissive = TRUE 
    AND v_roles = '{0}'::oid[] 
    AND v_qual ILIKE '%can_manage_pet_care(pet_id)%' 
    AND v_check ILIKE '%can_manage_pet_care(pet_id)%' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_update_policy semantic mismatch: cmd=%, permissive=%, roles=%, qual=%, check=%', 
                    v_cmd, v_permissive, v_roles, v_qual, v_check;
  END IF;

  -- plans_delete_policy (DELETE, PERMISSIVE, PUBLIC)
  v_cmd := NULL; v_permissive := NULL; v_roles := NULL; v_qual := NULL; v_check := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles, 
         pg_get_expr(pol.polqual, pol.polrelid), 
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_permissive, v_roles, v_qual, v_check
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plans' AND pol.polname = 'plans_delete_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plans_delete_policy" ON public.plans FOR DELETE USING (public.can_manage_pet_care(pet_id))';
  ELSIF v_cmd = 'd' 
    AND v_permissive = TRUE 
    AND v_roles = '{0}'::oid[] 
    AND v_qual ILIKE '%can_manage_pet_care(pet_id)%' 
    AND v_check IS NULL THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_delete_policy semantic mismatch: cmd=%, permissive=%, roles=%, qual=%, check=%', 
                    v_cmd, v_permissive, v_roles, v_qual, v_check;
  END IF;

  -- --------------------------------------------------------------------------
  -- 9b. public.plan_occurrences policies
  -- --------------------------------------------------------------------------

  -- plan_occurrences_select_policy (SELECT, PERMISSIVE, PUBLIC)
  v_cmd := NULL; v_permissive := NULL; v_roles := NULL; v_qual := NULL; v_check := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles, 
         pg_get_expr(pol.polqual, pol.polrelid), 
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_permissive, v_roles, v_qual, v_check
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plan_occurrences' AND pol.polname = 'plan_occurrences_select_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plan_occurrences_select_policy" ON public.plan_occurrences FOR SELECT USING (public.can_view_pet(pet_id))';
  ELSIF v_cmd = 'r' 
    AND v_permissive = TRUE 
    AND v_roles = '{0}'::oid[] 
    AND v_qual ILIKE '%can_view_pet(pet_id)%' 
    AND v_check IS NULL THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plan_occurrences_select_policy semantic mismatch: cmd=%, permissive=%, roles=%, qual=%, check=%', 
                    v_cmd, v_permissive, v_roles, v_qual, v_check;
  END IF;

  -- plan_occurrences_insert_policy (INSERT, PERMISSIVE, PUBLIC)
  v_cmd := NULL; v_permissive := NULL; v_roles := NULL; v_qual := NULL; v_check := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles, 
         pg_get_expr(pol.polqual, pol.polrelid), 
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_permissive, v_roles, v_qual, v_check
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plan_occurrences' AND pol.polname = 'plan_occurrences_insert_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plan_occurrences_insert_policy" ON public.plan_occurrences FOR INSERT WITH CHECK (public.can_manage_pet_care(pet_id))';
  ELSIF v_cmd = 'a' 
    AND v_permissive = TRUE 
    AND v_roles = '{0}'::oid[] 
    AND v_qual IS NULL 
    AND v_check ILIKE '%can_manage_pet_care(pet_id)%' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plan_occurrences_insert_policy semantic mismatch: cmd=%, permissive=%, roles=%, qual=%, check=%', 
                    v_cmd, v_permissive, v_roles, v_qual, v_check;
  END IF;

  -- plan_occurrences_update_policy (UPDATE, PERMISSIVE, PUBLIC)
  v_cmd := NULL; v_permissive := NULL; v_roles := NULL; v_qual := NULL; v_check := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles, 
         pg_get_expr(pol.polqual, pol.polrelid), 
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_permissive, v_roles, v_qual, v_check
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plan_occurrences' AND pol.polname = 'plan_occurrences_update_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plan_occurrences_update_policy" ON public.plan_occurrences FOR UPDATE USING (public.can_manage_pet_care(pet_id)) WITH CHECK (public.can_manage_pet_care(pet_id))';
  ELSIF v_cmd = 'w' 
    AND v_permissive = TRUE 
    AND v_roles = '{0}'::oid[] 
    AND v_qual ILIKE '%can_manage_pet_care(pet_id)%' 
    AND v_check ILIKE '%can_manage_pet_care(pet_id)%' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plan_occurrences_update_policy semantic mismatch: cmd=%, permissive=%, roles=%, qual=%, check=%', 
                    v_cmd, v_permissive, v_roles, v_qual, v_check;
  END IF;

  -- plan_occurrences_delete_policy (DELETE, PERMISSIVE, PUBLIC)
  v_cmd := NULL; v_permissive := NULL; v_roles := NULL; v_qual := NULL; v_check := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles, 
         pg_get_expr(pol.polqual, pol.polrelid), 
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_permissive, v_roles, v_qual, v_check
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plan_occurrences' AND pol.polname = 'plan_occurrences_delete_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plan_occurrences_delete_policy" ON public.plan_occurrences FOR DELETE USING (public.can_manage_pet_care(pet_id))';
  ELSIF v_cmd = 'd' 
    AND v_permissive = TRUE 
    AND v_roles = '{0}'::oid[] 
    AND v_qual ILIKE '%can_manage_pet_care(pet_id)%' 
    AND v_check IS NULL THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plan_occurrences_delete_policy semantic mismatch: cmd=%, permissive=%, roles=%, qual=%, check=%', 
                    v_cmd, v_permissive, v_roles, v_qual, v_check;
  END IF;

  -- --------------------------------------------------------------------------
  -- 9c. public.notification_jobs policies
  -- --------------------------------------------------------------------------

  -- notification_jobs_select_policy (SELECT, PERMISSIVE, PUBLIC)
  v_cmd := NULL; v_permissive := NULL; v_roles := NULL; v_qual := NULL; v_check := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles, 
         pg_get_expr(pol.polqual, pol.polrelid), 
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_permissive, v_roles, v_qual, v_check
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'notification_jobs' AND pol.polname = 'notification_jobs_select_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "notification_jobs_select_policy" ON public.notification_jobs FOR SELECT
             USING (
               EXISTS (
                 SELECT 1 FROM public.plans
                 WHERE plans.id = notification_jobs.plan_id
                   AND public.can_view_pet(plans.pet_id)
               )
             )';
  ELSIF v_cmd = 'r' 
    AND v_permissive = TRUE 
    AND v_roles = '{0}'::oid[] 
    AND v_qual ILIKE '%can_view_pet(plans.pet_id)%' 
    AND v_check IS NULL THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: notification_jobs_select_policy semantic mismatch: cmd=%, permissive=%, roles=%, qual=%, check=%', 
                    v_cmd, v_permissive, v_roles, v_qual, v_check;
  END IF;

  -- notification_jobs_manage_policy (FOR ALL, PERMISSIVE, PUBLIC)
  v_cmd := NULL; v_permissive := NULL; v_roles := NULL; v_qual := NULL; v_check := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles, 
         pg_get_expr(pol.polqual, pol.polrelid), 
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_permissive, v_roles, v_qual, v_check
  FROM pg_policy pol
  JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'notification_jobs' AND pol.polname = 'notification_jobs_manage_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "notification_jobs_manage_policy" ON public.notification_jobs FOR ALL
             USING (
               EXISTS (
                 SELECT 1 FROM public.plans
                 WHERE plans.id = notification_jobs.plan_id
                   AND public.can_manage_pet_care(plans.pet_id)
               )
             )';
  ELSIF (v_cmd = '*' OR v_cmd = 'a') 
    AND v_permissive = TRUE 
    AND v_roles = '{0}'::oid[] 
    AND v_qual ILIKE '%can_manage_pet_care(plans.pet_id)%' THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: notification_jobs_manage_policy semantic mismatch: cmd=%, permissive=%, roles=%, qual=%, check=%', 
                    v_cmd, v_permissive, v_roles, v_qual, v_check;
  END IF;
END $$;

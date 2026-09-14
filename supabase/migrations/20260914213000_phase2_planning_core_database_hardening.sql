-- Migration: 20260914213000_phase2_planning_core_database_hardening.sql
-- Description: Phase 2 Database Hardening for Planning Core
-- Objects: plans, plan_occurrences, notification_jobs
-- Transaction-Safe, Idempotent, Zero Data Loss, Fail-Fast Catalog Validation
-- Semantic Identity: Temp-table reference comparison (not ILIKE substring)

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
-- 7. SEMANTIC IDENTITY INFRASTRUCTURE
--    Temp-table reference approach: canonical definitions are added to temp
--    tables so pg_get_constraintdef / pg_get_expr produces the exact same
--    normalized output that PostgreSQL uses internally. Comparison is then
--    exact string equality (after whitespace normalization), NOT substring.
-- ============================================================================

-- 7.0 Normalization helper: collapse whitespace for cosmetic-only diffs
-- Note: We DO NOT use lower() to preserve string literal and identifier case sensitivity
CREATE OR REPLACE FUNCTION pg_temp._norm(p_text TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(trim(COALESCE(p_text, '')), '\s+', ' ', 'g');
$$;

-- NULL-safe expression match: both NULL → true, one NULL → false, else normalized eq
CREATE OR REPLACE FUNCTION pg_temp._expr_eq(a TEXT, b TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN a IS NULL AND b IS NULL THEN TRUE
    WHEN a IS NULL OR  b IS NULL THEN FALSE
    ELSE pg_temp._norm(a) = pg_temp._norm(b)
  END;
$$;

-- 7.1 Create reference tables mirroring real table columns
DROP TABLE IF EXISTS _p2ref_nj  CASCADE;
DROP TABLE IF EXISTS _p2ref_po  CASCADE;
DROP TABLE IF EXISTS _p2ref_plans CASCADE;

CREATE TEMP TABLE _p2ref_plans (
  status TEXT, source TEXT, policy TEXT, is_active BOOLEAN,
  assigned_to UUID, pet_id UUID, user_id UUID
);

CREATE TEMP TABLE _p2ref_po (
  record_table TEXT, assigned_to UUID, pet_id UUID, scheduled_at TIMESTAMPTZ
);

CREATE TEMP TABLE _p2ref_nj (
  plan_id UUID
);

-- 7.2 Add canonical constraints to reference tables
ALTER TABLE _p2ref_plans ADD CONSTRAINT _p2ref_status_check
  CHECK (status IN ('active', 'completed', 'cancelled', 'overdue', 'deleted'));

ALTER TABLE _p2ref_plans ADD CONSTRAINT _p2ref_status_check_legacy
  CHECK (status IN ('active', 'completed', 'cancelled', 'overdue'));

ALTER TABLE _p2ref_plans ADD CONSTRAINT _p2ref_source_check
  CHECK (source IN ('user', 'system', 'protocol', 'clinical', 'ai'));

ALTER TABLE _p2ref_plans ADD CONSTRAINT _p2ref_policy_check
  CHECK (policy IN ('optional', 'recommended', 'required'));

ALTER TABLE _p2ref_plans ADD CONSTRAINT _p2ref_invariant_check
  CHECK (
    (status IN ('active', 'overdue') AND is_active = TRUE)
    OR
    (status IN ('completed', 'cancelled', 'deleted') AND is_active = FALSE)
  );

ALTER TABLE _p2ref_plans ADD CONSTRAINT _p2ref_plans_assigned_fk
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE _p2ref_po ADD CONSTRAINT _p2ref_record_table_check
  CHECK (
    record_table IS NULL OR record_table IN (
      'vaccine_records_v2', 'parasite_records', 'weight_logs',
      'health_medication_courses', 'nutrition_logs', 'appointments'
    )
  );

ALTER TABLE _p2ref_po ADD CONSTRAINT _p2ref_po_assigned_fk
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID;

-- 7.3 Add canonical RLS policies to reference tables
ALTER TABLE _p2ref_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE _p2ref_po    ENABLE ROW LEVEL SECURITY;
ALTER TABLE _p2ref_nj    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "_p2ref_p_select" ON _p2ref_plans FOR SELECT
  USING (public.can_view_pet(pet_id));
CREATE POLICY "_p2ref_p_insert" ON _p2ref_plans FOR INSERT
  WITH CHECK (public.can_manage_pet_care(pet_id) AND auth.uid() = user_id);
CREATE POLICY "_p2ref_p_update" ON _p2ref_plans FOR UPDATE
  USING (public.can_manage_pet_care(pet_id))
  WITH CHECK (public.can_manage_pet_care(pet_id));
CREATE POLICY "_p2ref_p_delete" ON _p2ref_plans FOR DELETE
  USING (public.can_manage_pet_care(pet_id));

CREATE POLICY "_p2ref_o_select" ON _p2ref_po FOR SELECT
  USING (public.can_view_pet(pet_id));
CREATE POLICY "_p2ref_o_insert" ON _p2ref_po FOR INSERT
  WITH CHECK (public.can_manage_pet_care(pet_id));
CREATE POLICY "_p2ref_o_update" ON _p2ref_po FOR UPDATE
  USING (public.can_manage_pet_care(pet_id))
  WITH CHECK (public.can_manage_pet_care(pet_id));
CREATE POLICY "_p2ref_o_delete" ON _p2ref_po FOR DELETE
  USING (public.can_manage_pet_care(pet_id));

CREATE POLICY "_p2ref_nj_select" ON _p2ref_nj FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.plans
      WHERE plans.id = plan_id
        AND public.can_view_pet(plans.pet_id)
    )
  );
CREATE POLICY "_p2ref_nj_manage" ON _p2ref_nj FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.plans
      WHERE plans.id = plan_id
        AND public.can_manage_pet_care(plans.pet_id)
    )
  );

-- ============================================================================
-- 7.4 FAIL-FAST CONSTRAINT & RLS VALIDATION (MAIN DO BLOCK)
-- ============================================================================
DO $$
DECLARE
  -- constraint variables
  v_type       "char";
  v_validated  BOOLEAN;
  v_existing   TEXT;
  v_canonical  TEXT;
  v_legacy     TEXT;
  -- policy variables
  v_cmd        "char";
  v_perm       BOOLEAN;
  v_roles      oid[];
  v_eq         TEXT;  -- existing qual
  v_ec         TEXT;  -- existing check
  v_cq         TEXT;  -- canonical qual
  v_cc         TEXT;  -- canonical check
  v_rc         "char";  -- ref cmd
  v_rp         BOOLEAN; -- ref permissive
  v_rr         oid[];   -- ref roles
BEGIN

  -- ======================================================================
  -- A. CONSTRAINT & FK VALIDATION
  -- ======================================================================

  -- A1. plans_assigned_to_fkey
  SELECT pg_get_constraintdef(c.oid) INTO v_canonical
  FROM pg_constraint c WHERE c.conname = '_p2ref_plans_assigned_fk';

  v_type := NULL; v_validated := NULL; v_existing := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid)
  INTO   v_type, v_validated, v_existing
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' AND t.relname = 'plans'
    AND c.conname = 'plans_assigned_to_fkey';

  IF v_existing IS NULL THEN
    EXECUTE 'ALTER TABLE public.plans ADD CONSTRAINT plans_assigned_to_fkey
             FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID';
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_assigned_to_fkey';
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = TRUE THEN
    NULL; -- Case B: canonical + validated -> NO-OP
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = FALSE THEN
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_assigned_to_fkey';
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_assigned_to_fkey semantic mismatch. canonical=[ % ], actual=[ % ]', v_canonical, v_existing;
  END IF;

  -- A2. plan_occurrences_assigned_to_fkey
  SELECT pg_get_constraintdef(c.oid) INTO v_canonical
  FROM pg_constraint c WHERE c.conname = '_p2ref_po_assigned_fk';

  v_type := NULL; v_validated := NULL; v_existing := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid)
  INTO   v_type, v_validated, v_existing
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' AND t.relname = 'plan_occurrences'
    AND c.conname = 'plan_occurrences_assigned_to_fkey';

  IF v_existing IS NULL THEN
    EXECUTE 'ALTER TABLE public.plan_occurrences ADD CONSTRAINT plan_occurrences_assigned_to_fkey
             FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL NOT VALID';
    EXECUTE 'ALTER TABLE public.plan_occurrences VALIDATE CONSTRAINT plan_occurrences_assigned_to_fkey';
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = TRUE THEN
    NULL;
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = FALSE THEN
    EXECUTE 'ALTER TABLE public.plan_occurrences VALIDATE CONSTRAINT plan_occurrences_assigned_to_fkey';
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plan_occurrences_assigned_to_fkey semantic mismatch. canonical=[ % ], actual=[ % ]', v_canonical, v_existing;
  END IF;

  -- A3. plans_status_check (with legacy upgrade path)
  SELECT pg_get_constraintdef(c.oid) INTO v_canonical
  FROM pg_constraint c WHERE c.conname = '_p2ref_status_check';

  SELECT pg_get_constraintdef(c.oid) INTO v_legacy
  FROM pg_constraint c WHERE c.conname = '_p2ref_status_check_legacy';

  v_type := NULL; v_validated := NULL; v_existing := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid)
  INTO   v_type, v_validated, v_existing
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' AND t.relname = 'plans'
    AND c.conname = 'plans_status_check';

  IF v_existing IS NULL THEN
    EXECUTE 'ALTER TABLE public.plans ADD CONSTRAINT plans_status_check
             CHECK (status IN (''active'', ''completed'', ''cancelled'', ''overdue'', ''deleted'')) NOT VALID';
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_status_check';
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = TRUE THEN
    NULL;
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = FALSE THEN
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_status_check';
  ELSIF pg_temp._expr_eq(v_existing, v_legacy) THEN
    -- Known legacy (20260710000003): upgrade to canonical
    EXECUTE 'ALTER TABLE public.plans DROP CONSTRAINT plans_status_check';
    EXECUTE 'ALTER TABLE public.plans ADD CONSTRAINT plans_status_check
             CHECK (status IN (''active'', ''completed'', ''cancelled'', ''overdue'', ''deleted'')) NOT VALID';
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_status_check';
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_status_check semantic mismatch. canonical=[ % ], legacy=[ % ], actual=[ % ]', v_canonical, v_legacy, v_existing;
  END IF;

  -- A4. plans_source_check
  SELECT pg_get_constraintdef(c.oid) INTO v_canonical
  FROM pg_constraint c WHERE c.conname = '_p2ref_source_check';

  v_type := NULL; v_validated := NULL; v_existing := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid)
  INTO   v_type, v_validated, v_existing
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' AND t.relname = 'plans'
    AND c.conname = 'plans_source_check';

  IF v_existing IS NULL THEN
    EXECUTE 'ALTER TABLE public.plans ADD CONSTRAINT plans_source_check
             CHECK (source IN (''user'', ''system'', ''protocol'', ''clinical'', ''ai'')) NOT VALID';
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_source_check';
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = TRUE THEN
    NULL;
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = FALSE THEN
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_source_check';
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_source_check semantic mismatch. canonical=[ % ], actual=[ % ]', v_canonical, v_existing;
  END IF;

  -- A5. plans_policy_check
  SELECT pg_get_constraintdef(c.oid) INTO v_canonical
  FROM pg_constraint c WHERE c.conname = '_p2ref_policy_check';

  v_type := NULL; v_validated := NULL; v_existing := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid)
  INTO   v_type, v_validated, v_existing
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' AND t.relname = 'plans'
    AND c.conname = 'plans_policy_check';

  IF v_existing IS NULL THEN
    EXECUTE 'ALTER TABLE public.plans ADD CONSTRAINT plans_policy_check
             CHECK (policy IN (''optional'', ''recommended'', ''required'')) NOT VALID';
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_policy_check';
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = TRUE THEN
    NULL;
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = FALSE THEN
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_policy_check';
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_policy_check semantic mismatch. canonical=[ % ], actual=[ % ]', v_canonical, v_existing;
  END IF;

  -- A6. plans_status_is_active_invariant
  SELECT pg_get_constraintdef(c.oid) INTO v_canonical
  FROM pg_constraint c WHERE c.conname = '_p2ref_invariant_check';

  v_type := NULL; v_validated := NULL; v_existing := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid)
  INTO   v_type, v_validated, v_existing
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' AND t.relname = 'plans'
    AND c.conname = 'plans_status_is_active_invariant';

  IF v_existing IS NULL THEN
    EXECUTE 'ALTER TABLE public.plans ADD CONSTRAINT plans_status_is_active_invariant
             CHECK (
               (status IN (''active'', ''overdue'') AND is_active = TRUE)
               OR
               (status IN (''completed'', ''cancelled'', ''deleted'') AND is_active = FALSE)
             ) NOT VALID';
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_status_is_active_invariant';
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = TRUE THEN
    NULL;
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = FALSE THEN
    EXECUTE 'ALTER TABLE public.plans VALIDATE CONSTRAINT plans_status_is_active_invariant';
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_status_is_active_invariant semantic mismatch. canonical=[ % ], actual=[ % ]', v_canonical, v_existing;
  END IF;

  -- A7. plan_occurrences_record_table_check
  SELECT pg_get_constraintdef(c.oid) INTO v_canonical
  FROM pg_constraint c WHERE c.conname = '_p2ref_record_table_check';

  v_type := NULL; v_validated := NULL; v_existing := NULL;
  SELECT c.contype, c.convalidated, pg_get_constraintdef(c.oid)
  INTO   v_type, v_validated, v_existing
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE n.nspname = 'public' AND t.relname = 'plan_occurrences'
    AND c.conname = 'plan_occurrences_record_table_check';

  IF v_existing IS NULL THEN
    EXECUTE 'ALTER TABLE public.plan_occurrences ADD CONSTRAINT plan_occurrences_record_table_check
             CHECK (
               record_table IS NULL OR record_table IN (
                 ''vaccine_records_v2'', ''parasite_records'', ''weight_logs'',
                 ''health_medication_courses'', ''nutrition_logs'', ''appointments''
               )
             ) NOT VALID';
    EXECUTE 'ALTER TABLE public.plan_occurrences VALIDATE CONSTRAINT plan_occurrences_record_table_check';
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = TRUE THEN
    NULL;
  ELSIF pg_temp._expr_eq(v_existing, v_canonical) AND v_validated = FALSE THEN
    EXECUTE 'ALTER TABLE public.plan_occurrences VALIDATE CONSTRAINT plan_occurrences_record_table_check';
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plan_occurrences_record_table_check semantic mismatch. canonical=[ % ], actual=[ % ]', v_canonical, v_existing;
  END IF;

  -- ======================================================================
  -- B. RLS POLICY VALIDATION
  --    Each policy is compared across ALL 5 semantic dimensions:
  --      polcmd, polpermissive, polroles, polqual, polwithcheck
  --    Expression text from pg_get_expr is compared via temp-table reference
  --    to guarantee exact semantic identity (not substring matching).
  --    Temp table names in ref expressions are replaced with real table
  --    names before comparison, so cosmetic table-name diffs are absorbed.
  -- ======================================================================

  -- Ensure RLS is enabled on real tables
  EXECUTE 'ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.plan_occurrences ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY';

  -- Clean up legacy user_id-only policies (these are unconditionally safe to drop)
  EXECUTE 'DROP POLICY IF EXISTS "kullanici_kendi_planlarini_gorur" ON public.plans';
  EXECUTE 'DROP POLICY IF EXISTS "kullanici_kendi_planlarini_olusturur" ON public.plans';
  EXECUTE 'DROP POLICY IF EXISTS "kullanici_kendi_planlarini_gunceller" ON public.plans';
  EXECUTE 'DROP POLICY IF EXISTS "kullanici_kendi_planlarini_siler" ON public.plans';
  EXECUTE 'DROP POLICY IF EXISTS "Owners manage plan_occurrences" ON public.plan_occurrences';
  EXECUTE 'DROP POLICY IF EXISTS "kullanici_kendi_bildirimlerini_yonetir" ON public.notification_jobs';

  -- ---- B1. plans_select_policy ----
  -- Get canonical from ref
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_rc, v_rp, v_rr, v_cq, v_cc
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  WHERE c.relname = '_p2ref_plans' AND pol.polname = '_p2ref_p_select';
  -- Replace ref table name with real table name in expressions
  v_cq := replace(COALESCE(v_cq,''), '_p2ref_plans', 'plans');
  v_cc := NULLIF(replace(COALESCE(v_cc,''), '_p2ref_plans', 'plans'), '');

  -- Get existing
  v_cmd := NULL; v_perm := NULL; v_roles := NULL; v_eq := NULL; v_ec := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_perm, v_roles, v_eq, v_ec
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plans' AND pol.polname = 'plans_select_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plans_select_policy" ON public.plans FOR SELECT USING (public.can_view_pet(pet_id))';
  ELSIF v_cmd = v_rc AND v_perm = v_rp AND v_roles = v_rr
        AND pg_temp._expr_eq(v_eq, v_cq) AND pg_temp._expr_eq(v_ec, v_cc) THEN
    NULL; -- Full semantic match -> NO-OP
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_select_policy semantic mismatch. cmd=%/%, perm=%/%, roles=%/%, qual=[%]/[%], check=[%]/[%]',
      v_cmd, v_rc, v_perm, v_rp, v_roles, v_rr, v_eq, v_cq, v_ec, v_cc;
  END IF;

  -- ---- B2. plans_insert_policy ----
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_rc, v_rp, v_rr, v_cq, v_cc
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  WHERE c.relname = '_p2ref_plans' AND pol.polname = '_p2ref_p_insert';
  v_cq := NULLIF(replace(COALESCE(v_cq,''), '_p2ref_plans', 'plans'), '');
  v_cc := replace(COALESCE(v_cc,''), '_p2ref_plans', 'plans');

  v_cmd := NULL; v_perm := NULL; v_roles := NULL; v_eq := NULL; v_ec := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_perm, v_roles, v_eq, v_ec
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plans' AND pol.polname = 'plans_insert_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plans_insert_policy" ON public.plans FOR INSERT WITH CHECK (public.can_manage_pet_care(pet_id) AND auth.uid() = user_id)';
  ELSIF v_cmd = v_rc AND v_perm = v_rp AND v_roles = v_rr
        AND pg_temp._expr_eq(v_eq, v_cq) AND pg_temp._expr_eq(v_ec, v_cc) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_insert_policy semantic mismatch. cmd=%/%, perm=%/%, roles=%/%, qual=[%]/[%], check=[%]/[%]',
      v_cmd, v_rc, v_perm, v_rp, v_roles, v_rr, v_eq, v_cq, v_ec, v_cc;
  END IF;

  -- ---- B3. plans_update_policy ----
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_rc, v_rp, v_rr, v_cq, v_cc
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  WHERE c.relname = '_p2ref_plans' AND pol.polname = '_p2ref_p_update';
  v_cq := replace(COALESCE(v_cq,''), '_p2ref_plans', 'plans');
  v_cc := replace(COALESCE(v_cc,''), '_p2ref_plans', 'plans');

  v_cmd := NULL; v_perm := NULL; v_roles := NULL; v_eq := NULL; v_ec := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_perm, v_roles, v_eq, v_ec
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plans' AND pol.polname = 'plans_update_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plans_update_policy" ON public.plans FOR UPDATE USING (public.can_manage_pet_care(pet_id)) WITH CHECK (public.can_manage_pet_care(pet_id))';
  ELSIF v_cmd = v_rc AND v_perm = v_rp AND v_roles = v_rr
        AND pg_temp._expr_eq(v_eq, v_cq) AND pg_temp._expr_eq(v_ec, v_cc) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_update_policy semantic mismatch. cmd=%/%, perm=%/%, roles=%/%, qual=[%]/[%], check=[%]/[%]',
      v_cmd, v_rc, v_perm, v_rp, v_roles, v_rr, v_eq, v_cq, v_ec, v_cc;
  END IF;

  -- ---- B4. plans_delete_policy ----
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_rc, v_rp, v_rr, v_cq, v_cc
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  WHERE c.relname = '_p2ref_plans' AND pol.polname = '_p2ref_p_delete';
  v_cq := replace(COALESCE(v_cq,''), '_p2ref_plans', 'plans');
  v_cc := NULLIF(replace(COALESCE(v_cc,''), '_p2ref_plans', 'plans'), '');

  v_cmd := NULL; v_perm := NULL; v_roles := NULL; v_eq := NULL; v_ec := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_perm, v_roles, v_eq, v_ec
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plans' AND pol.polname = 'plans_delete_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plans_delete_policy" ON public.plans FOR DELETE USING (public.can_manage_pet_care(pet_id))';
  ELSIF v_cmd = v_rc AND v_perm = v_rp AND v_roles = v_rr
        AND pg_temp._expr_eq(v_eq, v_cq) AND pg_temp._expr_eq(v_ec, v_cc) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plans_delete_policy semantic mismatch. cmd=%/%, perm=%/%, roles=%/%, qual=[%]/[%], check=[%]/[%]',
      v_cmd, v_rc, v_perm, v_rp, v_roles, v_rr, v_eq, v_cq, v_ec, v_cc;
  END IF;

  -- ---- B5. plan_occurrences_select_policy ----
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_rc, v_rp, v_rr, v_cq, v_cc
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  WHERE c.relname = '_p2ref_po' AND pol.polname = '_p2ref_o_select';
  v_cq := replace(COALESCE(v_cq,''), '_p2ref_po', 'plan_occurrences');
  v_cc := NULLIF(replace(COALESCE(v_cc,''), '_p2ref_po', 'plan_occurrences'), '');

  v_cmd := NULL; v_perm := NULL; v_roles := NULL; v_eq := NULL; v_ec := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_perm, v_roles, v_eq, v_ec
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plan_occurrences' AND pol.polname = 'plan_occurrences_select_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plan_occurrences_select_policy" ON public.plan_occurrences FOR SELECT USING (public.can_view_pet(pet_id))';
  ELSIF v_cmd = v_rc AND v_perm = v_rp AND v_roles = v_rr
        AND pg_temp._expr_eq(v_eq, v_cq) AND pg_temp._expr_eq(v_ec, v_cc) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plan_occurrences_select_policy semantic mismatch. cmd=%/%, perm=%/%, roles=%/%, qual=[%]/[%], check=[%]/[%]',
      v_cmd, v_rc, v_perm, v_rp, v_roles, v_rr, v_eq, v_cq, v_ec, v_cc;
  END IF;

  -- ---- B6. plan_occurrences_insert_policy ----
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_rc, v_rp, v_rr, v_cq, v_cc
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  WHERE c.relname = '_p2ref_po' AND pol.polname = '_p2ref_o_insert';
  v_cq := NULLIF(replace(COALESCE(v_cq,''), '_p2ref_po', 'plan_occurrences'), '');
  v_cc := replace(COALESCE(v_cc,''), '_p2ref_po', 'plan_occurrences');

  v_cmd := NULL; v_perm := NULL; v_roles := NULL; v_eq := NULL; v_ec := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_perm, v_roles, v_eq, v_ec
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plan_occurrences' AND pol.polname = 'plan_occurrences_insert_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plan_occurrences_insert_policy" ON public.plan_occurrences FOR INSERT WITH CHECK (public.can_manage_pet_care(pet_id))';
  ELSIF v_cmd = v_rc AND v_perm = v_rp AND v_roles = v_rr
        AND pg_temp._expr_eq(v_eq, v_cq) AND pg_temp._expr_eq(v_ec, v_cc) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plan_occurrences_insert_policy semantic mismatch. cmd=%/%, perm=%/%, roles=%/%, qual=[%]/[%], check=[%]/[%]',
      v_cmd, v_rc, v_perm, v_rp, v_roles, v_rr, v_eq, v_cq, v_ec, v_cc;
  END IF;

  -- ---- B7. plan_occurrences_update_policy ----
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_rc, v_rp, v_rr, v_cq, v_cc
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  WHERE c.relname = '_p2ref_po' AND pol.polname = '_p2ref_o_update';
  v_cq := replace(COALESCE(v_cq,''), '_p2ref_po', 'plan_occurrences');
  v_cc := replace(COALESCE(v_cc,''), '_p2ref_po', 'plan_occurrences');

  v_cmd := NULL; v_perm := NULL; v_roles := NULL; v_eq := NULL; v_ec := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_perm, v_roles, v_eq, v_ec
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plan_occurrences' AND pol.polname = 'plan_occurrences_update_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plan_occurrences_update_policy" ON public.plan_occurrences FOR UPDATE USING (public.can_manage_pet_care(pet_id)) WITH CHECK (public.can_manage_pet_care(pet_id))';
  ELSIF v_cmd = v_rc AND v_perm = v_rp AND v_roles = v_rr
        AND pg_temp._expr_eq(v_eq, v_cq) AND pg_temp._expr_eq(v_ec, v_cc) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plan_occurrences_update_policy semantic mismatch. cmd=%/%, perm=%/%, roles=%/%, qual=[%]/[%], check=[%]/[%]',
      v_cmd, v_rc, v_perm, v_rp, v_roles, v_rr, v_eq, v_cq, v_ec, v_cc;
  END IF;

  -- ---- B8. plan_occurrences_delete_policy ----
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_rc, v_rp, v_rr, v_cq, v_cc
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  WHERE c.relname = '_p2ref_po' AND pol.polname = '_p2ref_o_delete';
  v_cq := replace(COALESCE(v_cq,''), '_p2ref_po', 'plan_occurrences');
  v_cc := NULLIF(replace(COALESCE(v_cc,''), '_p2ref_po', 'plan_occurrences'), '');

  v_cmd := NULL; v_perm := NULL; v_roles := NULL; v_eq := NULL; v_ec := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_perm, v_roles, v_eq, v_ec
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'plan_occurrences' AND pol.polname = 'plan_occurrences_delete_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "plan_occurrences_delete_policy" ON public.plan_occurrences FOR DELETE USING (public.can_manage_pet_care(pet_id))';
  ELSIF v_cmd = v_rc AND v_perm = v_rp AND v_roles = v_rr
        AND pg_temp._expr_eq(v_eq, v_cq) AND pg_temp._expr_eq(v_ec, v_cc) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: plan_occurrences_delete_policy semantic mismatch. cmd=%/%, perm=%/%, roles=%/%, qual=[%]/[%], check=[%]/[%]',
      v_cmd, v_rc, v_perm, v_rp, v_roles, v_rr, v_eq, v_cq, v_ec, v_cc;
  END IF;

  -- ---- B9. notification_jobs_select_policy ----
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_rc, v_rp, v_rr, v_cq, v_cc
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  WHERE c.relname = '_p2ref_nj' AND pol.polname = '_p2ref_nj_select';
  v_cq := replace(COALESCE(v_cq,''), '_p2ref_nj', 'notification_jobs');
  v_cc := NULLIF(replace(COALESCE(v_cc,''), '_p2ref_nj', 'notification_jobs'), '');

  v_cmd := NULL; v_perm := NULL; v_roles := NULL; v_eq := NULL; v_ec := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_perm, v_roles, v_eq, v_ec
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'notification_jobs' AND pol.polname = 'notification_jobs_select_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "notification_jobs_select_policy" ON public.notification_jobs FOR SELECT
             USING (EXISTS (SELECT 1 FROM public.plans WHERE plans.id = notification_jobs.plan_id AND public.can_view_pet(plans.pet_id)))';
  ELSIF v_cmd = v_rc AND v_perm = v_rp AND v_roles = v_rr
        AND pg_temp._expr_eq(v_eq, v_cq) AND pg_temp._expr_eq(v_ec, v_cc) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: notification_jobs_select_policy semantic mismatch. cmd=%/%, perm=%/%, roles=%/%, qual=[%]/[%], check=[%]/[%]',
      v_cmd, v_rc, v_perm, v_rp, v_roles, v_rr, v_eq, v_cq, v_ec, v_cc;
  END IF;

  -- ---- B10. notification_jobs_manage_policy (FOR ALL) ----
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_rc, v_rp, v_rr, v_cq, v_cc
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  WHERE c.relname = '_p2ref_nj' AND pol.polname = '_p2ref_nj_manage';
  v_cq := replace(COALESCE(v_cq,''), '_p2ref_nj', 'notification_jobs');
  v_cc := NULLIF(replace(COALESCE(v_cc,''), '_p2ref_nj', 'notification_jobs'), '');

  v_cmd := NULL; v_perm := NULL; v_roles := NULL; v_eq := NULL; v_ec := NULL;
  SELECT pol.polcmd, pol.polpermissive, pol.polroles,
         pg_get_expr(pol.polqual, pol.polrelid),
         pg_get_expr(pol.polwithcheck, pol.polrelid)
  INTO v_cmd, v_perm, v_roles, v_eq, v_ec
  FROM pg_policy pol JOIN pg_class c ON pol.polrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relname = 'notification_jobs' AND pol.polname = 'notification_jobs_manage_policy';

  IF v_cmd IS NULL THEN
    EXECUTE 'CREATE POLICY "notification_jobs_manage_policy" ON public.notification_jobs FOR ALL
             USING (EXISTS (SELECT 1 FROM public.plans WHERE plans.id = notification_jobs.plan_id AND public.can_manage_pet_care(plans.pet_id)))';
  ELSIF v_cmd = v_rc AND v_perm = v_rp AND v_roles = v_rr
        AND pg_temp._expr_eq(v_eq, v_cq) AND pg_temp._expr_eq(v_ec, v_cc) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'FAIL_FAST: notification_jobs_manage_policy semantic mismatch. cmd=%/%, perm=%/%, roles=%/%, qual=[%]/[%], check=[%]/[%]',
      v_cmd, v_rc, v_perm, v_rp, v_roles, v_rr, v_eq, v_cq, v_ec, v_cc;
  END IF;

END $$;

-- ============================================================================
-- 7.5 CLEANUP REFERENCE INFRASTRUCTURE
-- ============================================================================
DROP TABLE IF EXISTS _p2ref_nj   CASCADE;
DROP TABLE IF EXISTS _p2ref_po   CASCADE;
DROP TABLE IF EXISTS _p2ref_plans CASCADE;
DROP FUNCTION IF EXISTS pg_temp._expr_eq(TEXT, TEXT);
DROP FUNCTION IF EXISTS pg_temp._norm(TEXT);

-- ============================================================================
-- 8. EVIDENCE-BASED INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_plans_pet_active
  ON public.plans (pet_id, is_active);

CREATE INDEX IF NOT EXISTS idx_plan_occurrences_pet_scheduled
  ON public.plan_occurrences (pet_id, scheduled_at DESC);

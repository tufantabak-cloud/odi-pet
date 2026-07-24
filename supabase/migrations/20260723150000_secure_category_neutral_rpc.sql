-- Migration: Secure, Category-Neutral Atomic Recurring Plan Completion RPC
-- Date: 2026-07-23

-- 1. Add NOT VALID CHECK constraint for child occurrence rows
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_plans_child_occurrence_fields'
  ) THEN
    ALTER TABLE public.plans
    ADD CONSTRAINT check_plans_child_occurrence_fields
    CHECK (
      parent_plan_id IS NULL OR (
        occurrence_scheduled_at IS NOT NULL AND
        status = 'completed' AND
        repeat_rule IS NULL
      )
    ) NOT VALID;
  END IF;
END $$;

-- 2. Define Category-Neutral, Secure complete_recurring_plan RPC
CREATE OR REPLACE FUNCTION public.complete_recurring_plan(
  p_plan_id UUID,
  p_user_id UUID,
  p_occurrence_scheduled_at TIMESTAMPTZ,
  p_actual_completion_date TIMESTAMPTZ,
  p_next_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  p_close_series BOOLEAN DEFAULT FALSE,
  p_note TEXT DEFAULT NULL,
  p_extra_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan public.plans%ROWTYPE;
  v_completed_id UUID;
  v_actual_date TIMESTAMPTZ;
BEGIN
  -- 1. Barrier: p_occurrence_scheduled_at is MANDATORY
  IF p_occurrence_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'OCCURRENCE_SCHEDULED_AT_REQUIRED';
  END IF;

  -- 2. Lock main plan row FOR UPDATE
  SELECT * INTO v_plan
  FROM public.plans
  WHERE id = p_plan_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND';
  END IF;

  -- Main series validations
  IF v_plan.user_id <> p_user_id THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF v_plan.parent_plan_id IS NOT NULL THEN
    RAISE EXCEPTION 'CANNOT_COMPLETE_COMPLETED_OCCURRENCE';
  END IF;

  IF v_plan.status <> 'active' THEN
    RAISE EXCEPTION 'PLAN_NOT_ACTIVE';
  END IF;

  IF v_plan.repeat_rule IS NULL THEN
    RAISE EXCEPTION 'PLAN_NOT_RECURRING';
  END IF;

  -- Validate next date / close series requirement: No silent +365 days guessing in RPC!
  IF p_close_series IS FALSE AND p_next_scheduled_at IS NULL THEN
    RAISE EXCEPTION 'NEXT_SCHEDULED_AT_REQUIRED';
  END IF;

  v_actual_date := COALESCE(p_actual_completion_date, p_occurrence_scheduled_at, NOW());

  -- 3. Idempotency Check using exact occurrence_scheduled_at timestamp
  SELECT id INTO v_completed_id
  FROM public.plans
  WHERE parent_plan_id = p_plan_id
    AND occurrence_scheduled_at = p_occurrence_scheduled_at
  LIMIT 1;

  IF v_completed_id IS NOT NULL THEN
    -- Already completed for this exact occurrence scheduled timestamp!
    RETURN jsonb_build_object(
      'status', 'idempotent_already_completed',
      'is_recurring', true,
      'completed_id', v_completed_id,
      'main_plan_id', p_plan_id
    );
  END IF;

  -- 4. Create completed static child occurrence with v_actual_date as scheduled_at
  INSERT INTO public.plans (
    pet_id,
    user_id,
    category,
    sub_type,
    scheduled_at,
    occurrence_scheduled_at,
    repeat_rule,
    ends_at,
    notif_before,
    notif_unit,
    note,
    extra_data,
    status,
    parent_plan_id
  ) VALUES (
    v_plan.pet_id,
    v_plan.user_id,
    v_plan.category,
    v_plan.sub_type,
    v_actual_date,
    p_occurrence_scheduled_at,
    NULL,
    NULL,
    0,
    'minute',
    COALESCE(p_note, v_plan.note),
    v_plan.extra_data || p_extra_data || jsonb_build_object('is_past_done', true),
    'completed',
    p_plan_id
  )
  RETURNING id INTO v_completed_id;

  -- 5. Update main series plan status & next scheduled date
  IF p_close_series THEN
    UPDATE public.plans
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_plan_id;
  ELSE
    UPDATE public.plans
    SET scheduled_at = p_next_scheduled_at,
        status = 'active',
        extra_data = v_plan.extra_data || jsonb_build_object('is_past_done', false),
        updated_at = NOW()
    WHERE id = p_plan_id;
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'is_recurring', true,
    'completed_id', v_completed_id,
    'main_plan_id', p_plan_id,
    'next_scheduled_at', CASE WHEN p_close_series THEN NULL ELSE p_next_scheduled_at END
  );
END;
$$;

-- 3. Security Hardening: Revoke from PUBLIC, anon, authenticated and grant to service_role ONLY
REVOKE ALL ON FUNCTION public.complete_recurring_plan(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_recurring_plan(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TEXT, JSONB) TO service_role;

-- Migration: Add completed_at column to plans, enforce completed_at on child, and add INVALID_OCCURRENCE / INVALID_NEXT_OCCURRENCE checks to RPC
-- Date: 2026-07-23

-- 1. Add completed_at column to plans table
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ NULL;

-- 2. Define Category-Neutral, Secure complete_recurring_plan RPC with occurrence validations
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

  -- 3. OCCURRENCE VALIDATION: p_occurrence_scheduled_at MUST match current v_plan.scheduled_at
  IF p_occurrence_scheduled_at <> v_plan.scheduled_at THEN
    RAISE EXCEPTION 'INVALID_OCCURRENCE';
  END IF;

  -- 4. NEXT SCHEDULED AT VALIDATION: p_next_scheduled_at MUST be > p_occurrence_scheduled_at
  IF p_close_series IS FALSE THEN
    IF p_next_scheduled_at IS NULL THEN
      RAISE EXCEPTION 'NEXT_SCHEDULED_AT_REQUIRED';
    END IF;

    IF p_next_scheduled_at <= p_occurrence_scheduled_at THEN
      RAISE EXCEPTION 'INVALID_NEXT_OCCURRENCE';
    END IF;
  END IF;

  v_actual_date := COALESCE(p_actual_completion_date, p_occurrence_scheduled_at, NOW());

  -- 5. Idempotency Check using exact occurrence_scheduled_at timestamp
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

  -- 6. Create completed static child occurrence with completed_at explicitly set
  INSERT INTO public.plans (
    pet_id,
    user_id,
    category,
    sub_type,
    scheduled_at,
    occurrence_scheduled_at,
    completed_at,
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
    v_actual_date,
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

  -- 7. Update main series plan status & next scheduled date
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

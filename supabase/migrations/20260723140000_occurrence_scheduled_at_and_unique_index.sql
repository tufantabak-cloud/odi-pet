-- Migration: Add occurrence_scheduled_at column, update unique index, and refine complete_recurring_plan RPC
-- Date: 2026-07-23

-- 1. Add occurrence_scheduled_at column to plans table
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS occurrence_scheduled_at TIMESTAMPTZ NULL;

-- 2. Drop old date-based index if it exists
DROP INDEX IF EXISTS public.idx_plans_parent_occurrence_date;

-- 3. Create new timestamp-based unique index for exact occurrence idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_parent_occurrence_scheduled
ON public.plans (parent_plan_id, occurrence_scheduled_at)
WHERE parent_plan_id IS NOT NULL AND occurrence_scheduled_at IS NOT NULL;

-- 4. Update complete_recurring_plan RPC function with explicit occurrence_scheduled_at parameter
CREATE OR REPLACE FUNCTION public.complete_recurring_plan(
  p_plan_id UUID,
  p_user_id UUID,
  p_occurrence_scheduled_at TIMESTAMPTZ,
  p_actual_completion_date TIMESTAMPTZ DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_extra_data JSONB DEFAULT '{}'::jsonb,
  p_next_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan public.plans%ROWTYPE;
  v_next_scheduled_at TIMESTAMPTZ;
  v_completed_id UUID;
  v_actual_date TIMESTAMPTZ;
  v_interval INT;
  v_rule TEXT;
  v_vaccine_code TEXT;
BEGIN
  -- 1. Lock main plan row for update (prevents race conditions)
  SELECT * INTO v_plan
  FROM public.plans
  WHERE id = p_plan_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND';
  END IF;

  IF v_plan.parent_plan_id IS NOT NULL THEN
    RAISE EXCEPTION 'CANNOT_COMPLETE_COMPLETED_OCCURRENCE';
  END IF;

  v_actual_date := COALESCE(p_actual_completion_date, p_occurrence_scheduled_at, NOW());

  IF v_plan.repeat_rule IS NULL THEN
    -- One-time plan: mark completed directly
    UPDATE public.plans
    SET status = 'completed',
        note = COALESCE(p_note, note),
        extra_data = COALESCE(v_plan.extra_data || p_extra_data, v_plan.extra_data),
        updated_at = NOW()
    WHERE id = p_plan_id;

    RETURN jsonb_build_object(
      'status', 'completed',
      'is_recurring', false,
      'completed_id', p_plan_id
    );
  END IF;

  -- 2. Idempotency check using exact occurrence_scheduled_at timestamp
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

  -- 3. Create completed static child occurrence
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

  -- 4. Calculate next occurrence date for main plan (if p_next_scheduled_at provided, use it; else compute)
  IF p_next_scheduled_at IS NOT NULL THEN
    v_next_scheduled_at := p_next_scheduled_at;
  ELSE
    v_rule := v_plan.repeat_rule;
    v_interval := COALESCE((v_plan.extra_data->>'interval')::INT, 1);
    v_vaccine_code := COALESCE(v_plan.extra_data->>'vaccine_code', v_plan.extra_data->'vaccine'->>'code');

    IF v_plan.category = 'asi' AND (v_vaccine_code = 'DOG_RABIES' OR v_vaccine_code = 'CAT_RABIES' OR v_rule = 'yearly') THEN
      v_next_scheduled_at := v_actual_date + INTERVAL '365 days';
    ELSIF v_rule = 'hour' OR v_rule = 'hourly' THEN
      v_next_scheduled_at := v_actual_date + (v_interval || ' hours')::INTERVAL;
    ELSIF v_rule = 'daily' THEN
      v_next_scheduled_at := v_actual_date + (v_interval || ' days')::INTERVAL;
    ELSIF v_rule = 'weekly' THEN
      v_next_scheduled_at := v_actual_date + (v_interval * 7 || ' days')::INTERVAL;
    ELSIF v_rule = 'monthly' THEN
      v_next_scheduled_at := v_actual_date + (v_interval || ' months')::INTERVAL;
    ELSIF v_rule = 'yearly' THEN
      v_next_scheduled_at := v_actual_date + (v_interval || ' years')::INTERVAL;
    ELSE
      v_next_scheduled_at := v_actual_date + INTERVAL '365 days';
    END IF;
  END IF;

  -- 5. Roll main plan forward to next date, keeping status = 'active'
  UPDATE public.plans
  SET scheduled_at = v_next_scheduled_at,
      status = 'active',
      extra_data = v_plan.extra_data || jsonb_build_object('is_past_done', false),
      updated_at = NOW()
  WHERE id = p_plan_id;

  RETURN jsonb_build_object(
    'status', 'success',
    'is_recurring', true,
    'completed_id', v_completed_id,
    'main_plan_id', p_plan_id,
    'next_scheduled_at', v_next_scheduled_at
  );
END;
$$;

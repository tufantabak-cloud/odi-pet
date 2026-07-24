-- Migration: Add CHECK constraint, unique idempotency index, and complete_recurring_plan RPC
-- Date: 2026-07-23

-- 1. Check constraint (self-reference prevention)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_plans_parent_plan_id_not_self'
  ) THEN
    ALTER TABLE public.plans
    ADD CONSTRAINT check_plans_parent_plan_id_not_self
    CHECK (parent_plan_id IS NULL OR parent_plan_id <> id);
  END IF;
END $$;

-- 2. Unique index for occurrence idempotency (same parent plan cannot have two completed occurrences on the exact same date)
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_parent_occurrence_date 
ON public.plans (parent_plan_id, (CAST(scheduled_at AT TIME ZONE 'Europe/Istanbul' AS DATE))) 
WHERE parent_plan_id IS NOT NULL;

-- 3. Atomic RPC function for completing recurring plans
CREATE OR REPLACE FUNCTION public.complete_recurring_plan(
  p_plan_id UUID,
  p_user_id UUID,
  p_completion_date TIMESTAMPTZ,
  p_note TEXT DEFAULT NULL,
  p_extra_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan public.plans%ROWTYPE;
  v_next_scheduled_at TIMESTAMPTZ;
  v_completed_id UUID;
  v_date_str TEXT;
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

  -- 2. Idempotency check: check if an occurrence for this parent_plan_id on the same date already exists
  v_date_str := TO_CHAR(p_completion_date AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD');

  SELECT id INTO v_completed_id
  FROM public.plans
  WHERE parent_plan_id = p_plan_id
    AND TO_CHAR(scheduled_at AT TIME ZONE 'Europe/Istanbul', 'YYYY-MM-DD') = v_date_str
  LIMIT 1;

  IF v_completed_id IS NOT NULL THEN
    -- Already completed for this date! Return existing idempotently
    RETURN jsonb_build_object(
      'status', 'idempotent_already_completed',
      'is_recurring', true,
      'completed_id', v_completed_id,
      'main_plan_id', p_plan_id
    );
  END IF;

  -- 3. Create completed static occurrence
  INSERT INTO public.plans (
    pet_id,
    user_id,
    category,
    sub_type,
    scheduled_at,
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
    p_completion_date,
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

  -- 4. Calculate next occurrence date
  v_rule := v_plan.repeat_rule;
  v_interval := COALESCE((v_plan.extra_data->>'interval')::INT, 1);
  v_vaccine_code := COALESCE(v_plan.extra_data->>'vaccine_code', v_plan.extra_data->'vaccine'->>'code');

  IF v_plan.category = 'asi' AND (v_vaccine_code = 'DOG_RABIES' OR v_vaccine_code = 'CAT_RABIES' OR v_rule = 'yearly') THEN
    v_next_scheduled_at := p_completion_date + INTERVAL '365 days';
  ELSIF v_rule = 'hour' OR v_rule = 'hourly' THEN
    v_next_scheduled_at := p_completion_date + (v_interval || ' hours')::INTERVAL;
  ELSIF v_rule = 'daily' THEN
    v_next_scheduled_at := p_completion_date + (v_interval || ' days')::INTERVAL;
  ELSIF v_rule = 'weekly' THEN
    v_next_scheduled_at := p_completion_date + (v_interval * 7 || ' days')::INTERVAL;
  ELSIF v_rule = 'monthly' THEN
    v_next_scheduled_at := p_completion_date + (v_interval || ' months')::INTERVAL;
  ELSIF v_rule = 'yearly' THEN
    v_next_scheduled_at := p_completion_date + (v_interval || ' years')::INTERVAL;
  ELSE
    v_next_scheduled_at := p_completion_date + INTERVAL '365 days';
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

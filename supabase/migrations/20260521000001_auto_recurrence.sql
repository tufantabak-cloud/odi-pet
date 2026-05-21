-- =============================================
-- AUTO RECURRENCE TRIGGER
-- Automatically schedules the next task occurrence
-- when a recurring task (status = 'done') is completed.
-- =============================================

CREATE OR REPLACE FUNCTION public.auto_generate_next_schedule_occurrence()
RETURNS TRIGGER AS $$
DECLARE
  v_plan RECORD;
  v_latest_schedule RECORD;
  v_next_date DATE;
  v_existing_count INTEGER;
BEGIN
  -- If plan_id is NULL, do nothing
  IF NEW.plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the plan
  SELECT * INTO v_plan FROM public.health_plans WHERE id = NEW.plan_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- If frequency is once, do nothing
  IF v_plan.frequency = 'once' THEN
    RETURN NEW;
  END IF;

  -- Check occurrences limit if end_condition is occurrences
  IF v_plan.end_condition = 'occurrences' AND v_plan.end_occurrences IS NOT NULL THEN
    SELECT count(*) INTO v_existing_count FROM public.health_schedules WHERE plan_id = NEW.plan_id;
    IF v_existing_count >= v_plan.end_occurrences THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Find the latest schedule's due_date for this plan
  SELECT * INTO v_latest_schedule 
  FROM public.health_schedules 
  WHERE plan_id = NEW.plan_id 
  ORDER BY due_date DESC 
  LIMIT 1;

  -- If no latest schedule found (shouldn't happen), use NEW.due_date
  IF v_latest_schedule.due_date IS NULL THEN
    v_latest_schedule.due_date := NEW.due_date;
  END IF;

  -- Calculate next date
  IF v_plan.frequency = 'daily' THEN
    v_next_date := (v_latest_schedule.due_date + (COALESCE(v_plan.interval, 1) || ' day')::interval)::date;
  ELSIF v_plan.frequency = 'weekly' THEN
    v_next_date := (v_latest_schedule.due_date + (COALESCE(v_plan.interval, 1) * 7 || ' day')::interval)::date;
  ELSIF v_plan.frequency = 'monthly' THEN
    v_next_date := (v_latest_schedule.due_date + (COALESCE(v_plan.interval, 1) || ' month')::interval)::date;
  ELSIF v_plan.frequency = 'yearly' THEN
    v_next_date := (v_latest_schedule.due_date + (COALESCE(v_plan.interval, 1) || ' year')::interval)::date;
  ELSE
    RETURN NEW;
  END IF;

  -- Check date limit if end_condition is date
  IF v_plan.end_condition = 'date' AND v_plan.end_date IS NOT NULL THEN
    IF v_next_date > v_plan.end_date THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Insert the new occurrence
  INSERT INTO public.health_schedules (
    pet_id,
    plan_type,
    vaccine_id,
    title,
    due_date,
    due_time,
    status,
    plan_id,
    category,
    sub_category,
    notification_rule,
    notes,
    metadata,
    assigned_by,
    assigned_to,
    assignment_status,
    source
  ) VALUES (
    NEW.pet_id,
    NEW.plan_type,
    NEW.vaccine_id,
    NEW.title,
    v_next_date,
    NEW.due_time,
    'upcoming',
    NEW.plan_id,
    NEW.category,
    NEW.sub_category,
    NEW.notification_rule,
    NEW.notes,
    NEW.metadata,
    NEW.assigned_by,
    NEW.assigned_to,
    'unassigned',
    'auto_recurrence'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_generate_next_schedule ON public.health_schedules;

-- Create trigger
CREATE TRIGGER trigger_auto_generate_next_schedule
  AFTER UPDATE ON public.health_schedules
  FOR EACH ROW
  WHEN (NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done' AND NEW.plan_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_generate_next_schedule_occurrence();

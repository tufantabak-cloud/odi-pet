-- Migration: Unify Notification Engine
-- Description: Implement DB-level multi-fire jobs, idempotency, and trigger sync.

-- 0. SAFETY: Pause dispatch cron during migration
DO $$
BEGIN
  PERFORM cron.alter_job(jobid, active := false)
  FROM cron.job
  WHERE jobname = 'dispatch-vaccine-notifications';
  RAISE NOTICE 'dispatch-vaccine-notifications cron PAUSED for migration';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron pause skipped (local env or job not found): %', SQLERRM;
END;
$$;

-- 1. Modify notification_jobs
ALTER TABLE public.notification_jobs
ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'general_reminder';

-- Remove duplicates before adding unique constraint (just in case)
DELETE FROM public.notification_jobs a USING public.notification_jobs b
WHERE a.id > b.id AND a.plan_id = b.plan_id AND a.job_type = b.job_type;

ALTER TABLE public.notification_jobs
DROP CONSTRAINT IF EXISTS unique_plan_job_type;

ALTER TABLE public.notification_jobs
ADD CONSTRAINT unique_plan_job_type UNIQUE (plan_id, job_type);

-- 2. Modify notifications for In-App idempotency
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS notification_job_id UUID REFERENCES public.notification_jobs(id) ON DELETE CASCADE;

ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS unique_notification_job;

-- Only enforce unique constraint for non-null job_ids
CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique_job_id
ON public.notifications (notification_job_id)
WHERE notification_job_id IS NOT NULL;

-- 3. Overdue Idempotency Upgrade
DROP INDEX IF EXISTS notifications_one_vaccine_overdue_per_plan;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_one_plan_overdue_per_plan 
ON public.notifications (plan_id, type) 
WHERE plan_id IS NOT NULL AND type = 'plan_overdue';


-- 4. Create Trigger for multi-fire plan sync
CREATE OR REPLACE FUNCTION public.sync_plan_notification_jobs()
RETURNS TRIGGER AS $$
DECLARE
  v_fire_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- If status is completed or cancelled, delete ALL pending jobs
  IF NEW.status IN ('completed', 'cancelled') THEN
    DELETE FROM public.notification_jobs
    WHERE plan_id = NEW.id AND sent = false;
    RETURN NEW;
  END IF;

  -- On update, delete unsent jobs to recreate them with new settings
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.notification_jobs
    WHERE plan_id = NEW.id AND sent = false;
  END IF;

  -- Multi-fire for vaccines
  IF NEW.category = 'asi' THEN
    -- T-14
    v_fire_at := NEW.scheduled_at - INTERVAL '14 days';
    IF v_fire_at > NOW() THEN
      INSERT INTO public.notification_jobs (plan_id, fire_at, job_type) VALUES (NEW.id, v_fire_at, 'vaccine_t_minus_14') ON CONFLICT DO NOTHING;
    END IF;

    -- T-7
    v_fire_at := NEW.scheduled_at - INTERVAL '7 days';
    IF v_fire_at > NOW() THEN
      INSERT INTO public.notification_jobs (plan_id, fire_at, job_type) VALUES (NEW.id, v_fire_at, 'vaccine_t_minus_7') ON CONFLICT DO NOTHING;
    END IF;

    -- T-2
    v_fire_at := NEW.scheduled_at - INTERVAL '2 days';
    IF v_fire_at > NOW() THEN
      INSERT INTO public.notification_jobs (plan_id, fire_at, job_type) VALUES (NEW.id, v_fire_at, 'vaccine_t_minus_2') ON CONFLICT DO NOTHING;
    END IF;

    -- T0
    v_fire_at := NEW.scheduled_at;
    IF v_fire_at > NOW() THEN
      INSERT INTO public.notification_jobs (plan_id, fire_at, job_type) VALUES (NEW.id, v_fire_at, 'vaccine_t_0') ON CONFLICT DO NOTHING;
    END IF;

    -- T+1
    v_fire_at := NEW.scheduled_at + INTERVAL '1 day';
    IF v_fire_at > NOW() THEN
      INSERT INTO public.notification_jobs (plan_id, fire_at, job_type) VALUES (NEW.id, v_fire_at, 'vaccine_t_plus_1') ON CONFLICT DO NOTHING;
    END IF;
  
  ELSE
    -- General plans: Single job
    IF NEW.notif_before IS NOT NULL AND NEW.notif_unit IS NOT NULL THEN
      IF NEW.notif_unit = 'minute' THEN
        v_fire_at := NEW.scheduled_at - (NEW.notif_before || ' minutes')::interval;
      ELSIF NEW.notif_unit = 'hour' THEN
        v_fire_at := NEW.scheduled_at - (NEW.notif_before || ' hours')::interval;
      ELSIF NEW.notif_unit = 'day' THEN
        v_fire_at := NEW.scheduled_at - (NEW.notif_before || ' days')::interval;
      END IF;

      IF v_fire_at > NOW() THEN
        INSERT INTO public.notification_jobs (plan_id, fire_at, job_type) VALUES (NEW.id, v_fire_at, 'general_reminder') ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_plan_notification_jobs ON public.plans;
CREATE TRIGGER trg_sync_plan_notification_jobs
AFTER INSERT OR UPDATE OF scheduled_at, status, notif_before, notif_unit, category
ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.sync_plan_notification_jobs();

-- 5. Update claim_notification_jobs to include job_type
DROP FUNCTION IF EXISTS public.claim_notification_jobs(INT);
CREATE OR REPLACE FUNCTION public.claim_notification_jobs(p_limit INT DEFAULT 50)
RETURNS TABLE (
  job_id UUID,
  plan_id UUID,
  fire_at TIMESTAMPTZ,
  job_type TEXT,
  user_id UUID,
  pet_id UUID,
  category TEXT,
  sub_type TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT 
      nj.id AS c_job_id,
      nj.plan_id AS c_plan_id,
      nj.fire_at AS c_fire_at,
      nj.job_type AS c_job_type,
      pl.user_id AS c_user_id,
      pl.pet_id AS c_pet_id,
      pl.category AS c_category,
      pl.sub_type AS c_sub_type,
      pl.scheduled_at AS c_scheduled_at,
      pl.status AS c_status
    FROM public.notification_jobs nj
    JOIN public.plans pl ON pl.id = nj.plan_id
    WHERE nj.sent = false
      AND nj.fire_at <= NOW()
      AND (nj.locked_until IS NULL OR nj.locked_until < NOW())
      AND pl.status = 'active'
    FOR UPDATE OF nj SKIP LOCKED
    LIMIT p_limit
  ),
  updated AS (
    UPDATE public.notification_jobs nj
    SET locked_until = NOW() + INTERVAL '2 minutes',
        updated_at = NOW()
    FROM claimed c
    WHERE nj.id = c.c_job_id
    RETURNING nj.id
  )
  SELECT 
    c.c_job_id AS job_id,
    c.c_plan_id AS plan_id,
    c.c_fire_at AS fire_at,
    c.c_job_type AS job_type,
    c.c_user_id AS user_id,
    c.c_pet_id AS pet_id,
    c.c_category AS category,
    c.c_sub_type AS sub_type,
    c.c_scheduled_at AS scheduled_at,
    c.c_status AS status
  FROM claimed c
  JOIN updated u ON u.id = c.c_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_notification_jobs(INT) TO authenticated, service_role;

-- 6. Data Backfill
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Delete all unsent jobs to start fresh with new rules
  DELETE FROM public.notification_jobs WHERE sent = false;

  FOR rec IN
    SELECT id
    FROM public.plans
    WHERE status = 'active' AND scheduled_at > NOW() - INTERVAL '30 days'
  LOOP
    -- Dummy update fires the trigger and recreates jobs correctly
    UPDATE public.plans SET scheduled_at = scheduled_at WHERE id = rec.id;
  END LOOP;
END;
$$;

-- 7. Type Constraint Update
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('vaccine_reminder', 'vaccine_overdue', 'plan_overdue', 'general', 'estrus_forecast_upcoming', 'estrus_cycle_review'));

-- 8. Legacy Cleanup
DROP FUNCTION IF EXISTS public.generate_schedule_notifications();

DELETE FROM public.notifications 
WHERE notification_job_id IS NULL 
  AND type = 'vaccine_reminder' 
  AND is_read = false 
  AND sent_push = false;

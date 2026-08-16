-- =============================================
-- PLAN PUSH REMINDER & DUAL DOMAIN NOTIFICATIONS FIX
-- Description: Adds sent_push column to notifications, locked_until to notification_jobs,
-- atomic claim_notification_jobs RPC, and fixes generate_schedule_notifications
-- =============================================

-- 1. Add sent_push column to notifications table for decoupling email and push delivery states
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
          AND column_name = 'sent_push'
    ) THEN
        ALTER TABLE public.notifications ADD COLUMN sent_push BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Add locked_until column to notification_jobs for atomic lock/claim concurrency control
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'notification_jobs'
          AND column_name = 'locked_until'
    ) THEN
        ALTER TABLE public.notification_jobs ADD COLUMN locked_until TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- 3. Create atomic claim RPC for notification_jobs using FOR UPDATE SKIP LOCKED
CREATE OR REPLACE FUNCTION public.claim_notification_jobs(p_limit INT DEFAULT 50)
RETURNS TABLE (
  job_id UUID,
  plan_id UUID,
  fire_at TIMESTAMPTZ,
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

-- Grant execution to authenticated & service_role
GRANT EXECUTE ON FUNCTION public.claim_notification_jobs(INT) TO authenticated, service_role;

-- 4. Fix generate_schedule_notifications RPC (rec.scheduled_at fix & idempotency)
CREATE OR REPLACE FUNCTION public.generate_schedule_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec         RECORD;
  notif_count INTEGER := 0;
  title_text  TEXT;
  msg_text    TEXT;
  due_ts      TIMESTAMP;
  notify_ts   TIMESTAMP;
  now_ist     TIMESTAMP;
  category_tr TEXT;
BEGIN
  -- Get current time in Istanbul timezone
  now_ist := NOW() AT TIME ZONE 'Europe/Istanbul';

  FOR rec IN
    SELECT 
      pl.id          AS plan_id, 
      pl.pet_id, 
      COALESCE(pl.sub_type, pl.category) AS title, 
      pl.category, 
      pl.scheduled_at, 
      COALESCE(pl.notif_before, 0) AS notif_before,
      COALESCE(pl.notif_unit, 'minute') AS notif_unit,
      u.id           AS profile_id, 
      p.name         AS pet_name
    FROM public.plans pl
    JOIN public.profiles u ON u.id = pl.user_id
    JOIN public.pets p ON p.id = pl.pet_id
    WHERE pl.scheduled_at IS NOT NULL
      AND pl.status = 'active'
  LOOP
    -- Calculate due timestamp (convert TIMESTAMPTZ to Istanbul local timestamp for string formatting)
    due_ts := rec.scheduled_at AT TIME ZONE 'Europe/Istanbul';
    
    -- Calculate notify timestamp dynamically based on notif_before and notif_unit
    IF rec.notif_unit = 'hour' THEN
      notify_ts := due_ts - (rec.notif_before || ' hours')::interval;
    ELSIF rec.notif_unit = 'day' THEN
      notify_ts := due_ts - (rec.notif_before || ' days')::interval;
    ELSE
      notify_ts := due_ts - (rec.notif_before || ' minutes')::interval;
    END IF;
    
    category_tr := CASE rec.category
      WHEN 'Saglik' THEN 'Sağlık'
      WHEN 'Medikal' THEN 'Aşı'
      WHEN 'Bakım' THEN 'Bakım'
      WHEN 'Beslenme' THEN 'Beslenme'
      WHEN 'Hijyen' THEN 'Hijyen'
      WHEN 'Aktiviteler' THEN 'Aktivite'
      WHEN 'Veteriner' THEN 'Veteriner'
      ELSE 'Genel'
    END;

    IF due_ts < now_ist THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.profile_id = rec.profile_id
          AND n.pet_id = rec.pet_id
          AND n.title ILIKE '%' || LEFT(rec.title, 20) || '%'
          AND n.title ILIKE '%Gecikmiş%'
          AND n.created_at > NOW() - INTERVAL '48 hours'
      ) THEN
        title_text := rec.pet_name || ' - Gecikmiş Görev: ' || rec.title || ' ⚠️';
        msg_text   := rec.title || ' (' || category_tr || ') görevinin zamanı geçmiş. Lütfen tamamlandığında onaylayın.';
        
        INSERT INTO public.notifications (profile_id, type, title, message, pet_id)
        VALUES (rec.profile_id, 'general', title_text, msg_text, rec.pet_id);
        
        notif_count := notif_count + 1;
        
        -- Mark plan as overdue in DB
        UPDATE public.plans
        SET status = 'overdue'
        WHERE id = rec.plan_id;
      END IF;

    ELSIF now_ist >= notify_ts THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.profile_id = rec.profile_id
          AND n.pet_id = rec.pet_id
          AND n.title ILIKE '%' || LEFT(rec.title, 20) || '%'
          AND n.title ILIKE '%Hatırlatması%'
          AND n.created_at > NOW() - INTERVAL '48 hours'
      ) THEN
        title_text := rec.pet_name || ' - ' || category_tr || ' Hatırlatması ⏰';
        msg_text   := rec.title || ' görevinin zamanı yaklaşıyor. Planlanan zaman: ' || to_char(due_ts, 'DD.MM.YYYY HH24:MI') || '.';
        
        INSERT INTO public.notifications (profile_id, type, title, message, pet_id)
        VALUES (rec.profile_id, 'general', title_text, msg_text, rec.pet_id);
        
        notif_count := notif_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN notif_count;
END;
$$;

-- =============================================
-- PLAN TASKS NOTIFICATIONS FIX (v2)
-- Updates generate_schedule_notifications to scan `plans` table using correct schema
-- =============================================

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

  -- ==========================================
  -- 1. LEGACY: health_schedules Table Loop
  -- ==========================================
  FOR rec IN
    SELECT
      hs.id          AS schedule_id,
      hs.pet_id,
      hs.title,
      hs.category,
      hs.sub_category,
      hs.due_date,
      hs.due_time,
      hs.status,
      hs.notification_rule,
      po.profile_id,
      p.name         AS pet_name
    FROM public.health_schedules hs
    JOIN public.pet_owners po ON po.pet_id = hs.pet_id
    JOIN public.pets p ON p.id = hs.pet_id
    WHERE hs.status IN ('upcoming', 'overdue')
      AND hs.due_date IS NOT NULL
      AND COALESCE((hs.notification_rule->>'enabled')::boolean, false) = true
  LOOP
    due_ts := (rec.due_date + COALESCE(rec.due_time, '12:00:00'::time));
    notify_ts := due_ts - (COALESCE((rec.notification_rule->>'minutes_before')::integer, 0) || ' minutes')::interval;

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
        
        IF rec.status = 'upcoming' THEN
          UPDATE public.health_schedules
          SET status = 'overdue'
          WHERE id = rec.schedule_id;
        END IF;
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

  -- ==========================================
  -- 2. NEW: plans Table Loop
  -- ==========================================
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
    JOIN public.users u ON u.id = pl.user_id
    JOIN public.pets p ON p.id = pl.pet_id
    WHERE pl.scheduled_at IS NOT NULL
      AND pl.status = 'active'
  LOOP
    -- Calculate due timestamp
    due_ts := pl.scheduled_at AT TIME ZONE 'Europe/Istanbul';
    
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

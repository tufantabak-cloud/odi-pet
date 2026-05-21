-- =============================================
-- SMART TASKS NOTIFICATIONS
-- Add generate_schedule_notifications function to notify on general tasks
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
    -- Calculate due timestamp (local timestamp in Istanbul)
    due_ts := (rec.due_date + COALESCE(rec.due_time, '12:00:00'::time));
    
    -- Calculate notify timestamp (due_ts minus minutes_before)
    notify_ts := due_ts - (COALESCE((rec.notification_rule->>'minutes_before')::integer, 0) || ' minutes')::interval;

    -- Translate category for user-friendly notifications
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

    -- 1. OVERDUE NOTIFICATION
    -- If due time has passed and status is not done, check if we should notify
    IF due_ts < now_ist THEN
      -- Don't duplicate: no notification in last 48h for this pet + title + overdue keyword
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
        
        -- Update the schedule status to 'overdue' if not already
        IF rec.status = 'upcoming' THEN
          UPDATE public.health_schedules
          SET status = 'overdue'
          WHERE id = rec.schedule_id;
        END IF;
      END IF;

    -- 2. UPCOMING REMINDER NOTIFICATION
    -- If current time has reached/passed the notify_ts, but not yet due_ts
    ELSIF now_ist >= notify_ts THEN
      -- Don't duplicate: no notification in last 48h for this pet + title + reminder keyword
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

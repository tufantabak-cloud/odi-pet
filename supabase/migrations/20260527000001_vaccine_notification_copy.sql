-- =============================================
-- VACCINE NOTIFICATION COPY UPDATE
-- Updates generate_schedule_notifications() to use Odi.Pet
-- premium-silent tone for vaccine reminders.
-- Changes:
--   1. Removes emoji from notification titles
--   2. Uses brief-approved copy: "Tamamladıysan işaretle." / "Takvime göz at."
--   3. Separates vaccine notification types: vaccine_reminder / vaccine_overdue
--   4. Keeps non-vaccine (Bakım, Beslenme, etc.) notifications unchanged
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
  notif_type  TEXT;
  due_ts      TIMESTAMP;
  notify_ts   TIMESTAMP;
  now_ist     TIMESTAMP;
  category_tr TEXT;
  is_vaccine  BOOLEAN;
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

    -- Determine if this is a vaccine/medical task
    is_vaccine := (rec.category = 'Medikal');

    -- Translate category for user-friendly notifications (non-vaccine only)
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
    -- If due time has passed and status is not done
    IF due_ts < now_ist THEN
      -- Don't duplicate: no notification in last 48h for this schedule
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.profile_id = rec.profile_id
          AND n.pet_id = rec.pet_id
          AND n.title ILIKE '%' || LEFT(rec.title, 20) || '%'
          AND (n.type = 'vaccine_overdue' OR n.title ILIKE '%Gecikmiş%' OR n.title ILIKE '%bugün%')
          AND n.created_at > NOW() - INTERVAL '48 hours'
      ) THEN
        IF is_vaccine THEN
          -- Premium-silent vaccine copy (Brief approved)
          title_text := rec.pet_name || '''nın ' || rec.title || ' aşısı bugün';
          msg_text   := 'Tamamladıysan işaretle.';
          notif_type := 'vaccine_overdue';
        ELSE
          -- Non-vaccine tasks keep descriptive format (no emoji)
          title_text := rec.pet_name || ' - Gecikmiş Görev: ' || rec.title;
          msg_text   := rec.title || ' (' || category_tr || ') görevinin zamanı geçmiş. Tamamladığında işaretle.';
          notif_type := 'general';
        END IF;
        
        INSERT INTO public.notifications (profile_id, type, title, message, pet_id)
        VALUES (rec.profile_id, notif_type, title_text, msg_text, rec.pet_id);
        
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
      -- Don't duplicate: no notification in last 48h for this schedule
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.profile_id = rec.profile_id
          AND n.pet_id = rec.pet_id
          AND n.title ILIKE '%' || LEFT(rec.title, 20) || '%'
          AND (n.type = 'vaccine_reminder' OR n.title ILIKE '%Hatırlatması%' OR n.title ILIKE '%yaklaştı%')
          AND n.created_at > NOW() - INTERVAL '48 hours'
      ) THEN
        IF is_vaccine THEN
          -- Premium-silent vaccine copy (Brief approved)
          title_text := rec.pet_name || '''nın ' || rec.title || ' uygulaması yaklaştı';
          msg_text   := 'Takvime göz at.';
          notif_type := 'vaccine_reminder';
        ELSE
          -- Non-vaccine tasks keep descriptive format (no emoji)
          title_text := rec.pet_name || ' - ' || category_tr || ' Hatırlatması';
          msg_text   := rec.title || ' görevinin zamanı yaklaşıyor. Planlanan: ' || to_char(due_ts, 'DD.MM.YYYY HH24:MI') || '.';
          notif_type := 'general';
        END IF;
        
        INSERT INTO public.notifications (profile_id, type, title, message, pet_id)
        VALUES (rec.profile_id, notif_type, title_text, msg_text, rec.pet_id);
        
        notif_count := notif_count + 1;
      END IF;
    END IF;

  END LOOP;

  RETURN notif_count;
END;
$$;

-- =============================================
-- ODI.PET NOTIFICATION SYSTEM
-- =============================================

-- 1. notifications table (already queried in the app)
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'vaccine_reminder'
                CHECK (type IN ('vaccine_reminder','vaccine_overdue','general')),
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  pet_id      UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  is_read     BOOLEAN DEFAULT FALSE,
  sent_email  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON public.notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON public.notifications(is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage own notifications" ON public.notifications;
CREATE POLICY "Owners manage own notifications" ON public.notifications
  FOR ALL USING (profile_id = auth.uid());

-- 2. push_subscriptions table: Web Push (VAPID)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,
  p256dh        TEXT NOT NULL,
  auth_key      TEXT NOT NULL,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Owners manage own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (profile_id = auth.uid());

-- Service role can read all push subscriptions for sending
DROP POLICY IF EXISTS "Service role reads push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role reads push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.role() = 'service_role');

-- 3. Function: Generate in-app notifications for upcoming/overdue vaccines
-- Called by Edge Function cron job
CREATE OR REPLACE FUNCTION public.generate_vaccine_notifications()
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
BEGIN
  -- Find upcoming (3 days) and overdue vaccine records
  FOR rec IN
    SELECT
      vr.id          AS record_id,
      vr.pet_id,
      vr.vaccine_name,
      vr.due_at,
      vr.status,
      po.profile_id,
      p.name         AS pet_name
    FROM public.vaccine_records_v2 vr
    JOIN public.pet_owners po ON po.pet_id = vr.pet_id
    JOIN public.pets p ON p.id = vr.pet_id
    WHERE vr.status IN ('due', 'overdue', 'scheduled')
      AND vr.due_at IS NOT NULL
      AND (
        -- Upcoming in 1-3 days
        (vr.due_at::date BETWEEN CURRENT_DATE + INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '3 days')
        OR
        -- Overdue (past due)
        (vr.due_at::date < CURRENT_DATE AND vr.status IN ('due', 'overdue'))
      )
      -- Don't duplicate: no notification sent in last 48h for same pet+vaccine
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.profile_id = po.profile_id
          AND n.pet_id = vr.pet_id
          AND n.title ILIKE '%' || LEFT(vr.vaccine_name, 20) || '%'
          AND n.created_at > NOW() - INTERVAL '48 hours'
      )
  LOOP
    IF rec.due_at::date < CURRENT_DATE THEN
      notif_type := 'vaccine_overdue';
      title_text := rec.pet_name || ' - Gecikmiş Aşı ⚠️';
      msg_text   := rec.vaccine_name || ' aşısı '
                    || (CURRENT_DATE - rec.due_at::date)::text
                    || ' gündür gecikmiş. Veterinerinizi arayın.';
    ELSE
      notif_type := 'vaccine_reminder';
      title_text := rec.pet_name || ' - Aşı Hatırlatması 💉';
      msg_text   := rec.vaccine_name || ' için '
                    || (rec.due_at::date - CURRENT_DATE)::text
                    || ' gün kaldı.';
    END IF;

    INSERT INTO public.notifications (profile_id, type, title, message, pet_id)
    VALUES (rec.profile_id, notif_type, title_text, msg_text, rec.pet_id);

    notif_count := notif_count + 1;
  END LOOP;

  RETURN notif_count;
END;
$$;

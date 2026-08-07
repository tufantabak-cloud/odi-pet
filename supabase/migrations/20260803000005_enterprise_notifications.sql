-- ====================================================================
-- Odi.Pet Production-Grade Enterprise Web Push Migration v3.2
-- ====================================================================

-- 1. push_subscriptions tablosunu çoklu cihaz ve lifecycle kolonları ile genişlet
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS device_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS browser TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS app_version TEXT DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Unique Index: Tek cihazda aynı endpoint tekrar etmesin
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subs_profile_device 
  ON public.push_subscriptions (profile_id, device_id);

CREATE INDEX IF NOT EXISTS idx_push_subs_profile_active 
  ON public.push_subscriptions (profile_id, is_active);

-- 2. notification_preferences tablosu (Kullanıcı bildirim tercihleri)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  vaccines BOOLEAN DEFAULT true,
  parasite BOOLEAN DEFAULT true,
  nutrition BOOLEAN DEFAULT true,
  care BOOLEAN DEFAULT true,
  system BOOLEAN DEFAULT true,
  promotions BOOLEAN DEFAULT false,
  quiet_hours_override_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Owners manage own notification preferences" ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Service role manages notification preferences" ON public.notification_preferences;
CREATE POLICY "Service role manages notification preferences" ON public.notification_preferences
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. notification_delivery_logs tablosu (Gözlemlenebilirlik ve Analitik)
CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  device_id UUID,
  event_type TEXT NOT NULL, -- queued, send_attempted, send_success, send_failed, clicked, dismissed, permission_granted, permission_denied, subscription_created, subscription_removed, resubscribe_success, resubscribe_failed
  error_code TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read own delivery logs" ON public.notification_delivery_logs;
CREATE POLICY "Owners read own delivery logs" ON public.notification_delivery_logs
  FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Service role manages delivery logs" ON public.notification_delivery_logs;
CREATE POLICY "Service role manages delivery logs" ON public.notification_delivery_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notif_logs_profile_event 
  ON public.notification_delivery_logs (profile_id, event_type, created_at);

-- 4. 90 gündür pasif cihaz aboneliklerini temizleme / pasife alma prosedürü
CREATE OR REPLACE FUNCTION public.cleanup_stale_push_subscriptions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_rows INT;
BEGIN
  UPDATE public.push_subscriptions
  SET is_active = false
  WHERE last_seen_at < now() - INTERVAL '90 days'
    AND is_active = true;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$;

-- =============================================
-- HABIT LOOP ENGINE MIGRATION
-- =============================================

CREATE TABLE IF NOT EXISTS public.notifications_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast daily queries
CREATE INDEX IF NOT EXISTS idx_notifications_profile_sent_at 
ON public.notifications_log(profile_id, sent_at);

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage their notifications" ON public.notifications_log;
CREATE POLICY "Owners manage their notifications" ON public.notifications_log
  FOR ALL USING (profile_id = auth.uid());

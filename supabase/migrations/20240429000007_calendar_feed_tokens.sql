-- Calendar feed tokens (private ICS subscriptions)
CREATE TABLE IF NOT EXISTS public.calendar_feed_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL DEFAULT md5(random()::text || clock_timestamp()::text || gen_random_uuid()::text),
  scope TEXT NOT NULL DEFAULT 'assigned', -- 'assigned' | 'all' | 'critical_only'
  filters JSONB DEFAULT '{"vaccines":true,"nutrition":true,"grooming":true,"appointments":true,"critical":true}'::jsonb,
  days_ahead INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_fetched_at TIMESTAMPTZ,
  UNIQUE(profile_id)
);

ALTER TABLE public.calendar_feed_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own feed token" ON public.calendar_feed_tokens
  FOR ALL USING (profile_id = auth.uid());

-- Auto-create token on first use via upsert (handled in API)

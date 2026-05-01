-- Health Report tracking + share links
CREATE TABLE IF NOT EXISTS public.pet_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('summary','medical_timeline','travel_pack')),
  date_range TEXT DEFAULT 'last_12_months',
  share_token TEXT DEFAULT md5(random()::text || clock_timestamp()::text),
  share_expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  verification_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(share_token)
);

ALTER TABLE public.pet_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reports" ON public.pet_reports
  FOR ALL USING (profile_id = auth.uid());

-- Shared report is publicly readable via token (no auth)
CREATE POLICY "Public share token read" ON public.pet_reports
  FOR SELECT USING (share_expires_at > NOW());

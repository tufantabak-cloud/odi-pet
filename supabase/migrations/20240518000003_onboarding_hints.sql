CREATE TABLE IF NOT EXISTS onboarding_hints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hint_key TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, hint_key)
);

ALTER TABLE onboarding_hints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hints"
  ON onboarding_hints FOR ALL
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

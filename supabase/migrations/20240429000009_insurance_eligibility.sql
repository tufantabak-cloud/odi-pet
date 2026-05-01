-- Insurance Eligibility Engine
CREATE TABLE IF NOT EXISTS public.insurance_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  insurance_score INTEGER NOT NULL,
  segment TEXT NOT NULL CHECK (segment IN ('HIGH_ELIGIBILITY','REVIEW_NEEDED','HIGH_RISK')),
  reasons JSONB NOT NULL DEFAULT '[]',
  hard_flags JSONB NOT NULL DEFAULT '[]',
  -- Insurance-ready underwriting fields
  preventive_compliance_score INTEGER,
  incident_count INTEGER DEFAULT 0,
  chronic_condition_count INTEGER DEFAULT 0,
  care_consistency_score INTEGER,
  household_reliability_score INTEGER,
  -- Lifecycle
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  next_review_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  UNIQUE(pet_id)
);

ALTER TABLE public.insurance_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own insurance profile" ON public.insurance_profiles
  FOR ALL USING (profile_id = auth.uid());

-- Also allow pet members to view (for family sharing)
CREATE POLICY "Pet members can view insurance profile" ON public.insurance_profiles
  FOR SELECT USING (public.user_is_pet_member(pet_id));

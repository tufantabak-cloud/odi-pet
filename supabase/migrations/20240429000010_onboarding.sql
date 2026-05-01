-- Onboarding & activation tracking
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  -- Checklist steps
  has_added_pet BOOLEAN DEFAULT false,
  has_added_vaccine BOOLEAN DEFAULT false,
  has_added_feeding_log BOOLEAN DEFAULT false,
  has_invited_member BOOLEAN DEFAULT false,
  has_generated_report BOOLEAN DEFAULT false,
  -- Wizard state
  wizard_completed BOOLEAN DEFAULT false,
  wizard_step INTEGER DEFAULT 0,
  -- Demo mode
  demo_mode BOOLEAN DEFAULT false,
  -- Rewards
  activation_points_awarded BOOLEAN DEFAULT false,
  -- Timestamps
  first_pet_at TIMESTAMPTZ,
  first_health_event_at TIMESTAMPTZ,
  first_report_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own onboarding" ON public.onboarding_progress
  FOR ALL USING (profile_id = auth.uid());

-- Auto-create onboarding row on profile creation
CREATE OR REPLACE FUNCTION public.on_profile_created_init_onboarding()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.onboarding_progress (profile_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_init_onboarding ON public.profiles;
CREATE TRIGGER on_profile_created_init_onboarding
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.on_profile_created_init_onboarding();

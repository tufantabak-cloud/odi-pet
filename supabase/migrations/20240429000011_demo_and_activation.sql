-- Add is_demo flag to pets table for demo isolation
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;

-- Activation metrics table for funnel instrumentation
CREATE TABLE IF NOT EXISTS public.activation_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  first_value_at TIMESTAMPTZ,
  used_demo BOOLEAN DEFAULT FALSE,
  completed_steps TEXT[] DEFAULT ARRAY[]::TEXT[],
  conversion_after_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activation_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own activation metrics" ON public.activation_metrics
  FOR ALL USING (profile_id = auth.uid());

-- Auto-create activation metrics row on profile creation (if not exist)
CREATE OR REPLACE FUNCTION public.init_activation_metrics()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.activation_metrics (profile_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_activation_metrics ON public.profiles;
CREATE TRIGGER trg_init_activation_metrics
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.init_activation_metrics();

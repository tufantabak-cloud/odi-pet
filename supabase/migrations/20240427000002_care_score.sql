-- =============================================
-- CARE SCORE 2.0 MIGRATION
-- =============================================

CREATE TABLE IF NOT EXISTS public.daily_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    score INTEGER NOT NULL DEFAULT 50, -- Base score starts at 50 to allow up/down movement
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_pet_date UNIQUE (pet_id, date)
);

ALTER TABLE public.daily_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage daily_scores" ON public.daily_scores;
CREATE POLICY "Owners manage daily_scores" ON public.daily_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = daily_scores.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );

-- Helper function to safely adjust score (caps between 0 and 100)
CREATE OR REPLACE FUNCTION public.adjust_care_score(p_pet_id UUID, p_delta INTEGER)
RETURNS void AS $$
DECLARE
  current_score INTEGER;
BEGIN
  -- Insert base 50 if today's record doesn't exist
  INSERT INTO public.daily_scores (pet_id, date, score)
  VALUES (p_pet_id, CURRENT_DATE, 50)
  ON CONFLICT (pet_id, date) DO NOTHING;

  -- Update score within 0-100 bounds
  UPDATE public.daily_scores
  SET score = GREATEST(0, LEAST(100, score + p_delta))
  WHERE pet_id = p_pet_id AND date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

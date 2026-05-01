-- =============================================
-- PREDICTIVE ENGINE MIGRATION
-- =============================================

CREATE TABLE IF NOT EXISTS public.predictive_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    reason_code TEXT NOT NULL,
    message TEXT NOT NULL,
    action TEXT NOT NULL,
    priority INTEGER NOT NULL,
    confidence NUMERIC(3,2) DEFAULT 0.85,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_predictive_insights_pet_created 
ON public.predictive_insights(pet_id, created_at DESC);

ALTER TABLE public.predictive_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage their predictive insights" ON public.predictive_insights;
CREATE POLICY "Owners manage their predictive insights" ON public.predictive_insights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = predictive_insights.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );

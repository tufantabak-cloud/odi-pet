-- =============================================
-- VET VERIFICATION MIGRATION
-- =============================================

CREATE TABLE IF NOT EXISTS public.vets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  clinic_name TEXT,
  license_no TEXT,
  verified BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.vet_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  risk_id UUID REFERENCES public.predictive_insights(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_risk_review UNIQUE(risk_id)
);

CREATE TABLE IF NOT EXISTS public.vet_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID REFERENCES public.predictive_insights(id) ON DELETE CASCADE,
  vet_id UUID REFERENCES public.vets(id) ON DELETE CASCADE,
  approved BOOLEAN DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_risk_verification UNIQUE(risk_id)
);

ALTER TABLE public.vets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_verifications ENABLE ROW LEVEL SECURITY;

-- Vets table can be read by anyone (for displaying name)
DROP POLICY IF EXISTS "Public can view vets" ON public.vets;
CREATE POLICY "Public can view vets" ON public.vets FOR SELECT USING (true);

-- Users can read/write their own reviews
DROP POLICY IF EXISTS "Owners manage their reviews" ON public.vet_reviews;
CREATE POLICY "Owners manage their reviews" ON public.vet_reviews
  FOR ALL USING (profile_id = auth.uid());

-- Users can read verifications linked to their risks
DROP POLICY IF EXISTS "Owners view their verifications" ON public.vet_verifications;
CREATE POLICY "Owners view their verifications" ON public.vet_verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.predictive_insights pi
      JOIN public.pet_owners po ON pi.pet_id = po.pet_id
      WHERE pi.id = vet_verifications.risk_id AND po.profile_id = auth.uid()
    )
  );

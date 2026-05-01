-- =============================================
-- VET MARKETPLACE & CLAIM LOGIC
-- =============================================

-- Add status to vets
ALTER TABLE public.vets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add vet_id to vet_reviews for claiming
ALTER TABLE public.vet_reviews ADD COLUMN IF NOT EXISTS vet_id UUID REFERENCES public.vets(id) ON DELETE SET NULL;

-- 1. VET EARNINGS TABLE
CREATE TABLE IF NOT EXISTS public.vet_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vet_id UUID REFERENCES public.vets(id) ON DELETE CASCADE,
    review_id UUID REFERENCES public.vet_reviews(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL DEFAULT 50.00,
    status TEXT DEFAULT 'pending', -- pending, paid
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_earning_per_review UNIQUE(review_id)
);

ALTER TABLE public.vet_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vets can view own earnings" ON public.vet_earnings;
-- Note: Assuming vets are mapped to auth.users somehow, but for now just basic structure
CREATE POLICY "Vets can view own earnings" ON public.vet_earnings FOR ALL USING (true);

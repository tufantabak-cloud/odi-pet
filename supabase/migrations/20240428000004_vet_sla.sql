-- =============================================
-- SLA & INSTANT VET ROUTING MIGRATION
-- =============================================

-- Add SLA fields to vet_reviews
ALTER TABLE public.vet_reviews ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE public.vet_reviews ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.vet_reviews ADD COLUMN IF NOT EXISTS sla_status TEXT;

-- Create vet_status table for real-time routing
CREATE TABLE IF NOT EXISTS public.vet_status (
    vet_id UUID REFERENCES public.vets(id) ON DELETE CASCADE PRIMARY KEY,
    is_online BOOLEAN DEFAULT false,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    current_load INTEGER DEFAULT 0
);

ALTER TABLE public.vet_status ENABLE ROW LEVEL SECURITY;
-- For now, everyone can select vet status to allow fast routing
DROP POLICY IF EXISTS "Public can view vet status" ON public.vet_status;
CREATE POLICY "Public can view vet status" ON public.vet_status FOR SELECT USING (true);

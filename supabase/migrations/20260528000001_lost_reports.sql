-- =============================================
-- LOST REPORTS (Kayıp Pet Modu)
-- =============================================

CREATE TABLE IF NOT EXISTS public.lost_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  last_seen_location TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  contact_phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'found')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lost_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can view lost reports (for SOS public links and public visibility)
CREATE POLICY "Anyone can view active lost reports" ON public.lost_reports
  FOR SELECT USING (status = 'active');

-- Owners can view their own lost reports (including 'found' ones)
CREATE POLICY "Owners can view their own lost reports" ON public.lost_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = pet_id AND pets.owner_id = auth.uid()
    )
  );

-- Only pet owners can insert lost reports
CREATE POLICY "Owners can insert lost reports" ON public.lost_reports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = pet_id AND pets.owner_id = auth.uid()
    )
  );

-- Only pet owners can update lost reports (e.g. to mark as found)
CREATE POLICY "Owners can update lost reports" ON public.lost_reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = pet_id AND pets.owner_id = auth.uid()
    )
  );

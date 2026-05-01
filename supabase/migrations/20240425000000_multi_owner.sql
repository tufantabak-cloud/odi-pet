-- =============================================
-- MULTI-OWNER SUPPORT
-- =============================================

CREATE TABLE IF NOT EXISTS public.pet_owners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pet_id, profile_id)
);

ALTER TABLE public.pet_owners ENABLE ROW LEVEL SECURITY;

-- Migration: Existing owner_id to pet_owners
INSERT INTO public.pet_owners (pet_id, profile_id, role)
SELECT id, owner_id, 'owner' FROM public.pets
ON CONFLICT (pet_id, profile_id) DO NOTHING;

-- Update RLS for Pets
DROP POLICY IF EXISTS "Owners can view their own pets" ON public.pets;
CREATE POLICY "Owners can view their own pets" ON public.pets 
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.pet_owners 
      WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can update their own pets" ON public.pets;
CREATE POLICY "Owners can update their own pets" ON public.pets 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners 
      WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid() AND pet_owners.role = 'owner'
    )
  );

-- Care Plans RLS update
DROP POLICY IF EXISTS "Owners manage care plans" ON public.care_plans;
CREATE POLICY "Owners manage care plans" ON public.care_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = care_plans.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );

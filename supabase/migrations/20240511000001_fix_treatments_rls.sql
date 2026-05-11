-- ==========================================
-- FIX: health_treatments RLS for Multi-Owner Support
-- ==========================================

DROP POLICY IF EXISTS "Owners can view their pet treatments" ON public.health_treatments;
DROP POLICY IF EXISTS "Owners can insert their pet treatments" ON public.health_treatments;
DROP POLICY IF EXISTS "Owners can update their pet treatments" ON public.health_treatments;
DROP POLICY IF EXISTS "Owners can delete their pet treatments" ON public.health_treatments;

-- New Policies using pet_owners table
CREATE POLICY "Owners can view their pet treatments" ON public.health_treatments 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = health_treatments.pet_id AND pet_owners.profile_id = auth.uid())
  );

CREATE POLICY "Owners can insert their pet treatments" ON public.health_treatments 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = pet_id AND pet_owners.profile_id = auth.uid())
  );

CREATE POLICY "Owners can update their pet treatments" ON public.health_treatments 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = pet_id AND pet_owners.profile_id = auth.uid())
  );

CREATE POLICY "Owners can delete their pet treatments" ON public.health_treatments 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = pet_id AND pet_owners.profile_id = auth.uid())
  );

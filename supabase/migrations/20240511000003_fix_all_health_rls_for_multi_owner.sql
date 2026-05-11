-- Fix RLS for all legacy health_ tables that might fail with Multi-Owner logic

-- 1. health_vaccines
DROP POLICY IF EXISTS "Owners can view their pet vaccines" ON public.health_vaccines;
DROP POLICY IF EXISTS "Owners can insert their pet vaccines" ON public.health_vaccines;
DROP POLICY IF EXISTS "Owners can update their pet vaccines" ON public.health_vaccines;
DROP POLICY IF EXISTS "Owners manage health_vaccines" ON public.health_vaccines;

CREATE POLICY "Owners manage health_vaccines" ON public.health_vaccines FOR ALL USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND (pets.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid())))
);

-- 2. health_diseases
DROP POLICY IF EXISTS "Owners can view their pet diseases" ON public.health_diseases;
DROP POLICY IF EXISTS "Owners can insert their pet diseases" ON public.health_diseases;
DROP POLICY IF EXISTS "Owners can update their pet diseases" ON public.health_diseases;
DROP POLICY IF EXISTS "Owners manage health_diseases" ON public.health_diseases;

CREATE POLICY "Owners manage health_diseases" ON public.health_diseases FOR ALL USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND (pets.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid())))
);

-- 3. health_allergies
DROP POLICY IF EXISTS "Owners can view their pet allergies" ON public.health_allergies;
DROP POLICY IF EXISTS "Owners can insert their pet allergies" ON public.health_allergies;
DROP POLICY IF EXISTS "Owners can update their pet allergies" ON public.health_allergies;
DROP POLICY IF EXISTS "Owners manage health_allergies" ON public.health_allergies;

CREATE POLICY "Owners manage health_allergies" ON public.health_allergies FOR ALL USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND (pets.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid())))
);

-- 4. health_medications
DROP POLICY IF EXISTS "Owners can view their pet medications" ON public.health_medications;
DROP POLICY IF EXISTS "Owners can insert their pet medications" ON public.health_medications;
DROP POLICY IF EXISTS "Owners can update their pet medications" ON public.health_medications;
DROP POLICY IF EXISTS "Owners manage health_medications" ON public.health_medications;

CREATE POLICY "Owners manage health_medications" ON public.health_medications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND (pets.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid())))
);

-- 5. health_reproduction
DROP POLICY IF EXISTS "Owners can view their pet reproduction" ON public.health_reproduction;
DROP POLICY IF EXISTS "Owners can insert their pet reproduction" ON public.health_reproduction;
DROP POLICY IF EXISTS "Owners can update their pet reproduction" ON public.health_reproduction;
DROP POLICY IF EXISTS "Owners manage health_reproduction" ON public.health_reproduction;

CREATE POLICY "Owners manage health_reproduction" ON public.health_reproduction FOR ALL USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND (pets.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid())))
);

-- 6. health_growth
DROP POLICY IF EXISTS "Owners can view their pet growth" ON public.health_growth;
DROP POLICY IF EXISTS "Owners can insert their pet growth" ON public.health_growth;
DROP POLICY IF EXISTS "Owners can update their pet growth" ON public.health_growth;
DROP POLICY IF EXISTS "Owners manage health_growth" ON public.health_growth;

CREATE POLICY "Owners manage health_growth" ON public.health_growth FOR ALL USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND (pets.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid())))
);

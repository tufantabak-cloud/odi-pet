-- Migration: drop_eligibility_write_rls
-- Description: Removes client INSERT and UPDATE policies for pet_breeding_eligibility to prevent manipulation.

DROP POLICY IF EXISTS "Pet owners can insert eligibility" ON public.pet_breeding_eligibility;
DROP POLICY IF EXISTS "Pet owners can update eligibility" ON public.pet_breeding_eligibility;

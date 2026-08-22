-- Migration: Upgrade public.weight_logs RLS policies to canonical can_view_pet & can_manage_pet_care
-- Fixes: "new row violates row-level security policy for table weight_logs"

DROP POLICY IF EXISTS "Owners manage weight logs" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_logs_select" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_logs_insert" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_logs_update" ON public.weight_logs;
DROP POLICY IF EXISTS "weight_logs_delete" ON public.weight_logs;

-- SELECT Policy: authenticated users with view access (pets.owner_id, pet_memberships, pet_owners)
CREATE POLICY "weight_logs_select"
  ON public.weight_logs
  FOR SELECT
  TO authenticated
  USING (
    public.can_view_pet(pet_id)
    OR EXISTS (SELECT 1 FROM public.pets WHERE pets.id = weight_logs.pet_id AND pets.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = weight_logs.pet_id AND pet_owners.profile_id = auth.uid())
  );

-- INSERT Policy: authenticated users with pet care management access
CREATE POLICY "weight_logs_insert"
  ON public.weight_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_pet_care(pet_id)
    OR EXISTS (SELECT 1 FROM public.pets WHERE pets.id = weight_logs.pet_id AND pets.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = weight_logs.pet_id AND pet_owners.profile_id = auth.uid())
  );

-- UPDATE Policy: authenticated users with pet care management access
CREATE POLICY "weight_logs_update"
  ON public.weight_logs
  FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_pet_care(pet_id)
    OR EXISTS (SELECT 1 FROM public.pets WHERE pets.id = weight_logs.pet_id AND pets.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = weight_logs.pet_id AND pet_owners.profile_id = auth.uid())
  )
  WITH CHECK (
    public.can_manage_pet_care(pet_id)
    OR EXISTS (SELECT 1 FROM public.pets WHERE pets.id = weight_logs.pet_id AND pets.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = weight_logs.pet_id AND pet_owners.profile_id = auth.uid())
  );

-- DELETE Policy: authenticated users with pet care management access
CREATE POLICY "weight_logs_delete"
  ON public.weight_logs
  FOR DELETE
  TO authenticated
  USING (
    public.can_manage_pet_care(pet_id)
    OR EXISTS (SELECT 1 FROM public.pets WHERE pets.id = weight_logs.pet_id AND pets.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pet_owners WHERE pet_owners.pet_id = weight_logs.pet_id AND pet_owners.profile_id = auth.uid())
  );

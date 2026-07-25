-- pet_clinic_access, pets SELECT politikasının içinde okunur. Tablo ayrıcalığı
-- veya RLS politikası eksik olduğunda, yetkili bir sahip dahi kendi pet kaydını
-- okurken "permission denied" alabilir. Bu migrasyon yalnızca gerekli erişimi
-- verir; mevcut kayıtları değiştirmez veya silmez.
ALTER TABLE public.pet_clinic_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pet_clinic_access_select_authorized"
  ON public.pet_clinic_access;
CREATE POLICY "pet_clinic_access_select_authorized"
  ON public.pet_clinic_access
  FOR SELECT
  TO authenticated
  USING (
    clinic_id = auth.uid()
    OR public.user_has_pet_access(pet_id)
  );

DROP POLICY IF EXISTS "pet_clinic_access_insert_owner"
  ON public.pet_clinic_access;
CREATE POLICY "pet_clinic_access_insert_owner"
  ON public.pet_clinic_access
  FOR INSERT
  TO authenticated
  WITH CHECK (
    granted_by = auth.uid()
    AND public.user_has_pet_access(pet_id)
  );

DROP POLICY IF EXISTS "pet_clinic_access_update_owner"
  ON public.pet_clinic_access;
CREATE POLICY "pet_clinic_access_update_owner"
  ON public.pet_clinic_access
  FOR UPDATE
  TO authenticated
  USING (public.user_has_pet_access(pet_id))
  WITH CHECK (public.user_has_pet_access(pet_id));

DROP POLICY IF EXISTS "pet_clinic_access_delete_owner"
  ON public.pet_clinic_access;
CREATE POLICY "pet_clinic_access_delete_owner"
  ON public.pet_clinic_access
  FOR DELETE
  TO authenticated
  USING (public.user_has_pet_access(pet_id));

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.pet_clinic_access
  TO authenticated;

REVOKE ALL
  ON TABLE public.pet_clinic_access
  FROM anon;

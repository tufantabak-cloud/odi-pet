-- FIX: Pets SELECT policy
-- API tarafında insert(...).select().single() akışının çalışması için
-- henüz pet_owners tablosuna kayıt atılmadan önce owner_id üzerinden erişim izni verir.

DROP POLICY IF EXISTS "Owners can view their own pets" ON public.pets;

CREATE POLICY "Owners can view their own pets" ON public.pets 
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM public.pet_owners 
      WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid()
    )
  );

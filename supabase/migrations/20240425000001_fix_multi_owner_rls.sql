-- =============================================
-- FIX: Multi-owner RLS düzeltme migration
-- Önceki migration'ın bozduğu politikaları onarır
-- =============================================

-- 1. PETS tablosu: Bozulan SELECT policy'yi onar
-- owner_id VEYA pet_owners tablosundan erişim sağla
DROP POLICY IF EXISTS "Owners can view their own pets" ON public.pets;
CREATE POLICY "Owners can view their own pets" ON public.pets
  FOR SELECT USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid()
    )
  );

-- 2. PETS tablosu: INSERT policy — owner_id eşleşmesi yeterli
DROP POLICY IF EXISTS "Owners can insert their own pets" ON public.pets;
CREATE POLICY "Owners can insert their own pets" ON public.pets
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- 3. PETS tablosu: UPDATE policy — owner_id VEYA pet_owners
DROP POLICY IF EXISTS "Owners can update their own pets" ON public.pets;
CREATE POLICY "Owners can update their own pets" ON public.pets
  FOR UPDATE USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid() AND pet_owners.role = 'owner'
    )
  );

-- 4. PET_OWNERS tablosu: RLS politikaları (önceki migration'da eksikti!)
DROP POLICY IF EXISTS "Anyone can view pet_owners of their pets" ON public.pet_owners;
CREATE POLICY "Anyone can view pet_owners of their pets" ON public.pet_owners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = pet_id AND pets.owner_id = auth.uid()
    )
    OR profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "Pet owners can insert pet_owners" ON public.pet_owners;
CREATE POLICY "Pet owners can insert pet_owners" ON public.pet_owners
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = pet_id AND pets.owner_id = auth.uid()
    )
    OR profile_id = auth.uid()
  );

DROP POLICY IF EXISTS "Pet owners can delete pet_owners" ON public.pet_owners;
CREATE POLICY "Pet owners can delete pet_owners" ON public.pet_owners
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = pet_id AND pets.owner_id = auth.uid()
    )
  );

-- 5. CARE PLANS tablosu: owner_id fallback ekle
DROP POLICY IF EXISTS "Owners manage care plans" ON public.care_plans;
CREATE POLICY "Owners manage care plans" ON public.care_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = care_plans.pet_id
        AND (
          pets.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.pet_owners
            WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid()
          )
        )
    )
  );

-- 6. Eksik pet_owners kayıtlarını tekrar doldur (güvenli)
INSERT INTO public.pet_owners (pet_id, profile_id, role)
SELECT id, owner_id, 'owner'
FROM public.pets
WHERE owner_id IS NOT NULL
ON CONFLICT (pet_id, profile_id) DO NOTHING;

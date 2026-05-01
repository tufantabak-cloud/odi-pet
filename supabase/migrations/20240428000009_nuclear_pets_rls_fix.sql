-- =============================================
-- NUCLEAR FIX: Pets tablosundaki TÜM policy'leri sil ve temizden başla
-- =============================================

-- 1. TÜMÜNÜ SİL
DROP POLICY IF EXISTS "Owners can view their own pets" ON public.pets;
DROP POLICY IF EXISTS "Owners can insert their own pets" ON public.pets;
DROP POLICY IF EXISTS "Owners can update their own pets" ON public.pets;
DROP POLICY IF EXISTS "Owners can delete their own pets" ON public.pets;
DROP POLICY IF EXISTS "Clinic staff can view pets with appointments in their clinic" ON public.pets;

DROP POLICY IF EXISTS "Anyone can view pet_owners of their pets" ON public.pet_owners;
DROP POLICY IF EXISTS "Auth users can view pet_owners" ON public.pet_owners;
DROP POLICY IF EXISTS "Owners can insert pet_owners" ON public.pet_owners;
DROP POLICY IF EXISTS "Pet owners can delete pet_owners" ON public.pet_owners;

-- 2. SECURITY DEFINER fonksiyon (döngü kıran köprü)
CREATE OR REPLACE FUNCTION public.user_has_pet_access(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pet_owners
    WHERE pet_id = p_pet_id
      AND profile_id = auth.uid()
  );
$$;

-- 3. pets — TEK VE NET KURALLAR
-- INSERT: sadece owner olarak
CREATE POLICY "pets_insert_own" ON public.pets
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- SELECT: owner_id üzerinden (insert anı dahil) VEYA pet_owners üzerinden (fonksiyon)
CREATE POLICY "pets_select_own" ON public.pets
  FOR SELECT USING (
    auth.uid() = owner_id
    OR public.user_has_pet_access(id)
  );

-- UPDATE: owner_id kontrolü
CREATE POLICY "pets_update_own" ON public.pets
  FOR UPDATE USING (auth.uid() = owner_id OR public.user_has_pet_access(id));

-- DELETE: sadece owner_id
CREATE POLICY "pets_delete_own" ON public.pets
  FOR DELETE USING (auth.uid() = owner_id);

-- 4. pet_owners — döngüsüz basit kural
CREATE POLICY "pet_owners_select" ON public.pet_owners
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "pet_owners_insert" ON public.pet_owners
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "pet_owners_delete" ON public.pet_owners
  FOR DELETE USING (auth.uid() = profile_id);

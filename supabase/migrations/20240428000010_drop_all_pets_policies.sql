-- Dinamik olarak tüm mevcut policy'leri sil
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename IN ('pets', 'pet_owners')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- SECURITY DEFINER fonksiyon
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
CREATE POLICY "pets_insert_own" ON public.pets
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "pets_select_own" ON public.pets
  FOR SELECT USING (
    auth.uid() = owner_id
    OR public.user_has_pet_access(id)
  );

CREATE POLICY "pets_update_own" ON public.pets
  FOR UPDATE USING (auth.uid() = owner_id OR public.user_has_pet_access(id));

CREATE POLICY "pets_delete_own" ON public.pets
  FOR DELETE USING (auth.uid() = owner_id);

-- 4. pet_owners
CREATE POLICY "pet_owners_select" ON public.pet_owners
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "pet_owners_insert" ON public.pet_owners
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "pet_owners_delete" ON public.pet_owners
  FOR DELETE USING (auth.uid() = profile_id);

-- =============================================
-- KESİN ÇÖZÜM: Pets RLS Sonsuz Döngü Düzeltmesi (Final)
-- =============================================
-- Sorun: 20240428000007 dosyası owner_id OR EXISTS(...pet_owners) şeklinde
-- yeniden politika tanımladı, bu da pet_owners → pets → pet_owners döngüsüne yol açtı.
-- Çözüm: pet_owners SELECT yetkisini döngüsüz tut, pets'i SECURITY DEFINER fonksiyon ile kontrol et.

-- 1. Tüm eski pets ve pet_owners SELECT policy'lerini temizle
DROP POLICY IF EXISTS "Owners can view their own pets" ON public.pets;
DROP POLICY IF EXISTS "Anyone can view pet_owners of their pets" ON public.pet_owners;
DROP POLICY IF EXISTS "Auth users can view pet_owners" ON public.pet_owners;

-- 2. pet_owners: döngüsüz basit kural (authenticated herkes okur, içinde pets'e join yok)
CREATE POLICY "Auth users can view pet_owners" ON public.pet_owners
  FOR SELECT USING (auth.role() = 'authenticated');

-- 3. pets SELECT: SECURITY DEFINER fonksiyon ile döngüyü kır
CREATE OR REPLACE FUNCTION public.user_has_pet_access(p_pet_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pet_owners
    WHERE pet_owners.pet_id = p_pet_id
      AND pet_owners.profile_id = auth.uid()
  );
$$;

-- 4. pets SELECT policy: owner_id (insert anı) VEYA fonksiyon üzerinden erişim
CREATE POLICY "Owners can view their own pets" ON public.pets
  FOR SELECT USING (
    auth.uid() = owner_id
    OR public.user_has_pet_access(id)
  );

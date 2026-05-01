-- =============================================
-- KESİN ÇÖZÜM: Circular Dependency (Sonsuz Döngü) Düzeltmesi
-- =============================================

-- Sorunun kaynağı:
-- "pets" tablosu yetki için "pet_owners"a bakıyordu.
-- "pet_owners" tablosu yetki için "pets"e bakıyordu.
-- Bu durum veritabanında sonsuz döngü yaratıp sorguyu çökertiyordu (0 kayıt döner).

-- Çözüm: pet_owners tablosundaki döngü yaratan kuralı silip basitleştiriyoruz.

-- 1. pet_owners tablosundaki tüm eski SELECT kurallarını temizle
DROP POLICY IF EXISTS "Anyone can view pet_owners of their pets" ON public.pet_owners;
DROP POLICY IF EXISTS "Auth users can view pet_owners" ON public.pet_owners;

-- 2. Yeni ve döngüsüz kural: Giriş yapmış herkes pet_owners tablosunu okuyabilir
-- (Sadece id ve rol içerdiği için güvenlik açığı yaratmaz)
CREATE POLICY "Auth users can view pet_owners" ON public.pet_owners 
  FOR SELECT USING (auth.role() = 'authenticated');

-- 3. Pets tablosu için kuralı tekrar garantiye alalım (döngüsüz haliyle çalışacak)
DROP POLICY IF EXISTS "Owners can view their own pets" ON public.pets;
CREATE POLICY "Owners can view their own pets" ON public.pets
  FOR SELECT USING (
    auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.pet_owners 
      WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid()
    )
  );

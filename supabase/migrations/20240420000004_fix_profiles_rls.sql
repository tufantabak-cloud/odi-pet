-- pets tablosundaki döngüsel RLS policy'yi düzelt
-- Hatalı: "Clinic staff can view pets with appointments in their clinic"
-- Bu policy appointments → pets → appointments döngüsüne yol açıyor

DROP POLICY IF EXISTS "Clinic staff can view pets with appointments in their clinic" ON public.pets;

-- GÜVENLI versiyon: appointments yerine clinic_memberships tablosu üzerinden kontrol
-- Kullanıcının herhangi bir kliniğe üyesi ise o klinikteki tüm petleri görebilir
CREATE POLICY "Clinic staff can view pets in their clinic"
  ON public.pets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      INNER JOIN public.clinic_memberships cm
        ON a.clinic_id = cm.clinic_id
      WHERE a.pet_id = pets.id
        AND cm.profile_id = auth.uid()
    )
  );

-- Profiles tablosuna eksik INSERT/UPDATE policy ekle (foreign key hatası için)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE policyname = 'Users can insert their own profile' AND tablename = 'profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id)';
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE policyname = 'Users can update their own profile' AND tablename = 'profiles'
  ) THEN
    EXECUTE 'CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id)';
  END IF;
END $$;

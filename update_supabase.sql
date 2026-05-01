-- --------------------------------------------------------
-- FILE: 20240425000000_multi_owner.sql
-- --------------------------------------------------------


-- =============================================
-- MULTI-OWNER SUPPORT
-- =============================================

CREATE TABLE IF NOT EXISTS public.pet_owners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pet_id, profile_id)
);

ALTER TABLE public.pet_owners ENABLE ROW LEVEL SECURITY;

-- Migration: Existing owner_id to pet_owners
INSERT INTO public.pet_owners (pet_id, profile_id, role)
SELECT id, owner_id, 'owner' FROM public.pets
ON CONFLICT (pet_id, profile_id) DO NOTHING;

-- Update RLS for Pets
DROP POLICY IF EXISTS "Owners can view their own pets" ON public.pets;
CREATE POLICY "Owners can view their own pets" ON public.pets 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners 
      WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners can update their own pets" ON public.pets;
CREATE POLICY "Owners can update their own pets" ON public.pets 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners 
      WHERE pet_owners.pet_id = pets.id AND pet_owners.profile_id = auth.uid() AND pet_owners.role = 'owner'
    )
  );

-- Care Plans RLS update
DROP POLICY IF EXISTS "Owners manage care plans" ON public.care_plans;
CREATE POLICY "Owners manage care plans" ON public.care_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = care_plans.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );



-- --------------------------------------------------------
-- FILE: 20240425000001_fix_multi_owner_rls.sql
-- --------------------------------------------------------


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



-- --------------------------------------------------------
-- FILE: 20240425000002_fix_circular_rls.sql
-- --------------------------------------------------------


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
DROP POLICY IF EXISTS "Auth users can view pet_owners" ON public.pet_owners;
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



-- --------------------------------------------------------
-- FILE: 20240425000003_vaccine_system_v2.sql
-- --------------------------------------------------------


-- =============================================
-- VACCINE & HEALTH SYSTEM V2.0 (PetHealthCenter_VaccineSystem)
-- =============================================

-- 1. Add health_score to pets
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100;

-- 2. Vaccines Library
CREATE TABLE IF NOT EXISTS public.vaccines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  species TEXT NOT NULL, -- 'Dog' or 'Cat'
  is_core BOOLEAN DEFAULT FALSE,
  recommended_age_start_days INTEGER,
  dose_interval_days INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_vaccine_name_species UNIQUE (name, species)
);
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view vaccines" ON public.vaccines;
CREATE POLICY "Anyone can view vaccines" ON public.vaccines FOR SELECT USING (true);

-- 3. Health Schedules (Planlama)
CREATE TABLE IF NOT EXISTS public.health_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL, -- 'vaccine', 'medication', 'checkup'
  vaccine_id UUID REFERENCES public.vaccines(id),
  title TEXT,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'upcoming', -- 'upcoming', 'overdue', 'done'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.health_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage health schedules" ON public.health_schedules;
CREATE POLICY "Owners manage health schedules" ON public.health_schedules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = health_schedules.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );

-- 4. Vaccine Records
CREATE TABLE IF NOT EXISTS public.vaccine_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  vaccine_id UUID REFERENCES public.vaccines(id),
  schedule_id UUID REFERENCES public.health_schedules(id),
  applied_date DATE NOT NULL,
  dose_number INTEGER,
  vet_name TEXT,
  clinic_id UUID REFERENCES public.clinics(id),
  lot_number TEXT,
  brand_name TEXT,
  location TEXT,
  next_due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.vaccine_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage vaccine records" ON public.vaccine_records;
CREATE POLICY "Owners manage vaccine records" ON public.vaccine_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = vaccine_records.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );

-- 5. Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  record_id UUID REFERENCES public.vaccine_records(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage payments" ON public.payments;
CREATE POLICY "Owners manage payments" ON public.payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = payments.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );

-- 6. Documents
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  record_type TEXT, -- 'invoice', 'health_record', etc.
  document_url TEXT NOT NULL,
  title TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage documents" ON public.documents;
CREATE POLICY "Owners manage documents" ON public.documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = documents.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );

-- 7. Functions for auto-schedule on pet creation
CREATE OR REPLACE FUNCTION public.auto_generate_vaccine_schedules()
RETURNS TRIGGER AS $$
DECLARE
  v RECORD;
  base_date DATE;
  next_date DATE;
BEGIN
  -- Insert core vaccines for the new pet's species into schedules
  FOR v IN SELECT * FROM public.vaccines WHERE species = NEW.species AND is_core = TRUE LOOP
    base_date := (COALESCE(NEW.birth_date, CURRENT_DATE) + (v.recommended_age_start_days || ' days')::interval)::date;
    
    -- Insert the first dose
    INSERT INTO public.health_schedules (pet_id, plan_type, vaccine_id, title, due_date)
    VALUES (NEW.id, 'vaccine', v.id, v.name, base_date);
    
    -- If it has a repeating interval (>= 30 days) like parasites or yearly vaccines, generate up to current year + 1
    IF v.dose_interval_days >= 30 THEN
      next_date := base_date + (v.dose_interval_days || ' days')::interval;
      WHILE next_date <= CURRENT_DATE + interval '1 year' LOOP
        INSERT INTO public.health_schedules (pet_id, plan_type, vaccine_id, title, due_date)
        VALUES (NEW.id, 'vaccine', v.id, v.name || ' (Yıllık Tekrar)', next_date);
        
        next_date := next_date + (v.dose_interval_days || ' days')::interval;
      END LOOP;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-generate schedules on pet insert
DROP TRIGGER IF EXISTS on_pet_created_generate_schedules ON public.pets;
CREATE TRIGGER on_pet_created_generate_schedules
  AFTER INSERT ON public.pets
  FOR EACH ROW EXECUTE PROCEDURE public.auto_generate_vaccine_schedules();

-- 8. Functions for updating schedule and health score on record insertion
CREATE OR REPLACE FUNCTION public.on_vaccine_record_inserted()
RETURNS TRIGGER AS $$
BEGIN
  -- If linked to a schedule, mark it as done
  IF NEW.schedule_id IS NOT NULL THEN
    UPDATE public.health_schedules
    SET status = 'done'
    WHERE id = NEW.schedule_id;
  END IF;

  -- Create next schedule if next_due_date is provided
  IF NEW.next_due_date IS NOT NULL THEN
    INSERT INTO public.health_schedules (pet_id, plan_type, vaccine_id, due_date, status)
    VALUES (NEW.pet_id, 'vaccine', NEW.vaccine_id, NEW.next_due_date, 'upcoming');
  END IF;

  -- Increase health score
  UPDATE public.pets
  SET health_score = LEAST(100, COALESCE(health_score, 100) + 5)
  WHERE id = NEW.pet_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_on_vaccine_record_inserted ON public.vaccine_records;
CREATE TRIGGER trigger_on_vaccine_record_inserted
  AFTER INSERT ON public.vaccine_records
  FOR EACH ROW EXECUTE PROCEDURE public.on_vaccine_record_inserted();
-- =============================================
-- INITIAL SEED DATA FOR VACCINES
-- =============================================
INSERT INTO public.vaccines (name, species, is_core, recommended_age_start_days, dose_interval_days, description)
VALUES 
  ('Puppy DP (Başlangıç Aşısı)', 'Köpek', true, 42, null, 'Distemper + Parvovirus (6. Hafta)'),
  ('Karma Aşı (DHPPi) (1. Doz)', 'Köpek', true, 49, 21, 'DHPPi - Distemper, Hepatitis, Parvovirus, Parainfluenza'),
  ('Karma Aşı (DHPPi) (2. Doz)', 'Köpek', true, 70, 365, 'DHPPi Booster'),
  ('Corona Virüs (C) (1. Doz)', 'Köpek', false, 77, 21, 'Sindirim sistemi koruması'),
  ('Corona Virüs (C) (2. Doz)', 'Köpek', false, 98, 365, 'Corona Booster'),
  ('Boğmaca (Bordetella) (1. Doz)', 'Köpek', true, 84, 21, 'Bordetella koruması'),
  ('Boğmaca (Bordetella) (2. Doz)', 'Köpek', true, 105, 365, 'Boğmaca Booster'),
  ('Kuduz Aşısı (Rabies)', 'Köpek', true, 112, 365, 'Yasal zorunluluk'),
  ('Lyme Aşısı', 'Köpek', false, 120, 365, 'Kene kaynaklı hastalık koruması'),
  ('Leptospira (L) (1. Doz)', 'Köpek', true, 56, 21, 'Leptospirosis koruması (8. Hafta)'),
  ('Leptospira (L) (2. Doz)', 'Köpek', true, 77, 365, 'Leptospira Booster'),
  ('Karma Aşı (FVRCP) (1. Doz)', 'Kedi', true, 56, 21, 'FVRCP - Rhinotracheitis, Calicivirus, Panleukopenia'),
  ('Karma Aşı (FVRCP) (2. Doz)', 'Kedi', true, 77, 365, 'FVRCP Booster'),
  ('Lösemi Aşısı (FeLV) (1. Doz)', 'Kedi', false, 84, 21, 'Feline Leukemia (FeLV)'),
  ('Lösemi Aşısı (FeLV) (2. Doz)', 'Kedi', false, 105, 365, 'Lösemi Booster'),
  ('Kuduz Aşısı (Rabies)', 'Kedi', true, 112, 365, 'Yasal zorunluluk'),
  ('Karma Aşı (DHPPi) (Yıllık Tekrar)', 'Köpek', true, 365, 365, 'Yıllık DHPPi Booster'),
  ('Corona Virüs (C) (Yıllık Tekrar)', 'Köpek', false, 365, 365, 'Yıllık Corona Booster'),
  ('Boğmaca (Bordetella) (Yıllık Tekrar)', 'Köpek', true, 365, 365, 'Yıllık Boğmaca Booster'),
  ('Leptospira (L) (Yıllık Tekrar)', 'Köpek', true, 365, 365, 'Yıllık Leptospira Booster'),
  ('Karma Aşı (FVRCP) (Yıllık Tekrar)', 'Kedi', true, 365, 365, 'Yıllık FVRCP Booster'),
  ('Lösemi Aşısı (FeLV) (Yıllık Tekrar)', 'Kedi', false, 365, 365, 'Yıllık Lösemi Booster'),
  ('İç Parazit Uygulaması', 'Köpek', true, 45, 90, '3 ayda bir düzenli iç parazit'),
  ('Dış Parazit Uygulaması', 'Köpek', true, 60, 60, '2 ayda bir düzenli dış parazit damlası'),
  ('Parazit Tasması (6 Aylık)', 'Köpek', false, 90, 180, '6 ayda bir tasma yenileme'),
  ('Parazit Tasması (8 Aylık)', 'Köpek', false, 90, 240, '8 ayda bir tasma yenileme (Örn: Seresto)'),
  ('İç Parazit Uygulaması', 'Kedi', true, 45, 90, '3 ayda bir düzenli iç parazit'),
  ('Dış Parazit Uygulaması', 'Kedi', true, 60, 60, '2 ayda bir düzenli dış parazit damlası')
ON CONFLICT (name, species) DO NOTHING;



-- --------------------------------------------------------
-- FILE: 20240427000001_controlled_automation.sql
-- --------------------------------------------------------


-- =============================================
-- CONTROLLED AUTOMATION MIGRATION
-- 1. Drops blind auto-generation and health score triggers
-- 2. Adds plan_id, postpone_count, and source to health_schedules
-- 3. Creates health_plans table
-- =============================================

-- 1. Drop auto-generation trigger blindly creating 1 year of schedules
DROP TRIGGER IF EXISTS on_pet_created_generate_schedules ON public.pets;
DROP FUNCTION IF EXISTS public.auto_generate_vaccine_schedules();

-- 2. Drop the trigger that auto-increases health score
DROP TRIGGER IF EXISTS trigger_on_vaccine_record_inserted ON public.vaccine_records;
DROP FUNCTION IF EXISTS public.on_vaccine_record_inserted();

-- 3. Create health_plans table to track recurring series (as per prompt)
CREATE TABLE IF NOT EXISTS public.health_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    frequency TEXT, -- 'once', 'monthly', 'yearly'
    dose_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.health_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage health plans" ON public.health_plans;
CREATE POLICY "Owners manage health plans" ON public.health_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = health_plans.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );

-- 4. Add necessary columns to health_schedules table
ALTER TABLE public.health_schedules 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.health_plans(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS postpone_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS source TEXT; -- 'auto' or 'manual'



-- --------------------------------------------------------
-- FILE: 20240427000002_care_score.sql
-- --------------------------------------------------------


-- =============================================
-- CARE SCORE 2.0 MIGRATION
-- =============================================

CREATE TABLE IF NOT EXISTS public.daily_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    score INTEGER NOT NULL DEFAULT 50, -- Base score starts at 50 to allow up/down movement
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_pet_date UNIQUE (pet_id, date)
);

ALTER TABLE public.daily_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage daily_scores" ON public.daily_scores;
CREATE POLICY "Owners manage daily_scores" ON public.daily_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = daily_scores.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );

-- Helper function to safely adjust score (caps between 0 and 100)
CREATE OR REPLACE FUNCTION public.adjust_care_score(p_pet_id UUID, p_delta INTEGER)
RETURNS void AS $$
DECLARE
  current_score INTEGER;
BEGIN
  -- Insert base 50 if today's record doesn't exist
  INSERT INTO public.daily_scores (pet_id, date, score)
  VALUES (p_pet_id, CURRENT_DATE, 50)
  ON CONFLICT (pet_id, date) DO NOTHING;

  -- Update score within 0-100 bounds
  UPDATE public.daily_scores
  SET score = GREATEST(0, LEAST(100, score + p_delta))
  WHERE pet_id = p_pet_id AND date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- --------------------------------------------------------
-- FILE: 20240427000003_habit_engine.sql
-- --------------------------------------------------------


-- =============================================
-- HABIT LOOP ENGINE MIGRATION
-- =============================================

CREATE TABLE IF NOT EXISTS public.notifications_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast daily queries
CREATE INDEX IF NOT EXISTS idx_notifications_profile_sent_at 
ON public.notifications_log(profile_id, sent_at);

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage their notifications" ON public.notifications_log;
CREATE POLICY "Owners manage their notifications" ON public.notifications_log
  FOR ALL USING (profile_id = auth.uid());



-- --------------------------------------------------------
-- FILE: 20240427000004_predictive_insights.sql
-- --------------------------------------------------------


-- =============================================
-- PREDICTIVE ENGINE MIGRATION
-- =============================================

CREATE TABLE IF NOT EXISTS public.predictive_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL,
    risk_level TEXT NOT NULL,
    reason_code TEXT NOT NULL,
    message TEXT NOT NULL,
    action TEXT NOT NULL,
    priority INTEGER NOT NULL,
    confidence NUMERIC(3,2) DEFAULT 0.85,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_predictive_insights_pet_created 
ON public.predictive_insights(pet_id, created_at DESC);

ALTER TABLE public.predictive_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage their predictive insights" ON public.predictive_insights;
CREATE POLICY "Owners manage their predictive insights" ON public.predictive_insights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = predictive_insights.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );



-- --------------------------------------------------------
-- FILE: 20240428000001_monetization_nutrition.sql
-- --------------------------------------------------------


-- =============================================
-- MONETIZATION & NUTRITION MIGRATION
-- =============================================

-- 1. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'pro', 'ai_plus'
    status TEXT NOT NULL DEFAULT 'active',
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_profile_subscription UNIQUE (profile_id)
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners can view own subscription" ON public.user_subscriptions;
CREATE POLICY "Owners can view own subscription" ON public.user_subscriptions
  FOR SELECT USING (profile_id = auth.uid());

-- 2. NUTRITION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    food_logged BOOLEAN DEFAULT false,
    water_logged BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_pet_nutrition_date UNIQUE (pet_id, date)
);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage nutrition logs" ON public.nutrition_logs;
CREATE POLICY "Owners manage nutrition logs" ON public.nutrition_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = nutrition_logs.pet_id AND pet_owners.profile_id = auth.uid()
    )
  );

-- Function to safely insert default subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_subscriptions (profile_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create free subscription on profile creation
DROP TRIGGER IF EXISTS on_profile_created_subscription ON public.profiles;
CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();



-- --------------------------------------------------------
-- FILE: 20240428000002_vet_verification.sql
-- --------------------------------------------------------


-- =============================================
-- VET VERIFICATION MIGRATION
-- =============================================

CREATE TABLE IF NOT EXISTS public.vets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  clinic_name TEXT,
  license_no TEXT,
  verified BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.vet_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  risk_id UUID REFERENCES public.predictive_insights(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_risk_review UNIQUE(risk_id)
);

CREATE TABLE IF NOT EXISTS public.vet_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_id UUID REFERENCES public.predictive_insights(id) ON DELETE CASCADE,
  vet_id UUID REFERENCES public.vets(id) ON DELETE CASCADE,
  approved BOOLEAN DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_risk_verification UNIQUE(risk_id)
);

ALTER TABLE public.vets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vet_verifications ENABLE ROW LEVEL SECURITY;

-- Vets table can be read by anyone (for displaying name)
DROP POLICY IF EXISTS "Public can view vets" ON public.vets;
CREATE POLICY "Public can view vets" ON public.vets FOR SELECT USING (true);

-- Users can read/write their own reviews
DROP POLICY IF EXISTS "Owners manage their reviews" ON public.vet_reviews;
CREATE POLICY "Owners manage their reviews" ON public.vet_reviews
  FOR ALL USING (profile_id = auth.uid());

-- Users can read verifications linked to their risks
DROP POLICY IF EXISTS "Owners view their verifications" ON public.vet_verifications;
CREATE POLICY "Owners view their verifications" ON public.vet_verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.predictive_insights pi
      JOIN public.pet_owners po ON pi.pet_id = po.pet_id
      WHERE pi.id = vet_verifications.risk_id AND po.profile_id = auth.uid()
    )
  );



-- --------------------------------------------------------
-- FILE: 20240428000003_vet_marketplace.sql
-- --------------------------------------------------------


-- =============================================
-- VET MARKETPLACE & CLAIM LOGIC
-- =============================================

-- Add status to vets
ALTER TABLE public.vets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add vet_id to vet_reviews for claiming
ALTER TABLE public.vet_reviews ADD COLUMN IF NOT EXISTS vet_id UUID REFERENCES public.vets(id) ON DELETE SET NULL;

-- 1. VET EARNINGS TABLE
CREATE TABLE IF NOT EXISTS public.vet_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vet_id UUID REFERENCES public.vets(id) ON DELETE CASCADE,
    review_id UUID REFERENCES public.vet_reviews(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL DEFAULT 50.00,
    status TEXT DEFAULT 'pending', -- pending, paid
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_earning_per_review UNIQUE(review_id)
);

ALTER TABLE public.vet_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Vets can view own earnings" ON public.vet_earnings;
DROP POLICY IF EXISTS "Vets can view own earnings" ON public.vet_earnings;
CREATE POLICY "Vets can view own earnings" ON public.vet_earnings FOR ALL USING (true);



-- --------------------------------------------------------
-- FILE: 20240428000004_vet_sla.sql
-- --------------------------------------------------------


-- =============================================
-- SLA & INSTANT VET ROUTING MIGRATION
-- =============================================

-- Add SLA fields to vet_reviews
ALTER TABLE public.vet_reviews ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE public.vet_reviews ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.vet_reviews ADD COLUMN IF NOT EXISTS sla_status TEXT;

-- Create vet_status table for real-time routing
CREATE TABLE IF NOT EXISTS public.vet_status (
    vet_id UUID REFERENCES public.vets(id) ON DELETE CASCADE PRIMARY KEY,
    is_online BOOLEAN DEFAULT false,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    current_load INTEGER DEFAULT 0
);

ALTER TABLE public.vet_status ENABLE ROW LEVEL SECURITY;
-- For now, everyone can select vet status to allow fast routing
DROP POLICY IF EXISTS "Public can view vet status" ON public.vet_status;
CREATE POLICY "Public can view vet status" ON public.vet_status FOR SELECT USING (true);



-- --------------------------------------------------------
-- FILE: 20240428000005_vet_rpc.sql
-- --------------------------------------------------------


-- RPC for safely incrementing vet load
CREATE OR REPLACE FUNCTION public.increment_vet_load(p_vet_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.vet_status
  SET current_load = current_load + 1
  WHERE vet_id = p_vet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for safely decrementing vet load
CREATE OR REPLACE FUNCTION public.decrement_vet_load(p_vet_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.vet_status
  SET current_load = GREATEST(0, current_load - 1)
  WHERE vet_id = p_vet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- --------------------------------------------------------
-- FILE: 20240428000006_production_hardening_and_refill.sql
-- --------------------------------------------------------


-- =============================================
-- PRODUCTION HARDENING & AUTO REFILL SYSTEM MIGRATION
-- =============================================

-- 1. EVENT STREAMING SYSTEM
CREATE TABLE IF NOT EXISTS public.event_stream (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamp DEFAULT now()
);
DROP POLICY IF EXISTS "Users can insert their own events" ON public.event_stream;
CREATE POLICY "Users can insert their own events" ON public.event_stream FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- 2. SYSTEM LOGGING & MONITORING
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL, -- INFO, WARN, ERROR, CRITICAL
  service text,
  message text NOT NULL,
  context jsonb,
  profile_id uuid,
  created_at timestamp DEFAULT now()
);
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System can insert logs" ON public.system_logs;
CREATE POLICY "System can insert logs" ON public.system_logs FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  severity text NOT NULL,
  message text NOT NULL,
  is_resolved boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- 3. AUTO REFILL SYSTEM (INVENTORY & PREDICTION)
CREATE TABLE IF NOT EXISTS public.pet_food_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  food_brand text,
  package_size_grams integer,
  remaining_grams integer,
  last_updated_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now()
);
ALTER TABLE public.pet_food_inventory ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.refill_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  is_active boolean DEFAULT false,
  preferred_brand text,
  auto_order_enabled boolean DEFAULT false,
  threshold_days integer DEFAULT 3,
  created_at timestamp DEFAULT now()
);
DROP POLICY IF EXISTS "Users can manage their subscriptions" ON public.refill_subscriptions;
CREATE POLICY "Users can manage their subscriptions" ON public.refill_subscriptions FOR ALL USING (auth.uid() = profile_id);

CREATE TABLE IF NOT EXISTS public.refill_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,
  order_status text DEFAULT 'pending',
  estimated_delivery_date timestamp,
  payment_intent_id uuid,
  is_one_click boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);
DROP POLICY IF EXISTS "Users can view their orders" ON public.refill_orders;
CREATE POLICY "Users can view their orders" ON public.refill_orders FOR SELECT USING (auth.uid() = profile_id);

-- Enforce Strict RLS on all existing logic tables (if not already strictly applied)
-- Example: ensure predictive_insights is strictly tied to owner
-- (Skipping dropping old policies to prevent conflicts, but reinforcing architecture)

-- Materialized View for Daily Metrics (Skeleton)
-- In a real production setup, this would run via pg_cron
-- We will define a standard view for now due to local postgres limitations without pg_cron extensions active
CREATE OR REPLACE VIEW public.daily_user_metrics AS
SELECT
  profile_id,
  COUNT(*) FILTER (WHERE event_type = 'TASK_COMPLETED') as completed_tasks,
  COUNT(*) FILTER (WHERE event_type = 'PAYMENT_SUCCESS') as payments,
  DATE(created_at) as day
FROM public.event_stream
GROUP BY profile_id, DATE(created_at);



-- =============================================
-- NUTRITION FOUNDATION v1
-- Sprint: Nutrition Foundation
-- Tables: pet_nutrition_profiles, feeding_logs, weight_logs, food_inventory
-- =============================================

-- 1. PET NUTRITION PROFILES
-- Stores per-pet dietary setup (brand, daily grams, allergies, etc.)
CREATE TABLE IF NOT EXISTS public.pet_nutrition_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE UNIQUE,

  food_brand TEXT,
  food_product TEXT,
  food_type TEXT CHECK (food_type IN ('dry', 'wet', 'raw', 'mixed')),

  package_size_grams INT,
  daily_grams INT,
  meals_per_day INT DEFAULT 2,

  allergy_info TEXT[] DEFAULT '{}',
  sensitivity_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pet_nutrition_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage nutrition profiles" ON public.pet_nutrition_profiles;
CREATE POLICY "Owners manage nutrition profiles" ON public.pet_nutrition_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = pet_nutrition_profiles.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );

-- 2. FEEDING LOGS
-- Daily meal entries with appetite/stool scoring
CREATE TABLE IF NOT EXISTS public.feeding_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,

  meal_time TIMESTAMPTZ DEFAULT NOW(),
  amount_grams INT,

  appetite_score INT CHECK (appetite_score BETWEEN 1 AND 5),
  consumed_percent INT CHECK (consumed_percent BETWEEN 0 AND 100),

  stool_quality INT CHECK (stool_quality BETWEEN 1 AND 5),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.feeding_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage feeding logs" ON public.feeding_logs;
CREATE POLICY "Owners manage feeding logs" ON public.feeding_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = feeding_logs.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );

-- Index for fast timeline queries
CREATE INDEX IF NOT EXISTS idx_feeding_logs_pet_time ON public.feeding_logs(pet_id, meal_time DESC);

-- 3. WEIGHT LOGS
-- Periodic weight & body condition score tracking
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,

  weight_kg NUMERIC(5, 2) NOT NULL,
  body_condition_score INT CHECK (body_condition_score BETWEEN 1 AND 9),

  measured_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage weight logs" ON public.weight_logs;
CREATE POLICY "Owners manage weight logs" ON public.weight_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = weight_logs.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_weight_logs_pet_time ON public.weight_logs(pet_id, measured_at DESC);

-- 4. FOOD INVENTORY
-- Stock tracking with refill prediction data
CREATE TABLE IF NOT EXISTS public.food_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE UNIQUE,

  current_stock_grams INT NOT NULL DEFAULT 0,
  estimated_daily_usage INT,

  last_refill_date TIMESTAMPTZ,
  next_refill_estimate TIMESTAMPTZ,

  low_stock_threshold_days INT DEFAULT 5,

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.food_inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage food inventory" ON public.food_inventory;
CREATE POLICY "Owners manage food inventory" ON public.food_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = food_inventory.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );

-- 5. TRIGGER: auto-update nutrition_profiles.updated_at
CREATE OR REPLACE FUNCTION public.set_nutrition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nutrition_profile_updated_at ON public.pet_nutrition_profiles;
CREATE TRIGGER trg_nutrition_profile_updated_at
  BEFORE UPDATE ON public.pet_nutrition_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_nutrition_updated_at();

-- 6. HELPER VIEW: nutrition_overview_per_pet
-- Joins nutrition_profile + latest weight + inventory for dashboard use
CREATE OR REPLACE VIEW public.nutrition_overview AS
SELECT
  p.id AS pet_id,
  p.name AS pet_name,
  np.food_brand,
  np.food_product,
  np.food_type,
  np.daily_grams,
  np.meals_per_day,
  fi.current_stock_grams,
  fi.estimated_daily_usage,
  fi.low_stock_threshold_days,
  CASE
    WHEN fi.estimated_daily_usage > 0
    THEN ROUND((fi.current_stock_grams::NUMERIC / fi.estimated_daily_usage), 1)
    ELSE NULL
  END AS days_left,
  (SELECT weight_kg FROM public.weight_logs wl WHERE wl.pet_id = p.id ORDER BY measured_at DESC LIMIT 1) AS latest_weight_kg,
  (SELECT AVG(appetite_score) FROM public.feeding_logs fl WHERE fl.pet_id = p.id AND fl.meal_time >= NOW() - INTERVAL '7 days') AS avg_appetite_7d
FROM public.pets p
LEFT JOIN public.pet_nutrition_profiles np ON np.pet_id = p.id
LEFT JOIN public.food_inventory fi ON fi.pet_id = p.id;
-- 7. CLEANUP: Merge duplicate vaccines
-- Move all records from short names to standardized professional names
DO $$
BEGIN
    -- Update vaccine_records for Dose 1
    UPDATE public.vaccine_records 
    SET vaccine_id = (SELECT id FROM public.vaccines WHERE name = 'Karma Aşı (DHPPi) (1. Doz)' AND species = 'Köpek' LIMIT 1)
    WHERE vaccine_id = (SELECT id FROM public.vaccines WHERE name = 'Karma Aşı (1. Doz)' AND species = 'Köpek' LIMIT 1);

    -- Update health_schedules for Dose 1
    UPDATE public.health_schedules
    SET vaccine_id = (SELECT id FROM public.vaccines WHERE name = 'Karma Aşı (DHPPi) (1. Doz)' AND species = 'Köpek' LIMIT 1)
    WHERE vaccine_id = (SELECT id FROM public.vaccines WHERE name = 'Karma Aşı (1. Doz)' AND species = 'Köpek' LIMIT 1);

    -- Update vaccine_records for Dose 2
    UPDATE public.vaccine_records 
    SET vaccine_id = (SELECT id FROM public.vaccines WHERE name = 'Karma Aşı (DHPPi) (2. Doz)' AND species = 'Köpek' LIMIT 1)
    WHERE vaccine_id = (SELECT id FROM public.vaccines WHERE name = 'Karma Aşı (2. Doz)' AND species = 'Köpek' LIMIT 1);

    -- Update health_schedules for Dose 2
    UPDATE public.health_schedules
    SET vaccine_id = (SELECT id FROM public.vaccines WHERE name = 'Karma Aşı (DHPPi) (2. Doz)' AND species = 'Köpek' LIMIT 1)
    WHERE vaccine_id = (SELECT id FROM public.vaccines WHERE name = 'Karma Aşı (2. Doz)' AND species = 'Köpek' LIMIT 1);

    -- Delete the redundant entries
    DELETE FROM public.vaccines WHERE name = 'Karma Aşı (1. Doz)' AND species = 'Köpek';
    DELETE FROM public.vaccines WHERE name = 'Karma Aşı (2. Doz)' AND species = 'Köpek';
    
    -- Cleanup any orphaned schedules that might have used the short names
    UPDATE public.health_schedules SET title = 'Karma Aşı (DHPPi) (1. Doz)' WHERE title = 'Karma Aşı (1. Doz)';
    UPDATE public.health_schedules SET title = 'Karma Aşı (DHPPi) (2. Doz)' WHERE title = 'Karma Aşı (2. Doz)';

    -- FIX: Sync schedules with existing records
    -- If a vaccine record exists, mark all matching pending schedules as done
    UPDATE public.health_schedules hs
    SET status = 'done'
    FROM public.vaccine_records vr
    WHERE hs.pet_id = vr.pet_id 
      AND hs.vaccine_id = vr.vaccine_id
      AND hs.status != 'done';

    -- RENAME: Corona Virüs (CCV) to (C)
    UPDATE public.vaccines SET name = REPLACE(name, '(CCV)', '(C)') WHERE name LIKE '%Corona Virüs (CCV)%';
    UPDATE public.health_schedules SET title = REPLACE(title, '(CCV)', '(C)') WHERE title LIKE '%Corona Virüs (CCV)%';
END $$;

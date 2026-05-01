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
  ('Karma Aşı (1. Doz)', 'Köpek', true, 45, 21, 'DHPP - Distemper, Hepatitis, Parvovirus, Parainfluenza'),
  ('Karma Aşı (2. Doz)', 'Köpek', true, 66, 21, 'DHPP Booster'),
  ('Corona Virüs (1. Doz)', 'Köpek', false, 73, 21, 'Sindirim sistemi koruması'),
  ('Corona Virüs (2. Doz)', 'Köpek', false, 94, 21, 'Corona Booster'),
  ('Kuduz Aşısı', 'Köpek', true, 105, 365, 'Yasal zorunluluk (Rabies)'),
  ('Lyme Aşısı', 'Köpek', false, 120, 365, 'Kene kaynaklı hastalık koruması'),
  ('Karma Aşı (1. Doz)', 'Kedi', true, 56, 21, 'FVRCP - Rhinotracheitis, Calicivirus, Panleukopenia'),
  ('Karma Aşı (2. Doz)', 'Kedi', true, 77, 21, 'FVRCP Booster'),
  ('Lösemi Aşısı (1. Doz)', 'Kedi', false, 84, 21, 'Feline Leukemia (FeLV)'),
  ('Lösemi Aşısı (2. Doz)', 'Kedi', false, 105, 21, 'Lösemi Booster'),
  ('Kuduz Aşısı', 'Kedi', true, 112, 365, 'Yasal zorunluluk (Rabies)'),
  ('Karma Aşı (Yıllık Tekrar)', 'Köpek', true, 365, 365, 'Yıllık DHPP Booster'),
  ('Corona Virüs (Yıllık Tekrar)', 'Köpek', false, 365, 365, 'Yıllık Corona Booster'),
  ('Karma Aşı (Yıllık Tekrar)', 'Kedi', true, 365, 365, 'Yıllık FVRCP Booster'),
  ('Lösemi Aşısı (Yıllık Tekrar)', 'Kedi', false, 365, 365, 'Yıllık Lösemi Booster'),
  ('İç Parazit Uygulaması', 'Köpek', true, 45, 90, '3 ayda bir düzenli iç parazit'),
  ('Dış Parazit Uygulaması', 'Köpek', true, 60, 60, '2 ayda bir düzenli dış parazit damlası'),
  ('Parazit Tasması (6 Aylık)', 'Köpek', false, 90, 180, '6 ayda bir tasma yenileme'),
  ('Parazit Tasması (8 Aylık)', 'Köpek', false, 90, 240, '8 ayda bir tasma yenileme (Örn: Seresto)'),
  ('İç Parazit Uygulaması', 'Kedi', true, 45, 90, '3 ayda bir düzenli iç parazit'),
  ('Dış Parazit Uygulaması', 'Kedi', true, 60, 60, '2 ayda bir düzenli dış parazit damlası')
ON CONFLICT (name, species) DO NOTHING;

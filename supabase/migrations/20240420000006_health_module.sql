-- ==========================================
-- SPRINT 5: KAPSAMLI SAĞLIK MODÜLÜ TABLOLARI
-- ==========================================

-- 1. AŞI TAKVİMİ (Vaccine Tracking)
CREATE TABLE IF NOT EXISTS public.health_vaccines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  vaccine_type TEXT NOT NULL, -- Parazit, Rutin, Karma vb.
  brand TEXT,
  application_date DATE NOT NULL,
  next_date DATE,
  vet_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.health_vaccines ENABLE ROW LEVEL SECURITY;

-- 2. HASTALIK TAKİBİ (Disease Tracking)
CREATE TABLE IF NOT EXISTS public.health_diseases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  disease_name TEXT NOT NULL,
  diagnosis_date DATE,
  treatment TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.health_diseases ENABLE ROW LEVEL SECURITY;

-- 3. ALERJİ TAKİBİ (Allergy Tracking)
CREATE TABLE IF NOT EXISTS public.health_allergies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  trigger_name TEXT NOT NULL, -- Tetikleyici
  symptoms TEXT,
  treatment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.health_allergies ENABLE ROW LEVEL SECURITY;

-- 4. İLAÇ TAKİBİ (Medication Tracking)
CREATE TABLE IF NOT EXISTS public.health_medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dose TEXT,
  usage_duration TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.health_medications ENABLE ROW LEVEL SECURITY;

-- 5. ÜREME TAKİBİ (Reproduction Tracking)
CREATE TABLE IF NOT EXISTS public.health_reproduction (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  heat_start_date DATE,
  mating_date DATE,
  birth_date DATE,
  offspring_count INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.health_reproduction ENABLE ROW LEVEL SECURITY;

-- 6. GELİŞİM TAKİBİ (Growth Records)
CREATE TABLE IF NOT EXISTS public.health_growth (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,2),
  recorded_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.health_growth ENABLE ROW LEVEL SECURITY;


-- =====================================
-- RLS POLICIES (Row Level Security)
-- Sahipler kendi pet'lerinin verilerini yönetebilir
-- =====================================

-- Vaccines
CREATE POLICY "Owners can view their pet vaccines" ON public.health_vaccines FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can insert their pet vaccines" ON public.health_vaccines FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can update their pet vaccines" ON public.health_vaccines FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);

-- Diseases
CREATE POLICY "Owners can view their pet diseases" ON public.health_diseases FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can insert their pet diseases" ON public.health_diseases FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can update their pet diseases" ON public.health_diseases FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);

-- Allergies
CREATE POLICY "Owners can view their pet allergies" ON public.health_allergies FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can insert their pet allergies" ON public.health_allergies FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can update their pet allergies" ON public.health_allergies FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);

-- Medications
CREATE POLICY "Owners can view their pet medications" ON public.health_medications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can insert their pet medications" ON public.health_medications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can update their pet medications" ON public.health_medications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);

-- Reproduction
CREATE POLICY "Owners can view their pet reproduction" ON public.health_reproduction FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can insert their pet reproduction" ON public.health_reproduction FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can update their pet reproduction" ON public.health_reproduction FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);

-- Growth
CREATE POLICY "Owners can view their pet growth" ON public.health_growth FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can insert their pet growth" ON public.health_growth FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can update their pet growth" ON public.health_growth FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);

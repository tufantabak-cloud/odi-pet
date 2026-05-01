-- =============================================
-- SPRINT 3 — PETS TABLE EXTENSION
-- =============================================

-- Genişletilmiş Pet Profili
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS gender        TEXT CHECK (gender IN ('male', 'female', 'unknown')),
  ADD COLUMN IF NOT EXISTS color         TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url    TEXT,
  ADD COLUMN IF NOT EXISTS microchip_no  TEXT,
  ADD COLUMN IF NOT EXISTS passport_no   TEXT,
  ADD COLUMN IF NOT EXISTS tattoo_no     TEXT,
  ADD COLUMN IF NOT EXISTS pedigree_sire TEXT,
  ADD COLUMN IF NOT EXISTS pedigree_dam  TEXT,
  ADD COLUMN IF NOT EXISTS vet_name      TEXT,
  ADD COLUMN IF NOT EXISTS vet_phone     TEXT;

-- =============================================
-- BÜYÜME ANALİZİ
-- =============================================
CREATE TABLE IF NOT EXISTS public.growth_records (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id      UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  weight_kg   NUMERIC(5,2),
  height_cm   NUMERIC(5,1),
  recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.growth_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage growth records" ON public.growth_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = pet_id AND pets.owner_id = auth.uid()
    )
  );

-- =============================================
-- BESLENME PLANI
-- =============================================
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id         UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  meal_name      TEXT NOT NULL,
  portion_gr     INTEGER,
  times_per_day  INTEGER DEFAULT 2,
  food_stock_gr  INTEGER DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage nutrition plans" ON public.nutrition_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = pet_id AND pets.owner_id = auth.uid()
    )
  );

-- =============================================
-- SOSYAL PAYLAŞIMLAR (MVP Altyapı)
-- =============================================
CREATE TABLE IF NOT EXISTS public.social_posts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pet_id     UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  caption    TEXT,
  image_url  TEXT,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir, sadece sahip yazabilir
CREATE POLICY "Public can view posts" ON public.social_posts
  FOR SELECT USING (true);

CREATE POLICY "Owners manage their posts" ON public.social_posts
  FOR ALL USING (auth.uid() = owner_id);

-- =============================================
-- CARE EVENTS (Tamamlanan bakımların logu)
-- =============================================
CREATE TABLE IF NOT EXISTS public.care_events (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id       UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  care_plan_id UUID REFERENCES public.care_plans(id) ON DELETE SET NULL,
  event_type   TEXT NOT NULL, -- 'vaccine', 'grooming', 'nail_trim', 'bath', 'checkup'
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.care_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage care events" ON public.care_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pets
      WHERE pets.id = pet_id AND pets.owner_id = auth.uid()
    )
  );

-- Clinic staff da görebilir (klinik üyeliği varsa)
CREATE POLICY "Clinic staff can view care events" ON public.care_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.clinic_memberships cm ON a.clinic_id = cm.clinic_id
      WHERE a.pet_id = care_events.pet_id AND cm.profile_id = auth.uid()
    )
  );

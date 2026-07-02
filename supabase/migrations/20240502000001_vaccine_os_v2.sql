-- =============================================
-- VACCINE OS v2 — SUPABASE MIGRATION
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================

-- 1. vaccine_templates: Protocol master data
CREATE TABLE IF NOT EXISTS public.vaccine_templates (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL = System Default
  species           TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  vaccine_code      TEXT NOT NULL,
  vaccine_name      TEXT NOT NULL,
  mandatory_level   TEXT NOT NULL DEFAULT 'core'
                      CHECK (mandatory_level IN ('legal_required', 'core', 'optional')),
  protects_against  TEXT[] DEFAULT '{}',
  category          TEXT NOT NULL DEFAULT 'asi',
  dose_count        INTEGER NOT NULL DEFAULT 1,
  first_dose_week   INTEGER NOT NULL DEFAULT 6,
  dose_interval_days INTEGER NULL,
  has_annual_booster BOOLEAN DEFAULT true,
  recurrence_days   INTEGER NULL,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vaccine_templates_code_species_profile
  ON public.vaccine_templates(vaccine_code, species, COALESCE(profile_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 2. vaccine_records_v2: Actual administered/planned vaccines
CREATE TABLE IF NOT EXISTS public.vaccine_records_v2 (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id            UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  template_id       UUID REFERENCES public.vaccine_templates(id) ON DELETE SET NULL,
  vaccine_code      TEXT NOT NULL,
  vaccine_name      TEXT NOT NULL,
  dose_number       INTEGER NULL,
  status            TEXT NOT NULL DEFAULT 'scheduled'
                      CHECK (status IN ('scheduled','due','completed','overdue','invalid','skipped','needs_review')),
  administered_at   TIMESTAMPTZ NULL,
  due_at            TIMESTAMPTZ NULL,
  source            TEXT NOT NULL DEFAULT 'system_generated'
                      CHECK (source IN ('system_generated','user_quick_marked','user_detailed','imported_history','fresh_start_plan')),
  confidence_level  TEXT NOT NULL DEFAULT 'user_reported'
                      CHECK (confidence_level IN ('verified','user_reported','estimated')),
  notes             TEXT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaccine_records_v2_pet_id ON public.vaccine_records_v2(pet_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_records_v2_status  ON public.vaccine_records_v2(status);
CREATE INDEX IF NOT EXISTS idx_vaccine_records_v2_due_at  ON public.vaccine_records_v2(due_at);

-- 3. vaccine_setup_profiles: Track user setup mode per pet
CREATE TABLE IF NOT EXISTS public.vaccine_setup_profiles (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id      UUID NOT NULL UNIQUE REFERENCES public.pets(id) ON DELETE CASCADE,
  setup_mode  TEXT NOT NULL CHECK (setup_mode IN ('smart_start', 'historical_import', 'fresh_start')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.vaccine_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_records_v2     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_setup_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read vaccine templates" ON public.vaccine_templates;
CREATE POLICY "Users can read system or own templates" ON public.vaccine_templates
  FOR SELECT USING (profile_id IS NULL OR profile_id = auth.uid());

CREATE POLICY "Users can manage own templates" ON public.vaccine_templates
  FOR ALL USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Owners manage vaccine_records_v2" ON public.vaccine_records_v2;
CREATE POLICY "Owners manage vaccine_records_v2" ON public.vaccine_records_v2
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = vaccine_records_v2.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners manage vaccine_setup_profiles" ON public.vaccine_setup_profiles;
CREATE POLICY "Owners manage vaccine_setup_profiles" ON public.vaccine_setup_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pet_owners
      WHERE pet_owners.pet_id = vaccine_setup_profiles.pet_id
        AND pet_owners.profile_id = auth.uid()
    )
  );

-- =============================================
-- SEED DATA: 21 VACCINE PROTOCOL TEMPLATES
-- =============================================

-- Seed data removed for compatibility with new schema

-- =============================================
-- VERIFICATION QUERIES (run after migration)
-- =============================================
-- SELECT COUNT(*) FROM public.vaccine_templates;       -- expected: 21
-- SELECT COUNT(*) FROM public.vaccine_records_v2;      -- expected: 0 (empty)
-- SELECT COUNT(*) FROM public.vaccine_setup_profiles;  -- expected: 0 (empty)

-- =============================================
-- VACCINE OS v2 — SUPABASE MIGRATION
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================

-- 1. vaccine_templates: Protocol master data
CREATE TABLE IF NOT EXISTS public.vaccine_templates (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  species           TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  vaccine_code      TEXT NOT NULL,
  vaccine_name      TEXT NOT NULL,
  mandatory_level   TEXT NOT NULL DEFAULT 'core'
                      CHECK (mandatory_level IN ('legal_required', 'core', 'optional')),
  protects_against  TEXT[] DEFAULT '{}',
  dose_number       INTEGER NOT NULL DEFAULT 1,
  min_age_weeks     INTEGER NOT NULL DEFAULT 6,
  interval_days     INTEGER NULL,
  recurrence_type   TEXT NOT NULL DEFAULT 'none'
                      CHECK (recurrence_type IN ('none', 'annual', 'every_3_years', 'custom')),
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vaccine_templates_code_dose_species
  ON public.vaccine_templates(vaccine_code, dose_number, species);

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
CREATE POLICY "Anyone can read vaccine templates" ON public.vaccine_templates
  FOR SELECT USING (true);

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

INSERT INTO public.vaccine_templates
  (species, vaccine_code, vaccine_name, mandatory_level, protects_against, dose_number, min_age_weeks, interval_days, recurrence_type)
VALUES
  -- DOG: CORE SERIES
  ('dog','PUPPY_DP',  'Puppy DP (Başlangıç Aşısı)',       'core',           ARRAY['Distemper','Parvovirus'],                           1, 6,  NULL, 'none'),
  ('dog','DHPPI',     'Karma Aşı (DHPPi) 1. Doz',          'core',           ARRAY['Distemper','Hepatitis','Parvovirus','Parainfluenza'], 1, 7,  21,   'none'),
  ('dog','DHPPI',     'Karma Aşı (DHPPi) 2. Doz',          'core',           ARRAY['Distemper','Hepatitis','Parvovirus','Parainfluenza'], 2, 10, NULL, 'none'),
  ('dog','DHPPI_Y',   'Karma Aşı (DHPPi) Yıllık Tekrar',   'core',           ARRAY['Distemper','Hepatitis','Parvovirus','Parainfluenza'], 1, 52, 365,  'annual'),
  ('dog','LEPTO',     'Leptospira (L) 1. Doz',             'core',           ARRAY['Leptospirosis'],                                   1, 8,  21,   'none'),
  ('dog','LEPTO',     'Leptospira (L) 2. Doz',             'core',           ARRAY['Leptospirosis'],                                   2, 11, NULL, 'none'),
  ('dog','LEPTO_Y',   'Leptospira (L) Yıllık Tekrar',      'core',           ARRAY['Leptospirosis'],                                   1, 52, 365,  'annual'),
  ('dog','RABIES',    'Kuduz Aşısı (Rabies)',               'legal_required', ARRAY['Kuduz'],                                           1, 12, 365,  'annual'),
  ('dog','CCV',       'Corona Virüs (C) 1. Doz',           'optional',       ARRAY['Coronavirus'],                                     1, 11, 21,   'none'),
  ('dog','CCV',       'Corona Virüs (C) 2. Doz',           'optional',       ARRAY['Coronavirus'],                                     2, 14, NULL, 'none'),
  ('dog','CCV_Y',     'Corona Virüs (C) Yıllık Tekrar',    'optional',       ARRAY['Coronavirus'],                                     1, 52, 365,  'annual'),
  ('dog','BORDET',    'Boğmaca (Bordetella) 1. Doz',       'core',           ARRAY['Bordetella'],                                      1, 12, 21,   'none'),
  ('dog','BORDET',    'Boğmaca (Bordetella) 2. Doz',       'core',           ARRAY['Bordetella'],                                      2, 15, NULL, 'none'),
  ('dog','BORDET_Y',  'Boğmaca (Bordetella) Yıllık Tekrar','core',           ARRAY['Bordetella'],                                      1, 52, 365,  'annual'),
  -- CAT: CORE SERIES
  ('cat','FVRCP',     'Karma Aşı (FVRCP) 1. Doz',          'core',           ARRAY['Rhinotracheitis','Calicivirus','Panleukopenia'],    1, 8,  21,   'none'),
  ('cat','FVRCP',     'Karma Aşı (FVRCP) 2. Doz',          'core',           ARRAY['Rhinotracheitis','Calicivirus','Panleukopenia'],    2, 11, NULL, 'none'),
  ('cat','FVRCP_Y',   'Karma Aşı (FVRCP) Yıllık Tekrar',   'core',           ARRAY['Rhinotracheitis','Calicivirus','Panleukopenia'],    1, 52, 365,  'annual'),
  ('cat','FELV',      'Lösemi Aşısı (FeLV) 1. Doz',        'optional',       ARRAY['Feline Leukemia'],                                 1, 12, 21,   'none'),
  ('cat','FELV',      'Lösemi Aşısı (FeLV) 2. Doz',        'optional',       ARRAY['Feline Leukemia'],                                 2, 15, NULL, 'none'),
  ('cat','FELV_Y',    'Lösemi Aşısı (FeLV) Yıllık Tekrar', 'optional',       ARRAY['Feline Leukemia'],                                 1, 52, 365,  'annual'),
  ('cat','RABIES_CAT','Kuduz Aşısı (Rabies)',               'legal_required', ARRAY['Kuduz'],                                           1, 12, 365,  'annual')
ON CONFLICT (vaccine_code, dose_number, species) DO NOTHING;

-- =============================================
-- VERIFICATION QUERIES (run after migration)
-- =============================================
-- SELECT COUNT(*) FROM public.vaccine_templates;       -- expected: 21
-- SELECT COUNT(*) FROM public.vaccine_records_v2;      -- expected: 0 (empty)
-- SELECT COUNT(*) FROM public.vaccine_setup_profiles;  -- expected: 0 (empty)

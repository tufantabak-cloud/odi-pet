-- ================================================================
-- VACCINE OS v3 — PROTOCOL-CENTRIC SCHEMA
-- Her aşı = 1 satır. Doz sayısı, aralık, tekrar: kolonlarda.
-- Supabase Dashboard → SQL Editor'de çalıştırın.
-- ================================================================

-- 1. Eski tabloyu tamamen temizle ve yeniden oluştur
DROP TABLE IF EXISTS public.vaccine_templates CASCADE;

CREATE TABLE public.vaccine_templates (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL = Sistem varsayılanı
  species              TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
  vaccine_code         TEXT NOT NULL,
  vaccine_name         TEXT NOT NULL,
  category             TEXT NOT NULL DEFAULT 'vaccine'
                          CHECK (category IN ('vaccine', 'parasite', 'other')),
  mandatory_level      TEXT NOT NULL DEFAULT 'core'
                          CHECK (mandatory_level IN ('legal_required', 'core', 'optional')),
  protects_against     TEXT[] DEFAULT '{}',
  -- Doz serisi bilgisi
  dose_count           INTEGER NOT NULL DEFAULT 1,   -- Başlangıç seri doz sayısı
  first_dose_week      INTEGER NOT NULL DEFAULT 6,   -- Hayvanın hangi haftasında başlar
  dose_interval_days   INTEGER[] NULL,               -- Dozlar arası gün dizisi (Örn: ARRAY[21, 28])
  -- Yıllık tekrar
  has_annual_booster   BOOLEAN NOT NULL DEFAULT false,
  -- Periyodik tekrar (parazit için, gün cinsinden)
  recurrence_days      INTEGER NULL,                 -- Örn: 30 (aylık), 90 (3 aylık), NULL (tekrar yok)
  is_active            BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_vaccine_templates_code_species_profile
  ON public.vaccine_templates(vaccine_code, species, COALESCE(profile_id, '00000000-0000-0000-0000-000000000000'));

-- 2. RLS
ALTER TABLE public.vaccine_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read system or own templates" ON public.vaccine_templates
  FOR SELECT USING (profile_id IS NULL OR profile_id = auth.uid());

CREATE POLICY "Users can manage own templates" ON public.vaccine_templates
  FOR ALL USING (profile_id = auth.uid());

-- 3. SEED DATA — Köpek Aşıları
INSERT INTO public.vaccine_templates
  (species, vaccine_code, vaccine_name, category, mandatory_level, protects_against,
   dose_count, first_dose_week, dose_interval_days, has_annual_booster, recurrence_days)
VALUES
  -- Köpek Aşıları
  ('dog', 'PUPPY_DP',  'Puppy DP',                  'vaccine', 'core',           ARRAY['Distemper','Parvovirus'],                           1, 6,  NULL, false, NULL),
  ('dog', 'DHPPI',     'Karma Aşı (DHPPi)',           'vaccine', 'core',           ARRAY['Distemper','Hepatitis','Parvovirus','Parainfluenza'], 2, 7,  ARRAY[21],   true,  NULL),
  ('dog', 'LEPTO',     'Leptospira',                  'vaccine', 'core',           ARRAY['Leptospirosis'],                                   2, 8,  ARRAY[21],   true,  NULL),
  ('dog', 'RABIES',    'Kuduz Aşısı',                 'vaccine', 'legal_required', ARRAY['Rabies'],                                          1, 12, NULL, true,  NULL),
  ('dog', 'CCV',       'Corona Virüs',                'vaccine', 'optional',       ARRAY['Coronavirus'],                                     2, 11, ARRAY[21],   true,  NULL),
  ('dog', 'BORDET',    'Boğmaca (Bordetella)',         'vaccine', 'core',           ARRAY['Bordetella'],                                      2, 12, ARRAY[21],   true,  NULL),
  ('dog', 'LYME',      'Lyme Aşısı (Borrelia)',       'vaccine', 'core',           ARRAY['Lyme Disease', 'Borrelia'],                        2, 12, ARRAY[21],   true,  NULL),
  ('dog', 'RINGW',     'Mantar Aşısı',                'vaccine', 'core',           ARRAY['Microsporum canis', 'Ringworm'],                   2, 12, ARRAY[14],   true,  NULL),
  -- Köpek Parazit
  ('dog', 'INT_PAR_DOG', 'İç Parazit Tedavisi',       'parasite', 'core',          ARRAY[]::TEXT[],                                          1, 4,  NULL, false, 90),
  ('dog', 'EXT_PAR_DOG', 'Dış Parazit (Pire/Kene)',   'parasite', 'core',          ARRAY[]::TEXT[],                                          1, 8,  NULL, false, 30),
  ('dog', 'COLLAR_DOG',  'Parazit Tasması',            'parasite', 'optional',      ARRAY[]::TEXT[],                                          1, 8,  NULL, false, 180),
  -- Kedi Aşıları
  ('cat', 'FVRCP',     'Karma Aşı (FVRCP)',           'vaccine', 'core',           ARRAY['Rhinotracheitis','Calicivirus','Panleukopenia'],    2, 8,  ARRAY[21],   true,  NULL),
  ('cat', 'FELV',      'Lösemi Aşısı (FeLV)',         'vaccine', 'optional',       ARRAY['Feline Leukemia'],                                 2, 12, ARRAY[21],   true,  NULL),
  ('cat', 'RABIES_CAT','Kuduz Aşısı',                 'vaccine', 'legal_required', ARRAY['Rabies'],                                          1, 12, NULL, true,  NULL),
  ('cat', 'RINGW_CAT', 'Mantar Aşısı',                'vaccine', 'core',           ARRAY['Microsporum canis', 'Ringworm'],                   2, 12, ARRAY[14],   true,  NULL),
  -- Kedi Parazit
  ('cat', 'INT_PAR_CAT', 'İç Parazit Tedavisi',       'parasite', 'core',          ARRAY[]::TEXT[],                                          1, 4,  NULL, false, 90),
  ('cat', 'EXT_PAR_CAT', 'Dış Parazit (Pire/Kene)',   'parasite', 'core',          ARRAY[]::TEXT[],                                          1, 8,  NULL, false, 30),
  ('cat', 'COLLAR_CAT',  'Parazit Tasması',            'parasite', 'optional',      ARRAY[]::TEXT[],                                          1, 8,  NULL, false, 180)
ON CONFLICT DO NOTHING;

-- 4. Doğrulama
SELECT vaccine_code, vaccine_name, category, species, dose_count, has_annual_booster, recurrence_days
FROM public.vaccine_templates
ORDER BY species, category, vaccine_name;

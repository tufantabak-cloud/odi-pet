-- Seed data for vaccine_templates
INSERT INTO public.vaccine_templates (vaccine_code, vaccine_name, species, category, mandatory_level, dose_count, recurrence_days, first_dose_week, has_annual_booster, is_active)
VALUES 
  -- Dogs Core
  ('DOG_RABIES', 'Kuduz Aşısı', 'dog', 'vaccine', 'core', 1, NULL, 12, true, true),
  ('Rabies', 'Eski Kuduz', 'dog', 'vaccine', 'legal_required', 1, NULL, 12, true, false),
  ('DOG_CDV', 'Canine Distemper', 'dog', 'vaccine', 'core', 3, 21, 6, true, false),
  ('DOG_CAV1', 'Hepatitis', 'dog', 'vaccine', 'core', 3, 21, 6, true, false),
  ('DOG_CPV', 'Parvovirus', 'dog', 'vaccine', 'core', 3, 21, 6, true, false),
  ('DOG_CPIV', 'Karma Aşı (Parainfluenza vb.)', 'dog', 'vaccine', 'core', 3, 21, 6, true, true),
  
  -- Cats Core
  ('CAT_FPV', 'Feline Panleukopenia', 'cat', 'vaccine', 'core', 3, 21, 8, true, true),
  ('CAT_FHV1', 'Feline Herpesvirus', 'cat', 'vaccine', 'core', 3, 21, 8, true, true),
  ('CAT_FCV', 'Feline Calicivirus', 'cat', 'vaccine', 'core', 3, 21, 8, true, true),
  ('CAT_RABIES', 'Kuduz Aşısı', 'cat', 'vaccine', 'core', 1, NULL, 12, true, true),

  -- Parasites
  ('DOG_PARASITE_EXT', 'Dış Parazit', 'dog', 'parasite', 'core', 1, 30, 8, false, true),
  ('DOG_PARASITE_INT', 'İç Parazit', 'dog', 'parasite', 'core', 1, 60, 8, false, true),
  ('CAT_PARASITE_EXT', 'Dış Parazit', 'cat', 'parasite', 'core', 1, 30, 8, false, true),
  ('CAT_PARASITE_INT', 'İç Parazit', 'cat', 'parasite', 'core', 1, 60, 8, false, true),

  -- Optional Dog Vaccines
  ('DOG_LEPTO', 'Leptospirosis', 'dog', 'vaccine', 'optional', 2, 21, 8, true, true),
  ('DOG_BORDETELLA', 'Bordetella', 'dog', 'vaccine', 'optional', 1, NULL, 8, true, true),
  ('DOG_LYME', 'Lyme', 'dog', 'vaccine', 'optional', 2, 21, 9, true, true),

  -- Optional Cat Vaccines
  ('CAT_FELV', 'Feline Leukemia', 'cat', 'vaccine', 'optional', 2, 21, 8, true, true);

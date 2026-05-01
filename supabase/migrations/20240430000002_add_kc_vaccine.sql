-- Add Boğmaca (Kennel Cough) vaccine to the library
INSERT INTO public.vaccines (name, species, is_core, recommended_age_start_days, dose_interval_days, description)
VALUES 
  ('Boğmaca (Kennel Cough) (1. Doz)', 'Köpek', true, 80, 21, 'Bordetella koruması'),
  ('Boğmaca (Kennel Cough) (2. Doz)', 'Köpek', true, 101, 365, 'Boğmaca Booster'),
  ('Boğmaca (Kennel Cough) (Yıllık Tekrar)', 'Köpek', true, 365, 365, 'Yıllık Boğmaca Booster')
ON CONFLICT (name, species) DO NOTHING;

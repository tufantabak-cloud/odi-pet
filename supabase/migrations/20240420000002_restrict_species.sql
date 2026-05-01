-- Sadece Kedi ve Köpek'e kısıtla (Sprint 3 sonrası ekleme)
ALTER TABLE public.pets
  DROP CONSTRAINT IF EXISTS pets_species_check;

ALTER TABLE public.pets
  ADD CONSTRAINT pets_species_check
  CHECK (species IN ('Kedi', 'Köpek'));

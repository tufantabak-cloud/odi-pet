-- Normalize Turkish species values to English
UPDATE pets SET species = 'cat' WHERE species = 'Kedi' OR species ILIKE 'kedi';
UPDATE pets SET species = 'dog' WHERE species = 'Köpek' OR species ILIKE 'köpek';

-- Add a check constraint to ensure data consistency
ALTER TABLE pets DROP CONSTRAINT IF EXISTS pets_species_check;
ALTER TABLE pets ADD CONSTRAINT pets_species_check CHECK (species IN ('cat', 'dog'));

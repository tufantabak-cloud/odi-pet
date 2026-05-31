-- Add vet_company and vet_email columns to pets table
ALTER TABLE public.pets
ADD COLUMN IF NOT EXISTS vet_company TEXT,
ADD COLUMN IF NOT EXISTS vet_email TEXT;

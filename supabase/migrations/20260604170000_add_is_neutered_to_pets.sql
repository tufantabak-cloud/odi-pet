-- Add is_neutered column to pets table
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS is_neutered BOOLEAN DEFAULT FALSE;

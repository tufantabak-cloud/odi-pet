-- Add lifestyle and size columns to pets table
ALTER TABLE public.pets 
  ADD COLUMN IF NOT EXISTS lifestyle TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT;

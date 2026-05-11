
-- Add SOS Contacts column to pets table
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS sos_contacts JSONB DEFAULT '[]'::jsonb;

-- Update RLS (if needed, though pets table usually already has it)
-- Since it's a column on an existing table, existing policies should apply.

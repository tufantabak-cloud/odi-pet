
-- Add SOS Contacts column to pets table
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS sos_contacts JSONB DEFAULT '[]'::jsonb;

-- Since it's a column on an existing table, existing policies should apply.
